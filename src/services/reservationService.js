const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();



exports.createReservation = async (reservationData) => {
    const { userId, timeBlockId, dateTime } = reservationData;
    
    if (!userId || !timeBlockId || !dateTime) {
        throw new Error("Faltan campos requeridos: userId, timeBlockId, o dateTime.");
    }
    const appointmentDateTime = new Date(dateTime);
    if (isNaN(appointmentDateTime)) {
        throw new Error("El formato de fecha y hora (dateTime) no es válido.");
    }
    
    const conflict = await prisma.appointments.findFirst({
        where: {
            dateTime: appointmentDateTime,
            timeBlockId: parseInt(timeBlockId)
        }
    });
    if (conflict) {
        throw new Error('El horario ya está ocupado. Por favor, elige otra hora.');
    }
    
    const newAppointment = await prisma.appointments.create({
        data: {
            userId: BigInt(userId), 
            timeBlockId: parseInt(timeBlockId), 
            dateTime: appointmentDateTime,
        },
        include: { user: true, timeBlock: true }
    });
    return newAppointment;
};

exports.getReservation = async (id) => {
    const reservationId = parseInt(id); 
    if (isNaN(reservationId)) {
        throw new Error("El ID de la reserva debe ser un número válido.");
    }
    
    const appointment = await prisma.appointments.findUnique({
        where: { id: reservationId },
        include: { user: true, timeBlock: true }
    });
    return appointment;
};

exports.updateReservation = async (id, data) => {
    const reservationId = parseInt(id);
    if (isNaN(reservationId)) {
        throw new Error("El ID de la reserva debe ser un número válido.");
    }

    const updateData = {};
    if (data.dateTime) updateData.dateTime = new Date(data.dateTime);
    if (data.timeBlockId) updateData.timeBlockId = parseInt(data.timeBlockId);
    
    if (data.dateTime && isNaN(updateData.dateTime)) {
        throw new Error("El formato de fecha y hora (dateTime) para la actualización no es válido.");
    }
    
    if (updateData.dateTime || updateData.timeBlockId) {
        const conflict = await prisma.appointments.findFirst({
            where: {
                dateTime: updateData.dateTime,
                timeBlockId: updateData.timeBlockId ? updateData.timeBlockId : undefined,
                id: { not: reservationId }
            }
        });

        if (conflict) {
            throw new Error('El horario solicitado ya está ocupado por otra reserva.');
        }
    }

    try {
        const updatedAppointment = await prisma.appointments.update({
            where: { id: reservationId },
            data: updateData,
            include: { user: true, timeBlock: true }
        });
        return updatedAppointment;
    } catch (error) {
        if (error.code === 'P2025') {
            return null;
        }
        throw error;
    }
};

// FUNCIÓN DELETE ROBusta (TU VERSIÓN)
exports.deleteReservation = async (id) => {
    const reservationId = parseInt(id); 
    if (isNaN(reservationId)) {
        throw new Error("El ID de la reserva debe ser un número válido.");
    }
    
    try {
        const deletedAppointment = await prisma.appointments.delete({
            where: { id: reservationId },
        });
        return deletedAppointment;
    } catch (error) {
        if (error.code === 'P2025') {
            throw new Error(`Reservation not found with ID ${id}`);
        }
        throw error;
    }
};

module.exports = { 
    createReservation: exports.createReservation, 
    getReservation: exports.getReservation, 
    updateReservation: exports.updateReservation,
    deleteReservation: exports.deleteReservation 
};