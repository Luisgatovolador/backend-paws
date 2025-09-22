const pool = require('../db');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { crearUsuarioSchema, eliminarUsuarioSchema } = require('../validators/usuarioValidation');

// Crear usuario
const crearUsuario = async (req, res) => {
  try {
    // ✅ Validación con Joi
    const { error, value } = crearUsuarioSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, email, password, rol } = value;

    // 1Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2️⃣ Generar secreto único para 2FA
    const secret = speakeasy.generateSecret({ length: 20 });
    const secretBase32 = secret.base32;

    // 3️⃣ Guardar usuario en la base de datos
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol, twofa_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
      [nombre, email, hashedPassword, rol, secretBase32]
    );

    // 4️⃣ Generar QR para el 2FA
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({ 
      mensaje: 'Usuario creado con éxito.', 
      usuario: result.rows[0], 
      qrUrl 
    });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
};

// Obtener todos los usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener los usuarios.', error: err.message });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    
    const { error, value } = eliminarUsuarioSchema.validate(req.params);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { id } = value;

    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.json({ message: 'Usuario eliminado con éxito.', usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar el usuario.', error: err.message });
  }
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  eliminarUsuario
};
