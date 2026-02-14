// server.js
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import { Parser } from 'json2csv';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// Database connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+07:00'
});

// Test connection endpoint
app.get('/api/test', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        res.json({ message: 'Database connected successfully!' });
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// Create table if not exists (Helper - usually use migrations, but for simplicity here)
const initDb = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        nim VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        dept1 VARCHAR(100) NOT NULL,
        div1 VARCHAR(100) NOT NULL,
        reason1 TEXT,
        dept2 VARCHAR(100),
        div2 VARCHAR(100),
        reason2 TEXT,
        willing_transfer BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('Database initialized: registrations table ready.');
        connection.release();
    } catch (err) {
        console.error('Database initialization failed:', err);
    }
};

if (process.env.NODE_ENV !== 'production') {
    initDb();
}

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

// Register form endpoint
app.post('/api/register', async (req, res) => {
    try {
        const {
            name, nim, email, whatsapp,
            dept1, div1, reason1,
            dept2, div2, reason2,
            willing_transfer
        } = req.body;

        // Validation Rules
        const nimRegex = /^(123|124|125)\d{6}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+\.(123|124|125)\d{6}@student\.itera\.ac\.id$/;

        if (!nimRegex.test(nim)) {
            return res.status(400).json({ error: 'Invalid NIM format. Must start with 123, 124, 125 and be 9 digits.' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid Email format. Must be student.itera.ac.id and contain NIM.' });
        }

        // Check if email contains the NIM provided
        if (!email.includes(nim)) {
            return res.status(400).json({ error: 'Email must contain your NIM.' });
        }

        // Check if email already exists
        const [existing] = await pool.query('SELECT id FROM registrations WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const [result] = await pool.query(
            `INSERT INTO registrations (
        name, nim, email, whatsapp, 
        dept1, div1, reason1, 
        dept2, div2, reason2, 
        willing_transfer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name, nim, email, whatsapp,
                dept1, div1, reason1,
                dept2, div2, reason2,
                willing_transfer
            ]
        );

        res.status(201).json({ message: 'Registration successful', id: result.insertId });
    } catch (err) {
        console.error('Registration failed:', err);
        res.status(500).json({ error: 'Failed to register', details: err.message });
    }
});

// Export to Excel endpoint
app.get('/api/export/xlsx', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No data to export' });
        }

        // Load departments data manually since we can't easily import JSON with assertions in all envs
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

        // Transform data
        const transformedRows = rows.map(row => ({
            ...row,
            dept1: getDepartmentName(row.dept1),
            div1: getDivisionName(row.dept1, row.div1),
            dept2: getDepartmentName(row.dept2),
            div2: getDivisionName(row.dept2, row.div2),
            willing_transfer: row.willing_transfer ? 'Ya' : 'Tidak',
            created_at: new Date(row.created_at).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        }));

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Registrations');

        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'NIM', key: 'nim', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'WhatsApp', key: 'whatsapp', width: 20 },
            { header: 'Dept 1', key: 'dept1', width: 30 },
            { header: 'Div 1', key: 'div1', width: 30 },
            { header: 'Reason 1', key: 'reason1', width: 40 },
            { header: 'Dept 2', key: 'dept2', width: 30 },
            { header: 'Div 2', key: 'div2', width: 30 },
            { header: 'Reason 2', key: 'reason2', width: 40 },
            { header: 'Bersedia Dipindahkan', key: 'willing_transfer', width: 20 },
            { header: 'Waktu', key: 'created_at', width: 30 }
        ];

        // Add rows
        worksheet.addRows(transformedRows);

        // Style header row
        worksheet.getRow(1).font = { bold: true };

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="OPREC BPH PMK ITERA 2026.xlsx"');

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
        const [rows] = await pool.query('SELECT * FROM registrations ORDER BY created_at DESC');

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No data to export' });
        }

        const fields = [
            'id', 'name', 'nim', 'email', 'whatsapp',
            'dept1', 'div1', 'reason1',
            'dept2', 'div2', 'reason2',
            'willing_transfer', 'created_at'
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

// Admin API: Get Registrations with Filter & Sort
app.get('/api/registrations', authenticateToken, async (req, res) => {
    try {
        const { sort_by = 'created_at', order = 'DESC', dept, div } = req.query;

        let query = 'SELECT * FROM registrations';
        const params = [];
        const conditions = [];

        if (dept) {
            conditions.push('(dept1 = ? OR dept2 = ?)');
            params.push(dept, dept);
        }

        if (div) {
            conditions.push('(div1 = ? OR div2 = ?)');
            params.push(div, div);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Whitelist sort columns to prevent SQL injection
        const allowedSorts = ['name', 'nim', 'created_at'];
        const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        query += ` ORDER BY ${sortColumn} ${sortOrder}`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Fetch failed:', err);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

app.get('/', (req, res) => {
    res.send('BPH Recruitment API is running');
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

export default app;
