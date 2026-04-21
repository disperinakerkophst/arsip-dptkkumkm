import { Client, Databases, Account } from 'appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
export const COLLECTION_SURAT_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_SURAT_ID;
export const COLLECTION_USERS_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_USERS_ID;
export const COLLECTION_AUDIT_ID = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_AUDIT_ID;
