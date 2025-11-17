const pool = require('../db');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { 
  crearUsuarioSchema, 
  eliminarUsuarioSchema,
  actualizarUsuarioSchema,
  obtenerUsuarioSchema 
} = require('../validators/usuarioValidation');
const transporter = require('../config/transporter');  // ← ESTA ES LA IMPORTACIÓN CORRECTA


// Crear usuario
const crearUsuario = async (req, res) => {
  try {
    const { error, value } = crearUsuarioSchema.validate(req.body, { convert: false });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { nombre, email, password, rol } = value;

    // Hash contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Secreto 2FA
    const secret = speakeasy.generateSecret({ length: 20 });
    const secretBase32 = secret.base32;

    // Insertar usuario
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol, twofa_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
      [nombre, email, hashedPassword, rol, secretBase32]
    );

    // QR 2FA
    const qrUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Enviar correo
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Bienvenido a la plataforma',
      html: `
        <p>Hola ${nombre},</p>
        <p>Tu cuenta se creó exitosamente con el rol <strong>${rol}</strong>.</p>
        <p>Se configuró autenticación de doble factor (2FA) para mayor seguridad.</p>
      `,
    });

    res.status(201).json({
      mensaje: 'Usuario creado con éxito.',
      usuario: result.rows[0],
      qrUrl
    });

  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
};


// Obtener usuarios
const obtenerUsuarios = async (req, res) => {
  try {
    const { error, value } = obtenerUsuarioSchema.validate(req.body,{ convert: false });
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { id } = value;
    let result;

    if (!id) {
      result = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id ASC');
    } else {
      result = await pool.query(
        'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
    }

    res.json(result.rows);

  } catch (err) {
    res.status(500).json({
      message: 'Error al obtener los usuarios.',
      error: err.message
    });
  }
};


// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.json({
        success: false,
        message: "El ID debe ser un número entero positivo."
      });
    }

    const result = await pool.query(
      "DELETE FROM usuarios WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.json({
        success: false,
        message: "Usuario no encontrado."
      });
    }

    // Enviar correo
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: result.rows[0].email,
        subject: "Cuenta eliminada",
        html: `
          <p>Hola ${result.rows[0].nombre},</p>
          <p>Tu cuenta ha sido eliminada del sistema.</p>
        `,
      });
    } catch (emailErr) {
      console.error("Error enviando correo de eliminación:", emailErr);
    }

    return res.json({
      success: true,
      message: "Usuario eliminado con éxito.",
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error("Error al eliminar usuario:", err);
    return res.json({
      success: false,
      message: "Error interno al eliminar el usuario."
    });
  }
};


// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { error, value } = actualizarUsuarioSchema.validate(req.body);

    if (error) {
      return res.json({ success: false, message: error.details[0].message });
    }

    const { id, nombre, email, rol } = value;

    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, email = $2, rol = $3 WHERE id = $4 RETURNING id, nombre, email, rol',
      [nombre, email, rol, id]
    );

    if (result.rowCount === 0) {
      return res.json({ success: false, message: 'Usuario no encontrado.' });
    }

    // Enviar correo
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Cuenta actualizada',
        html: `
          <p>Hola ${nombre},</p>
          <p>Tu información ha sido actualizada con éxito.</p>
        `,
      });
    } catch (emailErr) {
      console.error('Error enviando correo de actualización:', emailErr);
    }

    return res.json({
      success: true,
      message: 'Usuario actualizado con éxito.',
      usuario: result.rows[0]
    });

  } catch (err) {
    console.error('Error en actualizarUsuario:', err);
    return res.json({ success: false, message: 'Error interno al actualizar usuario.' });
  }
};


module.exports = {
  crearUsuario,
  obtenerUsuarios,
  eliminarUsuario,
  actualizarUsuario
};
