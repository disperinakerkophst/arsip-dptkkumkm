'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTION_USERS_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' or 'superadmin'
  const [bidang, setBidang] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const accountData = await account.get();
      setUser(accountData);
      
      // Fetch role from Users collection based on logged in account ID
      if (COLLECTION_USERS_ID) {
        try {
            const roleData = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_USERS_ID,
            [Query.equal('userId', accountData.$id)]
            );
            if (roleData.documents.length > 0) {
              const userData = roleData.documents[0];
              const rawNama = userData.nama || '';
              const rawRole = userData.role || 'admin';
              
              // Format baru: nama = Username|DisplayName|Email|Password
              let displayName = '';
              let storedEmail = '';
              
              if (rawNama.includes('|')) {
                const parts = rawNama.split('|');
                // Format bisa 3 part atau 4 part
                if (parts.length >= 4) {
                  displayName = parts[1]; // Nama Panggilan
                  storedEmail = parts[2];
                } else {
                  // Legacy format
                  displayName = parts[0]; 
                  storedEmail = parts[1];
                }
              } else {
                displayName = rawNama;
              }

              // Update state user
              setUser(prev => ({
                ...prev,
                name: displayName || prev.name,
                email: storedEmail || prev.email
              }));
              
              // Parse role dan bidang
              if (rawRole.includes('[') && rawRole.includes(']')) {
                const parts = rawRole.split('[');
                setRole(parts[0]);
                setBidang(parts[1].replace(']', ''));
              } else {
                setRole(rawRole);
                setBidang('SKE');
              }
            } else {
              setRole('publik');
              setBidang('SKE');
            }
        } catch (e) {
            console.error("Gagal mengambil role dari Users. Pastikan ID Collection benar.", e);
        }
      }
    } catch (error) {
      // Not logged in
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (usernameOrEmail, password) => {
    let finalEmail = usernameOrEmail;

    // Jika input tidak mengandung '@', anggap sebagai username dan cari email-nya di database
    if (!usernameOrEmail.includes('@')) {
      try {
        const userDoc = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_USERS_ID,
          [Query.startsWith('nama', usernameOrEmail + '|'), Query.limit(1)]
        );

        if (userDoc.documents.length > 0) {
          const rawNama = userDoc.documents[0].nama || '';
          if (rawNama.includes('|')) {
            const parts = rawNama.split('|');
            // Jika 4 part (Username|Display|Email|Pass), email ada di index 2
            // Jika 3 part (Username|Email|Pass), email ada di index 1
            finalEmail = parts.length >= 4 ? parts[2] : parts[1];
          } else {
             finalEmail = `${usernameOrEmail.toLowerCase().replace(/\s+/g, '.')}@hstkab.go.id`;
          }
        } else {
          throw new Error('Username tidak ditemukan.');
        }
      } catch (e) {
        console.error("Lookup email gagal:", e);
        throw e;
      }
    }

    await account.createEmailPasswordSession(finalEmail, password);
    await checkUserStatus();
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.error(e);
    } finally {
      setUser(null);
      setRole(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, bidang, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
