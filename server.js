const express = require('express');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar cliente de Turso
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
});

// Inicializar tablas en Turso
async function initDb() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT,
        user_phone TEXT,
        discipline TEXT,
        ticket_type TEXT,
        cashea_level INTEGER,
        payment_ref TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Base de datos Turso conectada e inicializada correctamente.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos en Turso:', error);
  }
}

initDb();

// Rutas de API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor Academia Vivace activo' });
});

// Registro de orden / taquilla
app.post('/api/orders', async (req, res) => {
  const { user_name, user_phone, discipline, ticket_type, cashea_level, payment_ref } = req.body;

  try {
    const result = await db.execute({
      sql: `INSERT INTO orders (user_name, user_phone, discipline, ticket_type, cashea_level, payment_ref, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      args: [user_name, user_phone, discipline, ticket_type, cashea_level || 1, payment_ref]
    });

    res.status(201).json({ success: true, orderId: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error('Error al guardar la orden:', error);
    res.status(500).json({ success: false, error: 'Error al procesar la orden' });
  }
});

// Obtener todas las órdenes (para reporte)
app.get('/api/orders', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM orders ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al consultar órdenes' });
  }
});

// Servir la taquilla y la página principal
app.get('/taquilla', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'taquilla.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor web obligando a escuchar en 0.0.0.0 para Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});