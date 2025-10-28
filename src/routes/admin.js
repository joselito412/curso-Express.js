const { Router } = require('express');
const { createTimeBlocks, listReservations } = require('../controllers/adminController');

const authenticateToken = require('../middlewares/auth');

const router = Router();

router.post('/time-blocks', authenticateToken, createTimeBlocks);
router.get('/reservations', authenticateToken, listReservations);

module.exports = router;