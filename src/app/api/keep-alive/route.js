import { databases, DATABASE_ID, COLLECTION_SURAT_ID } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { NextResponse } from 'next/server';

export async function GET(request) {
  // Verifikasi Cron Secret untuk keamanan (Opsional tapi direkomendasikan)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Melakukan operasi ringan ke Appwrite agar project tetap aktif
    // Query list document dengan limit 1 sudah cukup untuk mentrigger aktivitas API
    const response = await databases.listDocuments(DATABASE_ID, COLLECTION_SURAT_ID, [
      Query.limit(1)
    ]);

    console.log('Keep-alive cron executed successfully at:', new Date().toISOString());

    return NextResponse.json({ 
      success: true, 
      message: 'Appwrite activity triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Keep-alive cron failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
