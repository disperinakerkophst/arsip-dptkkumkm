'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTION_USERS_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin' or 'superadmin'
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
            setRole(roleData.documents[0].role);
            } else {
            setRole('publik'); // fallback
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

  const login = async (email, password) => {
    await account.createEmailPasswordSession(email, password);
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
    <AuthContext.Provider value={{ user, role, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
