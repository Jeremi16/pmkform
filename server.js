// server.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import cors from 'cors';
import dotenv from 'dotenv';
import { Parser } from 'json2csv';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Supabase Configuration (Database Only)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cloudflare R2 Configuration (S3 Compatible)
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

// Multer Configuration (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Test connection endpoint
app.get('/api/test', async (req, res) => {
    try {
        const { data, error } = await supabase.from('registrations').select('count', { count: 'exact', head: true });
        if (error) throw error;
        res.json({ message: 'Supabase DB connected successfully!' });
    } catch (err) {
        console.error('Supabase connection failed:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// Get Public Setting
app.get('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        // If not found or error, return 404 but don't crash
        res.status(404).json({ error: 'Setting not found' });
    }
});

// Admin Login Endpoint
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Helper to upload file to Cloudflare R2
const uploadFile = async (file, folder, nim) => {
    // Get file extension
    const parts = file.originalname.split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : '';

    // Format: folder/NIM-folder.ext (e.g., sertif/124140195-sertif.pdf)
    const fileName = `${folder}/${nim}-${folder}${ext}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    await r2Client.send(command);

    // Construct Public URL
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || '';
    return `${publicDomain}/${fileName}`;
};

// Register form endpoint
app.post('/api/register', upload.fields([{ name: 'sertif', maxCount: 1 }, { name: 'portfolio', maxCount: 1 }]), async (req, res) => {
    try {
        const {
            name, nim, email, whatsapp, prodi,
            dept1, div1, reason1,
            dept2, div2, reason2,
            org_experience, skills, commitment, main_reason,
            active_period, willing_transfer
        } = req.body;

        // Validation Rules
        const strictNimRegex = /^(123|124|125)\d{6}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+\.(123|124|125)\d{6}@student\.itera\.ac\.id$/;

        if (!strictNimRegex.test(nim)) {
            return res.status(400).json({ error: 'Invalid NIM format. Must start with 123, 124, 125 and be 9 digits.' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid Email format. Must be student.itera.ac.id and contain NIM.' });
        }

        if (!email.includes(nim)) {
            return res.status(400).json({ error: 'Email must contain your NIM.' });
        }

        // Check if email or nim already exists
        const { data: existing } = await supabase
            .from('registrations')
            .select('id')
            .or(`email.eq.${email},nim.eq.${nim}`)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'Email or NIM already registered' });
        }

        // Handle File Uploads via R2
        let sertif_url = null;
        let portfolio_url = null;

        if (req.files['sertif']) {
            sertif_url = await uploadFile(req.files['sertif'][0], 'sertif', nim);
        }

        if (req.files['portfolio']) {
            portfolio_url = await uploadFile(req.files['portfolio'][0], 'portfolio', nim);
        }

        // Insert into Supabase
        const { data, error } = await supabase
            .from('registrations')
            .insert([{
                name, nim, email, whatsapp, prodi,
                dept1, div1, reason1,
                dept2, div2, reason2,
                org_experience, skills, commitment, main_reason,
                active_period: active_period === 'true',
                willing_transfer: willing_transfer === 'true',
                sertif_url,
                portfolio_url
            }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Registration successful', id: data[0].id });
    } catch (err) {
        console.error('Registration failed:', err);
        res.status(500).json({ error: 'Failed to register', details: err.message });
    }
});

// Export to Excel endpoint
app.get('/api/export/xlsx', authenticateToken, async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No data to export' });
        }

        // Load departments keys
        const departmentsData = JSON.parse(fs.readFileSync('./src/data/departments.json', 'utf8'));

        const getDepartmentName = (id) => {
            if (!id) return '-';
            const dept = departmentsData.find(d => d.id === id);
            return dept ? dept.name : id;
        };

        const getDivisionName = (deptId, divId) => {
            if (!deptId || !divId) return '-';
            const dept = departmentsData.find(d => d.id === deptId);
            if (!dept) return divId;
            const div = dept.divisions.find(d => d.id === divId);
            return div ? div.name : divId;
        };

        const transformedRows = rows.map(row => ({
            ...row,
            dept1: getDepartmentName(row.dept1),
            div1: getDivisionName(row.dept1, row.div1),
            dept2: getDepartmentName(row.dept2),
            div2: getDivisionName(row.dept2, row.div2),
            active_period: row.active_period ? 'Ya' : 'Tidak',
            willing_transfer: row.willing_transfer ? 'Ya' : 'Tidak',
            created_at: new Date(row.created_at).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            })
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Registrations');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 5 },
            { header: 'Waktu', key: 'created_at', width: 25 },
            { header: 'Nama', key: 'name', width: 30 },
            { header: 'NIM', key: 'nim', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'WhatsApp', key: 'whatsapp', width: 15 },
            { header: 'Prodi', key: 'prodi', width: 20 },
            { header: 'Dept 1', key: 'dept1', width: 25 },
            { header: 'Div 1', key: 'div1', width: 25 },
            { header: 'Alasan 1', key: 'reason1', width: 40 },
            { header: 'Dept 2', key: 'dept2', width: 25 },
            { header: 'Div 2', key: 'div2', width: 25 },
            { header: 'Alasan 2', key: 'reason2', width: 40 },
            { header: 'Org Exp', key: 'org_experience', width: 40 },
            { header: 'Skills', key: 'skills', width: 40 },
            { header: 'Komitmen', key: 'commitment', width: 40 },
            { header: 'Why Serve', key: 'main_reason', width: 40 },
            { header: 'Aktif 1 Periode', key: 'active_period', width: 15 },
            { header: 'Bersedia Pindah', key: 'willing_transfer', width: 15 },
            { header: 'Sertif URL', key: 'sertif_url', width: 30 },
            { header: 'Portfolio URL', key: 'portfolio_url', width: 30 }
        ];

        worksheet.addRows(transformedRows);
        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="OPREC_BPH_PMK_ITERA_2026.xlsx"');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Excel Export failed:', err);
        res.status(500).json({ error: 'Failed to export data', details: err.message });
    }
});

// Export to CSV endpoint
app.get('/api/export', authenticateToken, async (req, res) => {
    try {
        const { data: rows, error } = await supabase
            .from('registrations')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'No data to export' });
        }

        const fields = [
            'id', 'created_at', 'name', 'nim', 'email', 'whatsapp', 'prodi',
            'dept1', 'div1', 'reason1',
            'dept2', 'div2', 'reason2',
            'org_experience', 'skills', 'commitment', 'main_reason',
            'active_period', 'willing_transfer',
            'sertif_url', 'portfolio_url'
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(rows);

        res.header('Content-Type', 'text/csv');
        res.attachment('registrations.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export failed:', err);
        res.status(500).json({ error: 'Failed to export data', details: err.message });
    }
});

// Admin API: Get Registrations
app.get('/api/registrations', authenticateToken, async (req, res) => {
    try {
        const { sort_by = 'created_at', order = 'DESC', dept, div } = req.query;

        let query = supabase.from('registrations').select('*');

        if (dept) {
            query = query.or(`dept1.eq.${dept},dept2.eq.${dept}`);
        }

        if (div) {
            query = query.or(`div1.eq.${div},div2.eq.${div}`);
        }

        const allowedSorts = ['name', 'nim', 'created_at'];
        const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'created_at';

        query = query.order(sortColumn, { ascending: order.toUpperCase() === 'ASC' });

        const { data, error } = await query;
        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Fetch failed:', err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

app.get('/', (req, res) => {
    res.send('BPH Recruitment API is running (Supabase + R2)');
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
