BigInt.prototype.toJSON = function() { 
    return this.toString(); 
};
// =================================================================

const app = require('./app');
const PORT = process.env.PORT || 3005; // Asumo que usas 3005, pero puedes ajustarlo

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});