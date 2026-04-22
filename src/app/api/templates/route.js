import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function GET() {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    
    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 1. Find the 'template' folder inside the parent folder
    const folderRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = 'template' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let templateFolderId = parentFolderId; // fallback
    if (folderRes.data.files.length > 0) {
      templateFolderId = folderRes.data.files[0].id;
    }

    // 2. List files inside the template folder
    const filesRes = await drive.files.list({
      q: `'${templateFolderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'files(id, name, webViewLink, webContentLink, iconLink, size, modifiedTime)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    return NextResponse.json({ 
      success: true, 
      files: filesRes.data.files 
    });

  } catch (error) {
    console.error('List Templates Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const drive = google.drive({ version: 'v3', auth });

    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Find the 'template' folder
    const folderRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and name = 'template' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    let templateFolderId = parentFolderId;
    if (folderRes.data.files.length > 0) {
      templateFolderId = folderRes.data.files[0].id;
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: file.name,
      parents: [templateFolderId]
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

    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    return NextResponse.json({ success: true, id: response.data.id, link: response.data.webViewLink });

  } catch (error) {
    console.error('Template Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
