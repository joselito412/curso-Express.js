const { registerUser, loginUser} = require('../services/authService');

const register = async (req, res) => {
    try {
        // PASO A: Capturar 'phone' de req.body
        const { email, password, name, phone } = req.body; 
        
        // PASO A: Pasar 'phone' a la función de servicio
        await registerUser(email, password, name, phone); 
        
        return res.status(201).json({ message: 'User register Successfully'});
    } catch (error) {
        return res.status(400).json({ error: error.message });
    } 
};

// en esta estrucutra se envian todos los elementos relativos al loggin, por lo que pienso que tambien se puede incluir el contenido de la conversacion hasta el momento
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const token = await loginUser(email, password);
        return res.json({ token });
    } catch (error) {
        // NOTA: Asegúrate de que este 'jason' es 'json' en tu código real
        return res.status(400).json({ error: error.message}); 
    }
};

module.exports = { register, login };