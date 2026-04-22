'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID, COLLECTION_JENIS_ID, COLLECTION_KLASIFIKASI_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/audit';

const PEMBUAT_SURAT = [
  { label: 'Sekretariat (SKE)', value: 'SKE' },
  { label: 'Keuangan (KEU)', value: 'KEU' },
  { label: 'Perindustrian (IND)', value: 'IND' },
  { label: 'Tenaga Kerja (NAKER)', value: 'NAKER' },
  { label: 'Koperasi & UMKM (KUMKM)', value: 'KUMKM' },
];

export default function EditSurat() {
  const { user, role, bidang: userBidang, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [jenisOptions, setJenisOptions] = useState([]);
  const [klasifikasiOptions, setKlasifikasiOptions] = useState([]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [resJenis, resKlas] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_JENIS_ID, [Query.limit(100)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_KLASIFIKASI_ID, [Query.limit(100)])
        ]);
        
        if (resJenis.documents.length > 0) {
          setJenisOptions(resJenis.documents.map(d => ({ label: `${d.label} (${d.code})`, value: d.code })));
        }
        if (resKlas.documents.length > 0) {
          setKlasifikasiOptions(resKlas.documents.map(d => ({ label: `${d.label} (${d.code})`, value: d.code })));
        }
      } catch (err) {
        console.log("Using default configuration");
      }
    };
    fetchConfig();
  }, []);

  const [formData, setFormData] = useState({
    jenisSurat: 'SK',
    tanggalSurat: '',
    tujuanSurat: '',
    perihal: '',
    pembuatSurat: '',
    kodeBidang: 'SKE',
    klasifikasiSurat: '530',
    noUrut: '',
  });
  const [existingLinkFile, setExistingLinkFile] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const padZero = (num) => num.toString().padStart(3, '0');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!id) return;
    
    const fetchSuratData = async () => {
      try {
        const surat = await databases.getDocument(DATABASE_ID, COLLECTION_SURAT_ID, id);
        
        // Proteksi Role Pembuat Surat: Hanya boleh edit punya sendiri
        if (role === 'pembuat_surat' && surat.pembuatSurat !== user.name) {
          alert('Anda tidak memiliki izin untuk mengedit arsip milik orang lain.');
          router.push('/');
          return;
        }

        // Ekstrak kode bidang dari nomor surat jika ada (contoh: 530/001/SK/SKE/...)
        const parts = surat.nomorSurat ? surat.nomorSurat.split('/') : [];
        const extractedBidang = parts.length >= 4 ? parts[3] : (surat.pembuatSurat.length <= 5 ? surat.pembuatSurat : 'SKE');

        setFormData({
          jenisSurat: surat.jenisSurat || 'SK',
          tanggalSurat: surat.tanggalSurat ? surat.tanggalSurat.split('T')[0] : '',
          tujuanSurat: surat.tujuanSurat || '',
          perihal: surat.perihal || '',
          pembuatSurat: surat.pembuatSurat || '', // Berisi Nama
          kodeBidang: extractedBidang, // Berisi Kode (SKE, dll)
          klasifikasiSurat: surat.klasifikasiSurat || '530',
          noUrut: surat.noUrut || '',
        });
        setExistingLinkFile(surat.linkFile);
        setLoadingData(false);
      } catch (err) {
        console.error("Gagal mengambil data:", err);
        setError("Gagal memuat data arsip surat ini.");
        setLoadingData(false);
      }
    };
    
    fetchSuratData();
  }, [id]);

  // Validate duplicate noUrut (excluding current doc)
  useEffect(() => {
    // Only check if we are not loading data
    if (loadingData) return;

    const checkDuplicate = async () => {
      if (!formData.noUrut || !formData.tanggalSurat || !id) {
        setDuplicateWarning('');
        return;
      }
      
      try {
        const inputYear = new Date(formData.tanggalSurat).getFullYear().toString();
        
        const result = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SURAT_ID,
          [
            Query.equal('noUrut', formData.noUrut),
            Query.notEqual('$id', id)
          ]
        );

        const isDuplicate = result.documents.some(doc => {
          const docYear = new Date(doc.tanggalSurat).getFullYear().toString();
          return docYear === inputYear;
        });

        if (isDuplicate) {
          setDuplicateWarning(`Nomor urut ${formData.noUrut} sudah digunakan di tahun ${inputYear}!`);
        } else {
          setDuplicateWarning('');
        }
      } catch (err) {
        console.error("Error checking duplicate:", err);
      }
    };

    const timeoutId = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.noUrut, formData.tanggalSurat, id, loadingData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const inputYear = formData.tanggalSurat ? new Date(formData.tanggalSurat).getFullYear().toString() : '....';
  const displayNoUrut = formData.noUrut || '...';
  const fullNomorSurat = `${formData.klasifikasiSurat}/${displayNoUrut}/${formData.jenisSurat}/${formData.kodeBidang}/DPTKKUMKM/${inputYear}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (duplicateWarning) {
      setError("Nomor urut sudah dipakai. Silakan gunakan nomor lain.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.noUrut) throw new Error("Nomor urut wajib diisi");

      // Final check for duplicates before save
      const inputYearFinal = new Date(formData.tanggalSurat).getFullYear().toString();
      const checkFinal = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        [Query.equal('noUrut', formData.noUrut), Query.notEqual('$id', id)]
      );
      const isDuplicateFinal = checkFinal.documents.some(doc => {
        const docYear = new Date(doc.tanggalSurat).getFullYear().toString();
        return docYear === inputYearFinal;
      });
      if (isDuplicateFinal) throw new Error("Nomor urut sudah terpakai oleh user lain. Gunakan nomor lain.");

      let linkFile = existingLinkFile;

      // Update file in Google Drive if a new one is selected
      if (file) {
        const uploadData = new FormData();
        uploadData.append('file', file);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) {
          const errorMsg = uploadResult.details 
            ? `${uploadResult.error}: ${JSON.stringify(uploadResult.details)}` 
            : (uploadResult.error || "Gagal mengupload file ke Google Drive");
          throw new Error(errorMsg);
        }
        linkFile = uploadResult.link;
      }

      // Update to Appwrite
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        id,
        {
          jenisSurat: formData.jenisSurat,
          tanggalSurat: new Date(formData.tanggalSurat).toISOString(),
          nomorSurat: fullNomorSurat,
          tujuanSurat: formData.tujuanSurat,
          perihal: formData.perihal || null,
          pembuatSurat: formData.pembuatSurat,
          noUrut: formData.noUrut,
          klasifikasiSurat: formData.klasifikasiSurat,
          linkFile: linkFile
        }
      );

      await logActivity(user?.name, `Mengubah data/memperbarui file surat (${fullNomorSurat})`);

      setSuccess(`Surat berhasil diupdate dengan Nomor: ${fullNomorSurat}`);
      setTimeout(() => router.push('/'), 2000);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi Admin...</div>;
  }

  if (loadingData) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat data...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Kembali
        </button>
        <h2 style={{ margin: 0 }}>Edit Detail Surat</h2>
      </div>
      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.9rem', color: '#888', display: 'block', marginBottom: '0.5rem' }}>Pratinjau Nomor Surat:</span>
          <strong style={{ fontSize: '1.4rem', letterSpacing: '1px', color: '#fff' }}>{fullNomorSurat}</strong>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Tanggal Surat *</label>
              <input 
                type="date" 
                name="tanggalSurat" 
                value={formData.tanggalSurat} 
                onChange={handleChange} 
                required
              />
            </div>
            <div className="form-group">
              <label>Nomor Urut *</label>
              <input 
                type="text" 
                name="noUrut" 
                value={formData.noUrut} 
                onChange={handleChange} 
                placeholder="001"
                required
                style={duplicateWarning ? { borderColor: '#ff4444', backgroundColor: 'rgba(255,68,68,0.1)' } : {}}
              />
              {duplicateWarning && (
                <div style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 'bold' }}>
                  ⚠️ {duplicateWarning}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Jenis Surat</label>
              <select name="jenisSurat" value={formData.jenisSurat} onChange={handleChange}>
                {jenisOptions.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Klasifikasi Surat</label>
              <select name="klasifikasiSurat" value={formData.klasifikasiSurat} onChange={handleChange}>
                {klasifikasiOptions.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Identitas Pemilik Nomor</label>
              <input 
                type="text" 
                name="pembuatSurat" 
                value={formData.pembuatSurat} 
                disabled
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: 'var(--primary)', fontWeight: 'bold' }}
              />
              <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Identitas ini digunakan untuk sistem notifikasi booking.</small>
            </div>

            <div className="form-group">
              <label>Kode Bidang (Muncul di Nomor Surat)</label>
              <select name="kodeBidang" value={formData.kodeBidang} onChange={handleChange}>
                <option value="SKE">Sekretariat (SKE)</option>
                <option value="KEU">Keuangan (KEU)</option>
                <option value="IND">Perindustrian (IND)</option>
                <option value="NAKER">Tenaga Kerja (NAKER)</option>
                <option value="KUMKM">Koperasi & UMKM (KUMKM)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tujuan Surat *</label>
              <input 
                type="text" 
                name="tujuanSurat" 
                value={formData.tujuanSurat} 
                onChange={handleChange} 
                placeholder="Masukkan tujuan surat"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Perihal</label>
            <textarea 
              name="perihal" 
              value={formData.perihal} 
              onChange={handleChange} 
              placeholder="Perihal surat"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Update File Surat (Opsional)</label>
            {existingLinkFile && (
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                File saat ini: <a href={existingLinkFile} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Lihat Berkas</a>
              </div>
            )}
            <input 
              type="file" 
              accept=".pdf,application/pdf"
              onChange={handleFileChange} 
              style={{ display: 'block', color: 'var(--text-main)', marginTop: '0.5rem' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>* Kosongkan jika tidak ingin mengubah file surat</small>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
}
