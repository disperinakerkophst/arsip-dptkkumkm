'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_AUDIT_ID, COLLECTION_SURAT_ID } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuditLogPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(null); // stores log ID being restored
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState('all'); // 'all' or 'deletion'
  const ITEMS_PER_PAGE = 20;

  const [existingNumbers, setExistingNumbers] = useState([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (role !== 'superadmin') {
        router.push('/');
      }
    }
  }, [user, role, authLoading, router]);

  useEffect(() => {
    if (user && role === 'superadmin') {
      fetchLogs();
    }
  }, [page, user, role, filterType]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      if (!COLLECTION_AUDIT_ID) return;
      
      const queries = [
        Query.orderDesc('tanggal'),
        Query.limit(ITEMS_PER_PAGE),
        Query.offset((page - 1) * ITEMS_PER_PAGE)
      ];

      if (filterType === 'deletion') {
        queries.push(Query.contains('aktivitas', 'Menghapus'));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_AUDIT_ID,
        queries
      );
      
      setLogs(response.documents);
      setTotal(response.total);

      // Cek apakah data yang bisa dipulihkan sudah ada di database utama
      const payloads = response.documents
        .map(doc => parseActivity(doc.aktivitas).payload)
        .filter(p => p !== null);

      if (payloads.length > 0) {
        try {
          // Decode semua payload untuk mendapatkan daftar nomor surat
          const numbersToCheck = payloads.map(p => {
            try {
              const jsonStr = typeof window !== 'undefined' ? decodeURIComponent(escape(atob(p))) : Buffer.from(p, 'base64').toString('utf8');
              return JSON.parse(jsonStr).n;
            } catch(e) { return null; }
          }).filter(n => n !== null);

          if (numbersToCheck.length > 0) {
            const existing = await databases.listDocuments(
              DATABASE_ID,
              COLLECTION_SURAT_ID,
              [Query.equal('nomorSurat', numbersToCheck), Query.limit(100)]
            );
            setExistingNumbers(existing.documents.map(d => d.nomorSurat));
          }
        } catch (checkErr) {
          console.error("Gagal mengecek duplikasi:", checkErr);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data audit log. Pastikan koneksi stabil.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    const confirmed = window.confirm('Peringatan: Seluruh riwayat audit log akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan. Lanjutkan?');
    if (!confirmed) return;

    setIsClearing(true);
    try {
      let hasMore = true;
      let deletedCount = 0;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_AUDIT_ID,
          [Query.limit(100)]
        );

        if (response.documents.length === 0) {
          hasMore = false;
          break;
        }

        const deletePromises = response.documents.map(doc => 
          databases.deleteDocument(DATABASE_ID, COLLECTION_AUDIT_ID, doc.$id)
        );

        await Promise.all(deletePromises);
        deletedCount += response.documents.length;
        
        if (response.documents.length < 100) {
          hasMore = false;
        }
      }

      alert(`Sukses mengosongkan riwayat log (${deletedCount} entri dihapus).`);
      setPage(1);
      fetchLogs();
    } catch (err) {
      console.error(err);
      alert('Gagal membersihkan log: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRestore = async (logId, encodedData) => {
    setIsRestoring(logId);
    try {
      // Decode payload
      const jsonStr = typeof window !== 'undefined' ? decodeURIComponent(escape(atob(encodedData))) : Buffer.from(encodedData, 'base64').toString('utf8');
      const minData = JSON.parse(jsonStr);

      // Check duplikasi terakhir kali sebelum insert
      const check = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        [Query.equal('nomorSurat', minData.n), Query.limit(1)]
      );

      if (check.total > 0) {
        alert('Gagal: Data dengan Nomor Surat ini sudah ada di database.');
        fetchLogs(); // Refresh status
        return;
      }

      if (!window.confirm(`Pulihkan dokumen nomor ${minData.n} ke database?`)) return;

      // Map dari kunci pendek kembali ke struktur dokumen asli
      const cleanedData = {
        suratId: minData.s,
        jenisSurat: minData.j,
        nomorSurat: minData.n,
        tanggalSurat: minData.t,
        perihal: minData.p,
        tujuanSurat: minData.o,
        pembuatSurat: minData.m,
        linkFile: minData.l,
        idDrive: minData.d,
        noUrut: minData.u || '',
        klasifikasiSurat: minData.k || ''
      };

      // Create new document with original data
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        ID.unique(),
        cleanedData
      );

      alert('Berhasil memulihkan data surat ke riwayat utama.');
      fetchLogs(); // Refresh status tombol
    } catch (err) {
      console.error(err);
      alert('Gagal memulihkan data: ' + err.message);
    } finally {
      setIsRestoring(null);
    }
  };

  if (authLoading || !user || role !== 'superadmin') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', color: 'var(--text-muted)' }}>
        Memverifikasi hak akses Superadmin...
      </div>
    );
  }

  const parseActivity = (text) => {
    // Regex lebih tangguh mencari marker [R:...] di mana saja
    const markerMatch = text.match(/\[R:([^\]]+)\]/);
    if (markerMatch) {
      const payload = markerMatch[1];
      // Hapus marker dari tampilan untuk estetika
      const display = text.replace(` [R:${payload}]`, "");
      return { display, payload };
    }
    return { display: text, payload: null };
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(d).replace(/\./g, '');
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="main-content-inner" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem', background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Audit Log & Keamanan
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Transparansi aktivitas sistem dan riwayat pemulihan data.
          </p>
        </div>

        <button 
          onClick={handleClearLogs} 
          disabled={isClearing || logs.length === 0}
          className="btn-primary"
          style={{ 
            backgroundColor: 'rgba(242, 184, 181, 0.1)', 
            color: 'var(--error)', 
            border: '1px solid rgba(242, 184, 181, 0.3)',
            width: 'auto',
            padding: '0.6rem 1.25rem',
            fontSize: '0.85rem'
          }}
        >
          {isClearing ? 'Membersihkan...' : 'Kosongkan Seluruh Riwayat'}
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          onClick={() => { setFilterType('all'); setPage(1); }}
          style={{ 
            padding: '0.5rem 1.25rem', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
            backgroundColor: filterType === 'all' ? 'var(--primary)' : 'transparent',
            color: filterType === 'all' ? '#000' : 'var(--text-main)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Semua Aktivitas
        </button>
        <button 
          onClick={() => { setFilterType('deletion'); setPage(1); }}
          style={{ 
            padding: '0.5rem 1.25rem', 
            borderRadius: '20px', 
            border: '1px solid var(--border-color)',
            backgroundColor: filterType === 'deletion' ? 'var(--error)' : 'transparent',
            color: filterType === 'deletion' ? '#000' : 'var(--text-main)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          Riwayat Penghapusan
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        {loading ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ marginBottom: '1rem', display: 'inline-block', width: '24px', height: '24px', border: '3px solid rgba(168, 199, 250, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p>Menyelaraskan data audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '1rem', opacity: '0.3' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p>Tidak ditemukan rekaman log yang cocok.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table-compact table-responsive-stack">
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                  <th style={{ width: '20%' }}>Waktu</th>
                  <th style={{ width: '15%' }}>Pelaksana</th>
                  <th>Aktivitas</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Pemulihan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const { display, payload } = parseActivity(log.aktivitas);
                  const isDel = log.aktivitas.toLowerCase().includes('menghapus');
                  const rowNumber = (page - 1) * ITEMS_PER_PAGE + index + 1;
                  
                  return (
                    <tr key={log.$id} style={{ borderLeft: isDel ? '4px solid var(--error)' : 'none' }}>
                      <td data-label="No" style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                        {rowNumber}
                      </td>
                      <td data-label="Waktu" style={{ fontSize: '0.85rem' }}>{formatDate(log.tanggal)}</td>
                      <td data-label="Pelaksana">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isDel ? 'var(--error)' : 'var(--success)' }}></span>
                          <span style={{ fontWeight: '500' }}>{log.username}</span>
                        </div>
                      </td>
                      <td data-label="Aktivitas" style={{ fontSize: '0.9rem', color: isDel ? '#ffb4ab' : 'var(--text-main)' }}>
                        {display}
                      </td>
                      <td data-label="Pemulihan" style={{ textAlign: 'center' }}>
                        {payload ? (
                          (() => {
                            let currNum = '';
                              try {
                                if (mounted) {
                                  const jsonStr = typeof window !== 'undefined' ? decodeURIComponent(escape(atob(payload))) : Buffer.from(payload, 'base64').toString('utf8');
                                  currNum = JSON.parse(jsonStr).n;
                                }
                              } catch(e) {}
                            
                            const isAlreadyExists = existingNumbers.includes(currNum);

                            return isAlreadyExists ? (
                              <span style={{ 
                                padding: '0.4rem 0.8rem', 
                                fontSize: '0.75rem', 
                                borderRadius: '4px', 
                                backgroundColor: 'rgba(196, 238, 208, 0.1)', 
                                color: 'var(--success)',
                                fontWeight: '600',
                                border: '1px solid rgba(196, 238, 208, 0.3)'
                              }}>
                                Terpulihkan
                              </span>
                            ) : (
                              <button 
                                onClick={() => handleRestore(log.$id, payload)}
                                disabled={isRestoring === log.$id}
                                style={{ 
                                  padding: '0.4rem 0.8rem', 
                                  fontSize: '0.75rem', 
                                  borderRadius: '4px', 
                                  border: '1px solid var(--primary)', 
                                  background: 'rgba(168, 199, 250, 0.1)', 
                                  color: 'var(--primary)', 
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                {isRestoring === log.$id ? '...' : 'Pulihkan'}
                              </button>
                            );
                          })()
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#444' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Menampilkan <strong>{logs.length}</strong> entri dari total <strong>{total}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
            >
              Sebelumnya
            </button>
            <button 
              disabled={page * ITEMS_PER_PAGE >= total}
              onClick={() => setPage(page + 1)}
              style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: (page * ITEMS_PER_PAGE >= total) ? 'not-allowed' : 'pointer', opacity: (page * ITEMS_PER_PAGE >= total) ? 0.5 : 1 }}
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
