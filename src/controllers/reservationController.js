const { 
    createReservation: createReservationService, 
    getReservation: getReservationService,
    deleteReservation: deleteReservationService,
    updateReservation: updateReservationService
} = require("../services/reservationService");

exports.createReservation = async (req, res) =>{
    try {
        const reservation = await createReservationService(req.body);
        res.status(201).json(reservation);
    } catch (error) {
        console.error("Error creating reservation:", error);
        if (error.message.includes('Faltan campos') || error.message.includes('inválido') || error.message.includes('ocupado')) {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno al crear la reserva.' });
    }
};

exports.getReservation = async (req, res) => {
    try {
        const reservation = await getReservationService(req.params.id);
        
        if (!reservation) {
            return res.status(404).json({ error: 'Reservation not found'});
        }
        res.json(reservation);
    } catch (error) {
        console.error("Error fetching reservation:", error);
        if (error.message.includes('número válido')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno al consultar la reserva.'});
    }
}

exports.updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedReservation = await updateReservationService(id, req.body);
        
        if (!updatedReservation) {
            return res.status(404).json({ error: `Reservation with ID ${id} not found.` });
        }
        
        res.status(200).json(updatedReservation);

    } catch (error) {
        console.error("Error updating reservation:", error);
        // Manejo de errores de validación de conflicto y formato
        if (error.message.includes('inválido') || error.message.includes('ocupado')) {
             return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno al actualizar la reserva.' });
    }
}

exports.deleteReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteReservationService(id);

        res.status(200).json({ message: `Reservation with ID ${id} deleted successfully.`, deletedReservation: result });

    } catch (error) {
        console.error("Error deleting reservation:", error);
        
        if (error.message.includes('Reservation not found')) {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message.includes('número válido')) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Error interno al eliminar la reserva.' });
    }
}

module.exports = {
    createReservation: exports.createReservation,
    getReservation: exports.getReservation,
    updateReservation: exports.updateReservation,
    deleteReservation: exports.deleteReservation
};