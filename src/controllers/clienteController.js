const db = require('../db/index');
const {
  crearClienteSchema,
  actualizarClienteSchema,
  buscarClienteSchema, // --- AÑADE ESTE ---
} = require('../validators/clienteValidator');

// Función para manejar errores comunes de la base de datos
const handleDbError = (res, error) => {
  if (error.code === '23505') { // Error de restricción UNIQUE
    return res.status(409).json({
      message: 'Error: Ya existe un cliente con el mismo nombre y teléfono.',
    });
  }
  if (error.code === '23503') { // Error de llave foránea
     return res.status(409).json({
      message: 'Error: No se puede eliminar el cliente porque está asociado a uno o más movimientos.',
    });
  }
  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
};

// Crear un nuevo cliente
exports.crearCliente = async (req, res) => {
  const { error } = crearClienteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { nombre, telefono, contacto } = req.body;

  try {
    // Validar duplicados en el backend antes de insertar
    const existingClient = await db.query(
      'SELECT nombre, telefono FROM clientes WHERE nombre = $1 OR telefono = $2',
      [nombre, telefono]
    );

    if (existingClient.rowCount > 0) {
      const duplicate = existingClient.rows[0];
      if (duplicate.nombre === nombre) {
        return res.status(409).json({ message: `Error: Ya existe un cliente con el nombre "${nombre}".` });
      }
      if (duplicate.telefono === telefono) {
        return res.status(409).json({ message: `Error: Ya existe un cliente con el teléfono "${telefono}".` });
      }
    }

    const result = await db.query(
      'INSERT INTO clientes (nombre, telefono, contacto) VALUES ($1, $2, $3) RETURNING *',
      [nombre, telefono, contacto]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

// Obtener todos los clientes
exports.obtenerClientes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY nombre ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    handleDbError(res, error);
  }
};

// Obtener un cliente por ID
// MODIFICA ESTA FUNCIÓN
// POST /api/v1/clientes/detail -> Buscar cliente por ID o Nombre
exports.obtenerClientePorId = async (req, res) => {
  // 1. Validar la entrada con el nuevo esquema de búsqueda
  const { error, value } = buscarClienteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { id_cliente, nombre } = value; // Usar 'value' de Joi

  try {
    // 2. Construir la consulta SQL dinámicamente
    let queryText = 'SELECT * FROM clientes WHERE';
    const queryParams = [];
    const conditions = [];

    if (id_cliente) {
      queryParams.push(id_cliente);
      conditions.push(`id_cliente = $${queryParams.length}`);
    }

    if (nombre) {
      // Usamos ILIKE y wildcards (%) para una búsqueda flexible
      queryParams.push(`%${nombre}%`);
      conditions.push(`nombre ILIKE $${queryParams.length}`);
    }

    // 3. Unir las condiciones con 'OR'
    queryText += ' ' + conditions.join(' OR ');

    // 4. Ejecutar la consulta
    const result = await db.query(queryText, queryParams);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    // Devolvemos un array, ya que la búsqueda por nombre puede traer múltiples resultados
    res.status(200).json(result.rows);

  } catch (error) {
    handleDbError(res, error);
  }
};

// Actualizar un cliente
exports.actualizarCliente = async (req, res) => {
  const { id_cliente, nombre, telefono, contacto } = req.body;
  if (!id_cliente) {
     return res.status(400).json({ message: 'El campo id_cliente es requerido para actualizar.' });
  }
  const { error } = actualizarClienteSchema.validate({ nombre, telefono, contacto });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // Validar duplicados antes de actualizar
    if (nombre || telefono) {
      const existing = await db.query(
        'SELECT * FROM clientes WHERE (nombre = $1 OR telefono = $2) AND id_cliente != $3',
        [nombre, telefono, id_cliente]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ message: 'El nuevo nombre o teléfono ya está en uso por otro cliente.' });
      }
    }

    const actual = await db.query('SELECT * FROM clientes WHERE id_cliente = $1', [id_cliente]);
    if (actual.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }

    const clienteActual = actual.rows[0];
    const nombreActualizado = nombre !== undefined ? nombre : clienteActual.nombre;
    const telefonoActualizado = telefono !== undefined ? telefono : clienteActual.telefono;
    const contactoActualizado = contacto !== undefined ? contacto : clienteActual.contacto;

    const result = await db.query(
      'UPDATE clientes SET nombre = $1, telefono = $2, contacto = $3 WHERE id_cliente = $4 RETURNING *',
      [nombreActualizado, telefonoActualizado, contactoActualizado, id_cliente]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

// Eliminar un cliente
exports.eliminarCliente = async (req, res) => {
  const { id_cliente } = req.body;
  if (!id_cliente) {
     return res.status(400).json({ message: 'El campo id_cliente es requerido.' });
  }
  try {
    const result = await db.query('DELETE FROM clientes WHERE id_cliente = $1 RETURNING *', [id_cliente]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Cliente no encontrado.' });
    }
    res.status(200).json({ message: 'Cliente eliminado exitosamente.', cliente: result.rows[0] });
  } catch (error) {
    handleDbError(res, error);
  }
};