// apis internas - bases de datos - servidor
const errorHandler = (err, req, res, next) => {
    // Definimos el código de estado (statusCode) y el mensaje de error.
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocurrió un error Inesperado';

    // Registro del error en la consola del servidor (para el desarrollador)
    console.error(`[ERROR] ${new Date().toISOString()} - ${statusCode} - ${message}`);

    if (err.stack) {
        console.error(err.stack);
    };

    // Enviamos la respuesta HTTP al cliente.
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        // CORRECCIÓN: Incluye la pila de llamadas (stack) SOLAMENTE si estamos en desarrollo.
        // El operador spread (...) se aplica a la expresión condicional.
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;