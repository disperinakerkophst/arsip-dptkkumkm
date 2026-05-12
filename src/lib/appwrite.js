import { Client, Databases, Account } from 'appwrite';

// Selalu gunakan endpoint langsung dari env var.
// Proxy /api/appwrite hanya berlaku di browser saat production (Vercel CORS),
// tapi tidak valid di sisi server (SSR/Turbopack) karena bukan URL absolut.
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
export const COLLECTION_SURAT_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SURAT_ID;
export const COLLECTION_USERS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS_ID;
export const COLLECTION_AUDIT_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_AUDIT_ID;
export const COLLECTION_JENIS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_JENIS_ID || 'jenis_surat';
export const COLLECTION_KLASIFIKASI_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_KLASIFIKASI_ID || 'klasifikasi_surat';
