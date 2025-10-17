'use strict';

const db = require('../db/index');
const { Client } = require('@googlemaps/google-maps-services-js');
const { locationSchema, userIdSchema } = require('../validators/locationValidators');

// *** Configuración de la API Key ***
// Se lee la clave de Google Maps Platform desde las variables de entorno
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const mapsClient = new Client({}); // Inicializa el cliente

/**
 * Obtiene la dirección IP del cliente, manejando el caso de localhost.
 * @param {object} req - Objeto de la solicitud (request).
 * @returns {string} La dirección IP real o una IP de prueba.
 */
const getClientIp = (req) => {
    // Intenta obtener la IP del encabezado 'x-forwarded-for' o de la conexión remota
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Si la IP es una representación de localhost, usa una IP de prueba
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === '::ffff:127.0.0.1') {
        console.warn('Advertencia: IP local detectada. Usando una IP de prueba (8.8.8.8).');
        return '8.8.8.8'; // IP de prueba para desarrollo
    }
    // Si hay múltiples IPs (proxy), toma la primera
    return ipAddress.split(',')[0].trim();
};

// --------------------------------------------------------------------------------

/**
 * Endpoint principal: Almacena la ubicación del usuario obtenida por IP
 * usando las APIs de Google (Geolocation para Lat/Lon y Geocoding para la dirección).
 * Requiere: userId, actionName en req.body.
 */
exports.saveLocationByIp = async (req, res) => {
    
    try {
        // 1. Validación de la solicitud
        const { error } = locationSchema.validate({userId:req.body.userId, actionName:req.body.actionName});
        
        if (error) {
            console.log(error);
            
            return ;
        }

        const { userId, actionName } = req.body;
        const clientIp = getClientIp(req);

        let lat, lon;
        let fullAddress = 'Dirección no encontrada';
        
        if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'TU_CLAVE_API_REAL_DE_GOOGLE') {
            console.log('ERROR: GOOGLE_API_KEY no está configurada o es el valor por defecto.');
            return ;
        }

        try {
            // =========================================================================
            // 2. OBTENER COORDENADAS (Lat/Lon) con Google Geolocation API
            // La librería usa 'geolocate' para esto.
            // =========================================================================

            const geoResponse = await mapsClient.geolocate({
                params: {
                    key: GOOGLE_API_KEY,
                    // Pasa la IP obtenida a la API, si no es la de prueba
                    ...(clientIp !== '8.8.8.8' && { ipAddress: clientIp }),
                    considerIp: true, // Asegura que la IP sea considerada
                },
            });
            
            if (geoResponse.data && geoResponse.data.location) {
                lat = geoResponse.data.location.lat;
                lon = geoResponse.data.location.lng;
            } else {
                throw new Error('Google Geolocation API no devolvió coordenadas válidas.');
            }

            // =========================================================================
            // 3. OBTENER DIRECCIÓN COMPLETA con Google Geocoding API
            // La librería usa 'reverseGeocode' para convertir Lat/Lon a dirección.
            // =========================================================================

            const geocodingResponse = await mapsClient.reverseGeocode({
                params: {
                    key: GOOGLE_API_KEY,
                    latlng: [lat, lon], // Latitud y longitud como array
                },
            });

            if (geocodingResponse.data.status === 'OK' && geocodingResponse.data.results.length > 0) {
                // Toma la dirección formateada del resultado más preciso
                fullAddress = geocodingResponse.data.results[0].formatted_address;
            } else {
                console.warn(`Advertencia de Geocoding: ${geocodingResponse.data.status}. Usando coordenadas.`);
            }

        } catch (apiError) {
            console.log('Error en la llamada a la API de Google:', apiError.message);
            // El error 'apiError.message' contendrá el error de la API de Google (ej. 'REQUEST_DENIED')
            return ;
        }

        // 4. Procesamiento y guardado en la DB
        const actionResult = await db.query('SELECT id FROM actions_catalog WHERE name = $1', [actionName]);
        if (actionResult.rowCount === 0) {
            return ;
        }
        const actionId = actionResult.rows[0].id;

        // **IMPORTANTE**: La tabla 'user_locations' debe tener las columnas: 
        // user_id, latitude, longitude, action_id, full_address
        await db.query(
            'INSERT INTO user_locations (user_id, latitude, longitude, action_id, full_address) VALUES ($1, $2, $3, $4, $5)',
            [userId, lat, lon, actionId, fullAddress]
        );

        console.log(`Ubicación y dirección guardadas para el usuario ${userId}: ${fullAddress}`);
        ;

    } catch (error) {
        console.log('Error interno al guardar ubicación:', error);
        ;
    }
};

// --------------------------------------------------------------------------------

/**
 * Función para obtener las ubicaciones por ID de usuario.
 * Se ha modificado el SELECT para incluir el nuevo campo full_address.
 */
exports.getLocationsByUserId = async (req, res) => {
    const { error } = userIdSchema.validate(req.body);

    if (error) {
        return ;
    }
    try {
        const { userId } = req.body;
        const result = await db.query(
            'SELECT latitude, longitude, full_address, timestamp, action_id FROM user_locations WHERE user_id = $1 ORDER BY timestamp DESC',
            [userId]
        );
        ;
    } catch (error) {
        console.log('Error al obtener ubicaciones:', error);
        ;
    }
};