// Clase simple con métodos estáticos para consultar e insertar
const pool = require('../db');
const bcrypt = require('bcrypt');


class Usuario {
constructor({ id, nombre, email, password, rol }) {
this.id = id;
this.nombre = nombre;
this.email = email;
this.password = password;
this.rol = rol;
}


static async all() {
const res = await pool.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id');
return res.rows;
}


static async findByEmail(email) {
const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
return res.rows[0] || null;
}


static async create({ nombre, email, password, rol }) {
const hashed = await bcrypt.hash(password, 10);
const res = await pool.query(
'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
[nombre, email, hashed, rol]
);
return res.rows[0];
}


static async update(id, { nombre, email, rol }) {
    const res = await pool.query(
      'UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4 RETURNING id, nombre, email, rol',
      [nombre, email, rol, id]
    );
    return res.rows[0];
  }

  static async delete(id) {
    const res = await pool.query(
      'DELETE FROM usuarios WHERE id=$1 RETURNING id',
      [id]
    );
    return res.rows[0];
  }
}


module.exports = Usuario;