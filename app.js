const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
            <h1>curso Express.js v2</h1>
            <p>Este es un proyecto con express.js</p>
            <p>Corre en el puerto: ${PORT}</p>
        `);
});

app.listen(PORT, ()=>{
    console.log(`Nuestra app funciona en el port ${PORT}`);
});