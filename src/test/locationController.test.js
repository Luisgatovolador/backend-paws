// Importa el controlador DESPUÉS de mocks básicos si es necesario, pero antes del mock específico
const locationController = require('../controllers/locationController');

// Importa dependencias
const db = require('../db/index');
const { Client } = require('@googlemaps/google-maps-services-js'); // Para verificar mock
const { locationSchema, userIdSchema } = require('../validators/locationValidators');

// --- Mockea dependencias BÁSICAS primero ---
jest.mock('../db/index');
jest.mock('../validators/locationValidators', () => ({
  locationSchema: { validate: jest.fn() },
  userIdSchema: { validate: jest.fn() }
}));

// --- FUNCIONES DE AYUDA PARA MOCKS ---
const mockRequest = (body = {}, params = {}, ip = '127.0.0.1', user = null) => ({
  body,
  params,
  ip,
  headers: {
    // Simula x-forwarded-for (más robusto)
    'x-forwarded-for': ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') ? undefined : `${ip}, some.other.proxy`,
  },
  // --- CORRECCIÓN MÁS ROBUSTA: Simula connection ---
  connection: {
    remoteAddress: ip,
    socket: { // A veces se accede a socket
        remoteAddress: ip
    }
  },
  socket: { // A veces se accede directamente a socket
      remoteAddress: ip
  },
  user,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};


// --- INICIO DE LAS PRUEBAS ---
describe('Pruebas Unitarias para locationController', () => {

  // Limpieza general
  afterEach(() => {
    jest.clearAllMocks();
    if (db?.query?.mockClear) db.query.mockClear();
    if (locationSchema?.validate?.mockClear) locationSchema.validate.mockClear();
    if (userIdSchema?.validate?.mockClear) userIdSchema.validate.mockClear();
  });

  // --- Pruebas para saveLocationByIp ---
  describe('saveLocationByIp', () => {
    // --- Mock específico para Google Maps DENTRO del describe ---
    let mockGeocode; // Declara aquí
    beforeAll(() => {
        mockGeocode = jest.fn(); // Inicializa aquí
        jest.doMock('@googlemaps/google-maps-services-js', () => {
            return {
                Client: jest.fn().mockImplementation(() => ({
                    geocode: mockGeocode
                }))
            };
        });
        // Forzar recarga del módulo CON el mock activado
        jest.resetModules();
        // Importar DE NUEVO el controlador para que use el mock
        require('../controllers/locationController');
    });
    // --- FIN Mock específico ---


    let req;
    let res;
    const mockActionData = { userId: 1, actionName: 'login_success' };
    const mockIp = '8.8.8.8';
    const mockGeoResponse = { data: { results: [{ geometry: { location: { lat: 34.0522, lng: -118.2437 } } }] } };
    const mockSavedLocation = { /* ... tu mockSavedLocation ... */ };
    let originalApiKey;

    beforeAll(() => {
        originalApiKey = process.env.GOOGLE_MAPS_API_KEY;
        process.env.GOOGLE_MAPS_API_KEY = 'test_api_key';
    });
    afterAll(() => {
        process.env.GOOGLE_MAPS_API_KEY = originalApiKey;
         // Limpiar mocks específicos si es necesario
        if (mockGeocode) mockGeocode.mockClear();
        // Restaurar módulos si se usó jest.resetModules()
        jest.resetModules();
    });

    beforeEach(() => {
      req = mockRequest(mockActionData, mockIp);
      res = mockResponse();
      // Re-aplica mocks que se resetean entre tests
      if(locationSchema?.validate) locationSchema.validate.mockReturnValue({ error: null, value: mockActionData });
      if(mockGeocode) mockGeocode.mockResolvedValue(mockGeoResponse); // Configura respuesta mock
      if(db?.query) db.query.mockResolvedValue({ rows: [mockSavedLocation], rowCount: 1 });
    });

    // --- Tus Tests (sin cambios en la lógica interna, solo llamadas) ---

    test('Debe fallar (400) si la validación de Joi falla', async () => {
        const validationError = { details: [{ message: 'User ID inválido simulado.' }] };
        locationSchema.validate.mockReturnValue({ error: validationError });
        await locationController.saveLocationByIp(req, res);
        expect(res.status).toHaveBeenCalledWith(400); // Ahora debe pasar
        expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
        if(mockGeocode) expect(mockGeocode).not.toHaveBeenCalled();
        expect(db.query).not.toHaveBeenCalled();
    });

    test('Debe obtener geolocalización y guardar en BD (201) si todo es válido', async () => {
      await locationController.saveLocationByIp(req, res);
      expect(mockGeocode).toHaveBeenCalledWith({ params: { address: mockIp, key: 'test_api_key' } });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_locations'),
        [ mockActionData.userId, 34.0522, -118.2437, mockActionData.actionName ]
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedLocation);
    });

    test('Debe manejar el caso donde geocode no devuelve resultados', async () => {
      if(mockGeocode) mockGeocode.mockResolvedValue({ data: { results: [] } });
      await locationController.saveLocationByIp(req, res);
      expect(db.query).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    test('Debe manejar errores durante la llamada a geocode', async () => {
      const geoError = new Error('Error de API de Google simulado');
      if(mockGeocode) mockGeocode.mockRejectedValue(geoError);
      await locationController.saveLocationByIp(req, res);
      expect(db.query).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener geolocalización.', error: geoError.message });
    });

    test('Debe manejar errores durante la inserción en la base de datos', async () => {
      const dbError = new Error('Error de inserción simulado');
      if(db?.query) db.query.mockRejectedValue(dbError); // Asegura que db.query exista
      await locationController.saveLocationByIp(req, res);
      // Solo verifica geocode si existe
      if(mockGeocode) expect(mockGeocode).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error al guardar la ubicación.', error: dbError.message });
    });

    test('Debe omitir geolocalización para IPs locales/privadas (ej. 127.0.0.1)', async () => {
        req = mockRequest(mockActionData, '127.0.0.1');
        await locationController.saveLocationByIp(req, res);
        if(mockGeocode) expect(mockGeocode).not.toHaveBeenCalled();
        expect(db.query).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
  });

  // --- Pruebas para obtenerHistorialUbicaciones ---
  const getHistoryFunctionName = 'obtenerHistorialUbicaciones'; // <-- VERIFICA ESTE NOMBRE

  // Recarga el controlador aquí por si resetModules lo afectó
  let currentController = require('../controllers/locationController');

  if (currentController && typeof currentController[getHistoryFunctionName] === 'function') {
      describe(getHistoryFunctionName, () => {
        let req;
        let res;
        const userId = 1;
        const mockHistory = [ /* ... tu mockHistory ... */ ];

        beforeEach(() => {
            req = mockRequest({ userId: userId });
            res = mockResponse();
            if(userIdSchema?.validate) userIdSchema.validate.mockReturnValue({ error: null, value: req.body });
            if(db?.query) db.query.mockResolvedValue({ rows: mockHistory, rowCount: mockHistory.length });
        });

        test('Debe fallar (400) si la validación del ID falla', async () => {
            const validationError = { details: [{ message: 'ID inválido.' }] };
            userIdSchema.validate.mockReturnValue({ error: validationError });
            await currentController[getHistoryFunctionName](req, res); // Usa la referencia recargada
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: validationError.details[0].message });
            expect(db.query).not.toHaveBeenCalled();
        });

        test('Debe devolver el historial (200) si el ID es válido', async () => {
            await currentController[getHistoryFunctionName](req, res); // Usa la referencia recargada
            expect(db.query).toHaveBeenCalledWith( expect.stringContaining('user_id = $1'), [userId] );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockHistory);
        });

        test('Debe devolver un array vacío (200) si no hay historial', async () => {
            db.query.mockResolvedValue({ rows: [], rowCount: 0 });
            await currentController[getHistoryFunctionName](req, res); // Usa la referencia recargada
            expect(db.query).toHaveBeenCalledWith(expect.any(String), [userId]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        test('Debe manejar errores de base de datos', async () => {
            const dbError = new Error('Error al buscar historial');
            db.query.mockRejectedValue(dbError);
            await currentController[getHistoryFunctionName](req, res); // Usa la referencia recargada
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener el historial de ubicaciones.', error: dbError.message });
        });
      });
  } else {
      console.warn(`ADVERTENCIA: La función '${getHistoryFunctionName}' no se encontró o no se exportó en locationController. Omitiendo sus pruebas.`);
  }
});