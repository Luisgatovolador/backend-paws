// --- NO importes authController aquí arriba ---

// Importamos (y simularemos) las dependencias PRIMERO
const db = require('../db/index');
const authValidator = require('../validators/authValidators');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const locationController = require('../controllers/locationController');

// --- SIMULACIÓN (MOCKING) DE DEPENDENCIAS ---

// --- ORDEN CRÍTICO ---
// 1. DEFINE mockSendMail PRIMERO
const mockSendMail = jest.fn();

// 2. MOCKEA nodemailer DESPUÉS, usando la variable ya definida
//    Usamos jest.doMock aquí para más control sobre el hoisting
jest.doMock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail
  })
}));
// --- FIN DEL ORDEN CRÍTICO ---


// Mockea el resto de dependencias (puedes seguir usando jest.mock para estas)
jest.mock('../db/index');
jest.mock('../validators/authValidators');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('speakeasy');
jest.mock('../controllers/locationController');


// --- FUNCIONES DE AYUDA PARA MOCKS ---
const mockRequest = (body = {}, params = {}, user = null) => ({
  body,
  params,
  user,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};


// --- INICIO DE LAS PRUEBAS ---
describe('Pruebas Unitarias para authController', () => {

  // --- CORRECCIÓN: Requiere el controlador DESPUÉS de los mocks ---
  let authController;
  beforeAll(() => {
    // Forzar la carga del módulo AHORA, cuando los mocks ya están definidos
    authController = require('../controllers/authController');
  });
  // --- FIN CORRECCIÓN ---


  const TEST_JWT_SECRET = 'mi_secreto_super_secreto_para_pruebas';
  let originalJwtSecret;

  beforeAll(() => {
    originalJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalJwtSecret;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Limpia el mock específico de sendMail si existe
    if (mockSendMail) {
        mockSendMail.mockClear();
    }
    // Resetea implementaciones si es necesario
    if (db && db.query && typeof db.query.mockClear === 'function') {
        db.query.mockClear();
    }
     if (bcrypt && bcrypt.compare && typeof bcrypt.compare.mockClear === 'function') {
        bcrypt.compare.mockClear();
    }
     if (jwt && jwt.sign && typeof jwt.sign.mockClear === 'function') {
        jwt.sign.mockClear();
    }
    // ... etc para otros mocks importantes
  });

  // --- Pruebas para forgotPassword ---
  describe('forgotPassword', () => {
    let req;
    let res;
    const mockUser = { id: 1, email: 'forgot@example.com', nombre: 'Test Forgot' };

    beforeEach(() => {
      req = mockRequest({ email: 'forgot@example.com' });
      res = mockResponse();
      // Asegurarse de que los mocks de validación existan antes de usarlos
      if (authValidator && authValidator.forgotPasswordSchema) {
        authValidator.forgotPasswordSchema.validate = jest.fn().mockReturnValue({ error: null, value: req.body });
      }
      if(jwt && jwt.sign) jwt.sign.mockReturnValue('mockResetToken');
      if(locationController && locationController.saveLocationByIp) locationController.saveLocationByIp.mockClear(); // Limpiar llamadas previas
      if(mockSendMail) mockSendMail.mockResolvedValue({});
    });

    test('Debe fallar (400) si la validación de Joi falla', async () => {
        const validationError = { details: [{ message: 'Email inválido simulado.' }] };
        authValidator.forgotPasswordSchema.validate.mockReturnValue({ error: validationError });
        await authController.forgotPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
    });

    test('Debe responder 404 si el usuario no existe', async () => {
      db.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await authController.forgotPassword(req, res);
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE email = $1', ['forgot@example.com']);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('Si el correo existe') });
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('Debe actualizar token en BD, enviar correos y responder 200 si el usuario existe', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT
      db.query.mockResolvedValueOnce({}); // UPDATE
      // mockSendMail configurado en beforeEach

      await authController.forgotPassword(req, res);

      expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
        ['mockResetToken', expect.any(Date), mockUser.id]
      );
      expect(mockSendMail).toHaveBeenCalledTimes(2);
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'forgot@example.com', subject: 'Restablecimiento de Contraseña' }));
      expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: mockUser.email, subject: 'Solicitud de restablecimiento de contraseña' }));
      expect(locationController.saveLocationByIp).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Enlace de restablecimiento de contraseña enviado a tu correo.' });
    });

     test('Debe manejar errores de base de datos o envío de correo', async () => {
        db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT OK
        db.query.mockRejectedValueOnce(new Error('Error de BD simulado')); // Falla UPDATE
        await authController.forgotPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
     });
  });

  // --- Pruebas para resetPassword ---
  describe('resetPassword', () => {
    let req;
    let res;
    const mockToken = 'validResetToken';
    const mockUser = { id: 1, email: 'reset@example.com' };

    beforeEach(() => {
        req = mockRequest({ newPassword: 'NewPassword123' }, { token: mockToken });
        res = mockResponse();
        if(authValidator && authValidator.resetPasswordSchema) authValidator.resetPasswordSchema.validate = jest.fn().mockReturnValue({ error: null, value: req.body });
        if(bcrypt && bcrypt.hash) bcrypt.hash.mockResolvedValue('hashedNewPassword');
        if(locationController && locationController.saveLocationByIp) locationController.saveLocationByIp.mockClear();
        if(mockSendMail) mockSendMail.mockResolvedValue({});
    });

    test('Debe fallar (400) si la validación de Joi falla', async () => {
        const validationError = { details: [{ message: 'Contraseña inválida simulada.' }] };
        authValidator.resetPasswordSchema.validate.mockReturnValue({ error: validationError });
        await authController.resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
    });

    test('Debe fallar (400) si el token es inválido o expirado', async () => {
        db.query.mockResolvedValue({ rows: [], rowCount: 0 });
        await authController.resetPassword(req, res);
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('reset_password_token = $1'), [mockToken]);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'El token es inválido o ha expirado.' });
    });

    test('Debe actualizar contraseña, enviar correo y responder 200 si el token es válido', async () => {
        db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT
        db.query.mockResolvedValueOnce({}); // UPDATE

        await authController.resetPassword(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE usuarios SET password = $1'),
            ['hashedNewPassword', mockUser.id]
        );
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: mockUser.email, subject: 'Contraseña actualizada correctamente' }));
        expect(locationController.saveLocationByIp).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña actualizada correctamente.' });
    });

     test('Debe manejar errores de base de datos', async () => {
        db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT OK
        db.query.mockRejectedValueOnce(new Error('Error de BD en UPDATE')); // Falla UPDATE
        await authController.resetPassword(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor.' });
     });
  });

  // --- Pruebas para login ---
  describe('login', () => {
    let req;
    let res;

    beforeEach(() => {
      req = mockRequest({ email: 'test@example.com', password: 'password123' });
      res = mockResponse();
      if(authValidator && authValidator.loginSchema) authValidator.loginSchema.validate = jest.fn().mockReturnValue({ error: null, value: req.body });
      if(locationController && locationController.saveLocationByIp) locationController.saveLocationByIp.mockClear();
      if(mockSendMail) mockSendMail.mockResolvedValue({});
    });

    test('Debe fallar (401) si el usuario no existe', async () => {
      db.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await authController.login(req, res);
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE email = $1', ['test@example.com']);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Credenciales inválidas.' });
    });

    test('Debe fallar (401) si la contraseña es incorrecta', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashedPassword' };
      db.query.mockResolvedValue({ rows: [mockUser], rowCount: 1 });
      bcrypt.compare.mockResolvedValue(false);
      await authController.login(req, res);
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Credenciales inválidas.' });
    });

    test('Debe enviar código por email y responder 200 si las credenciales son correctas y el email se envía', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashedPassword' };
      db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT
      db.query.mockResolvedValueOnce({}); // UPDATE verification_code
      bcrypt.compare.mockResolvedValue(true); // Contraseña OK
      // mockSendMail configurado en beforeEach

      await authController.login(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE usuarios SET verification_code'), expect.anything());
      expect(mockSendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Se ha enviado un código de verificación a tu correo.',
        needsVerification: true,
        userId: mockUser.id,
        method: 'email'
      });
      expect(locationController.saveLocationByIp).toHaveBeenCalled();
    });

     test('Debe responder para usar TOTP si el envío de email falla', async () => {
      const mockUser = { id: 1, email: 'test@example.com', password: 'hashedPassword' };
      db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // SELECT
      db.query.mockResolvedValueOnce({}); // UPDATE
      bcrypt.compare.mockResolvedValue(true); // Contraseña OK
      // Simula fallo ANTES de llamar
      if(mockSendMail) mockSendMail.mockRejectedValue(new Error('Fallo de conexión'));

      await authController.login(req, res);

      expect(mockSendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('No se pudo enviar el correo. Usa tu aplicación'),
        method: 'totp'
      }));
    });
  });

  // --- Pruebas para verifyCode ---
  describe('verifyCode', () => {
    let req;
    let res;
    const mockUser = {
        id: 1, email: 'test@example.com', verification_code: '123456',
        verification_code_expires: new Date(Date.now() + 600000), // Válido
        twofa_secret: 'BASE32SECRET', is_logged_in: false
    };

    beforeEach(() => {
        req = mockRequest({ userId: 1, code: '123456' });
        res = mockResponse();
        if(authValidator && authValidator.verifyCodeSchema) authValidator.verifyCodeSchema.validate = jest.fn().mockReturnValue({ error: null, value: req.body });
        if(jwt && jwt.sign) jwt.sign.mockReturnValue('mockToken123');
        process.env.JWT_SECRET = TEST_JWT_SECRET;
    });

    test('Debe fallar (400) si el usuario no existe', async () => {
        db.query.mockResolvedValue({ rows: [], rowCount: 0 });
        await authController.verifyCode(req, res);
        expect(db.query).toHaveBeenCalledWith('SELECT * FROM usuarios WHERE id = $1', [1]);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado.' });
    });

    test('Debe fallar (401) si el código (ni email ni TOTP) es inválido', async () => {
        const expiredUser = { ...mockUser, verification_code_expires: new Date(Date.now() - 1000) };
        db.query.mockResolvedValueOnce({ rows: [expiredUser], rowCount: 1 });
        speakeasy.totp = { verify: jest.fn().mockReturnValue(false) };

        req.body.code = 'wrongcode';
        await authController.verifyCode(req, res);

        expect(speakeasy.totp.verify).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Código inválido o expirado.' });
    });

    test('Debe pasar (200) y devolver token si el código de email es válido', async () => {
        db.query.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 }); // Encontrar usuario
        db.query.mockResolvedValueOnce({}); // UPDATE is_logged_in
        db.query.mockResolvedValueOnce({}); // UPDATE para limpiar código

        await authController.verifyCode(req, res);

        expect(db.query).toHaveBeenCalledWith('UPDATE usuarios SET is_logged_in = TRUE WHERE id = $1', [mockUser.id]);
        expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE usuarios SET verification_code = NULL'), [mockUser.id]);
        expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            token: 'mockToken123', method: 'email', message: 'Inicio de sesión exitoso con 2FA (email).'
        });
    });

    test('Debe pasar (200) y devolver token si el código TOTP es válido', async () => {
        const userWithoutEmailCode = { ...mockUser, verification_code: null, verification_code_expires: null };
        db.query.mockResolvedValueOnce({ rows: [userWithoutEmailCode], rowCount: 1 }); // Encontrar usuario
        db.query.mockResolvedValueOnce({}); // UPDATE is_logged_in
        speakeasy.totp = { verify: jest.fn().mockReturnValue(true) };

        req.body.code = 'validTOTP';
        await authController.verifyCode(req, res);

        expect(speakeasy.totp.verify).toHaveBeenCalledWith(expect.objectContaining({ token: 'validTOTP' }));
        expect(db.query).toHaveBeenCalledWith('UPDATE usuarios SET is_logged_in = TRUE WHERE id = $1', [mockUser.id]);
        expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE usuarios SET verification_code = NULL'), expect.anything());
        expect(jwt.sign).toHaveBeenCalledWith({ id: mockUser.id }, TEST_JWT_SECRET, { expiresIn: '1h' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            token: 'mockToken123', method: 'totp'
        }));
    });
  });

  // --- Pruebas para logout ---
  describe('logout', () => {
     test('Debe actualizar is_logged_in a false y responder 200', async () => {
        req = mockRequest({}, {}, { id: 1 });
        res = mockResponse();
        db.query.mockResolvedValue({});

        await authController.logout(req, res);

        expect(db.query).toHaveBeenCalledWith('UPDATE usuarios SET is_logged_in = FALSE WHERE id = $1', [1]);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Sesión cerrada exitosamente.' });
     });

     test('Debe responder 400 si no se identifica al usuario', async () => {
        req = mockRequest({}, {}, null);
        res = mockResponse();

        await authController.logout(req, res);

        expect(db.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: expect.stringContaining('No se pudo identificar') });
     });
   });

});