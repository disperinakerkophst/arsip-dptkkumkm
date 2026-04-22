'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import './login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { user, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      setErrorMsg('Kredensial tidak valid. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) return null;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-wrapper">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 className="login-title">Portal Arsip</h1>
          <p className="login-subtitle">Masuk untuk mengelola dokumentasi arsip dinas</p>
        </div>

        {errorMsg && (
          <div className="login-alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Alamat Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dinas.go.id"
              required
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label>Kata Sandi</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                </svg>
                Memproses...
              </span>
            ) : 'Masuk'}
          </button>
        </form>

        <div className="login-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#444' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Sambungan Terenkripsi</span>
          </div>
          &copy; {mounted ? new Date().getFullYear() : '2026'} DPTKKUMKM
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
