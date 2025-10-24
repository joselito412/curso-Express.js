// middlewares/auth.js

const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Formato de token inválido o ausente.' });
    }

    // CORRECCIÓN: Se usan corchetes [1] en lugar de paréntesis (1)
    const token = authHeader.split(' ')[1]; 
    
    // Si la división por espacio no produce un token válido.
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido.' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // El token es inválido, expiró, o está mal firmado.
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        
        req.user = user;
        next();
    });
};

module.exports = authenticateToken;