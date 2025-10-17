'use strict';
const jwt = require('jsonwebtoken');
const db = require('../db/index'); 

// Clave secreta para verificar el JWT. DEBE coincidir con la usada para firmar el token.
const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_por_defecto_NO_USAR_EN_PRODUCCION'; 

/**
 * @desc Middleware que verifica si existe un JWT válido.
 * Si es válido, decodifica el token, busca el usuario en la BD y adjunta el usuario (id y rol) al objeto 'req'.
 * @route Aplicar a todas las rutas que requieren que el usuario esté logueado.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Verificar si el token está presente en el encabezado 'Authorization'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // Extraer el token del formato: "Bearer <token>"
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // HTTP 401 Unauthorized
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado. No se proporcionó token de autenticación.' 
        });
    }

    try {
        // 2. Verificar y decodificar el token usando la clave secreta
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Buscar el usuario en la base de datos para obtener su rol actual (es una capa de seguridad extra)
        // Asume que el payload del token tiene un campo 'id'
        const userResult = await db.query(
            'SELECT id, rol FROM usuarios WHERE id = $1', 
            [decoded.id] 
        );

        if (userResult.rowCount === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido. Usuario asociado no encontrado en el sistema.' 
            });
        }
        
        // 4. Adjuntar el objeto de usuario (id y rol) a la solicitud para uso posterior
        req.user = userResult.rows[0]; 
        
        next(); // Continuar
    } catch (error) {
        console.error('Error de verificación de token:', error.message);
        // HTTP 401 Unauthorized (para tokens expirados o corruptos)
        return res.status(401).json({ 
            success: false, 
            message: 'Token inválido o expirado. Vuelva a iniciar sesión.' 
        });
    }
};

/**
 * @desc Middleware de autorización: Verifica que el usuario adjunto en 'req.user' tenga uno de los roles permitidos.
 * DEBE usarse DESPUÉS del middleware 'protect'.
 * @param {...string} roles - Lista de roles permitidos (ej: 'admin', 'editor', 'supervisor').
 */
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // 1. Verificar si el rol del usuario está incluido en la lista de roles permitidos
        if (!req.user || !roles.includes(req.user.rol)) {
            // HTTP 403 Forbidden
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado. Su rol ('${req.user ? req.user.rol : 'N/A'}') no está autorizado para esta operación.` 
            });
        }
        next(); // El usuario tiene el rol correcto, continuar
    };
};