'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import jsPDF from 'jspdf';

export default function WalkthroughPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleDownloadPDF = () => {
    // Enable compression to keep file size small while maintaining quality
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // --- PAGE 1: COVER ---
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Premium Left Border
    doc.setFillColor(85, 107, 47); // Sage
    doc.rect(0, 0, 4, pageHeight, 'F');
    doc.setFillColor(101, 67, 33); // Brown
    doc.rect(4, 0, 1.5, pageHeight, 'F');
    
    try {
      doc.addImage('/logo_hst.png', 'PNG', (pageWidth/2) - 18, 40, 36, 45);
    } catch (e) {}

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 45, 30);
    
    doc.setFontSize(11);
    doc.text('PEMERINTAH KABUPATEN HULU SUNGAI TENGAH', pageWidth/2, 100, { align: 'center' });
    
    doc.setFontSize(13);
    doc.text('DINAS PERINDUSTRIAN, TENAGA KERJA,', pageWidth/2, 110, { align: 'center' });
    doc.text('KOPERASI DAN UMKM', pageWidth/2, 117, { align: 'center' });
    
    // Decorative lines
    doc.setDrawColor(85, 107, 47);
    doc.setLineWidth(0.8);
    doc.line(40, 130, pageWidth - 40, 130);
    doc.setLineWidth(0.2);
    doc.line(50, 132, pageWidth - 50, 132);
    
    doc.setFontSize(26);
    doc.setTextColor(101, 67, 33);
    doc.text('MANUAL OPERASIONAL', pageWidth/2, 155, { align: 'center' });
    doc.setFontSize(22);
    doc.text('SISTEM ARSIP DIGITAL', pageWidth/2, 168, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(130, 110, 90);
    doc.setFont('helvetica', 'normal');
    doc.text('DOKUMEN PANDUAN ADMINISTRASI — VERSI @2026-04 V.1.0', pageWidth/2, 182, { align: 'center' });
    
    // Bottom Credit
    doc.setFontSize(8.5);
    doc.setTextColor(150, 140, 130);
    doc.text('Jl. H. Sibli Imansyah, Kel. Barabai Barat, Kec. Barabai', pageWidth/2, 265, { align: 'center' });
    doc.text('Barabai, Kalimantan Selatan', pageWidth/2, 271, { align: 'center' });

    // --- CONTENT PAGES ---
    doc.addPage();
    
    const drawWhiteBg = () => {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Subtle Geometric Corner
      doc.setFillColor(245, 245, 240);
      doc.triangle(pageWidth, 0, pageWidth - 30, 0, pageWidth, 30, 'F');
      
      // Header
      try {
        doc.addImage('/logo_hst.png', 'PNG', 15, 8, 9, 11);
      } catch (e) {}
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 110, 100);
      doc.text('SISTEM ARSIP DIGITAL | DPTKKUMKM HST', 27, 15);
      
      doc.setDrawColor(230, 225, 220);
      doc.setLineWidth(0.3);
      doc.line(15, 21, pageWidth - 15, 21);
      
      // Footer with Page Numbering
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(160, 150, 140);
      doc.text(`Halaman ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      doc.text('© 2026 DPTKKUMKM HST - Manual Operasional Digital', 15, pageHeight - 10);
      doc.line(15, pageHeight - 14, pageWidth - 15, pageHeight - 14);
    };    drawWhiteBg();
    let currentY = 38;

    const addSection = (title, content, isList = false, imagePath = null, customBg = null, isSquare = false) => {
      const lines = content ? doc.splitTextToSize(content, 165) : [];
      let cardHeight = 18 + (lines.length * 6.5);
      
      if (imagePath) {
        cardHeight += isSquare ? 82 : 82; 
      }

      // Ensure 2 features per page by forcing break if currentY is high
      if (currentY + cardHeight > 280) { 
        doc.addPage(); 
        drawWhiteBg();
        currentY = 32; 
      }
      
      const isBenefit = title && title.includes('MANFAAT');
      const isGuide = title && (title.startsWith('A.') || title.startsWith('B.') || title.startsWith('C.') || title.startsWith('D.'));
      
      let finalBg = {r: 245, g: 240, b: 230}; 
      if (isBenefit) finalBg = {r: 238, g: 243, b: 230}; 
      else if (isGuide) finalBg = {r: 250, g: 248, b: 242}; 
      else if (customBg) finalBg = customBg;

      doc.setFillColor(finalBg.r, finalBg.g, finalBg.b); 
      doc.setDrawColor(finalBg.r - 20, finalBg.g - 20, finalBg.b - 30);
      doc.roundedRect(15, currentY - 6, 180, cardHeight, 3, 3, 'FD');
      
      if (title) {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 45, 30);
        doc.text(title, 22, currentY + 2);
        currentY += 10;
      }
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 50, 40);
      
      let stepCounter = 1;
      if (content) {
        lines.forEach(line => {
          if (line.includes('[CHECK]')) {
            const cleanLine = line.replace('[CHECK]', '').trim();
            doc.setTextColor(85, 107, 47);
            doc.setFont('helvetica', 'bold');
            doc.text('✓', 22, currentY);
            doc.setTextColor(60, 50, 40);
            doc.setFont('helvetica', 'normal');
            doc.text(cleanLine, 28, currentY);
          } else if (line.includes('[STEP]')) {
            const cleanLine = line.replace('[STEP]', '').trim();
            doc.setFillColor(101, 67, 33);
            doc.circle(23, currentY - 1, 2.2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(stepCounter.toString(), 22.3, currentY - 0.2);
            doc.setTextColor(60, 50, 40);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.text(cleanLine, 28, currentY);
            stepCounter++;
          } else {
            doc.text(isList ? '  • ' + line : line, 22, currentY);
          }
          currentY += 6;
        });
      }

      if (imagePath) {
        try {
          const imgWidth = isSquare ? 75 : 135; 
          const imgHeight = isSquare ? 75 : (imgWidth * 9) / 16; 
          const startX = isSquare ? (pageWidth / 2) - (imgWidth / 2) : 23;
          
          doc.setDrawColor(180, 170, 160);
          doc.roundedRect(startX - 0.5, currentY + 1.5, imgWidth + 1, imgHeight + 1, 1, 1, 'D');
          doc.addImage(imagePath, 'PNG', startX, currentY + 2, imgWidth, imgHeight);
          currentY += imgHeight + 8;
        } catch (e) {}
      }
      currentY += 10;
    };

    // KEUNGGULAN UTAMA (Special Colored Grid)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(101, 67, 33); // Deep Brown Title
    doc.text('KEUNGGULAN UTAMA & MANFAAT', 15, currentY);
    currentY += 8;

    const drawBenefitCard = (x, y, title, text, borderColor) => {
      doc.setFillColor(242, 238, 225); 
      doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
      doc.setLineWidth(0.4);
      doc.roundedRect(x, y, 86, 24, 3, 3, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 30, 10); 
      doc.text(title, x + 6, y + 8);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 60, 50); 
      const subLines = doc.splitTextToSize(text, 75);
      doc.text(subLines, x + 6, y + 14);
      
      doc.setFillColor(borderColor.r, borderColor.g, borderColor.b);
      doc.circle(x + 3, y + 7.5, 0.7, 'F');
    };

    drawBenefitCard(15, currentY, 'PENOMORAN OTOMATIS', 'Sistem menentukan nomor urut secara cerdas & otomatis.', {r: 101, g: 67, b: 33});
    drawBenefitCard(105, currentY, 'ANTI-DUPLIKASI', 'Validasi real-time mencegah adanya nomor surat ganda.', {r: 139, g: 69, b: 19});
    currentY += 28;
    drawBenefitCard(15, currentY, 'INTEGRITAS BERKAS', 'Mewajibkan PDF untuk menjamin arsip yang selalu lengkap.', {r: 85, g: 107, b: 47});
    drawBenefitCard(105, currentY, 'CLOUD STORAGE', 'Penyimpanan otomatis ke Google Drive dinas yang aman.', {r: 130, g: 110, b: 90});
    currentY += 42; // Extra space before Dashboard
 
    addSection('DASHBOARD & AKTIVITAS', 
      'Statistik real-time surat dan grafik distribusi jenis surat. Fitur Feed Aktivitas mencatat aksi staf secara transparan.\n' +
      '• STATISTIK: Rekapitulasi surat Hari Ini, Bulan Ini, dan Tahun Ini.\n' +
      '• GRAFIK: Visualisasi tren jenis surat dalam bentuk diagram.', 
      false, '/dashboard_real.png', {r: 240, g: 245, b: 230} // Sage Green
    );
 
    // --- PAGE 3: BOOKING & LAPORAN (Forced together) ---
    doc.addPage();
    drawWhiteBg();
    currentY = 35;

    addSection('FITUR BOOKING NOMOR SURAT', 
      'Mendukung mode Lengkap dan mode Booking. Sistem menerapkan aturan disiplin: Staf dilarang meminta nomor baru jika masih ada dokumen booking yang belum lengkap.', 
      false, '/form_real.png', {r: 250, g: 242, b: 230}
    );
 
    addSection('LAPORAN TERINTEGRASI PER BIDANG', 
      'Modul laporan yang mendukung filter per bidang. Laporan menyertakan statistik kategori dan klasifikasi surat. Filter bidang otomatis terkunci pada staf.', 
      false, '/laporan_real.png', {r: 242, g: 245, b: 235}
    );
 
    // --- PAGE 4: RIWAYAT & TEMPLATE (Forced together) ---
    doc.addPage();
    drawWhiteBg();
    currentY = 32;

    addSection('RIWAYAT SURAT KELUAR', 
      'Pusat kendali seluruh arsip yang telah dibuat. Memungkinkan pencarian cepat, pengunggahan PDF susulan untuk booking, serta pengeditan data arsip secara fleksibel.', 
      false, '/riwayat_real.png', {r: 248, g: 240, b: 235} // Dusty Rose/Clay
    );
 
    addSection('TEMPLATE SURAT TERINTEGRASI', 
      'Menyediakan daftar dokumen template standar (Nota Dinas, SK, Undangan, dll) untuk menjaga keseragaman format di seluruh unit kerja.', 
      false, '/template_real.png', {r: 238, g: 243, b: 230} // Sage Green
    );
 
    // --- PAGE: PANDUAN PENGGUNAAN RINCI (Special Treatment: Single Dedicated Page) ---
    doc.addPage();
    drawWhiteBg();
    currentY = 35;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(101, 67, 33);
    doc.text('PANDUAN PENGGUNAAN RINCI', 15, currentY);
    currentY += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 60);
    doc.text('Instruksi teknis pengoperasian fitur utama sistem dalam satu lembar referensi cepat.', 15, currentY);
    currentY += 12;

    const drawGuideCard = (x, y, w, title, content) => {
      const lines = doc.splitTextToSize(content, w - 12);
      const cardH = 18 + (lines.length * 6.5);
      
      doc.setFillColor(252, 250, 245);
      doc.setDrawColor(215, 205, 190);
      doc.roundedRect(x, y, w, cardH, 3, 3, 'FD');
      
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(101, 67, 33);
      doc.text(title, x + 5, y + 7);
      
      let stepY = y + 14;
      let sCounter = 1;
      lines.forEach(line => {
        if (line.includes('[STEP]')) {
          const cLine = line.replace('[STEP]', '').trim();
          doc.setFillColor(101, 67, 33);
          doc.circle(x + 7, stepY - 1, 2, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.text(sCounter.toString(), x + 6.3, stepY - 0.2);
          
          doc.setTextColor(60, 50, 40);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(cLine, x + 11, stepY);
          sCounter++;
        }
        stepY += 6.5;
      });
      return cardH;
    };

    // Row 1
    const h1 = drawGuideCard(15, currentY, 88, 'A. Membuat Surat Baru', 
      '[STEP] Manajemen Surat > Buat Baru.\n' +
      '[STEP] Isi seluruh data arsip.\n' +
      '[STEP] Toggle Booking: OFF.\n' +
      '[STEP] Klik Upload PDF > Pilih file.\n' +
      '[STEP] Klik Simpan & Terbitkan.'
    );
    const h2 = drawGuideCard(107, currentY, 88, 'B. Cara Booking Nomor', 
      '[STEP] Manajemen Surat > Buat Baru.\n' +
      '[STEP] Isi detail surat.\n' +
      '[STEP] Toggle Booking: ON.\n' +
      '[STEP] Klik Booking Nomor.\n' +
      '[STEP] Upload PDF nanti di Riwayat.'
    );
    currentY += Math.max(h1, h2) + 8;

    // Row 2
    const h3 = drawGuideCard(15, currentY, 88, 'C. Penarikan Laporan', 
      '[STEP] Menu Laporan > Tentukan Tgl.\n' +
      '[STEP] Klik Tampilkan Laporan.\n' +
      '[STEP] Isi data Penandatangan.\n' +
      '[STEP] Klik Unduh PDF Laporan.'
    );
    const h4 = drawGuideCard(107, currentY, 88, 'D. Kelola Template', 
      '[STEP] Menu Template Surat.\n' +
      '[STEP] Klik Unduh pada draf.\n' +
      '[STEP] (Admin) Unggah file baru untuk\n memperbarui draf template.'
    );
    currentY += Math.max(h3, h4) + 15;

    addSection('MANFAAT UTAMA BAGI ORGANISASI', 
      'Penerapan sistem ini memberikan dampak positif yang signifikan terhadap tata kelola administrasi dinas:\n\n' +
      '[CHECK]  Menghilangkan risiko nomor surat ganda atau tumpang tindih antar bidang.\n' +
      '[CHECK]  Penyimpanan aman di Cloud (Google Drive), bebas risiko kehilangan data fisik.\n' +
      '[CHECK]  Meningkatkan kedisiplinan pengarsipan digital melalui sistem blokir otomatis.\n' +
      '[CHECK]  Memudahkan pencarian dan pembuatan rekapitulasi data secara instan.', 
      false
    );

    doc.save('Panduan_Sistem_Arsip_Digital.pdf');
  };

  if (authLoading || !user) return <div style={{ padding: '4rem', textAlign: 'center' }}>Memuat...</div>;

  return (
    <div className="card" style={{ maxWidth: '900px', margin: '2rem auto', padding: '3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)' }}>Panduan Sistem</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>Dokumen Panduan Fitur & Manfaat Sistem Arsip Digital</p>
        </div>
        <button onClick={handleDownloadPDF} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Unduh PDF Panduan
        </button>
      </div>

      <div style={{ lineHeight: '1.6', color: 'var(--text-main)' }}>
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>01.</span> Keunggulan Utama & Manfaat
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(168,199,250,0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(168,199,250,0.1)' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Penomoran Otomatis</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sistem menentukan nomor urut secara cerdas & otomatis, menghilangkan entri manual.</p>
            </div>
            <div style={{ background: 'rgba(255,193,7,0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,193,7,0.1)' }}>
              <div style={{ color: '#ffc107', marginBottom: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Anti-Duplikasi</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Validasi real-time mencegah adanya nomor surat ganda atau tumpang tindih.</p>
            </div>
            <div style={{ background: 'rgba(74,222,128,0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(74,222,128,0.1)' }}>
              <div style={{ color: '#4ade80', marginBottom: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Integritas Berkas</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mewajibkan PDF untuk setiap nomor guna menjamin arsip yang selalu lengkap.</p>
            </div>
            <div style={{ background: 'rgba(168,199,250,0.05)', padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(168,199,250,0.1)' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              </div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Cloud Storage</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Penyimpanan otomatis ke Google Drive dinas yang aman dan terpusat.</p>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>02.</span> Dashboard & Aktivitas
          </h2>
          <p>
            Visualisasi data real-time memberikan gambaran cepat mengenai volume surat keluar. 
          </p>
          <div style={{ position: 'relative', marginTop: '1.5rem', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(168,199,250,0.1)' }}>
            <img 
              src="/dashboard_real.png" 
              alt="Dashboard Riil" 
              style={{ width: '100%', display: 'block', transition: 'transform 0.3s' }} 
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></div>
              Tampilan Dashboard Aktif (Real-time)
            </div>
          </div>
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', margin: 0 }}>
                <li style={{ marginBottom: '0.75rem' }}><strong>Statistik Cepat:</strong> Menampilkan jumlah surat keluar secara real-time (Hari Ini, Bulan Ini, Tahun Ini) untuk memantau volume kerja.</li>
                <li style={{ marginBottom: '0.75rem' }}><strong>Nomor Terakhir:</strong> Informasi nomor urut terakhir yang digunakan guna memudahkan pemantauan urutan surat.</li>
              </ul>
            </div>
            <div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', margin: 0 }}>
                <li style={{ marginBottom: '0.75rem' }}><strong>Grafik Distribusi:</strong> Visualisasi persentase jenis surat yang paling sering diterbitkan dalam periode berjalan.</li>
                <li style={{ marginBottom: '0.75rem' }}><strong>Feed Aktivitas:</strong> Rekaman jejak audit dari setiap aksi staf (Tambah/Edit/Hapus) untuk transparansi organisasi.</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>03.</span> Fitur Booking Nomor Surat
          </h2>
          <div style={{ padding: '1.25rem', background: 'rgba(255,193,7,0.1)', borderRadius: '16px', borderLeft: '4px solid #ffc107', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0 }}>
              Sistem menerapkan <strong>aturan disiplin berkas</strong>: Staf (Pencatat Surat) dilarang meminta nomor baru 
              jika masih memiliki dokumen "Booking" yang belum diunggah PDF-nya. Hal ini memastikan tertib administrasi digital.
            </p>
          </div>
          <img src="/guide_booking.png" alt="Booking Restriction Guide" style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)' }} />
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>04.</span> Laporan Terintegrasi per Bidang
          </h2>
          <p>
            Laporan dapat difilter per bidang untuk memantau produktivitas secara spesifik. 
            Untuk staf, filter otomatis <strong>terkunci</strong> pada bidang masing-masing guna menjaga integritas data laporan.
          </p>
          <img src="/laporan_real.png" alt="Reports Guide" style={{ width: '100%', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--border-color)' }} />
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>05.</span> Riwayat Surat Keluar
          </h2>
          <p>
            Pusat kendali seluruh arsip yang telah dibuat. Di sini pengguna dapat melakukan pencarian cepat berdasarkan perihal atau nomor, 
            mengunduh file PDF, serta melengkapi file untuk dokumen yang sebelumnya hanya di-booking nomornya melalui tombol <strong>Lengkapi PDF</strong>.
          </p>
          <div style={{ 
            marginTop: '1.5rem', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.1)', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            background: '#1a1a1a' 
          }}>
            {/* Mac Header */}
            <div style={{ height: '32px', background: '#252525', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
              <div style={{ marginLeft: 'auto', marginRight: 'auto', fontSize: '0.7rem', color: '#666', fontWeight: '500', letterSpacing: '0.05em' }}>arsip_dinas_riwayat.app</div>
            </div>
            <img src="/riwayat_real.png" alt="Riwayat Riil" style={{ width: '100%', display: 'block' }} />
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>06.</span> Template Surat Terintegrasi
          </h2>
          <p>
            Menyediakan daftar dokumen template standar (seperti format Nota Dinas, Surat Keputusan, atau Surat Undangan) 
            yang dapat diunduh langsung untuk menjaga keseragaman format surat di seluruh unit kerja.
          </p>
          <div style={{ 
            marginTop: '1.5rem', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.1)', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            background: '#1a1a1a' 
          }}>
            {/* Mac Header */}
            <div style={{ height: '32px', background: '#252525', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></div>
              <div style={{ marginLeft: 'auto', marginRight: 'auto', fontSize: '0.7rem', color: '#666', fontWeight: '500', letterSpacing: '0.05em' }}>arsip_dinas_template.app</div>
            </div>
            <img src="/template_real.png" alt="Template Riil" style={{ width: '100%', display: 'block' }} />
          </div>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)' }}>07.</span> Panduan Penggunaan Rinci
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Step 1 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>A. Membuat Surat Baru (Mode Lengkap)</h3>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.95rem' }}>
                    <li>Pilih menu <strong>Manajemen Surat</strong> &gt; <strong>Buat Surat Baru</strong>.</li>
                    <li>Isi seluruh data (Tanggal, Jenis, Klasifikasi, Tujuan, Perihal).</li>
                    <li>Pastikan toggle "Hanya Booking Nomor" dalam posisi <strong>Mati (OFF)</strong>.</li>
                    <li>Klik area <strong>Upload PDF</strong> dan pilih file dari komputer Anda.</li>
                    <li>Klik <strong>Simpan & Terbitkan Nomor</strong>.</li>
                  </ol>
                </div>
                <div style={{ flex: '0.8', minWidth: '280px', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src="/form_real.png" alt="Form Guide" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>B. Cara Booking Nomor (Tanpa PDF)</h3>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.95rem' }}>
                    <li>Buka halaman <strong>Buat Surat Baru</strong>.</li>
                    <li>Isi detail surat seperti biasa.</li>
                    <li>Aktifkan toggle <strong>Hanya Booking Nomor (PDF Susulan)</strong>.</li>
                    <li>Klik <strong>Booking Nomor Sekarang</strong>.</li>
                    <li>Unggah file PDF nanti melalui tombol <strong>Lengkapi PDF</strong> di Tabel Riwayat.</li>
                  </ol>
                </div>
                <div style={{ flex: '0.8', minWidth: '280px', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src="/booking_real.png" alt="Booking Toggle" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>C. Penarikan Laporan & Rekapitulasi</h3>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.95rem' }}>
                    <li>Masuk ke menu <strong>Laporan</strong>.</li>
                    <li>Tentukan rentang tanggal (Contoh: 1 Jan s/d 31 Jan).</li>
                    <li>Klik <strong>Tampilkan Laporan</strong> untuk melihat statistik dan tabel rekap.</li>
                    <li>Isi data <strong>Pejabat Mengetahui</strong> (Kepala Dinas) dan <strong>Penanggung Jawab</strong> pada form di bawah pratinjau.</li>
                    <li>Klik <strong>Unduh PDF Laporan</strong> untuk mencetak dokumen resmi yang sudah bertandatangan.</li>
                  </ol>
                </div>
                <div style={{ flex: '0.8', minWidth: '280px', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src="/laporan_real.png" alt="Report Guide" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '280px' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>D. Unduh & Kelola Template Surat</h3>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.95rem' }}>
                    <li>Masuk ke menu <strong>Manajemen Surat</strong> &gt; <strong>Template Surat</strong>.</li>
                    <li>Klik tombol <strong>Unduh</strong> pada draf yang diinginkan untuk menyimpan ke komputer.</li>
                    <li>(Khusus Admin) Gunakan area <strong>Unggah Template Baru</strong> untuk memperbarui draf.</li>
                    <li>Sistem otomatis mensinkronisasi file baru ke penyimpanan cloud dinas.</li>
                  </ol>
                </div>
                <div style={{ flex: '0.8', minWidth: '280px', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src="/template_real.png" alt="Template Guide" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(168,199,250,0.05)', borderRadius: '16px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
        Dokumen Panduan Sistem Digital — Dinas Perindustrian, Tenaga Kerja, Koperasi dan UMKM Kabupaten HST
      </div>
    </div>
  );
}
