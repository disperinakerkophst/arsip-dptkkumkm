import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Arsip DPTKKUMKM HST',
  description: 'Arsip Dinas Perindustrian, Tenaga Kerja, Koperasi dan UMKM Kabupaten Hulu Sungai Tengah',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <div className="app-container">
            <Sidebar />
            <div className="content-wrapper">
              <main className="main-content">
                {children}
              </main>
              <footer className="main-footer">
                @2026-04 V.1.0 - Dibuat Oleh JF Pranata Komputer / Diberdayakan Oleh DPTKKUMKM HST
              </footer>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
