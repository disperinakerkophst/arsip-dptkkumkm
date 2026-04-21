import { databases, DATABASE_ID, COLLECTION_AUDIT_ID } from './appwrite';
import { ID } from 'appwrite';

export const logActivity = async (username, aktivitas, payload = null) => {
  if (!COLLECTION_AUDIT_ID) return;

  try {
    let activityText = aktivitas;
    if (payload) {
      // Simpan field esensial guna pemulihan
      const minData = {
        s: payload.suratId,
        j: payload.jenisSurat,
        n: payload.nomorSurat,
        t: payload.tanggalSurat,
        p: payload.perihal,
        o: payload.tujuanSurat,
        m: payload.pembuatSurat,
        l: payload.linkFile,
        d: payload.idDrive,
        u: payload.noUrut,        // noUrut is required
        k: payload.klasifikasiSurat // klasifikasiSurat is required
      };
      
      const payloadStr = JSON.stringify(minData);
      const encodedPayload = typeof window !== 'undefined' ? btoa(unescape(encodeURIComponent(payloadStr))) : Buffer.from(payloadStr).toString('base64');
      
      // Tambahkan marker restorasi tanpa pembatasan 255 karakter (karena DB sudah diubah ke 5000)
      activityText += ` [R:${encodedPayload}]`;
    }

    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_AUDIT_ID,
      ID.unique(),
      {
        username: username || 'System',
        aktivitas: activityText,
        tanggal: new Date().toISOString()
      }
    );
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
};
