'use strict';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('bcrypt');
jest.mock('qrcode');
jest.mock('speakeasy');

const pool = require('../db');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { crearUsuario, obtenerUsuarios, eliminarUsuario, actualizarUsuario } = require('../controllers/usuarioController');

describe('Usuario Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------- crearUsuario --------------------
  describe('crearUsuario', () => {
    it('debería crear un usuario correctamente', async () => {
      const req = { body: { nombre: 'Juan Perez', email: 'juan@gmail.com', password: 'Password1!', rol: 'Empleado' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      bcrypt.hash.mockResolvedValue('hashedPassword');
      speakeasy.generateSecret.mockReturnValue({ base32: 'SECRET123', otpauth_url: 'otpauth://url' });
      QRCode.toDataURL.mockResolvedValue('data:image/png;base64,FAKEQR');
      pool.query.mockResolvedValue({ rows: [{ id: 1, nombre: 'Juan Perez', email: 'juan@gmail.com', rol: 'Empleado' }] });

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        mensaje: 'Usuario creado con éxito.',
        usuario: expect.objectContaining({ id: 1 }),
        qrUrl: 'data:image/png;base64,FAKEQR'
      }));
    });

    it('debería manejar error de validación', async () => {
      const req = { body: { nombre: '', email: 'juan', password: 'pass', rol: '' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringMatching(/password|nombre|rol|email/i)
      }));
    });

    it('debería manejar error de DB al crear usuario', async () => {
      const req = { body: { nombre: 'Error', email: 'error@gmail.com', password: 'Password1!', rol: 'Empleado' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      pool.query.mockRejectedValue(new Error('DB Error'));

      await crearUsuario(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Error al crear usuario'
      }));
    });
  });

  // -------------------- obtenerUsuarios --------------------
  describe('obtenerUsuarios', () => {
    it('debería obtener todos los usuarios', async () => {
      const req = { body: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      pool.query.mockResolvedValue({ rows: [{ id: 1, nombre: 'Juan', email: 'juan@gmail.com', rol: 'Empleado' }] });

      await obtenerUsuarios(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });

    it('debería obtener un usuario por id', async () => {
      const req = { body: { id: 1 } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      pool.query.mockResolvedValue({ rows: [{ id: 1, nombre: 'Juan', email: 'juan@gmail.com', rol: 'Empleado' }] });

      await obtenerUsuarios(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 1 })]));
    });

    it('debería retornar 404 si el usuario no existe', async () => {
      const req = { body: { id: 99 } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      pool.query.mockResolvedValue({ rows: [] });

      await obtenerUsuarios(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debería manejar error de DB al obtener usuarios', async () => {
      const req = { body: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      pool.query.mockRejectedValue(new Error('DB Error'));

      await obtenerUsuarios(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -------------------- eliminarUsuario --------------------
  describe('eliminarUsuario', () => {
    it('debería eliminar un usuario existente', async () => {
      const req = { body: { id: 1 } };
      const res = { json: jest.fn() };
      pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, nombre: 'Juan', email: 'juan@gmail.com' }] });

      await eliminarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('debería manejar id inválido', async () => {
      const req = { body: { id: -1 } };
      const res = { json: jest.fn() };

      await eliminarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('debería manejar error de DB al eliminar usuario', async () => {
      const req = { body: { id: 1 } };
      const res = { json: jest.fn() };
      pool.query.mockRejectedValue(new Error('DB Error'));

      await eliminarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // -------------------- actualizarUsuario --------------------
  describe('actualizarUsuario', () => {
    it('debería actualizar un usuario existente', async () => {
      const req = { body: { id: 1, nombre: 'Juan P', email: 'juanp@gmail.com', rol: 'Empleado' } };
      const res = { json: jest.fn() };
      pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, nombre: 'Juan P', email: 'juanp@gmail.com', rol: 'Empleado' }] });

      await actualizarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('debería manejar error de validación', async () => {
      const req = { body: { id: 'invalid' } };
      const res = { json: jest.fn() };

      await actualizarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('debería manejar error de DB al actualizar usuario', async () => {
      const req = { body: { id: 1, nombre: 'Juan P', email: 'juanp@gmail.com', rol: 'Empleado' } };
      const res = { json: jest.fn() };
      pool.query.mockRejectedValue(new Error('DB Error'));

      await actualizarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('debería retornar usuario no encontrado si no existe', async () => {
      const req = { body: { id: 99, nombre: 'NoUser', email: 'nouser@gmail.com', rol: 'Empleado' } };
      const res = { json: jest.fn() };
      pool.query.mockResolvedValue({ rowCount: 0, rows: [] });

      await actualizarUsuario(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Usuario no encontrado.' }));
    });
  });
});
