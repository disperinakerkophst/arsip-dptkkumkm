'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_AUDIT_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuditLogPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    // Hanya Superadmin yang boleh mengakses halaman ini
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
  }, [page, user, role]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (!COLLECTION_AUDIT_ID) return;
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_AUDIT_ID,
        [
          Query.orderDesc('tanggal'),
          Query.limit(ITEMS_PER_PAGE),
          Query.offset((page - 1) * ITEMS_PER_PAGE)
        ]
      );
      setLogs(response.documents);
      setTotal(response.total);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data audit log dari server.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user || role !== 'superadmin') {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi hak akses Superadmin...</div>;
  }

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(d);
  };

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
          Sistem Audit Log
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Pantau seluruh aktivitas administrator di sistem arsip digital secara real-time. Hak akses ini didedikasikan secara eksklusif bagi Superadmin.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error">{error}</div>
      ) : loading ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>Mengambil Data Pantauan...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada log aktivitas yang tercatat di sistem.</div>
      ) : (
        <>
          <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <tr>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '200px' }}>Waktu Akses</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '150px' }}>Identitas Admin</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Detail Aktivitas</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.$id} style={{ borderBottom: idx < logs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                    <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {formatDate(log.tanggal)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ backgroundColor: 'rgba(255,193,7,0.1)', color: '#ffc107' }}>
                        {log.username}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                      {log.aktivitas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Menampilkan {Math.min((page - 1) * ITEMS_PER_PAGE + 1, total)} - {Math.min(page * ITEMS_PER_PAGE, total)} dari total {total} Log Aktivitas
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn-primary" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              >
                Sebelumnya
              </button>
              <button 
                className="btn-primary" 
                disabled={page * ITEMS_PER_PAGE >= total}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
