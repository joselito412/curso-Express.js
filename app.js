//      1. DEPENDENCIAS Y MÓDULOS
// =======================

// Módulos del Sistema / Entorno
require('dotenv').config(); // Carga variables de entorno
const express = require('express');
const fs = require('fs');
const path = require('path');

// Módulos de Terceros
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Módulos Locales / Middlewares
const loggerMiddleware = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const { validateUserData } = require('./Utils/validation');
const authenticateToken = require('./middlewares/auth')

// =======================
//      2. CONFIGURACIÓN INICIAL
// =======================
const app = express();
const prisma = new PrismaClient(); // Inicializa el cliente de Prisma
const PORT = process.env.PORT || 3000;
const userFilePath = path.join(__dirname, 'users.json');


// =======================
//      3. MIDDLEWARES GLOBALES
// =======================
// a) Body Parsers (Siempre van primero para leer la solicitud)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// b) Logger (Para registrar la solicitud entrante)
app.use(loggerMiddleware); 

// =======================
//      4. FUNCIONES DE UTILIDAD
// =======================

// Función de utilidad para leer usuarios (JSON)
const readUsers = (callback) => {
    fs.readFile(userFilePath, 'utf-8', (err, data) => {
        if (err && err.code !== 'ENOENT') {
            return callback(err);
        }
        const users = data ? JSON.parse(data) : [];
        callback(null, users);
    });
};

// Función de utilidad para escribir usuarios (JSON)
const writeUsers = (users, callback) => {
    fs.writeFile(userFilePath, JSON.stringify(users, null, 2), callback);
};

// FUNCIÓN DE UTILIDAD: Serializa BigInt a String para evitar el error de JSON
const serializeBigInt = (data) => {
    return JSON.parse(JSON.stringify(data, (key, value) => 
        (typeof value === 'bigint' ? value.toString() : value)
    ));
};

// =======================
//      5. RUTAS
// =======================

// Ruta raíz
app.get('/', (req, res) => {
  res.send(`<h1>Servidor Express.js</h1><p>Servidor escuchando peticiones.</p>`);
});

// GET /db-users -> Obtiene todos los usuarios de PostgreSQL usando Prisma
app.get('/db-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    
    // Serializa BigInt a String para que Express pueda enviar el JSON
    const serializedUsers = serializeBigInt(users); 
    
    res.json(serializedUsers);
  } catch (error) {
    console.error("Error de base de datos en /db-users:", error);
    res.status(500).json({error: 'Error al comunicarse con la base de datos'});
  }
});


// POST /users -> Crea un usuario y lo guarda en el archivo JSON
app.post('/users', (req, res) => {
  const { name, email, phone } = req.body;
  const userData = { name, email, phone };

  readUsers((err, users) => {
    if (err) return res.status(500).json({ error: 'Error al leer la base de datos.' });

    const validationError = validateUserData(userData, users);
    if (validationError) {
        return res.status(validationError.status).json({ error: validationError.error });
    }

    const uniqueId = uuidv4();
    let numericId = Date.now();
    while (users.some(u => u.numericId === numericId)) numericId++;

    const newUser = { uuid: uniqueId, numericId, ...userData };
    users.push(newUser);

    writeUsers(users, err => {
      if (err) return res.status(500).json({ error: 'Error al guardar el usuario.' });
      res.status(201).json({ message: 'Usuario creado correctamente', user: newUser });
    });
  });
});


// PUT /users/:id -> Actualiza un usuario por numericId en el JSON
app.put('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const updateData = req.body;

  readUsers((err, users) => {
    if (err) return res.status(500).json({ error: 'Error al leer la base de datos.' });

    const userIndex = users.findIndex(u => u.numericId === userId);
    if (userIndex === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const existingUser = users[userIndex];
    const userDataToValidate = {
        name: updateData.name || existingUser.name,
        email: updateData.email || existingUser.email,
        phone: updateData.phone || existingUser.phone,
    };

    const validationError = validateUserData(userDataToValidate, users, userId);
    if (validationError) {
        return res.status(validationError.status).json({ error: validationError.error });
    }

    users[userIndex] = {
      ...existingUser,
      ...userDataToValidate 
    };

    writeUsers(users, err => {
      if (err) return res.status(500).json({ error: 'Error al actualizar el usuario.' });
      res.json({ message: 'Usuario actualizado correctamente', user: users[userIndex] });
    });
  });
});

// GET /users -> Obtiene todos los usuarios del JSON
app.get('/users', (req, res) => {
  readUsers((err, users) => {
    if (err) return res.status(500).json({ error: 'Error al leer la base de datos.' });
    res.json(users);
  });
});

// GET /users/:id -> Obtiene un usuario por numericId del JSON
app.get('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  readUsers((err, users) => {
    if (err) return res.status(500).json({ error: 'Error al leer la base de datos.' });
    const user = users.find(u => u.numericId === userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json(user);
  });
});

// DELETE /users/:id -> Elimina un usuario por numericId del JSON
app.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id, 10);

    readUsers((err, users) => {
        if (err) return res.status(500).json({ error: 'Error al leer la base de datos.' });

        const initialLength = users.length;
        const newUsers = users.filter(u => u.numericId !== userId);

        if (newUsers.length === initialLength) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        writeUsers(newUsers, err => {
            if (err) return res.status(500).json({ error: 'Error al eliminar el usuario.' });
            
            res.json({ message: 'Usuario eliminado correctamente' });
        });
    });
});


// =======================
//      6. MANEJO DE ERRORES (EL ÚLTIMO MIDDLEWARE)
// =======================
app.use(errorHandler);

app.get('/protected-route', authenticateToken, (req, res) => {
  res.send('Esta es una ruta protegida')
});

// =======================
//      7. SERVIDOR
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});