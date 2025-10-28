const { Router } = require('express');
const { register, login } = require('../controllers/authController');
const authenticateToken = require('../middlewares/auth');

const router = Router();

router.post('/register', register);
router.post('/login', login);

// GET /protected-route -> Ruta de prueba protegida por JWT
router.get('/protected-route', authenticateToken, (req, res) => {
  // El token es válido si llegamos aquí
  res.send(`Esta es una ruta protegida. Usuario: ${req.user.email}`);
});

module.exports = router;