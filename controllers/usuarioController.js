const Usuario = require('../models/usuario');


exports.lista = async (req, res) => {
try {
const usuarios = await Usuario.all();
res.render('usuarios', { usuarios });
} catch (err) {
console.error(err);
res.status(500).send('Error al obtener usuarios');
}
};


exports.formNuevo = (req, res) => {
res.render('nuevo', { error: null, form: {} });
};


exports.crear = async (req, res) => {
try {
const { nombre, email, password, rol } = req.body;
if (!nombre || !email || !password || !rol) {
return res.status(400).render('nuevo', { error: 'Todos los campos son obligatorios', form: req.body });
}


const existe = await Usuario.findByEmail(email);
if (existe) {
return res.status(400).render('nuevo', { error: 'El email ya está registrado', form: req.body });
}


await Usuario.create({ nombre, email, password, rol });
res.redirect('/usuarios');
} catch (err) {
console.error(err);
res.status(500).render('nuevo', { error: 'Error al crear usuario', form: req.body });
}
};