// api/upscale.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const formidable = require('formidable');

// --- Logika Asli (Dimodifikasi sedikit untuk Serverless) ---

const config = ['2', '4'];

async function gettoken() {
    try {
        const html = await axios.get('https://www.iloveimg.com/upscale-image').then(r => r.data);
        const token = html.match(/"token":"(eyJ[^"]+)"/)?.[1];
        const task = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];
        if (!token || !task) throw new Error("Gagal mengambil token/task ID");
        return { token, task };
    } catch (e) {
        throw new Error("Gagal koneksi ke iloveimg: " + e.message);
    }
}

async function upimage(filepath, filename, token, task) {
    const form = new FormData();
    form.append('name', filename);
    form.append('chunk', '0');
    form.append('chunks', '1');
    form.append('task', task);
    form.append('preview', '1');
    form.append('v', 'web.0');
    // Di Vercel serverless, kita baca dari path temporary formidable
    form.append('file', fs.createReadStream(filepath));

    const r = await axios.post('https://api29g.iloveimg.com/v1/upload', form, {
        headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${token}`,
            Origin: 'https://www.iloveimg.com',
            Referer: 'https://www.iloveimg.com/'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
    });
    return r.data.server_filename;
}

async function doUpscale(serverfilename, token, task, scale) {
    if (!config.includes(String(scale))) throw new Error('Invalid scale');

    const form = new FormData();
    form.append('task', task);
    form.append('server_filename', serverfilename);
    form.append('scale', scale);

    const r = await axios.post('https://api29g.iloveimg.com/v1/upscale', form, {
        headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${token}`,
            Origin: 'https://www.iloveimg.com',
            Referer: 'https://www.iloveimg.com/'
        },
        responseType: 'arraybuffer'
    });

    return r.data;
}

// --- Vercel Serverless Handler ---

// Kita harus menonaktifkan body parser bawaan Vercel agar formidable bisa bekerja
export const configVercel = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const form = new formidable.IncomingForm();
    
    // Parse request upload
    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ error: 'Gagal upload file' });
        }

        try {
            // Support form-data array structure or single object
            const uploadedFile = Array.isArray(files.image) ? files.image[0] : files.image;
            const scale = Array.isArray(fields.scale) ? fields.scale[0] : fields.scale;

            if (!uploadedFile) {
                return res.status(400).json({ error: 'Tidak ada gambar yang diupload' });
            }

            // 1. Dapatkan Token
            const { token, task } = await gettoken();

            // 2. Upload ke Server iLoveImg
            const serverFilename = await upimage(uploadedFile.filepath, uploadedFile.originalFilename, token, task);

            // 3. Proses Upscale
            const imageBuffer = await doUpscale(serverFilename, token, task, scale || '2');

            // 4. Kirim balik gambar hasil
            res.setHeader('Content-Type', 'image/png');
            res.status(200).send(imageBuffer);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message || 'Terjadi kesalahan saat upscale' });
        }
    });
}
