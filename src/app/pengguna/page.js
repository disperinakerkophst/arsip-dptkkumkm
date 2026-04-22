'use client';
import { useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTION_USERS_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { logActivity } from '@/lib/audit';

export default function PenggunaPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'admin',
    bidang: 'SKE'
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      if (editingId) {
        // Edit Mode - Simpan bidang di dalam string role: role[BIDANG]
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_USERS_ID,
          editingId,
          {
            nama: formData.username,
            role: `${formData.role}[${formData.bidang}]`
          }
        );
        await logActivity(user?.name, `Mengubah data pengguna: ${formData.username} menjadi role ${formData.role} (${formData.bidang})`);
        setSuccessMsg(`Berhasil memperbarui data Admin: ${formData.username}`);
        setEditingId(null);
        setFormData({ username: '', email: '', password: '', role: 'admin', bidang: 'SKE' });
        fetchUsers();
      } else {
        // Create Mode
        const newAccount = await account.create(
          ID.unique(),
          formData.email,
          formData.password,
          formData.username
        );

        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_USERS_ID,
          ID.unique(),
          {
            userId: newAccount.$id,
            nama: formData.username,
            role: `${formData.role}[${formData.bidang}]`
          }
        );
        await logActivity(user?.name, `Menambahkan pengguna baru: ${formData.username} dengan role ${formData.role} (${formData.bidang})`);

        setSuccessMsg(`Berhasil mendaftarkan Admin: ${formData.username}`);
        setFormData({ username: '', email: '', password: '', role: 'admin', bidang: 'SKE' });
        fetchUsers();
      }
    } catch (err) {
      console.error("Gagal menyimpan pengguna:", err);
      setError(err.message || 'Gagal menyimpan data user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (u) => {
    let baseRole = u.role || 'admin';
    let userBidang = 'SKE';

    if (baseRole.includes('[') && baseRole.includes(']')) {
      const parts = baseRole.split('[');
      baseRole = parts[0];
      userBidang = parts[1].replace(']', '');
    }

    setEditingId(u.$id);
    setFormData({
      username: u.nama,
      email: '', 
      password: '',
      role: baseRole,
      bidang: userBidang
    });
    setSuccessMsg('');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ username: '', email: '', password: '', role: 'admin', bidang: 'SKE' });
    setSuccessMsg('');
    setError('');
  };

  const handleDelete = async (u) => {
    if(!window.confirm(`Yakin ingin mencabut hak akses '${u.nama}' secara permanen? Dokumen profil akan dihapus.`)) return;
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_USERS_ID, u.$id);
      await logActivity(user?.name, `Menghapus akun pengguna: ${u.nama} (${u.role})`);
      setSuccessMsg(`Berhasil menghapus hak akses admin: ${u.nama}`);
      fetchUsers();
    } catch(err) {
      console.error(err);
      alert('Gagal menghapus pengguna.');
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
        
        {/* Form Tambah/Edit Admin */}
        <div className="card" style={{ alignSelf: 'start' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginTop: 0 }}>
            {editingId ? 'Edit Pengguna' : 'Tambah Pengguna'}
          </h3>
          
          {error && <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>{successMsg}</div>}

          <form onSubmit={handleSubmit} autoComplete="off">
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
            
            <div className="form-group" style={{ display: editingId ? 'none' : 'block' }}>
              <label>Email Pengguna</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                placeholder="admin@hst.go.id" 
                required={!editingId}
                disabled={editingId}
              />
            </div>
            
            <div className="form-group" style={{ display: editingId ? 'none' : 'block' }}>
              <label>Sandi Rahasia</label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
                required={!editingId}
                disabled={editingId}
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
                <option value="pembuat_surat">Pembuat Surat (Hanya Input & Booking)</option>
                <option value="admin">Administrator Biasa (Surat & Rekap)</option>
                <option value="superadmin">Superadmin (+Audit & Tambah User)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Penempatan Bidang</label>
              <select 
                value={formData.bidang} 
                onChange={e => setFormData({...formData, bidang: e.target.value})}
              >
                <option value="SKE">Sekretariat (SKE)</option>
                <option value="KEU">Keuangan (KEU)</option>
                <option value="IND">Perindustrian (IND)</option>
                <option value="NAKER">Tenaga Kerja (NAKER)</option>
                <option value="KUMKM">Koperasi & UMKM (KUMKM)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 1 }}>
                {isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Daftarkan Sistem')}
              </button>
              {editingId ? (
                <button type="button" onClick={handleCancelEdit} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  Batal
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setFormData({ username: '', email: '', password: '', role: 'admin', bidang: 'SKE' })} 
                  style={{ flex: '0 0 auto', padding: '0.75rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Bersihkan
                </button>
              )}
            </div>
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
                    {users.map((u, idx) => {
                      let displayRole = u.role || 'admin';
                      let displayBidang = 'SKE';
                      if (displayRole.includes('[')) {
                        const parts = displayRole.split('[');
                        displayRole = parts[0];
                        displayBidang = parts[1].replace(']', '');
                      }
                      
                      return (
                        <tr key={u.$id} style={{ borderBottom: idx < users.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{u.nama}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className="badge" style={
                              displayRole === 'superadmin' 
                                ? { backgroundColor: 'rgba(255,193,7,0.1)', color: '#ffc107', border: '1px solid #ffc107' }
                                : displayRole === 'pembuat_surat'
                                ? { backgroundColor: 'rgba(0,191,165,0.1)', color: '#00bfa5', border: '1px solid #00bfa5' }
                                : { backgroundColor: 'rgba(168,199,250,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)' }
                            }>
                              {displayRole.replace('_', ' ').toUpperCase()}
                            </span>
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              ({displayBidang})
                            </span>
                          </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleEdit(u)} 
                          style={{ background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', marginRight: '0.5rem' }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(u)} 
                          style={{ background: 'transparent', border: '1px solid var(--error)', color: 'var(--error)', padding: '0.3rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
