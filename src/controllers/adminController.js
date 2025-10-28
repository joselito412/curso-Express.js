const { createTimeBlockService: serviceCreateTimeBlock, listReservationService } = require('../services/adminService');

const createTimeBlocks = async(req, res) => {
    console.log(`[DEBUG] Intentando crear TimeBlock. Usuario: ${req.user.email}, Rol: ${req.user.role}`);
    
    if(req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acces denied'});
    }
    
    const { startTime, endTime } = req.body;
    
    console.log(`[DEBUG] Datos recibidos: startTime=${startTime}, endTime=${endTime}`);
    
    try {
        const newTimeBlock = await serviceCreateTimeBlock(startTime, endTime);
        
        console.log(`[DEBUG] TimeBlock creado exitosamente con ID: ${newTimeBlock.id}`);
        
        res.status(201).json(newTimeBlock);
    } catch (error) {
        console.error("⛔️ FALLO CRÍTICO AL CREAR TIMEBLOCK:", error);
        
        res.status(500).json({ error: 'Error creating time block '});
    }
};

const listReservations = async (req, res) => {
    console.log(`[DEBUG] Intento de listar reservas por usuario: ${req.user.email}`);
    
    if(req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acces denied'});
    }
    try {
        const reservations = await listReservationService();
        
        console.log(`[DEBUG] Consulta de reservas exitosa. Total: ${reservations.length}`);
        
        res.json(reservations);
    } catch (error) {
        console.error("⛔️ FALLO CRÍTICO AL CONSULTAR RESERVAS:", error);
        
        res.status(500).json({ error: 'Error consulting reservations '});
    }
}; 

module.exports = { createTimeBlocks, listReservations };