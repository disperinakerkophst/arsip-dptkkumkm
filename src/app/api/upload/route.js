import { google } from 'googleapis';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert Buffer to Readable Stream for googleapis
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const drive = google.drive({ version: 'v3', auth });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    const fileMetadata = {
      name: file.name,
      parents: [folderId]
    };

    const media = {
      mimeType: file.type,
      body: stream,
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });
    
    // We also need to share the file publicly so 'webViewLink' is accessible by anyone
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    return NextResponse.json({ 
      success: true, 
      id: response.data.id,
      link: response.data.webViewLink 
    });

  } catch (error) {
    console.error('Upload Error:', error);
    if (error.response && error.response.data) {
      console.error('Google API Error Details:', error.response.data);
      return NextResponse.json({ 
        error: error.message, 
        details: error.response.data 
      }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
