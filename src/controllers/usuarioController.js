// controllers/usuarioController.js
const pool = require('../db');
const Joi = require('joi');

// Esquema con patrones (patterns) y mensajes claros
const usuarioSchema = Joi.object({
  nombre: Joi.string()
    .pattern(/^(?!\s*$)(?![Nn][Uu][Ll][Ll]$)(?!string$)(?!String$)(?!STRING$)[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/)
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El nombre no puede estar vacío.',
      'string.pattern.base': 'El nombre solo puede contener letras y espacios, y no puede ser "null" ni "string".',
      'string.min': 'El nombre debe tener al menos 2 caracteres.',
      'string.max': 'El nombre no puede superar los 100 caracteres.',
      'any.required': 'El nombre es obligatorio.'
    }),
  email: Joi.string()
    .pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .required()
    .messages({
      'string.empty': 'El correo electrónico no puede estar vacío.',
      'string.pattern.base': 'El correo electrónico debe ser una cuenta válida de @gmail.com',
      'any.required': 'El correo electrónico es obligatorio.'
    }),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,255}$/)
    .required()
    .messages({
      'string.empty': 'La contraseña no puede estar vacía.',
      'string.pattern.base': 'La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula, número y símbolo.',
      'any.required': 'La contraseña es obligatoria.'
    }),
  rol: Joi.string()
    .valid('admin', 'editor', 'lector')
    .required()
    .messages({
      'any.only': 'El rol debe ser uno de: admin, editor o lector.',
      'any.required': 'El rol es obligatorio.'
    })
});

// Crear usuario


const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');


const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // 1Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2️⃣ Generar secreto único para 2FA
    const secret = speakeasy.generateSecret({ length: 20 });
    const secretBase32 = secret.base32; // <- guardas esto en la DB

    // 3️⃣ Guardar usuario en la base de datos, incluyendo el secreto 2FA
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol, twofa_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
      [nombre, email, hashedPassword, rol, secretBase32]
    );

    // 4️⃣ Opcional: generar QR para mostrar al usuario
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.status(201).json({ 
      mensaje: 'Usuario creado con éxito.', 
      usuario: result.rows[0], 
      qrUrl // el usuario puede escanear este QR con su app 2FA
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

// Eliminar usuario por ID
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
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
