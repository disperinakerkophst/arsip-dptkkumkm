'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function TemplatesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null); // stores ID being deleted
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.files);
      } else {
        throw new Error(data.error || 'Gagal memuat template');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/templates', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Berhasil mengunggah template: ${file.name}`);
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Gagal mengunggah template');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus template "${name}" secara permanen?`)) return;

    try {
      setIsDeleting(id);
      setError('');
      setSuccess('');

      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Berhasil menghapus template: ${name}`);
        fetchTemplates();
      } else {
        throw new Error(data.error || 'Gagal menghapus template');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(1) + ' MB';
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d).replace(/\./g, '');
  };

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi akses...</div>;
  }

  return (
    <div className="main-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '0.5rem', background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Pusat Template Surat
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Unduh draf dan template dokumen resmi untuk mempermudah administrasi dinas.
        </p>
      </div>

      {error ? (
        <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
          <strong>Error:</strong> {error}
          <button onClick={fetchTemplates} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Coba Lagi</button>
        </div>
      ) : null}

      {success ? (
        <div className="alert alert-success" style={{ marginBottom: '2rem' }}>
          {success}
        </div>
      ) : null}

      {/* ADMIN UPLOAD SECTION */}
      {user && (
        <div className="card" style={{ marginBottom: '2.5rem', padding: '1.5rem', border: '1px dashed var(--primary)', background: 'rgba(168, 199, 250, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Unggah Template Baru</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Format yang didukung: .docx, .pdf</p>
            </div>
            <div style={{ position: 'relative' }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }} disabled={uploading}>
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Mengunggah...
                  </span>
                ) : 'Pilih & Unggah File'}
              </button>
              <input 
                type="file" 
                accept=".docx,.pdf" 
                onChange={handleUpload}
                disabled={uploading}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ height: '200px', opacity: 0.3 }}></div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ marginBottom: '1.5rem', opacity: 0.2 }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <h3>Belum Ada Template</h3>
          <p style={{ color: 'var(--text-muted)' }}>Silakan unggah file template di atas.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {templates.map(file => (
            <div key={file.id} className="dashboard-card" style={{ position: 'relative', transition: 'transform 0.2s', border: '1px solid var(--border-color)' }}>
              {role === 'superadmin' && (
                <button 
                  onClick={() => handleDelete(file.id, file.name)}
                  disabled={isDeleting === file.id}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  title="Hapus Template"
                >
                  {isDeleting === file.id ? '...' : '×'}
                </button>
              )}
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', paddingRight: role === 'superadmin' ? '2.5rem' : '0' }}>
                <div style={{ background: 'rgba(168, 199, 250, 0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                    {file.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(file.modifiedTime)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  {formatSize(file.size)}
                </div>
                <a 
                  href={file.webContentLink || file.webViewLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary" 
                  style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Unduh
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(255,193,7,0.05)', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.1)' }}>
        <h4 style={{ color: '#ffc107', marginBottom: '1rem' }}>💡 Tips Penggunaan</h4>
        <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '1.2rem', lineHeight: '1.8' }}>
          <li>Template ini dikelola langsung melalui <strong>Google Drive</strong> instansi, hubungi admin jika ada kesalahan.</li>
          <li>Cek kembali nama, jabatan, dan NIP pejabat penandatangan, pastikan sudah sesuai.</li>
          <li>Template menggunakan format kertas A4 (21.5 cm x 31 cm), sesuaikan agar kop dan penandatangan tidak terpotong.</li>
          <li>Jika file baru belum muncul, klik tombol segarkan atau tunggu beberapa saat.</li>
        </ul>
      </div>
    </div>
  );
}
