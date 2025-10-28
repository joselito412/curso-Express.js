// Módulos de Terceros (DB/Auth)
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Inicializa el cliente de Prisma

// PASO B: Recibir 'phone' como argumento
const registerUser = async (email, password, name, phone) => {
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const newUser = await prisma.user.create({
        data: { 
            email, 
            password: hashedPassword, 
            name, 
            role: 'USER',
            phone 
        }
    });
    return newUser;
};

const loginUser = async (email, password) => {
    const user = await prisma.user.findUnique({ where: { email }});
    if(!user) {
        throw new Error('Invalid email or password');
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if(!validPassword) {
        throw new Error('Invalid email or password');
    }
    const token = jwt.sign(
        {id: user.id, role: user.role},
        process.env.JWT_SECRET,
        {expiresIn: '4h'}
    );
    return token;
};

module.exports = { registerUser, loginUser };