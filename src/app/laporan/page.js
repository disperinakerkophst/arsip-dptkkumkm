'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID, COLLECTION_JENIS_ID, COLLECTION_KLASIFIKASI_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BIDANG_LABELS = {
  'SKE': 'Sekretariat',
  'KEU': 'Keuangan',
  'IND': 'Perindustrian',
  'NAKER': 'Tenaga Kerja',
  'KUMKM': 'Koperasi & UMKM'
};

// Helper top-level agar bisa digunakan di fetchLaporanData maupun generatePDF
const getBidangFromNomor = (nomor) => {
  if (!nomor) return 'UMUM';
  const parts = nomor.split('/');
  return parts[3] || 'UMUM';
};

export default function LaporanPage() {
  const { user, role, bidang: userBidang, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tahunPilihan, setTahunPilihan] = useState([]);
  const [tahun, setTahun] = useState('');
  const [bulan, setBulan] = useState('all'); // 'all' or '0'-'11'
  const [jenisSuratList, setJenisSuratList] = useState([]);
  const [klasifikasiList, setKlasifikasiList] = useState([]);
  
  const [dataLaporan, setDataLaporan] = useState([]);
  const [allDocsForReport, setAllDocsForReport] = useState([]);
  const [totalSurat, setTotalSurat] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [bidangFilter, setBidangFilter] = useState('all'); // 'all' | 'SKE' | 'KEU' | 'IND' | 'NAKER' | 'KUMKM'

  // State untuk penandatangan
  const [ttd, setTtd] = useState({
    mengetahuiNama: '',
    mengetahuiNip: '',
    mengetahuiJabatan: 'Kepala Dinas',
    pjNama: '',
    pjNip: '',
    pjJabatan: 'Admin Sistem'
  });

  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [
      currentYear.toString(),
      (currentYear - 1).toString(),
      (currentYear - 2).toString()
    ];
    setTahunPilihan(years);
    setTahun(years[0]);

    // Fetch Configs
    const fetchConfig = async () => {
      try {
        const [resJenis, resKlas] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_JENIS_ID, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_KLASIFIKASI_ID, [Query.limit(100)])
        ]);
        setJenisSuratList(resJenis.documents);
        setKlasifikasiList(resKlas.documents);
      } catch (err) {
        console.error('Error fetching config', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      }
      // pembuat_surat boleh akses — filter akan dikunci ke bidang mereka sendiri
    }
  }, [user, role, authLoading, router]);

  // Auto-lock filter ke bidang sendiri jika role pembuat_surat
  useEffect(() => {
    if (role === 'pembuat_surat' && userBidang) {
      setBidangFilter(userBidang);
    }
  }, [role, userBidang]);

  useEffect(() => {
    if (user && tahun && jenisSuratList.length >= 0) {
      fetchLaporanData();
    }
  }, [tahun, bulan, bidangFilter, user, jenisSuratList]);

  const fetchLaporanData = async () => {
    if (!tahun) return;
    setLoading(true);
    try {
      const yearStr = tahun.toString();
      let startDate, endDate;

      if (bulan === 'all') {
        startDate = `${yearStr}-01-01T00:00:00.000Z`;
        endDate = `${yearStr}-12-31T23:59:59.999Z`;
      } else {
        const m = parseInt(bulan);
        const lastDay = new Date(parseInt(yearStr), m + 1, 0).getDate();
        const monthStr = (m + 1).toString().padStart(2, '0');
        startDate = `${yearStr}-${monthStr}-01T00:00:00.000Z`;
        endDate = `${yearStr}-${monthStr}-${lastDay}T23:59:59.999Z`;
      }

      let allDocuments = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SURAT_ID,
          [
            Query.between('tanggalSurat', startDate, endDate),
            Query.limit(100),
            Query.offset(offset)
          ]
        );
        
        allDocuments = [...allDocuments, ...response.documents];
        if (response.documents.length < 100) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }

      // Filter berdasarkan bidang jika bukan 'all'
      if (bidangFilter !== 'all') {
        allDocuments = allDocuments.filter(doc =>
          getBidangFromNomor(doc.nomorSurat) === bidangFilter
        );
      }

      setAllDocsForReport(allDocuments);
      setTotalSurat(allDocuments.length);

      let groupedData = [];

      if (bulan === 'all') {
        groupedData = BULAN.map((namaBulan, index) => {
          const suratBulanIni = allDocuments.filter(doc => {
            if (!doc.tanggalSurat) return false;
            return new Date(doc.tanggalSurat).getMonth() === index;
          });

          const counts = {};
          jenisSuratList.forEach(j => counts[j.code] = 0);
          let lainnya = 0;

          suratBulanIni.forEach(doc => {
            if (counts[doc.jenisSurat] !== undefined) {
              counts[doc.jenisSurat]++;
            } else {
              lainnya++;
            }
          });

          return {
            label: namaBulan,
            total: suratBulanIni.length,
            counts,
            lainnya
          };
        });
      } else {
        const m = parseInt(bulan);
        const lastDay = new Date(parseInt(yearStr), m + 1, 0).getDate();
        
        for (let i = 1; i <= lastDay; i++) {
          const suratHariIni = allDocuments.filter(doc => {
            if (!doc.tanggalSurat) return false;
            return new Date(doc.tanggalSurat).getDate() === i;
          });

          const counts = {};
          jenisSuratList.forEach(j => counts[j.code] = 0);
          let lainnya = 0;

          suratHariIni.forEach(doc => {
            if (counts[doc.jenisSurat] !== undefined) {
              counts[doc.jenisSurat]++;
            } else {
              lainnya++;
            }
          });

          groupedData.push({
            label: `${i} ${BULAN[m]}`,
            total: suratHariIni.length,
            counts,
            lainnya
          });
        }
      }

      setDataLaporan(groupedData);
    } catch (err) {
      console.error('Error fetching report', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const isMonthly = bulan !== 'all';
    const periodName = isMonthly ? `${BULAN[parseInt(bulan)]} ${tahun}` : `Tahun ${tahun}`;
    const isBidangSpecific = bidangFilter !== 'all';
    const bidangLabel = BIDANG_LABELS[bidangFilter] || bidangFilter;

    // Header
    // Note: Pastikan file logo_hst.png sudah ada di folder public/
    try {
      // Perkecil logo sedikit
      doc.addImage('/logo_hst.png', 'PNG', 15, 8, 15, 18);
    } catch (e) {
      console.warn("Logo tidak ditemukan di /public/logo_hst.png");
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PEMERINTAH KABUPATEN HULU SUNGAI TENGAH', 155, 15, { align: 'center' });
    doc.text('DINAS PERINDUSTRIAN, TENAGA KERJA, KOPERASI DAN UMKM', 155, 22, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. H. Sibli Imansyah, Kel. Barabai Barat, Kec. Barabai, Kab. Hulu Sungai Tengah, Kalimantan Selatan 71352', 155, 28, { align: 'center' });
    doc.line(14, 32, 282, 32);
    doc.setLineWidth(1);
    doc.line(14, 33, 282, 33);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`LAPORAN STATISTIK ARSIP SURAT KELUAR`, 148, 42, { align: 'center' });
    if (isBidangSpecific) {
      doc.text(`BIDANG: ${bidangLabel.toUpperCase()}`, 148, 48, { align: 'center' });
      doc.text(`PERIODE: ${periodName.toUpperCase()}`, 148, 54, { align: 'center' });
    } else {
      doc.text(`PERIODE: ${periodName.toUpperCase()}`, 148, 48, { align: 'center' });
    }

    // Geser startY jika judul pakai 2 baris (bidang spesifik)
    const tableStartY = isBidangSpecific ? 61 : 55;

    // Table 1: Monthly Summary
    let mainTableData = [];
    if (!isMonthly) {
      mainTableData = dataLaporan.map(item => [
        item.label,
        item.total.toString(),
        ...jenisSuratList.map(j => (item.counts[j.code] || 0).toString()),
        item.lainnya.toString()
      ]);
    } else {
      const totalCounts = {};
      jenisSuratList.forEach(j => totalCounts[j.code] = 0);
      let totalLainnya = 0;
      allDocsForReport.forEach(doc => {
         if (totalCounts[doc.jenisSurat] !== undefined) totalCounts[doc.jenisSurat]++;
         else totalLainnya++;
      });
      mainTableData = [[
        BULAN[parseInt(bulan)],
        totalSurat.toString(),
        ...jenisSuratList.map(j => (totalCounts[j.code] || 0).toString()),
        totalLainnya.toString()
      ]];
    }

    const grandTotalRow = [
      "TOTAL",
      totalSurat.toString(),
      ...jenisSuratList.map(j => {
        if (!isMonthly) return (dataLaporan.reduce((acc, curr) => acc + (curr.counts[j.code] || 0), 0)).toString();
        return allDocsForReport.filter(d => d.jenisSurat === j.code).length.toString();
      }),
      (!isMonthly ? dataLaporan.reduce((acc, curr) => acc + curr.lainnya, 0) : allDocsForReport.filter(d => !jenisSuratList.some(j => j.code === d.jenisSurat)).length).toString()
    ];
    mainTableData.push(grandTotalRow);

    autoTable(doc, {
      head: [["Bulan", "Total", ...jenisSuratList.map(j => j.code), "Lainnya"]],
      body: mainTableData,
      startY: tableStartY,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      margin: { bottom: 20 },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.row.index === mainTableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
      }
    });

    let currentY = doc.lastAutoTable.finalY + 5;

    // Neat Legend Table - Max 3 rows
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Keterangan Kode Jenis Surat:', 14, currentY);
    
    // Calculate columns needed to keep it within 3 rows
    const numRows = 3;
    const numCols = Math.ceil(jenisSuratList.length / numRows);
    const legendData = [];
    
    for (let r = 0; r < numRows; r++) {
      const row = [];
      for (let c = 0; c < numCols; c++) {
        const index = c * numRows + r;
        if (index < jenisSuratList.length) {
          const j = jenisSuratList[index];
          row.push(`${j.code}: ${j.label}`);
        } else {
          row.push("");
        }
      }
      legendData.push(row);
    }

    autoTable(doc, {
      body: legendData,
      startY: currentY + 2,
      theme: 'plain',
      styles: { 
        fontSize: 7, 
        cellPadding: 0.5, 
        fontStyle: 'italic', 
        color: [100, 100, 100],
        minCellWidth: 30
      },
      margin: { left: 14, bottom: 20 }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Category Recap
    if (currentY > 180) { doc.addPage(); currentY = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REKAPITULASI KATEGORI ARSIP', 14, currentY);
    currentY += 5;

    // Recap 1: Jenis Surat
    const jenisRows = jenisSuratList.map(j => {
      const count = allDocsForReport.filter(d => d.jenisSurat === j.code).length;
      return [j.label, j.code, count.toString(), ((count/totalSurat)*100 || 0).toFixed(1) + '%'];
    }).filter(r => parseInt(r[2]) > 0);

    autoTable(doc, {
      head: [['Nama Jenis', 'Kode', 'Jumlah', '%']],
      body: jenisRows,
      startY: currentY,
      margin: { left: 14, bottom: 20 },
      tableWidth: 80,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 152, 219] }
    });

    // Recap 2: Klasifikasi
    const klasRows = klasifikasiList.map(k => {
      const count = allDocsForReport.filter(d => d.klasifikasiSurat === k.code).length;
      return [k.label, k.code, count.toString()];
    }).filter(r => parseInt(r[2]) > 0);

    autoTable(doc, {
      head: [['Klasifikasi', 'Kode', 'Jml']],
      body: klasRows,
      startY: currentY,
      margin: { left: 100, bottom: 20 },
      tableWidth: 85,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [46, 204, 113] }
    });

    // Recap 3: Penempatan Bidang — tampilkan hanya jika laporan mencakup semua bidang
    if (!isBidangSpecific) {
      const bidangCounts = {};
      allDocsForReport.forEach(d => {
        const b = getBidangFromNomor(d.nomorSurat);
        bidangCounts[b] = (bidangCounts[b] || 0) + 1;
      });

      const bidangRows = Object.entries(bidangCounts).map(([bidang, count]) => [
        BIDANG_LABELS[bidang] || bidang,
        count.toString(),
        ((count / totalSurat) * 100 || 0).toFixed(1) + '%'
      ]);

      autoTable(doc, {
        head: [['Bidang', 'Jumlah', '%']],
        body: bidangRows,
        startY: currentY,
        margin: { left: 195, bottom: 20 },
        tableWidth: 80,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [155, 89, 182] }
      });
    }

    const recapFinalY = doc.lastAutoTable.finalY;
    
    // Fleksibilitas: Jika ruang sempit, kecilkan gap tanda tangan
    let gap = 20;
    let signatureY = recapFinalY + gap;
    
    if (signatureY > 165) {
      // Coba kecilkan gap ke 10mm jika itu membantu muat di halaman ini
      if (recapFinalY + 10 <= 165) {
        signatureY = recapFinalY + 10;
      } else {
        doc.addPage();
        signatureY = 30;
      }
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const col1X = 50; 
    const col2X = 220; 

    // Tanggal
    doc.text(`Barabai, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, col2X, signatureY - 5);

    // Kolom 1: Mengetahui
    doc.text('Mengetahui,', col1X, signatureY);
    doc.text(ttd.mengetahuiJabatan, col1X, signatureY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(ttd.mengetahuiNama || '..........................................', col1X, signatureY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(ttd.mengetahuiNip ? `NIP. ${ttd.mengetahuiNip}` : 'NIP. ..........................................', col1X, signatureY + 30);

    // Kolom 2: Penanggung Jawab
    doc.text('Penanggung Jawab,', col2X, signatureY);
    doc.text(ttd.pjJabatan, col2X, signatureY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(ttd.pjNama || '..........................................', col2X, signatureY + 25);
    doc.setFont('helvetica', 'normal');
    doc.text(ttd.pjNip ? `NIP. ${ttd.pjNip}` : 'NIP. ..........................................', col2X, signatureY + 30);

    return doc;
  };

  const handleExportPDF = () => {
    const doc = generatePDF();
    const periodName = bulan !== 'all' ? `${BULAN[parseInt(bulan)]}_${tahun}` : `Tahun_${tahun}`;
    const bidangSuffix = bidangFilter !== 'all' ? `_${bidangFilter}` : '';
    doc.save(`Laporan_Statistik${bidangSuffix}_${periodName}.pdf`);
  };

  useEffect(() => {
    if (dataLaporan.length > 0 && !loading) {
      const doc = generatePDF();
      setPdfPreview(doc.output('datauristring'));
    }
  }, [dataLaporan, loading, ttd, bidangFilter]);

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi...</div>;
  }

  const maxVal = Math.max(...dataLaporan.map(d => d.total), 1);

  return (
    <div className="card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Laporan Statistik Arsip</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}> Ringkasan penerbitan surat berdasarkan kategori. </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={bulan} 
            onChange={(e) => setBulan(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          >
            <option value="all">Seluruh Bulan</option>
            {BULAN.map((b, i) => <option key={i} value={i.toString()}>{b}</option>)}
          </select>

          <select 
            value={tahun} 
            onChange={(e) => setTahun(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          >
            {tahunPilihan.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Filter Bidang */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <select 
              value={bidangFilter} 
              onChange={(e) => setBidangFilter(e.target.value)}
              disabled={role === 'pembuat_surat'}
              title={role === 'pembuat_surat' ? 'Anda hanya dapat melihat laporan bidang Anda sendiri' : ''}
              style={{ 
                padding: '0.5rem 1rem', 
                borderRadius: '8px', 
                background: role === 'pembuat_surat' ? 'rgba(255,255,255,0.03)' : 'rgba(168,199,250,0.08)', 
                color: role === 'pembuat_surat' ? 'var(--text-muted)' : 'var(--primary)', 
                border: '1px solid rgba(168,199,250,0.3)', 
                fontWeight: '600',
                cursor: role === 'pembuat_surat' ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="all">Semua Bidang</option>
              {Object.entries(BIDANG_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label} ({code})</option>
              ))}
            </select>
            {role === 'pembuat_surat' && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                (dikunci ke bidang Anda)
              </span>
            )}
          </div>

          {(role === 'superadmin' || role === 'admin' || role === 'pembuat_surat') && (
            <button onClick={handleExportPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Unduh PDF{bidangFilter !== 'all' ? ` — ${BIDANG_LABELS[bidangFilter]}` : ''}
            </button>
          )}
        </div>
      </div>

      {/* Info badge bidang aktif */}
      {bidangFilter !== 'all' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'rgba(168,199,250,0.07)', border: '1px solid rgba(168,199,250,0.25)', marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
            Filter Aktif: Bidang {BIDANG_LABELS[bidangFilter]} ({bidangFilter})
          </span>
          {role !== 'pembuat_surat' && (
            <button 
              onClick={() => setBidangFilter('all')}
              style={{ marginLeft: 'auto', fontSize: '0.78rem', background: 'transparent', border: '1px solid rgba(168,199,250,0.3)', color: 'var(--text-muted)', padding: '0.2rem 0.75rem', borderRadius: '6px', cursor: 'pointer' }}
            >
              × Hapus Filter
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(168, 199, 250, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--primary)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: '700' }}>
            Total Surat {bidangFilter !== 'all' ? `— ${BIDANG_LABELS[bidangFilter]}` : ''} ({bulan === 'all' ? tahun : BULAN[parseInt(bulan)] + ' ' + tahun})
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.5rem' }}>{totalSurat}</div>
        </div>

        {/* Form Input Penandatangan */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>MENGETAHUI</div>
            <input 
              type="text" 
              placeholder="Nama Pejabat" 
              value={ttd.mengetahuiNama} 
              onChange={e => setTtd({...ttd, mengetahuiNama: e.target.value})}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', marginBottom: '0.4rem', fontSize: '0.85rem' }}
            />
            <input 
              type="text" 
              placeholder="NIP Pejabat" 
              value={ttd.mengetahuiNip} 
              onChange={e => setTtd({...ttd, mengetahuiNip: e.target.value})}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>PENANGGUNG JAWAB</div>
            <input 
              type="text" 
              placeholder="Nama Admin" 
              value={ttd.pjNama} 
              onChange={e => setTtd({...ttd, pjNama: e.target.value})}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', marginBottom: '0.4rem', fontSize: '0.85rem' }}
            />
            <input 
              type="text" 
              placeholder="NIP Admin (Opsional)" 
              value={ttd.pjNip} 
              onChange={e => setTtd({...ttd, pjNip: e.target.value})}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto 1rem' }}></div>
          <p>Menganalisis data arsip...</p>
        </div>
      ) : (
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  {bulan === 'all' ? "Bulan" : "Tanggal"}
                </th>
                <th style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', textAlign: 'center', width: '100px' }}>Total</th>
                <th style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>Rincian Per Jenis</th>
              </tr>
            </thead>
            <tbody>
              {dataLaporan.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: idx < dataLaporan.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.2s' }}>
                  <td style={{ padding: '1.25rem', fontWeight: '700' }}>{item.label}</td>
                  <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--primary)' }}>{item.total}</span>
                  </td>
                  <td style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ 
                        height: '8px', 
                        background: 'rgba(168, 199, 250, 0.1)', 
                        borderRadius: '4px', 
                        width: '100%',
                        overflow: 'hidden'
                      }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--primary)', 
                          width: `${(item.total / maxVal) * 100}%`,
                          transition: 'width 0.8s ease-out'
                        }}></div>
                      </div>
                      {item.total > 0 && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {jenisSuratList.map(j => item.counts[j.code] > 0 ? (
                            <span key={j.code} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <strong>{j.code}:</strong> {item.counts[j.code]}
                            </span>
                          ) : null)}
                          {item.lainnya > 0 && (
                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <strong>Lainnya:</strong> {item.lainnya}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live Preview Section */}
      {pdfPreview && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            Live Preview Laporan
          </h3>
          <div style={{ width: '100%', height: '600px', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <iframe 
              src={pdfPreview} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title="PDF Preview"
            />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
            Preview di atas akan diperbarui secara otomatis saat Anda mengubah data penandatangan atau filter.
          </p>
        </div>
      )}
    </div>
  );
}
