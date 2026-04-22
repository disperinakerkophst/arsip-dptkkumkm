'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_JENIS_ID, COLLECTION_KLASIFIKASI_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/audit';

export default function Pengaturan() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jenisList, setJenisList] = useState([]);
  const [klasifikasiList, setKlasifikasiList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for new item forms
  const [newJenis, setNewJenis] = useState({ label: '', code: '' });
  const [newKlasifikasi, setNewKlasifikasi] = useState({ label: '', code: '' });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || role !== 'superadmin')) {
      router.push('/');
    }
  }, [user, role, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resJenis, resKlas] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_JENIS_ID, [Query.limit(100)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_KLASIFIKASI_ID, [Query.limit(100)])
      ]);
      setJenisList(resJenis.documents);
      setKlasifikasiList(resKlas.documents);
    } catch (err) {
      console.error("Gagal memuat data pengaturan:", err);
      // Don't show error if collection doesn't exist yet, just keep empty arrays
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && role === 'superadmin') {
      fetchData();
    }
  }, [user, role]);

  const handleAddJenis = async (e) => {
    e.preventDefault();
    if (!newJenis.label || !newJenis.code) return;
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_JENIS_ID, ID.unique(), {
        label: newJenis.label,
        code: newJenis.code
      });
      await logActivity(user.name, `Menambahkan jenis surat baru: ${newJenis.label} (${newJenis.code})`);
      setNewJenis({ label: '', code: '' });
      setSuccess("Jenis surat berhasil ditambahkan");
      fetchData();
    } catch (err) {
      setError("Gagal menambah: " + err.message);
    }
  };

  const handleAddKlasifikasi = async (e) => {
    e.preventDefault();
    if (!newKlasifikasi.label || !newKlasifikasi.code) return;
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_KLASIFIKASI_ID, ID.unique(), {
        label: newKlasifikasi.label,
        code: newKlasifikasi.code
      });
      await logActivity(user.name, `Menambahkan klasifikasi baru: ${newKlasifikasi.label} (${newKlasifikasi.code})`);
      setNewKlasifikasi({ label: '', code: '' });
      setSuccess("Klasifikasi berhasil ditambahkan");
      fetchData();
    } catch (err) {
      setError("Gagal menambah: " + err.message);
    }
  };

  const handleDelete = async (collectionId, docId, label) => {
    if (!window.confirm(`Hapus ${label}?`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID, collectionId, docId);
      await logActivity(user.name, `Menghapus item pengaturan: ${label}`);
      setSuccess(`${label} berhasil dihapus`);
      fetchData();
    } catch (err) {
      setError("Gagal menghapus: " + err.message);
    }
  };

  if (authLoading || !user || role !== 'superadmin') {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Pengaturan Koleksi</h2>
        <p style={{ color: 'var(--text-muted)' }}>Kelola data master Jenis Surat dan Klasifikasi yang digunakan dalam penomoran.</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* JENIS SURAT */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Daftar Jenis Surat</h3>
          
          <form onSubmit={handleAddJenis} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Label (e.g. Surat Keputusan)" 
              value={newJenis.label} 
              onChange={e => setNewJenis({...newJenis, label: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Kode" 
              value={newJenis.code} 
              onChange={e => setNewJenis({...newJenis, code: e.target.value})}
              required
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem' }}>Tambah</button>
          </form>

          <table style={{ background: 'transparent' }}>
            <thead>
              <tr>
                <th>Label</th>
                <th style={{ width: '80px' }}>Kode</th>
                <th style={{ width: '50px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {jenisList.length > 0 ? jenisList.map(j => (
                <tr key={j.$id}>
                  <td>{j.label}</td>
                  <td><span className="badge">{j.code}</span></td>
                  <td>
                    <button onClick={() => handleDelete(COLLECTION_JENIS_ID, j.$id, j.label)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                      Hapus
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* KLASIFIKASI SURAT */}
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Daftar Klasifikasi Surat</h3>
          
          <form onSubmit={handleAddKlasifikasi} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Label (e.g. Kepegawaian)" 
              value={newKlasifikasi.label} 
              onChange={e => setNewKlasifikasi({...newKlasifikasi, label: e.target.value})}
              required
            />
            <input 
              type="text" 
              placeholder="Kode" 
              value={newKlasifikasi.code} 
              onChange={e => setNewKlasifikasi({...newKlasifikasi, code: e.target.value})}
              required
            />
            <button type="submit" className="btn-primary" style={{ padding: '0.5rem' }}>Tambah</button>
          </form>

          <table style={{ background: 'transparent' }}>
            <thead>
              <tr>
                <th>Label</th>
                <th style={{ width: '80px' }}>Kode</th>
                <th style={{ width: '50px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {klasifikasiList.length > 0 ? klasifikasiList.map(k => (
                <tr key={k.$id}>
                  <td>{k.label}</td>
                  <td><span className="badge" style={{ background: 'rgba(255, 193, 7, 0.1)', color: '#ffc107' }}>{k.code}</span></td>
                  <td>
                    <button onClick={() => handleDelete(COLLECTION_KLASIFIKASI_ID, k.$id, k.label)} style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer' }}>
                      Hapus
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
