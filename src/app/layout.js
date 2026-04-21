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
            <main className="main-content">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
