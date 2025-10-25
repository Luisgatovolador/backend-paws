const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // convertir a número
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME // Asegúrate que DB_NAME sea la variable correcta en tu .env
});

// --- CORRECCIÓN AQUÍ ---
// Solo intentar conectar si NO estamos en entorno de pruebas ('test')
if (process.env.NODE_ENV !== 'test') {
  pool.connect()
    .then(() => console.log('Conectado a la base de datos..'))
    .catch(err => console.error('Error de conexión:', err));
}
// --- FIN CORRECCIÓN ---

module.exports = pool;