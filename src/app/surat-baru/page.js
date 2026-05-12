'use client';
import { useState, useEffect } from 'react';
import { databases, DATABASE_ID, COLLECTION_SURAT_ID, COLLECTION_JENIS_ID, COLLECTION_KLASIFIKASI_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { logActivity } from '@/lib/audit';

export default function SuratBaru() {
  const router = useRouter();
  const { user, role, bidang: userBidang, loading: authLoading } = useAuth();

  // Cek apakah pembuat_surat punya dokumen booking yang belum diupload PDF-nya
  const [blockingDoc, setBlockingDoc] = useState(null); // document yang menghambat
  const [checkingBlock, setCheckingBlock] = useState(false);
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
    pembuatSurat: '', // Akan diisi nama user
    kodeBidang: 'SKE', // Untuk Nomor Surat
    klasifikasiSurat: '530',
    noUrut: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Set initial date to today on mount
  useEffect(() => {
    if (user) {
      setFormData(prev => ({ 
        ...prev, 
        tanggalSurat: new Date().toISOString().split('T')[0],
        pembuatSurat: user.name || '',
        kodeBidang: userBidang || 'SKE'
      }));
    }
  }, [user, userBidang]);

  // Cek blocking: pembuat_surat tidak boleh request nomor baru jika ada dokumen lama tanpa PDF
  useEffect(() => {
    const checkBlockingDoc = async () => {
      if (!user || role !== 'pembuat_surat') return;
      setCheckingBlock(true);
      try {
        const result = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_SURAT_ID,
          [
            Query.equal('pembuatSurat', user.name || ''),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]
        );
        // Cari dokumen milik user ini yang belum ada linkFile-nya
        const unuploaded = result.documents.find(doc => !doc.linkFile);
        setBlockingDoc(unuploaded || null);
      } catch (err) {
        console.error('Gagal memeriksa status dokumen sebelumnya:', err);
      } finally {
        setCheckingBlock(false);
      }
    };
    checkBlockingDoc();
  }, [user, role]);

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
  // Gunakan kodeBidang untuk Nomor Surat resmi (SKE, KEU, dll)
  const fullNomorSurat = `${formData.klasifikasiSurat}/${displayNoUrut}/${formData.jenisSurat}/${formData.kodeBidang}/DPTKKUMKM/${inputYear}`;

  if (authLoading || !user) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Memverifikasi otorisasi Admin...</div>;
  }

  // Tampilkan layar blokir jika pembuat_surat punya dokumen tanpa PDF
  if (role === 'pembuat_surat' && (checkingBlock || blockingDoc)) {
    if (checkingBlock) {
      return (
        <div className="main-content-inner">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            Memeriksa status dokumen Anda...
          </div>
        </div>
      );
    }

    if (blockingDoc) {
      return (
        <div className="main-content-inner">
          <h2 className="page-title">Penginputan Surat Baru</h2>
          <div className="card" style={{ marginTop: '1.5rem', border: '1px solid rgba(255, 68, 68, 0.4)', backgroundColor: 'rgba(255, 68, 68, 0.05)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem', gap: '1.25rem' }}>
              {/* Ikon blokir */}
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>

              <div>
                <h3 style={{ margin: '0 0 0.5rem', color: '#ff4444', fontSize: '1.1rem' }}>Permintaan Nomor Baru Diblokir</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '480px', lineHeight: 1.6 }}>
                  Anda masih memiliki <strong style={{ color: 'var(--text-main)' }}>1 dokumen booking</strong> yang belum diunggah PDF-nya.
                  Selesaikan unggahan dokumen tersebut terlebih dahulu sebelum meminta nomor surat baru.
                </p>
              </div>

              {/* Info dokumen yang menghambat */}
              <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1rem 1.25rem', textAlign: 'left' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dokumen yang menghambat</p>
                <p style={{ margin: '0 0 0.25rem', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)' }}>{blockingDoc.nomorSurat}</p>
                <p style={{ margin: '0 0 0.1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {blockingDoc.perihal || 'Tidak ada perihal'}
                </p>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                  Dibuat: {new Date(blockingDoc.$createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => router.push('/')}
                  style={{ padding: '0.7rem 1.5rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Pergi ke Riwayat & Upload PDF
                </button>
                <button
                  onClick={() => router.push('/')}
                  style={{ padding: '0.7rem 1.25rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
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

      setShowModal(true);
      // Remove the direct redirect, user will close modal or be redirected after delay
      setTimeout(() => {
        if (!showModal) router.push('/');
      }, 10000); // 10s auto redirect if modal left open

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullNomorSurat);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="main-content-inner">
      <h2 className="page-title">Penginputan Surat Baru</h2>
      
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="preview-number-box">
          <span>Pratinjau Nomor Surat:</span>
          <strong>{fullNomorSurat}</strong>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* BOOKING MODE TOGGLE */}
          <div className={`booking-toggle-container ${isBooking ? 'active' : ''}`}>
            <label className="booking-label">
                <input 
                  type="checkbox" 
                  checked={isBooking}
                  onChange={(e) => setIsBooking(e.target.checked)}
                  className="booking-checkbox"
                  suppressHydrationWarning
                />
              Hanya Booking Nomor Surat
            </label>
            <p className="booking-description">
              Abaikan pengunggahan file dan isi bidang opsional secara menyusul nanti. Berguna untuk mengamankan nomor urut dengan cepat selagi draf surat diproses.
            </p>
          </div>

          <div className="form-row-grid">
            <div className="form-group">
              <label>Tanggal Surat *</label>
              <input 
                type="date" 
                name="tanggalSurat" 
                value={formData.tanggalSurat} 
                onChange={handleChange} 
                required
                suppressHydrationWarning
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
                suppressHydrationWarning
              />
              <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                Nomor urut otomatis disesuaikan berdasarkan data terakhir di tahun ini.
              </small>
              {duplicateWarning && (
                <div style={{ color: '#ff4444', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 'bold' }}>
                  ⚠️ {duplicateWarning}
                </div>
              )}
            </div>
          </div>

          <div className="form-row-grid">
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

          <div className="form-row-grid">
            <div className="form-group">
              <label>Identitas Pembuat (Otomatis)</label>
              <input 
                type="text" 
                name="pembuatSurat" 
                value={formData.pembuatSurat} 
                disabled
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'not-allowed', color: 'var(--primary)', fontWeight: 'bold' }}
                suppressHydrationWarning
              />
              <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nama Anda terekam untuk sistem notifikasi booking.</small>
            </div>

            <div className="form-group">
              <label>Kode Bidang (Untuk Nomor Surat)</label>
              <select name="kodeBidang" value={formData.kodeBidang} onChange={handleChange}>
                <option value="SKE">Sekretariat (SKE)</option>
                <option value="KEU">Keuangan (KEU)</option>
                <option value="IND">Perindustrian (IND)</option>
                <option value="NAKER">Tenaga Kerja (NAKER)</option>
                <option value="KUMKM">Koperasi & UMKM (KUMKM)</option>
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
                suppressHydrationWarning
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

      {/* SUCCESS MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 className="modal-title">Surat Berhasil Diarsip!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Nomor surat Anda telah berhasil di-input ke sistem.
            </p>
            
            <div className="modal-number-box">
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Nomor Surat Resmi:</span>
              <span className="modal-number">{fullNomorSurat}</span>
            </div>

            <div className="modal-actions">
              <button className="btn-copy" onClick={handleCopy}>
                {copySuccess ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Tersalin!
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    Salin Nomor Surat
                  </>
                )}
              </button>
              <button className="btn-close-modal" onClick={() => router.push('/')}>
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
