'use client';
import { useState, useEffect, useRef } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID, COLLECTION_AUDIT_ID, COLLECTION_USERS_ID, COLLECTION_JENIS_ID, COLLECTION_KLASIFIKASI_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/audit';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// Elegant SVG Icons
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [suratList, setSuratList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  
  // Filters State
  const [search, setSearch] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting State
  const [sortBy, setSortBy] = useState('tanggalSurat'); // default sort by latest
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Dashboard State
  const [dashboardStats, setDashboardStats] = useState({ tahunIni: 0, bulanIni: 0, hariIni: 0, lastNumber: '-', loading: true });
  const [activities, setActivities] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [bookingAlert, setBookingAlert] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'complete', 'booking'
  const [jenisOptions, setJenisOptions] = useState([{ label: 'Semua Jenis', value: '' }]);
  const [showFilters, setShowFilters] = useState(false);
  const [jenisMap, setJenisMap] = useState({});
  const searchInputRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (user && role) {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [resTahun, resBulan, resHari, resLastNum, actRes, allDocs, saRes, configJenis] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [Query.greaterThanEqual('tanggalSurat', startOfYear), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [Query.greaterThanEqual('tanggalSurat', startOfMonth), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [Query.greaterThanEqual('tanggalSurat', startOfDay), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [Query.orderDesc('noUrut'), Query.limit(1)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_AUDIT_ID, [Query.orderDesc('$createdAt'), Query.limit(20)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [Query.greaterThanEqual('tanggalSurat', startOfYear), Query.limit(500)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_USERS_ID, [Query.startsWith('role', 'superadmin'), Query.limit(100)]).catch(() => ({ documents: [] })),
        databases.listDocuments(DATABASE_ID, COLLECTION_JENIS_ID, [Query.limit(100)]).catch(() => ({ documents: [] }))
      ]);

      if (configJenis.documents.length > 0) {
        const newOptions = [{ label: 'Semua Jenis', value: '' }, ...configJenis.documents.map(d => ({ label: `${d.label} (${d.code})`, value: d.code }))];
        const newMap = {};
        configJenis.documents.forEach(d => { newMap[d.code] = d.label; });
        setJenisOptions(newOptions);
        setJenisMap(newMap);
      }

      // Parse nama superadmin (Format: Username|DisplayName|Email|Password)
      const saInfo = saRes.documents.map(d => {
        const parts = (d.nama || '').split('|');
        return parts.length >= 4 ? [parts[0], parts[1]] : [d.nama];
      }).flat();

      setDashboardStats({
        tahunIni: resTahun.total,
        bulanIni: resBulan.total,
        hariIni: resHari.total,
        lastNumber: resLastNum.documents.length > 0 ? resLastNum.documents[0].nomorSurat : '-',
        loading: false
      });
      
      const filteredActivities = actRes.documents
        .filter(act => {
          // Jika user adalah pembuat_surat (Pencatat), sembunyikan aktivitas superadmin
          if (role === 'pembuat_surat') {
            return !saInfo.includes(act.username);
          }
          // Selain itu (admin/superadmin), tampilkan semua
          return true;
        })
        .slice(0, 6);
      setActivities(filteredActivities);

      let typeCounts = {};
      allDocs.documents.forEach(doc => {
        if (doc.jenisSurat) typeCounts[doc.jenisSurat] = (typeCounts[doc.jenisSurat] || 0) + 1;
      });
      const formattedPie = Object.keys(typeCounts).map(k => ({ name: k, value: typeCounts[k] })).sort((a,b)=>b.value - a.value).slice(0, 5);
      setPieData(formattedPie);

      if (user?.name) {
        let bookingDocs;
        if (role === 'pembuat_surat') {
          // Hanya ambil punya sendiri
          const res = await databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [
            Query.equal('pembuatSurat', user.name),
            Query.limit(100)
          ]);
          bookingDocs = res.documents;
        } else {
          // Admin & Superadmin: Ambil semua yang tidak punya linkFile
          // Catatan: Karena Appwrite Query.isNull butuh index, kita ambil materi terbaru (misal 100 terakhir)
          const res = await databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [
            Query.orderDesc('$createdAt'),
            Query.limit(100)
          ]);
          bookingDocs = res.documents;
        }
        
        // Periksa status linkFile secara manual untuk akurasi tanpa index
        const missing = bookingDocs.filter(d => {
          const isNoFile = d.linkFile === null || d.linkFile === undefined || d.linkFile.trim() === '';
          if (role === 'pembuat_surat') return isNoFile;
          // Untuk admin, kita hitung semua yang kosong
          return isNoFile;
        }).length;
        
        setBookingAlert(missing);
      }
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchSurat(page);
  }, [page, jenisFilter, startDate, endDate, sortBy, sortOrder, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [jenisFilter, startDate, endDate, sortBy, sortOrder, statusFilter]);

  const fetchSurat = async (currentPage) => {
    try {
      setLoading(true);
      let queries = [
        Query.limit(ITEMS_PER_PAGE),
        Query.offset((currentPage - 1) * ITEMS_PER_PAGE)
      ];
      
      const toIsoSafe = (dateStr) => {
        try {
          const d = new Date(dateStr);
          return isNaN(d.getTime()) ? null : d.toISOString();
        } catch (e) {
          return null;
        }
      };

      // Handle Sorting
      if (sortOrder === 'desc') {
        queries.push(Query.orderDesc(sortBy));
      } else {
        queries.push(Query.orderAsc(sortBy));
      }
      
      if (jenisFilter) {
        queries.push(Query.equal('jenisSurat', jenisFilter));
      }

      if (statusFilter === 'booking') {
        queries.push(Query.isNull('linkFile')); // Works if it's truly null
        // If it might be empty string, Appwrite is tricky, let's use isNull for now
      } else if (statusFilter === 'complete') {
        queries.push(Query.isNotNull('linkFile'));
      }
      
      const startIso = toIsoSafe(startDate);
      const endIso = toIsoSafe(endDate);

      if (startIso && endIso) {
        queries.push(Query.between('tanggalSurat', startIso, endIso));
      } else if (startIso) {
        queries.push(Query.greaterThanEqual('tanggalSurat', startIso));
      } else if (endIso) {
        queries.push(Query.lessThanEqual('tanggalSurat', endIso));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        queries
      );
      setSuratList(response.documents);
      setTotal(response.total);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data surat.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDelete = async (id, nomorSurat) => {
    if (role === 'pembuat_surat') {
      alert('Maaf, role Pencatat Surat tidak memiliki izin untuk menghapus arsip.');
      return;
    }
    if(!window.confirm('Yakin ingin menghapus arsip surat ini? Riwayat data akan disimpan di audit log untuk pemulihan.')) return;
    try {
      // Ambil data dulu sebelum dihapus agar bisa direstore nantinya
      const doc = await databases.getDocument(DATABASE_ID, COLLECTION_SURAT_ID, id);
      
      // Hapus dokumen
      await databases.deleteDocument(DATABASE_ID, COLLECTION_SURAT_ID, id);
      
      // Catat dengan payload data yang dihapus
      await logActivity(user?.name, `Menghapus dokumen surat dengan Nomor: ${nomorSurat || doc.nomorSurat || id}`, doc);
      
      fetchSurat(page);
    } catch(e) {
      console.error(e);
      alert('Gagal menghapus surat: ' + e.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d).replace(/\./g, '');
  };

  // Client-side full-text search for responsiveness
  const filteredSurat = suratList.filter(surat => {
    const searchTerm = search.toLowerCase();
    return (
      (surat.nomorSurat?.toLowerCase() || '').includes(searchTerm) ||
      (surat.perihal?.toLowerCase() || '').includes(searchTerm) ||
      (surat.tujuanSurat?.toLowerCase() || '').includes(searchTerm) ||
      (surat.pembuatSurat?.toLowerCase() || '').includes(searchTerm)
    );
  });

  const handleQuarter = (q) => {
    const year = new Date().getFullYear();
    let start, end;
    if (q === '1') { start = `${year}-01-01`; end = `${year}-03-31`; }
    else if (q === '2') { start = `${year}-04-01`; end = `${year}-06-30`; }
    else if (q === '3') { start = `${year}-07-01`; end = `${year}-09-30`; }
    else if (q === '4') { start = `${year}-10-01`; end = `${year}-12-31`; }
    
    setStartDate(start);
    setEndDate(end);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3, marginLeft: '0.5rem' }}>↕</span>;
    return sortOrder === 'desc' ? <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>↓</span> : <span style={{ marginLeft: '0.5rem', color: 'var(--primary)' }}>↑</span>;
  };

  const COLORS = ['#A8C7FA', '#699BF7', '#4E7BE0', '#345CAD', '#203A70'];

  const handleCariArsip = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleLengkapiBooking = () => {
    setStatusFilter('booking');
    if (tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getTimeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return "Baru saja";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    return `${Math.floor(hours / 24)} hari yang lalu`;
  };

  return (
    <div>
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-badge">🚀 Introducing Sistem Arsip Berbasis Digital</div>
        <h1 className="hero-title">Kelola Surat Lebih Cepat,<br/>Simpan Lebih Aman</h1>
        <p className="hero-description">
          Selamat datang di Sistem Arsip Terintegrasi Dinas Perindustrian, Tenaga Kerja, Koperasi dan Usaha Mikro Kecil Menengah Kabupaten Hulu Sungai Tengah. Platform ini dirancang untuk mengoptimalkan manajemen korespondensi organisasi melalui standardisasi Penomoran Surat Keluar secara otomatis dan penyimpanan dokumen berbasis digital.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!user ? (
            <button 
              onClick={() => {
                router.push('/login');
              }}
              className="btn-primary" 
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Buat Nomor Baru
            </button>
          ) : (
            <Link href="/surat-baru" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Buat Nomor Baru
            </Link>
          )}
          <button onClick={handleCariArsip} className="btn-outline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Cari Arsip
          </button>
          <Link href="/template-surat" className="btn-outline">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Unduh Template Surat
          </Link>
        </div>

        {/* Minimalist Scroll Hint */}
        <div 
          onClick={() => {
            if (tableRef.current) {
              window.scrollTo({ top: tableRef.current.offsetTop - 100, behavior: 'smooth' });
            }
          }}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            marginTop: '2rem', 
            paddingBottom: '0.5rem',
            cursor: 'pointer',
            opacity: 0.35,
            transition: 'opacity 0.3s ease'
          }}
          className="scroll-hint-container"
        >
          <span style={{ 
            fontSize: '0.62rem', 
            fontWeight: '600', 
            letterSpacing: '1.2px', 
            textTransform: 'uppercase',
            fontFamily: "'Inter', sans-serif",
            marginBottom: '0.5rem', 
            color: 'var(--text-muted)'
          }}>
            Menuju Riwayat Surat
          </span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="bounce-anim">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      </section>

      {/* DASHBOARD SUMMARY SECTION */}
      {user && (
        <div className="welcome-card card">
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Selamat Datang Kembali, <span className="username-reveal" style={{ color: 'var(--primary)' }}>{user.name}!</span></h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Pantau aktivitas surat menyurat harian Anda di sini.
            </p>
            
            {bookingAlert > 0 && (
              <div className="booking-alert-banner">
                <div className="booking-alert-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div className="booking-alert-content">
                  <h4>Peringatan Booking Nomor</h4>
                  <p>
                    Anda memiliki <strong>{bookingAlert}</strong> nomor surat yang belum dilengkapi berkas PDF-nya.
                  </p>
                </div>
                <button 
                  className="btn-complete-now"
                  onClick={() => {
                    setStatusFilter('booking');
                    setSearch(role === 'pembuat_surat' ? (user?.name || '') : '');
                    if (tableRef.current) {
                      window.scrollTo({ top: tableRef.current.offsetTop - 100, behavior: 'smooth' });
                    }
                  }}
                >
                  Lengkapi Sekarang
                </button>
              </div>
            )}
          </div>
          
          <div style={{ opacity: 0.8 }} className="hide-mobile">
            <svg width="100" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M2 15h10"></path><path d="M9 18l3-3-3-3"></path>
            </svg>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* KOLOM KIRI: 3 Stat Cards + Pie Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem' }}>
            <div className="dashboard-card" style={{ padding: '1rem' }}>
              <div className="stats-label" style={{ fontSize: '0.75rem' }}>Total (Tahun Ini)</div>
              <div className="stats-value" style={{ fontSize: '1.5rem' }}>{dashboardStats.tahunIni}</div>
            </div>
            <div className="dashboard-card" style={{ padding: '1rem' }}>
              <div className="stats-label" style={{ fontSize: '0.75rem' }}>Total (Bulan Ini)</div>
              <div className="stats-value" style={{ fontSize: '1.5rem' }}>{dashboardStats.bulanIni}</div>
            </div>
            <div className="dashboard-card" style={{ padding: '1rem' }}>
              <div className="stats-label" style={{ fontSize: '0.75rem' }}>Total (Hari Ini)</div>
              <div className="stats-value" style={{ fontSize: '1.5rem' }}>{dashboardStats.hariIni}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: 0 }}>Distribusi Jenis Surat</h4>
              <span className="badge" style={{ background: 'rgba(168, 199, 250, 0.1)', color: 'var(--primary)', fontWeight: 'bold' }}>Top 5</span>
            </div>
            
            <div style={{ flex: 1, width: '100%', minHeight: '320px', display: 'flex', flexDirection: 'column' }}>
              {pieData.length > 0 ? (
                <>
                  <div style={{ height: '220px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                           data={pieData} 
                           cx="50%" 
                           cy="50%" 
                           innerRadius={70} 
                           outerRadius={100} 
                           paddingAngle={4} 
                           dataKey="value"
                           stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                           formatter={(value, name) => [value, jenisMap[name] || `Lainnya (${name})`]}
                           contentStyle={{ backgroundColor: 'rgba(30, 31, 32, 0.95)', border: '1px solid #444746', borderRadius: '8px', color: '#fff', backdropFilter: 'blur(10px)' }}
                           itemStyle={{ color: '#E3E3E3' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '0.6rem', 
                    marginTop: 'auto', 
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    {pieData.map((entry, index) => {
                      const percentage = ((entry.value / (dashboardStats.tahunIni || 1)) * 100).toFixed(0);
                      return (
                        <div 
                          key={entry.name} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem', 
                            background: 'rgba(255,255,255,0.02)', 
                            borderRadius: '10px', 
                            border: '1px solid rgba(255,255,255,0.03)',
                            minWidth: 0
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              backgroundColor: COLORS[index % COLORS.length], 
                              borderRadius: '50%',
                              flexShrink: 0 
                            }}></div>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span style={{ fontSize: '0.75rem', color: '#fff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {jenisMap[entry.name] || entry.name}
                              </span>
                              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                {entry.name} • {percentage}%
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', marginLeft: '0.5rem' }}>
                            {entry.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Belum ada data klasifikasi</div>
              )}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Nomor Terakhir + Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="dashboard-card" style={{ background: 'rgba(168, 199, 250, 0.05)', borderColor: 'rgba(168, 199, 250, 0.2)', padding: '1.5rem 2rem' }}>
            <div className="stats-label" style={{ color: 'var(--primary)' }}>Nomor Terakhir Digunakan</div>
            <div className="stats-value" style={{ fontSize: 'clamp(1rem, 3.5vw, 1.8rem)', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
              {dashboardStats.lastNumber}
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4>Aktivitas Terakhir</h4>
            <div className="activity-feed">
              {activities.length > 0 ? activities.map(act => (
                <div key={act.$id} className="activity-item">
                  <div className="activity-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div className="activity-content">
                    <div className="activity-text" dangerouslySetInnerHTML={{ __html: `<strong>${act.username || 'Admin'}</strong> ${(act.aktivitas || '').split(' [R:')[0]}` }} />
                    <div className="activity-time">{getTimeAgo(act.$createdAt)}</div>
                  </div>
                </div>
              )) : (
                 <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Belum ada aktivitas tercatat.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={tableRef} id="tabel-riwayat" style={{ borderTop: '1px solid var(--border-color)', margin: '3rem 0', paddingTop: '3rem' }}>
         <h2 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Riwayat Surat Keluar</h2>
         <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Eksplorasi tabel riwayat dan cari spesifik dokumen.</p>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="filter-card">
        <div className="filter-mobile-header" onClick={() => setShowFilters(!showFilters)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            <span>Filter & Pencarian</span>
          </div>
          <svg 
            className={showFilters ? 'rotate' : ''} 
            width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div className={`filter-expandable ${showFilters ? 'show' : ''}`}>
          <div className="filter-grid">
            <div className="filter-group">
              <label>Pencarian</label>
              <input 
                ref={searchInputRef}
                type="text" 
                className="filter-input"
                placeholder="Cari perihal, nomor, atau tujuan..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                suppressHydrationWarning
              />
            </div>

            <div className="filter-group">
              <label>Status Berkas</label>
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Semua Status</option>
                <option value="complete">Lengkap</option>
                <option value="booking">Booking</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Kategori Jenis</label>
              <select className="filter-select" value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
                {jenisOptions.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Dari Tanggal</label>
              <input className="filter-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} suppressHydrationWarning />
            </div>

            <div className="filter-group">
              <label>Sampai Tanggal</label>
              <input className="filter-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} suppressHydrationWarning />
            </div>
          </div>

          <div className="quick-filter-bar">
            <span className="quick-filter-label">Triwulan:</span>
            {['1', '2', '3', '4'].map(q => {
              const year = new Date().getFullYear();
              let qStart, qEnd;
              if (q === '1') { qStart = `${year}-01-01`; qEnd = `${year}-03-31`; }
              else if (q === '2') { qStart = `${year}-04-01`; qEnd = `${year}-06-30`; }
              else if (q === '3') { qStart = `${year}-07-01`; qEnd = `${year}-09-30`; }
              else if (q === '4') { qStart = `${year}-10-01`; qEnd = `${year}-12-31`; }
              
              const isActive = startDate === qStart && endDate === qEnd;
              
              return (
                <button 
                  key={q} 
                  className={`badge-filter ${isActive ? 'active' : ''}`}
                  onClick={() => handleQuarter(q)}
                >
                  TW {q}
                </button>
              );
            })}
            
            <button 
              className="btn-reset-filter"
              onClick={() => { 
                setStartDate(''); 
                setEndDate(''); 
                setJenisFilter(''); 
                setSearch(''); 
                setStatusFilter('all');
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card table-container" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat data arsip...</div>
        ) : filteredSurat.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Tidak ditemukan data surat yang sesuai dengan kriteria.
          </div>
        ) : (
          <>
            <table className="table-responsive-stack" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th 
                    onClick={() => toggleSort('jenisSurat')}
                    style={{ width: '130px', padding: '1.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Status {renderSortIcon('jenisSurat')}
                  </th>
                  <th 
                    onClick={() => toggleSort('noUrut')} 
                    style={{ width: '220px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Nomor Surat {renderSortIcon('noUrut')}
                  </th>
                  <th 
                    onClick={() => toggleSort('tanggalSurat')} 
                    style={{ width: '150px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Tanggal {renderSortIcon('tanggalSurat')}
                  </th>
                  <th 
                    onClick={() => toggleSort('pembuatSurat')} 
                    style={{ width: '150px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Pembuat {renderSortIcon('pembuatSurat')}
                  </th>
                  <th style={{ width: '180px' }}>Tujuan</th>
                  <th>Perihal</th>
                  <th style={{ width: '280px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurat.map((surat, index) => {
                  const rowNumber = (page - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <tr key={surat.$id}>
                      <td data-label="No" style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {rowNumber}
                      </td>
                      <td data-label="Status" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-main)',
                            fontWeight: '700',
                            textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                            width: 'fit-content',
                            letterSpacing: '0.5px'
                          }}>
                            {surat.jenisSurat}
                          </span>
                          {surat.linkFile ? (
                            <span style={{ 
                              fontSize: '0.6rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '4px',
                              background: 'rgba(76, 175, 80, 0.1)',
                              color: '#c4eed0',
                              fontWeight: '700',
                              border: '1px solid rgba(76, 175, 80, 0.2)',
                              width: 'fit-content',
                              textTransform: 'uppercase'
                            }}>
                              Lengkap
                            </span>
                          ) : (
                            <span style={{ 
                              fontSize: '0.6rem', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '4px',
                              background: 'rgba(255, 193, 7, 0.1)',
                              color: '#ffc107',
                              fontWeight: '700',
                              border: '1px solid rgba(255, 193, 7, 0.2)',
                              width: 'fit-content',
                              textTransform: 'uppercase'
                            }}>
                              Booking
                            </span>
                          )}
                        </div>
                      </td>
                    <td data-label="Nomor Surat" style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {surat.nomorSurat}
                    </td>
                    <td data-label="Tanggal" style={{ fontSize: '0.85rem' }}>{surat.tanggalSurat ? formatDate(surat.tanggalSurat) : '-'}</td>
                    <td data-label="Pembuat">
                      <span className="badge" style={{ backgroundColor: 'rgba(168, 199, 250, 0.1)', color: 'var(--primary)', fontWeight: '600' }}>
                        {surat.pembuatSurat}
                      </span>
                    </td>
                    <td data-label="Tujuan" style={{ fontSize: '0.9rem' }}>{surat.tujuanSurat}</td>
                    <td data-label="Perihal" style={{ lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--text-muted)', paddingRight: '2rem' }}>
                      {surat.perihal || '-'}
                    </td>
                    <td data-label="Aksi" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
                        {surat.linkFile && (
                          <a 
                            href={surat.linkFile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn-icon"
                            title="Buka Berkas"
                            style={{ 
                              color: 'var(--primary)',
                              background: 'rgba(168, 199, 250, 0.1)',
                              border: '1px solid rgba(168, 199, 250, 0.2)',
                              width: '36px',
                              height: '36px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '10px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <IconEye />
                          </a>
                        )}

                        {user && (
                          <>
                            {(role !== 'pembuat_surat' || surat.pembuatSurat === user.name) && (
                              <Link 
                                href={`/edit-surat/${surat.$id}`}
                                title={surat.linkFile ? "Ubah Data" : "Lengkapi Berkas"}
                                style={{ 
                                  width: '36px',
                                  height: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '10px',
                                  transition: 'all 0.2s',
                                  textDecoration: 'none',
                                  ...(surat.linkFile ? {
                                    color: 'var(--text-main)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                  } : {
                                    background: '#ffc107',
                                    color: '#000',
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
                                  })
                                }}
                              >
                                {surat.linkFile ? <IconEdit /> : <IconPlus />}
                              </Link>
                            )}
                            {(role === 'superadmin' || role === 'admin') && (
                              <button
                                onClick={() => handleDelete(surat.$id, surat.nomorSurat)}
                                title="Hapus Permanen"
                                style={{ 
                                  width: '36px',
                                  height: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '10px',
                                  background: 'rgba(255, 68, 68, 0.05)',
                                  border: '1px solid rgba(255, 68, 68, 0.1)',
                                  color: '#ff4444',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <IconTrash />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            <div className="pagination-controls">
              <div className="pagination-info">
                <strong>{Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)}</strong>
                <span> – </span>
                <strong>{Math.min(page * ITEMS_PER_PAGE, total)}</strong>
                <span> dari </span>
                <strong>{total}</strong>
                <span> surat</span>
              </div>
              <div className="pagination-buttons">
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Sebelumnya
                </button>
                <div className="pagination-page-label">
                  {page} / {Math.ceil(total / ITEMS_PER_PAGE)}
                </div>
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0.45rem 1rem', fontSize: '0.82rem' }}
                  disabled={page * ITEMS_PER_PAGE >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
