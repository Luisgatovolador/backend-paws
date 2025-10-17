const db = require('../db/index');
const {
  crearProveedorSchema,
  actualizarProveedorSchema,
  buscarProveedorSchema,

} = require('../validators/proveedorValidator');

// Función para manejar errores de base de datos de forma descriptiva
const handleDbError = (res, error) => {
  if (error.code === '23505') { // Error de restricción UNIQUE
    return res.status(409).json({
      message: 'Error: Ya existe un proveedor con el mismo nombre y teléfono.',
    });
  }
  if (error.code === '23503') { // Error de FOREIGN KEY
     return res.status(409).json({
      message: 'Error: No se puede eliminar el proveedor porque está asociado a uno o más movimientos.',
    });
  }
  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
};

// POST /api/proveedores - Crear un nuevo proveedor
exports.crearProveedor = async (req, res) => {
  // 1. Validar el formato de los datos con Joi (esto no cambia)
  const { error } = crearProveedorSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { nombre, telefono, contacto } = req.body;

  try {
    // --- INICIO DE LA NUEVA VALIDACIÓN EN EL BACKEND ---

    // 2. Consultar la BD para buscar duplicados por nombre O por teléfono
    const existingProvider = await db.query(
      'SELECT nombre, telefono FROM proveedores WHERE nombre = $1 OR telefono = $2',
      [nombre, telefono]
    );

    // 3. Si se encuentra al menos un resultado, determinar cuál campo es el duplicado
    if (existingProvider.rowCount > 0) {
      const duplicate = existingProvider.rows[0];
      if (duplicate.nombre === nombre) {
        // Devolver un error específico para el nombre
        return res.status(409).json({ // 409 Conflict es el código correcto para duplicados
          message: `Error: Ya existe un proveedor con el nombre "${nombre}".`
        });
      }
      if (duplicate.telefono === telefono) {
        // Devolver un error específico para el teléfono
        return res.status(409).json({
          message: `Error: Ya existe un proveedor con el teléfono "${telefono}".`
        });
      }
    }

    // --- FIN DE LA NUEVA VALIDACIÓN ---

    // 4. Si no se encontraron duplicados, proceder con la inserción
    const result = await db.query(
      'INSERT INTO proveedores (nombre, telefono, contacto) VALUES ($1, $2, $3) RETURNING *',
      [nombre, telefono, contacto]
    );
    res.status(201).json(result.rows[0]);

  } catch (error) {
    // El 'handleDbError' sigue siendo útil para otros errores inesperados
    handleDbError(res, error);
  }
};

// GET /api/proveedores - Obtener todos los proveedores
exports.obtenerProveedores = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    handleDbError(res, error);
  }
};


// GET /api/proveedores/:id -> Obtener un proveedor por ID
exports.obtenerProveedorPorId = async (req, res) => {
  // 1. Validar la entrada con el nuevo esquema de búsqueda
  const { error, value } = buscarProveedorSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { id_proveedor, nombre } = value; // Usar 'value' de Joi

  try {
    // 2. Construir la consulta SQL dinámicamente
    let queryText = 'SELECT * FROM proveedores WHERE';
    const queryParams = [];
    const conditions = [];

    if (id_proveedor) {
      queryParams.push(id_proveedor);
      conditions.push(`id_proveedor = $${queryParams.length}`);
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
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }

    // Devolvemos un array, ya que la búsqueda por nombre puede traer múltiples resultados
    res.status(200).json(result.rows);
    
  } catch (error) {
    handleDbError(res, error);
  }
};

// PUT /api/proveedores/:id - Actualizar un proveedor
// PUT /api/proveedores/update - Actualizar un proveedor
exports.actualizarProveedor = async (req, res) => {
  const { id_proveedor, nombre, telefono, contacto } = req.body;

  if (!id_proveedor) {
    return res.status(400).json({ message: 'El campo id_proveedor es requerido para actualizar.' });
  }

  const { error } = actualizarProveedorSchema.validate({ nombre, telefono, contacto });
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    // --- 2. NUEVA VALIDACIÓN DE DUPLICADOS PARA ACTUALIZAR ---
    if (nombre || telefono) {
      const queryText = 'SELECT id_proveedor, nombre, telefono FROM proveedores WHERE (nombre = $1 OR telefono = $2) AND id_proveedor != $3';
      const queryParams = [nombre, telefono, id_proveedor];
      
      const existingProvider = await db.query(queryText, queryParams);

      if (existingProvider.rowCount > 0) {
        const duplicate = existingProvider.rows[0];
        if (duplicate.nombre === nombre) {
          return res.status(409).json({ message: `Error: El nombre "${nombre}" ya está en uso por otro proveedor.` });
        }
        if (duplicate.telefono === telefono) {
          return res.status(409).json({ message: `Error: El teléfono "${telefono}" ya está en uso por otro proveedor.` });
        }
      }
    }
    // --- FIN DE LA NUEVA VALIDACIÓN ---

    // 3. Obtener valores actuales
    const actual = await db.query('SELECT * FROM proveedores WHERE id_proveedor = $1', [id_proveedor]);
    if (actual.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }
    const proveedorActual = actual.rows[0];

    // 4. Preparar la actualización
    const nombreActualizado = nombre !== undefined ? nombre : proveedorActual.nombre;
    const telefonoActualizado = telefono !== undefined ? telefono : proveedorActual.telefono;
    const contactoActualizado = contacto !== undefined ? contacto : proveedorActual.contacto;

    const result = await db.query(
      'UPDATE proveedores SET nombre = $1, telefono = $2, contacto = $3 WHERE id_proveedor = $4 RETURNING *',
      [nombreActualizado, telefonoActualizado, contactoActualizado, id_proveedor]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    handleDbError(res, error);
  }
};

// DELETE /api/proveedores/:id - Eliminar un proveedor
exports.eliminarProveedor = async (req, res) => {
  // --- CAMBIO AQUÍ ---
  const { id_proveedor } = req.body; // Lee desde el body
  // --- FIN CAMBIO ---

  if (!id_proveedor) {
     return res.status(400).json({ message: 'El campo id_proveedor es requerido.' });
  }
  
  try {
    const result = await db.query('DELETE FROM proveedores WHERE id_proveedor = $1 RETURNING *', [
      id_proveedor, // Usa la variable
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado.' });
    }
    res.status(200).json({ message: 'Proveedor eliminado exitosamente.', proveedor: result.rows[0] });
  } catch (error) {
    // ... (tu manejo de errores 23503) ...
    handleDbError(res, error);
  }
};