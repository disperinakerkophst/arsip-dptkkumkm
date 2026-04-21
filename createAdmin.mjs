import { Client, Databases, ID } from 'appwrite';

const client = new Client()
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('69e608940022dcf8b19d');

const databases = new Databases(client);

async function saveSuperadmin() {
    try {
        console.log("Menyimpan profil di Collection Users...");
        await databases.createDocument(
            '69e6197400342a4576f1',
            'users',
            ID.unique(),
            {
                userId: '69e7b4fd0033ede0996d',
                nama: 'Ahmad Nur Helmi',
                role: 'superadmin'
            }
        );
        console.log("Akun Superadmin berhasil didaftarkan di Database (role superadmin)!");
    } catch (e) {
        console.error("Gagal menyimpan ke database:", e.message || e);
    }
}

saveSuperadmin();
