import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Arsip Dinas HST',
  description: 'Arsip Dinas Perindustrian, Tenaga Kerja, Koperasi dan UMKM Kabupaten Hulu Sungai Tengah',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <div className="app-container">
          <aside className="sidebar">
            <div className="sidebar-header">
              <div className="sidebar-brand">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '0.25rem' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 11h8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                  <path d="M8 15h5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                  <path d="M10 7h4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                </svg>
                <div className="sidebar-title">Arsip Dinas</div>
              </div>
              <div className="sidebar-subtitle">
                <span className="subtitle-l1">Dinas Perindustrian, Tenaga Kerja, Koperasi & UMKM</span>
                <span className="subtitle-l2"></span>
                <span className="subtitle-l3">Kabupaten Hulu Sungai Tengah</span>
              </div>
            </div>
            
            <nav className="nav-links">
              <Link href="/" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                Riwayat Surat Keluar
              </Link>
              <Link href="/surat-baru" className="nav-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Surat Baru
              </Link>
            </nav>

            <div className="sidebar-footer">
              @2026-04 V.1.0 - Dibuat Oleh JF Pranata Komputer / Diberdayakan Oleh DPTKKUMKM HST
            </div>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
