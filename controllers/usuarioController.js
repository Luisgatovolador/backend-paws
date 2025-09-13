const Usuario = require('../models/usuario');

exports.lista = async (req, res) => {
  try {
    const usuarios = await Usuario.all();
    res.json(usuarios); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const usuario = await Usuario.create({ nombre, email, password, rol });
    res.status(201).json({ mensaje: "Usuario creado", usuario }); // JSON con id incluido
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, email, rol } = req.body;
    const usuario = await Usuario.update(id, { nombre, email, rol });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ mensaje: "Usuario actualizado", usuario });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usuario = await Usuario.delete(id);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ mensaje: `Usuario ${id} eliminado` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
