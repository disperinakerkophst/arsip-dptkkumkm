'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/audit';

const JENIS_SURAT = [
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

const KLASIFIKASI_SURAT = [
  { label: 'Perindustrian (530)', value: '530' },
  { label: 'Tenaga Kerja (560)', value: '560' },
  { label: 'Koperasi dan UMKM (518)', value: '518' },
  { label: 'Kepegawaian (800)', value: '800' },
  { label: 'Perjalanan Dinas (090)', value: '090' },
  { label: 'Undangan (005)', value: '005' },
  { label: 'Keuangan (900)', value: '900' },
  { label: 'Perencanaan (050)', value: '050' },
  { label: 'Organisasi (060)', value: '060' },
];

const PEMBUAT_SURAT = [
  { label: 'Sekretariat (SKE)', value: 'SKE' },
  { label: 'Keuangan (KEU)', value: 'KEU' },
  { label: 'Perindustrian (IND)', value: 'IND' },
  { label: 'Tenaga Kerja (NAKER)', value: 'NAKER' },
  { label: 'Koperasi & UMKM (KUMKM)', value: 'KUMKM' },
];

export default function SuratBaru() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    jenisSurat: 'SK',
    tanggalSurat: new Date().toISOString().split('T')[0],
    tujuanSurat: '',
    perihal: '',
    pembuatSurat: 'SKE',
    klasifikasiSurat: '530',
    noUrut: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Auth Protection Redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const padZero = (num) => num.toString().padStart(3, '0');

  // Fetch next number automatically
  useEffect(() => {
    const fetchNextNumber = async () => {
      if (!formData.tanggalSurat) return;
      
      try {
        const inputYear = new Date(formData.tanggalSurat).getFullYear().toString();
        const result = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SURAT_ID,
          [Query.orderDesc('$createdAt'), Query.limit(20)] // Check last few to be safe about year
        );

        let nextNoUrut = '001';
        
        // Find latest for the same year
        const yearDocs = result.documents.filter(doc => {
          const docYear = new Date(doc.tanggalSurat).getFullYear().toString();
          return docYear === inputYear;
        });

        if (yearDocs.length > 0) {
          // Sort by noUrut numerically to find the true max
          const maxNoUrut = Math.max(...yearDocs.map(doc => parseInt(doc.noUrut || 0, 10)));
          nextNoUrut = padZero(maxNoUrut + 1);
        }

        setFormData(prev => ({ ...prev, noUrut: nextNoUrut }));
      } catch (err) {
        console.error("Error fetching next number:", err);
      }
    };

    fetchNextNumber();
  }, [formData.tanggalSurat]);

  // Validate duplicate noUrut
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!formData.noUrut || !formData.tanggalSurat) {
        setDuplicateWarning('');
        return;
      }
      
      try {
        const inputYear = new Date(formData.tanggalSurat).getFullYear().toString();
        
        const result = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SURAT_ID,
          [Query.equal('noUrut', formData.noUrut)]
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

    const timeoutId = setTimeout(checkDuplicate, 500); // Debounce check
    return () => clearTimeout(timeoutId);
  }, [formData.noUrut, formData.tanggalSurat]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const inputYear = formData.tanggalSurat ? new Date(formData.tanggalSurat).getFullYear().toString() : '....';
  const displayNoUrut = formData.noUrut || '...';
  const fullNomorSurat = `${formData.klasifikasiSurat}/${displayNoUrut}/${formData.jenisSurat}/${formData.pembuatSurat}/DPTKKUMKM/${inputYear}`;

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi Admin...</div>;
  }

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
        [Query.equal('noUrut', formData.noUrut)]
      );
      const isDuplicateFinal = checkFinal.documents.some(doc => {
        const docYear = new Date(doc.tanggalSurat).getFullYear().toString();
        return docYear === inputYearFinal;
      });
      if (isDuplicateFinal) throw new Error("Nomor urut baru saja terpakai oleh user lain. Gunakan nomor lain.");

      // 1. Fetch latest suratId for total count
      const resultCount = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        [Query.orderDesc('suratId'), Query.limit(1)]
      );
      let nextSuratId = 1;
      if (resultCount.documents.length > 0) {
        nextSuratId = (resultCount.documents[0].suratId || 0) + 1;
      }

      // 2. Upload file to Google Drive if not booking
      let linkFile = null;
      if (!isBooking && file) {
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
      } else if (!isBooking && !file) {
        throw new Error("File surat wajib diupload, atau centang mode 'Hanya Booking Nomor'.");
      }

      // 3. Save to Appwrite
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_SURAT_ID,
        ID.unique(),
        {
          suratId: nextSuratId,
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

      await logActivity(user?.name, `Membuat arsip surat baru (${fullNomorSurat}) mode: ${isBooking ? 'Booking' : 'Lengkap'}`);

      setSuccess(`Surat berhasil disimpan dengan Nomor: ${fullNomorSurat}`);
      setTimeout(() => router.push('/'), 2000);

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Penginputan Surat Baru</h2>
      
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
          {/* BOOKING MODE TOGGLE */}
          <div style={{ padding: '1rem 1.25rem', background: isBooking ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '1.5rem', border: isBooking ? '1px solid rgba(255, 193, 7, 0.4)' : '1px solid rgba(255,255,255,0.05)', transition: 'all 0.3s ease' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: isBooking ? '#ffc107' : 'var(--text-main)', cursor: 'pointer', fontSize: '1.05rem' }}>
              <input 
                type="checkbox" 
                checked={isBooking}
                onChange={(e) => setIsBooking(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#ffc107' }}
              />
              <strong style={{ letterSpacing: '0.5px' }}>Hanya Booking Nomor Surat</strong>
            </label>
            <p style={{ margin: '0.5rem 0 0 2rem', fontSize: '0.85rem', color: isBooking ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)' }}>
              Abaikan pengunggahan file dan isi bidang opsional secara menyusul nanti. Berguna untuk mengamankan nomor urut dengan cepat selagi draf surat diproses.
            </p>
          </div>

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
                {JENIS_SURAT.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Klasifikasi Surat</label>
              <select name="klasifikasiSurat" value={formData.klasifikasiSurat} onChange={handleChange}>
                {KLASIFIKASI_SURAT.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group">
              <label>Pembuat Surat</label>
              <select name="pembuatSurat" value={formData.pembuatSurat} onChange={handleChange}>
                {PEMBUAT_SURAT.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Tujuan Surat {!isBooking && '*'}</label>
              <input 
                type="text" 
                name="tujuanSurat" 
                value={formData.tujuanSurat} 
                onChange={handleChange} 
                placeholder="Masukkan tujuan surat"
                required={!isBooking}
                style={isBooking ? { opacity: 0.7 } : {}}
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
            <label>Upload File Surat {!isBooking && '*'}</label>
            {isBooking ? (
              <div style={{ padding: '1rem', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <em>Mode Booking aktif. Anda bisa mengunggah file PDF menyusul di Riwayat Surat.</em>
              </div>
            ) : (
              <input 
                type="file" 
                accept=".pdf,application/pdf"
                onChange={handleFileChange} 
                style={{ display: 'block', color: 'var(--text-main)', marginTop: '0.5rem' }}
                required={!isBooking}
              />
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem', backgroundColor: isBooking ? '#ffc107' : 'var(--primary)', color: '#000' }}>
            {loading ? 'Menyimpan...' : (isBooking ? 'Booking Nomor Sekarang' : 'Simpan Surat')}
          </button>
        </form>
      </div>
    </div>
  );
}
