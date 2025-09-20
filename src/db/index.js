const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // convertir a número
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Para probar la conexión inmediatamente
pool.connect()
  .then(() => console.log('Conectado a la base de datos..'))
  .catch(err => console.error('Error de conexión:', err));

module.exports = pool; 