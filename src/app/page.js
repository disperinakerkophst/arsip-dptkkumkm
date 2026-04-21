'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import Link from 'next/link';

const JENIS_SURAT = [
  { label: 'Semua Jenis', value: '' },
  { label: 'Surat Keputusan (SK)', value: 'SK' },
  { label: 'Surat Tugas (ST)', value: 'ST' },
  { label: 'Surat Undangan (UND)', value: 'UND' },
  { label: 'Surat Edaran (SE)', value: 'SE' },
  { label: 'Surat Keterangan (KET)', value: 'KET' },
  { label: 'Nota Dinas (ND)', value: 'ND' },
  { label: 'Surat Perjanjian/Kontrak (SPK)', value: 'SPK' },
  { label: 'Surat Permohonan (PMH)', value: 'PMH' },
  { label: 'Surat Pengantar (PNT)', value: 'PNT' },
  { label: 'Rekomendasi (REK)', value: 'REK' },
  { label: 'Berita Acara (BA)', value: 'BA' },
  { label: 'Nota Kesepahaman (MOU)', value: 'MOU' },
  { label: 'Pengumuman (PENG)', value: 'PENG' },
  { label: 'Surat Balasan (BLS)', value: 'BLS' },
  { label: 'Surat Biasa (B)', value: 'B' },
];

const ITEMS_PER_PAGE = 20;

export default function Home() {
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

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters or sort change
    fetchSurat(1);
  }, [jenisFilter, startDate, endDate, sortBy, sortOrder]);

  useEffect(() => {
    fetchSurat(page);
  }, [page]);

  const fetchSurat = async (currentPage) => {
    try {
      setLoading(true);
      let queries = [
        Query.limit(ITEMS_PER_PAGE),
        Query.offset((currentPage - 1) * ITEMS_PER_PAGE)
      ];
      
      // Handle Sorting
      if (sortOrder === 'desc') {
        queries.push(Query.orderDesc(sortBy));
      } else {
        queries.push(Query.orderAsc(sortBy));
      }
      
      if (jenisFilter) {
        queries.push(Query.equal('jenisSurat', jenisFilter));
      }
      
      if (startDate && endDate) {
        queries.push(Query.between('tanggalSurat', new Date(startDate).toISOString(), new Date(endDate).toISOString()));
      } else if (startDate) {
        queries.push(Query.greaterThanEqual('tanggalSurat', new Date(startDate).toISOString()));
      } else if (endDate) {
        queries.push(Query.lessThanEqual('tanggalSurat', new Date(endDate).toISOString()));
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

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d).replace(/\//g, '-');
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2>Riwayat Surat Keluar</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Kelola dan cari arsip surat keluar dinas secara efisien.
          </p>
        </div>
        <Link href="/surat-baru" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto', padding: '0.75rem 1.25rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Tambah Surat Baru
        </Link>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Pencarian Kata Kunci</label>
            <input 
              type="text" 
              placeholder="Cari perihal, nomor, atau tujuan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Kategori Jenis Surat</label>
            <select value={jenisFilter} onChange={(e) => setJenisFilter(e.target.value)}>
              {JENIS_SURAT.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dari Tanggal</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Sampai Tanggal</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '0.5rem' }}>Pilih Kuartal:</span>
          {['1', '2', '3', '4'].map(q => (
            <button 
              key={q} 
              className="badge" 
              onClick={() => handleQuarter(q)}
              style={{ cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)' }}
            >
              Kuartal {q}
            </button>
          ))}
          <button 
            className="badge" 
            onClick={() => { setStartDate(''); setEndDate(''); setJenisFilter(''); setSearch(''); }}
            style={{ cursor: 'pointer', border: '1px solid #ff4444', background: 'transparent', color: '#ff4444', marginLeft: 'auto' }}
          >
            Reset Filter
          </button>
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
            <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '100px', padding: '1.25rem' }}>
                    No/Jenis
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
                  <th style={{ width: '120px' }}>Pembuat</th>
                  <th style={{ width: '180px' }}>Tujuan</th>
                  <th>Perihal</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurat.map((surat) => (
                  <tr key={surat.$id}>
                    <td style={{ padding: '1.25rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ color: 'var(--text-main)' }}>#{surat.suratId}</strong>
                        <span className="badge" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>{surat.jenisSurat}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--primary)', fontSize: '0.9rem' }}>
                      {surat.nomorSurat}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{surat.tanggalSurat ? formatDate(surat.tanggalSurat) : '-'}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: 'rgba(168, 199, 250, 0.1)', color: 'var(--primary)', fontWeight: '600' }}>
                        {surat.pembuatSurat}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{surat.tujuanSurat}</td>
                    <td style={{ lineHeight: '1.5', fontSize: '0.9rem', color: 'var(--text-muted)', paddingRight: '2rem' }}>
                      {surat.perihal || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {surat.linkFile ? (
                          <>
                            <a 
                              href={surat.linkFile} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-primary"
                              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap', width: 'auto', display: 'inline-block' }}
                            >
                              Berkas
                            </a>
                            <Link 
                              href={`/edit-surat/${surat.$id}`}
                              className="badge"
                              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap', width: 'auto', display: 'inline-block', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'transparent', textDecoration: 'none' }}
                            >
                              Edit
                            </Link>
                          </>
                        ) : (
                          <>
                            <span style={{ 
                              padding: '0.4rem 0.8rem', 
                              fontSize: '0.75rem', 
                              whiteSpace: 'nowrap', 
                              border: '1px solid #ffc107', 
                              color: '#ffc107', 
                              borderRadius: '4px',
                              display: 'inline-block',
                              backgroundColor: 'rgba(255, 193, 7, 0.1)',
                              fontWeight: '600'
                            }}>
                              Booking
                            </span>
                            <Link 
                              href={`/edit-surat/${surat.$id}`}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', whiteSpace: 'nowrap', width: 'auto', display: 'inline-block', backgroundColor: '#ffc107', color: '#000', fontWeight: 'bold' }}
                            >
                              Lengkapi
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION CONTROLS */}
            <div style={{ 
              padding: '1.5rem', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.02)'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Menampilkan <strong>{Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)} - {Math.min(page * ITEMS_PER_PAGE, total)}</strong> dari <strong>{total}</strong> surat
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Sebelumnya
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                  Halaman {page}
                </div>
                <button 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  disabled={page * ITEMS_PER_PAGE >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
