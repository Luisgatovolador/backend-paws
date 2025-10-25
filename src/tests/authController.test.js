/**
 * @file tests/authController.test.js
 * Pruebas unitarias completas para authController.js
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('nodemailer');
jest.mock('speakeasy');
jest.mock('../db/index', () => ({ query: jest.fn() }));
jest.mock('../controllers/locationController', () => ({ saveLocationByIp: jest.fn() }));

const db = require('../db/index');
const locationController = require('../controllers/locationController');
const authController = require('../controllers/authController');

// Mock del transporter de nodemailer
const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {}, params: {}, user: { id: 1 } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  // ---------------- FORGOT PASSWORD ----------------
  describe('forgotPassword', () => {
    it('debe retornar 400 si el email es inválido o falta', async () => {
      req.body = { email: '' };
      await authController.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe retornar 404 si el usuario no existe', async () => {
      req.body = { email: 'test@example.com' };
      db.query.mockResolvedValueOnce({ rows: [] });
      await authController.forgotPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe enviar un correo si el usuario existe', async () => {
      req.body = { email: 'test@example.com' };
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com' }] }) // select user
        .mockResolvedValueOnce({}); // update user
      jwt.sign.mockReturnValue('fake_token');
      await authController.forgotPassword(req, res);
      expect(sendMailMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---------------- RESET PASSWORD ----------------
  describe('resetPassword', () => {
    it('debe retornar 400 si el body es inválido', async () => {
      req.body = { newPassword: '' };
      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe retornar 400 si el token no es válido', async () => {
      req.body = { newPassword: 'Abcdef12' };
      req.params = { token: 'fake_token' };
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      await authController.resetPassword(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe actualizar la contraseña correctamente', async () => {
      req.body = { newPassword: 'Abcdef12' };
      req.params = { token: 'fake_token' };
      db.query
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1, email: 'test@example.com' }] })
        .mockResolvedValueOnce({});
      bcrypt.hash.mockResolvedValue('hashed_pw');
      await authController.resetPassword(req, res);
      expect(sendMailMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---------------- LOGIN ----------------
  describe('login', () => {
    it('debe retornar 401 si las credenciales son inválidas', async () => {
      req.body = { email: 'test@example.com', password: '1234' };
      db.query.mockResolvedValueOnce({ rows: [] });
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe retornar 200 si el login es correcto y se envía correo', async () => {
      req.body = { email: 'test@example.com', password: 'Abcd1234' };
      db.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com', password: 'hashed' }] });
      bcrypt.compare.mockResolvedValue(true);
      await authController.login(req, res);
      expect(sendMailMock).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ---------------- VERIFY CODE ----------------
  describe('verifyCode', () => {
    it('debe retornar 400 si el body es inválido', async () => {
      req.body = {};
      await authController.verifyCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe retornar 400 si el usuario no existe', async () => {
      req.body = { userId: 1, code: '123456' };
      db.query.mockResolvedValueOnce({ rows: [] });
      await authController.verifyCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe retornar 200 si el código es válido', async () => {
      req.body = { userId: 1, code: '123456' };
      const now = new Date(Date.now() + 60000);
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1, verification_code: '123456', verification_code_expires: now }] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});
      jwt.sign.mockReturnValue('token');
      await authController.verifyCode(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token' }));
    });
  });

  // ---------------- LOGOUT ----------------
  describe('logout', () => {
    it('debe retornar 400 si no hay user.id', async () => {
      req.user = {};
      await authController.logout(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe cerrar sesión correctamente', async () => {
      await authController.logout(req, res);
      expect(db.query).toHaveBeenCalledWith('UPDATE usuarios SET is_logged_in = FALSE WHERE id = $1', [1]);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
