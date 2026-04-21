'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <a href="/" className="sidebar-brand-link" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <div className="sidebar-brand">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '0.25rem' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 11h8" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <path d="M8 15h5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <path d="M10 7h4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            </svg>
            <div className="sidebar-title">Arsip Dinas</div>
          </div>
        </a>
        <div className="sidebar-subtitle">
          <span className="subtitle-l1">Dinas Perindustrian, Tenaga Kerja, Koperasi & UMKM</span>
          <span className="subtitle-l2"></span>
          <span className="subtitle-l3">Kabupaten Hulu Sungai Tengah</span>
        </div>
      </div>

      {user && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,193,7,0.1)', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(255,193,7,0.2)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{getGreeting()},</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffc107', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
              Admin {user.name || 'Utama'}
            </div>
          </div>
        </div>
      )}
      
      <nav className="nav-links" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Link 
          href="/" 
          className="nav-link" 
          style={pathname === '/' || pathname.startsWith('/edit-surat') ? { color: 'var(--primary)', backgroundColor: 'rgba(168, 199, 250, 0.08)' } : {}}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          Riwayat Surat Keluar
        </Link>
        
        {user && (
          <>
            <Link 
              href="/surat-baru" 
              className="nav-link"
              style={pathname === '/surat-baru' ? { color: 'var(--primary)', backgroundColor: 'rgba(168, 199, 250, 0.08)' } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Surat Baru
            </Link>

            <Link 
              href="/laporan" 
              className="nav-link"
              style={pathname === '/laporan' ? { color: 'var(--primary)', backgroundColor: 'rgba(168, 199, 250, 0.08)' } : {}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Rekap Laporan
            </Link>

            {role === 'superadmin' && (
              <div style={{ marginTop: 'auto', marginBottom: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '1rem' }}>Menu Superadmin</div>
                <Link 
                  href="/audit-log" 
                  className="nav-link"
                  style={pathname === '/audit-log' ? { color: 'var(--primary)', backgroundColor: 'rgba(168, 199, 250, 0.08)' } : {}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                    <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Audit Log System
                </Link>

                <Link 
                  href="/pengguna" 
                  className="nav-link"
                  style={pathname === '/pengguna' ? { color: 'var(--primary)', backgroundColor: 'rgba(168, 199, 250, 0.08)' } : {}}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Kelola Admin
                </Link>
              </div>
            )}
            
            <button 
              onClick={logout} 
              className="nav-link" 
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', outline: 'none', color: '#ff4444', textAlign: 'left', marginTop: role === 'superadmin' ? '0' : 'auto' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.75rem' }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Keluar Sistem
            </button>
          </>
        )}

        {!user && (
          <Link href="/login" className="nav-link" style={{ marginTop: 'auto', border: '1px dashed rgba(255,255,255,0.1)', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Login Admin
          </Link>
        )}
      </nav>

      <div className="sidebar-footer">
        @2026-04 V.1.0 - Dibuat Oleh JF Pranata Komputer / Diberdayakan Oleh DPTKKUMKM HST
      </div>
    </aside>
  );
}
