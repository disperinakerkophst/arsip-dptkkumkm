import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    console.log("Attempting to delete template with ID:", id);
    if (!id) return NextResponse.json({ error: "ID file tidak ditemukan" }, { status: 400 });

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth });

    // Hapus file secara permanen
    await drive.files.delete({
      fileId: id,
      supportsAllDrives: true,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete Template Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
