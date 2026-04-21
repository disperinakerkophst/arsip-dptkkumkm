'use client';
import { useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTION_USERS_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function PenggunaPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    // Hanya Superadmin
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
      fetchUsers();
    }
  }, [user, role]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!COLLECTION_USERS_ID) return;
      
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_USERS_ID,
        [Query.orderDesc('$createdAt')]
      );
      setUsers(response.documents);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      // 1. Appwrite Auth Create (Tergantung konfigurasi Appwrite Server, metode klien ini mungkin dibatasi)
      // Disarankan backend logic untuk meminimalisasi konflik, namun ini implementasi klien Appwrite.
      const newAccount = await account.create(
        ID.unique(),
        formData.email,
        formData.password,
        formData.username
      );

      // 2. Simpan profil ke Collection Users
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_USERS_ID,
        ID.unique(),
        {
          userId: newAccount.$id,
          nama: formData.username,
          role: formData.role
        }
      );

      setSuccessMsg(`Berhasil mendaftarkan Admin: ${formData.username}`);
      setFormData({ username: '', email: '', password: '', role: 'admin' });
      fetchUsers(); // Refresh Tabel
    } catch (err) {
      console.error("Gagal mendaftar:", err);
      setError(err.message || 'Gagal mendaftarkan user baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user || role !== 'superadmin') {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi hak akses Superadmin...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Manajemen Akses
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>
          Registrasi administrator baru dan tentukan hak istimewa (role) sistem. Modul khusus Superadmin.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(400px, 2fr)', gap: '2rem' }}>
        
        {/* Form Tambah Admin */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginTop: 0 }}>Tambah Pengguna</h3>
          
          {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>{successMsg}</div>}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Panggilan Username</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})} 
                placeholder="cth: Budi Hartono" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Email Pengguna</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="admin@hst.go.id" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Sandi Rahasia</label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required 
                minLength={8}
                placeholder="Minimal 8 karakter"
              />
            </div>
            
            <div className="form-group">
              <label>Tingkatan Hak Akses</label>
              <select 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="admin">Administrator Biasa (Surat & Rekap)</option>
                <option value="superadmin">Superadmin (+Audit & Tambah User)</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: '100%', marginTop: '0.5rem' }}>
              {isSubmitting ? 'Memproses...' : 'Daftarkan Sistem'}
            </button>
          </form>
        </div>

        {/* Tabel Admin */}
        <div className="card">
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginTop: 0 }}>Daftar Autorisasi Aktif</h3>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Memuat daftar akses...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada data di Collection.</div>
          ) : (
            <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>Username</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>Status Hak Akses</th>
                    <th style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.$id} style={{ borderBottom: idx < users.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{u.nama}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className="badge" style={
                          u.role === 'superadmin' 
                            ? { backgroundColor: 'rgba(255,193,7,0.1)', color: '#ffc107', border: '1px solid #ffc107' }
                            : { backgroundColor: 'rgba(168,199,250,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }
                        }>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                         <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Otomatis aktif</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
