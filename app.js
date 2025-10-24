// =======================
//      1. DEPENDENCIAS Y MÓDULOS
// =======================

// Módulos del Sistema / Entorno
require('dotenv').config(); // Carga variables de entorno
const express = require('express');
const fs = require('fs');
const path = require('path');

// Módulos de Terceros (DB/Auth)
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Módulos Locales / Middlewares
const loggerMiddleware = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler'); // Manejo de errores 500
const { validateUserData } = require('./Utils/validation'); // Validación de datos de usuario
const authenticateToken = require('./middlewares/auth'); // Middleware de protección de rutas


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
// a) Body Parsers (Siempre van primero para leer el cuerpo JSON)
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
//      5. RUTAS DE AUTENTICACIÓN Y DB
// =======================

// POST /register -> Registra un nuevo usuario en PostgreSQL
app.post('/register', async (req, res) => {
  const { email, password, name, phone } = req.body;
  
  if (!email || !password || !name || !phone) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  try {
    // Verificación de unicidad antes de la creación
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
      }
      if (existingUser.phone === phone) {
        return res.status(409).json({ error: 'El número de teléfono ya está registrado.' });
      }
    }

    // Hashing de la contraseña y generación de ID numérico
    const hashedPassword = await bcrypt.hash(password, 10);
    const numericId = BigInt(Date.now());
    
    // Creación del nuevo usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        numericId: numericId, 
        name: name,
        email: email,
        phone: phone, 
        password: hashedPassword,
        role: 'USER', // Rol por defecto
      },
      select: { // Retornar solo campos seguros
        uuid: true,
        numericId: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Aplicar la serialización de BigInt
    const serializedUser = serializeBigInt(newUser); 
    
    res.status(201).json({ message: 'Usuario registrado con éxito', user: serializedUser });

  } catch (error) {
    console.error("Error al registrar usuario:", error);
    
    if (error.code === 'P2002') { // Error de unicidad de Prisma
        return res.status(409).json({ error: 'Error de unicidad: El email o teléfono ya existen.' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST - LOGIN de usuarios en DB 
app.post('/login', async (req, res) => {
  const {email, password} = req.body;
  const user = await prisma.user.findUnique({where: {email}});

  if (!user) return res.status(400).json({ error: 'invalid email or password'});

  const validPassword = await bcrypt.compare(password, user.password);

  if(!validPassword) return res.status(400).json({ error: 'invalid email or password'});

  const token = jwt.sign({ id: user.id, role: user.role}, process.env.JWT_SECRET, { expiresIn: '4h'});

  res.json({ token });
});

// GET /db-users -> Obtiene todos los usuarios de PostgreSQL
app.get('/db-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    
    // Serializa BigInt
    const serializedUsers = serializeBigInt(users); 
    
    res.json(serializedUsers);
  } catch (error) {
    console.error("Error de base de datos en /db-users:", error);
    res.status(500).json({error: 'Error al comunicarse con la base de datos'});
  }
});

// GET /protected-route -> Ruta de prueba protegida por JWT
app.get('/protected-route', authenticateToken, (req, res) => {
  // El token es válido si llegamos aquí
  res.send(`Esta es una ruta protegida. Usuario: ${req.user.email}`);
});


// =======================
//      6. RUTAS ANTIGUAS (JSON)
// =======================

// Ruta raíz
app.get('/', (req, res) => {
  res.send(`<h1>Servidor Express.js</h1><p>Servidor escuchando peticiones.</p>`);
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
//      7. MANEJO DE ERRORES (EL ÚLTIMO MIDDLEWARE)
// =======================
app.use(errorHandler);

// =======================
//      8. SERVIDOR
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});