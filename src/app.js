const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');

const usuariosRouter = require('./routes/usuarios');
const authRouter = require('./routes/auth');
const locatioRouter = require('./routes/location');
const alertasRouter = require('./routes/alertas');
const productsRouter = require('./routes/products');
const movimientosRoutes = require('./routes/movimientos');
const proveedoresRouter = require('./routes/proveedores');
const clientesRouter = require('./routes/clientes');

const app = express();

// =========================
//   CORS CONFIG RENDER
// =========================
const allowedOrigins = [
  "https://frequissimo.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // Postman / SSR
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origen no permitido por CORS"), false);
    },
    credentials: true,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization"
  })
);

// Necesario para preflight
app.options("/*", cors()); // Express 5


// =========================
//   EXPRESS
// =========================
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({
      messagea: 'El cuerpo de la petición no tiene un formato JSON válido.'
    });
  }
  next();
});

// Vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// =========================
//   RUTAS
// =========================
app.use('/api/v1/usuarios', usuariosRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', locatioRouter);
app.use('/api/v1/proveedores', proveedoresRouter);
app.use('/api/v1/clientes', clientesRouter);
app.use('/api/v1/alertas', alertasRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/movimientos', movimientosRoutes);

// Swagger
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Redirigir /
app.get('/', (req, res) => res.redirect('/usuarios'));

module.exports = app;
