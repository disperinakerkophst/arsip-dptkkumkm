'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TAHUN_PILIHAN = [
  new Date().getFullYear().toString(),
  (new Date().getFullYear() - 1).toString(),
  (new Date().getFullYear() - 2).toString()
];

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function LaporanPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tahun, setTahun] = useState(TAHUN_PILIHAN[0]);
  const [dataLaporan, setDataLaporan] = useState([]);
  const [totalSurat, setTotalSurat] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchLaporanData();
    }
  }, [tahun, user]);

  const fetchLaporanData = async () => {
    setLoading(true);
    try {
      const startDate = `${tahun}-01-01T00:00:00.000Z`;
      const endDate = `${tahun}-12-31T23:59:59.999Z`;

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

      setTotalSurat(allDocuments.length);

      // Grup data per bulan
      const groupedData = BULAN.map((namaBulan, index) => {
        const suratBulanIni = allDocuments.filter(doc => {
          if (!doc.tanggalSurat) return false;
          const monthIndex = new Date(doc.tanggalSurat).getMonth();
          return monthIndex === index;
        });

        // Hitung juga statistik jenis surat untuk bulan tersebut
        const suratKeputusan = suratBulanIni.filter(d => d.jenisSurat === 'SK').length;
        const notaDinas = suratBulanIni.filter(d => d.jenisSurat === 'ND').length;
        const suratTugas = suratBulanIni.filter(d => d.jenisSurat === 'ST').length;

        return {
          bulan: namaBulan,
          total: suratBulanIni.length,
          sk: suratKeputusan,
          nd: notaDinas,
          st: suratTugas,
          lainnya: suratBulanIni.length - (suratKeputusan + notaDinas + suratTugas)
        };
      });

      setDataLaporan(groupedData);
    } catch (err) {
      console.error('Error fetching report', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Judul Kop Surat
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Dinas Perindustrian, Tenaga Kerja, Koperasi & UMKM', 14, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rekapitulasi Arsip Surat Keluar - Tahun ${tahun}`, 14, 28);
    
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    const tableColumn = ["Bulan", "Total Surat", "Surat Keputusan (SK)", "Nota Dinas (ND)", "Surat Tugas (ST)", "Jenis Lainnya"];
    const tableRows = [];

    dataLaporan.forEach(laporan => {
      const rowData = [
        laporan.bulan,
        laporan.total.toString(),
        laporan.sk.toString(),
        laporan.nd.toString(),
        laporan.st.toString(),
        laporan.lainnya.toString()
      ];
      tableRows.push(rowData);
    });

    tableRows.push([
      "TOTAL KESELURUHAN",
      totalSurat.toString(),
      dataLaporan.reduce((acc, curr) => acc + curr.sk, 0).toString(),
      dataLaporan.reduce((acc, curr) => acc + curr.nd, 0).toString(),
      dataLaporan.reduce((acc, curr) => acc + curr.st, 0).toString(),
      dataLaporan.reduce((acc, curr) => acc + curr.lainnya, 0).toString(),
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 4 },
      footStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: function (data) {
        if (data.row.index === tableRows.length - 1) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    // Signature Area
    const finalY = doc.lastAutoTable.finalY || 40;
    doc.text('Hulu Sungai Tengah, ___________', 140, finalY + 20);
    doc.text('Mengetahui,', 140, finalY + 30);
    doc.text('Admin Sistem / Superadmin', 140, finalY + 60);

    doc.save(`Rekap_Surat_${tahun}.pdf`);
  };

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi Admin...</div>;
  }

  // Hitung persentase untuk chart bar yang simpel
  const maxBulan = Math.max(...dataLaporan.map(d => d.total), 1);

  return (
    <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Laporan Statistik Tahunan</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Pantau jumlah penerbitan surat keluar setiap bulan secara real-time berdasarkan arsip yang sukses direkam oleh sistem.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            value={tahun} 
            onChange={(e) => setTahun(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
          >
            {TAHUN_PILIHAN.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {role === 'superadmin' ? (
            <button onClick={handleExportPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Unduh PDF
            </button>
          ) : (
            <div style={{ fontSize: '0.75rem', color: '#ffc107', background: 'rgba(255,193,7,0.1)', padding: '0.5rem 1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              PDF Khusus Superadmin
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: 'rgba(168, 199, 250, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--primary)' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>Total Surat Keluar ({tahun})</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '0.5rem' }}>{totalSurat}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Menghitung data statistik...</div>
      ) : (
        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '150px' }}>Bulan</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '120px', textAlign: 'center' }}>Total</th>
                <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Visualisasi</th>
              </tr>
            </thead>
            <tbody>
              {dataLaporan.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: idx < dataLaporan.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <td style={{ padding: '1rem', fontWeight: '600' }}>{item.bulan}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.total}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        height: '24px', 
                        background: 'linear-gradient(90deg, var(--primary) 0%, rgba(168, 199, 250, 0.8) 100%)', 
                        borderRadius: '4px', 
                        width: `${item.total === 0 ? 0 : Math.max((item.total / maxBulan) * 100, 2)}%`,
                        transition: 'width 1s ease-in-out'
                      }}></div>
                      {item.total > 0 && <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.sk > 0 && <span>SK: {item.sk}</span>}
                        {item.nd > 0 && <span>ND: {item.nd}</span>}
                        {item.st > 0 && <span>ST: {item.st}</span>}
                      </div>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
