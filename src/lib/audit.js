import { databases, DATABASE_ID, COLLECTION_AUDIT_ID } from './appwrite';
import { ID } from 'appwrite';

export const logActivity = async (username, aktivitas) => {
  if (!COLLECTION_AUDIT_ID) return;

  try {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_AUDIT_ID,
      ID.unique(),
      {
        username: username || 'System',
        aktivitas: aktivitas,
        tanggal: new Date().toISOString()
      }
    );
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
};
