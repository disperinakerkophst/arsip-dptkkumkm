'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [highlightLogin, setHighlightLogin] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'surat', 'sistem'
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleHighlight = () => {
      setHighlightLogin(true);
      setTimeout(() => {
        const loginBtn = document.querySelector('.login-highlight-anim');
        if (loginBtn) loginBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      setTimeout(() => setHighlightLogin(false), 3000);
    };
    
    window.addEventListener('highlightLogin', handleHighlight);
    return () => window.removeEventListener('highlightLogin', handleHighlight);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const handleScrollToTop = (e) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrollToTable = (e) => {
    if (pathname === '/') {
      e.preventDefault();
      const element = document.getElementById('tabel-riwayat');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="top-navbar">
      <Link href="/" style={{ textDecoration: 'none' }} onClick={handleScrollToTop}>
        <div className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '2px' }}>
            <rect x="3" y="15" width="18" height="6" rx="2" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M5 15V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 7h6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            <path d="M9 11h6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            <circle cx="12" cy="18" r="1.5" fill="var(--primary)"/>
          </svg>
          <div className="navbar-brand-text">
            <span className="navbar-title"><b>Arsip Dinas</b> </span>
          </div>
        </div>
      </Link>

      <button className="mobile-hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        {isMenuOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        )}
      </button>

      {/* Mobile Drawer Overlay */}
      <div 
        className={`mobile-menu-overlay ${isMenuOpen ? 'show' : ''}`} 
        onClick={() => setIsMenuOpen(false)}
      ></div>

      <nav className={`nav-links ${isMenuOpen ? 'show' : ''}`}>
        {/* Brand in Drawer (Mobile Only) */}
        <div className="drawer-header hide-on-desktop">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div className="navbar-brand-text">
              <span className="navbar-title">Arsip Dinas</span>
            </div>
          </div>
        </div>
        {/* 1. Beranda */}
        <Link 
          href="/" 
          className={`nav-link ${pathname === '/' ? 'active' : ''}`} 
          onClick={(e) => { handleScrollToTop(e); setIsMenuOpen(false); }}
        >
          Beranda
        </Link>

        {/* 2. Manajemen Surat */}
        <div 
          className="nav-item-container"
          onMouseEnter={() => setOpenDropdown('surat')}
          onMouseLeave={() => setOpenDropdown(null)}
          onClick={() => { if(window.innerWidth <= 768) setOpenDropdown(openDropdown === 'surat' ? null : 'surat'); }}
        >
          <div className={`nav-link ${(pathname === '/surat-baru' || pathname === '/template-surat' || pathname.includes('#tabel-riwayat')) ? 'active' : ''}`}>
            Manajemen Surat
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px', opacity: 0.5, transform: openDropdown === 'surat' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <div className={`nav-dropdown ${openDropdown === 'surat' ? 'show' : ''}`}>
            {user && (
              <Link href="/surat-baru" className={`dropdown-link ${pathname === '/surat-baru' ? 'active' : ''}`} onClick={() => { setOpenDropdown(null); setIsMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Buat Surat Baru
              </Link>
            )}
            <Link href="/#tabel-riwayat" className="dropdown-link" onClick={(e) => { setOpenDropdown(null); setIsMenuOpen(false); handleScrollToTable(e); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Riwayat Surat Keluar
            </Link>
            <Link href="/template-surat" className={`dropdown-link ${pathname === '/template-surat' ? 'active' : ''}`} onClick={() => { setOpenDropdown(null); setIsMenuOpen(false); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><rect x="2" y="7" width="20" height="13" rx="2" ry="2"/><rect x="5" y="11" width="14" height="2"/></svg>
              Template Surat
            </Link>
          </div>
        </div>

        {/* 3. Laporan */}
        {user && (
          <Link href="/laporan" className={`nav-link ${pathname === '/laporan' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
            Laporan
          </Link>
        )}

        {/* 3.5 Panduan Sistem */}
        {user && (
          <Link href="/walkthrough" className={`nav-link ${pathname === '/walkthrough' ? 'active' : ''}`} onClick={() => setIsMenuOpen(false)}>
            Panduan Sistem
          </Link>
        )}

        {/* 4. Pengaturan Sistem */}
        {user && role === 'superadmin' && (
          <div 
            className="nav-item-container"
            onMouseEnter={() => setOpenDropdown('sistem')}
            onMouseLeave={() => setOpenDropdown(null)}
            onClick={() => { if(window.innerWidth <= 768) setOpenDropdown(openDropdown === 'sistem' ? null : 'sistem'); }}
          >
            <div className={`nav-link ${(pathname === '/pengguna' || pathname === '/pengaturan' || pathname === '/audit-log') ? 'active' : ''}`}>
              Pengaturan Sistem
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px', opacity: 0.5, transform: openDropdown === 'sistem' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <div className={`nav-dropdown ${openDropdown === 'sistem' ? 'show' : ''}`}>
              <Link href="/pengguna" className={`dropdown-link ${pathname === '/pengguna' ? 'active' : ''}`} onClick={() => { setOpenDropdown(null); setIsMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Data Admin
              </Link>
              <Link href="/pengaturan" className={`dropdown-link ${pathname === '/pengaturan' ? 'active' : ''}`} onClick={() => { setOpenDropdown(null); setIsMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Klasifikasi & Jenis Surat
              </Link>
              <Link href="/audit-log" className={`dropdown-link ${pathname === '/audit-log' ? 'active' : ''}`} onClick={() => { setOpenDropdown(null); setIsMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Audit Log
              </Link>
            </div>
          </div>
        )}

        {user ? (
          <div className="nav-user">
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#e0e0e0', whiteSpace: 'nowrap' }}>
               Halo, {user.name || 'Admin'}
             </span>
             <button onClick={logout} title="Keluar" style={{ padding: '0 0 0 0.6rem', color: '#bdbdbd', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', outline: 'none', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
             </button>
          </div>
        ) : (
          <Link href="/login" 
            className={`nav-link ${highlightLogin ? 'login-highlight-anim' : ''}`} 
            onClick={() => setIsMenuOpen(false)}
            style={{ 
              border: '1px solid rgba(168, 199, 250, 0.2)', 
              padding: '0.4rem 1.25rem',
              borderRadius: '999px',
              color: 'var(--primary)',
              fontWeight: '800',
              textShadow: '0 0 10px rgba(168, 199, 250, 0.4)',
              background: 'rgba(168, 199, 250, 0.05)'
            }}
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
