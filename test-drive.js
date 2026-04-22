const { google } = require('googleapis');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
for (const line of env.split('\n')) {
  if (line.includes('=')) {
    const [k, ...rest] = line.split('=');
    process.env[k.trim()] = rest.join('=').trim().replace(/['"]/g, '');
  }
}

async function check() {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const drive = google.drive({ version: 'v3', auth });
    const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log("Searching in parent:", parentFolderId);

    const templateFolderId = '1qh3V-y4vsDlC3JPgGwGqM6Nr2WhSpMa0';
    console.log("Checking contents of folder ID:", templateFolderId);

    const checkFiles = await drive.files.list({
      q: `'${templateFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    console.log("Files found in folder:", checkFiles.data.files);

  } catch (error) {
    console.error('Error:', error);
  }
}
check();
