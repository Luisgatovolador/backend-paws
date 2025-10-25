// src/test/alertaController.test.js
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('../db/index');
const { probarAlertaStock, revisarYEnviarAlertasDeStock } = require('../controllers/alertaController');

// Mock de nodemailer
jest.mock('../config/nodemailer', () => ({
  sendMail: jest.fn().mockResolvedValue(true)
}));

const transporter = require('../config/nodemailer');

const app = express();
app.use(bodyParser.json());
app.get('/api/v1/products/stock-alert-test', probarAlertaStock);

// Evitar logs de consola durante los tests
beforeAll(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

describe('Alerta Controller', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    db.query = jest.fn(); // Para consultas directas
  });

  it('debe devolver mensaje de éxito si no hay productos con stock bajo', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // No hay productos con stock bajo

    const res = await request(app).get('/api/v1/products/stock-alert-test');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('No hay productos con bajo stock.');
  });

  it('debe enviar correo si hay productos con stock bajo', async () => {
    const lowStockProducts = [
      { nombre: 'ProductoA', stock_actual: 2, stock_minimo: 5, codigo: 'SKU-A' },
      { nombre: 'ProductoB', stock_actual: 1, stock_minimo: 3, codigo: 'SKU-B' }
    ];

    db.query.mockResolvedValueOnce({ rows: lowStockProducts });

    const res = await request(app).get('/api/v1/products/stock-alert-test');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe(`Correo de alerta enviado para ${lowStockProducts.length} productos.`);
    expect(transporter.sendMail).toHaveBeenCalled();
  });

  it('debe devolver error 500 si falla la DB', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/api/v1/products/stock-alert-test');

    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Error al enviar el correo.');
  });
});
