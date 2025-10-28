const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.header('Authorization');

    // 1. Verificación Inicial: ¿Existe la cabecera?
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado: Token ausente.' });
    }

    // 2. Extracción Robusta: Limpiamos y dividimos la cabecera.
    // .trim() elimina espacios al inicio/final.
    const parts = authHeader.trim().split(' ');
    
    const scheme = parts[0]; // Ej: "Bearer"
    const token = parts[1];  // Ej: "eyJhbGc..."
    
    // 3. Verificación de Formato: Debe ser "Bearer" y debe existir la parte del token.
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Acceso denegado: Formato de token inválido o ausente.' });
    }
    
    // 4. Verificación del Token JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Error 403: El token es inválido, expiró, o está mal firmado.
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        
        // 5. Éxito: Adjuntar payload del usuario y continuar
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;