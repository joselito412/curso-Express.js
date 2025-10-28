// --- RegEx y Constantes de Validación ---
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?(\d[\s\-]?)?(\(?\d{2,3}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{3,4}$/;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 50;
const MIN_PHONE_LENGTH = 7;
const MAX_PHONE_LENGTH = 15;

/**
 * Valida los datos de un usuario (name, email, phone) y su unicidad.
 * @param {Object} userData - Los datos a validar (name, email, phone).
 * @param {Array} users - La lista completa de usuarios para verificar la unicidad.
 * @param {number|null} [currentNumericId=null] - ID del usuario actual (solo para PUT).
 * @returns {Object|null} Objeto de error con { status, error } si la validación falla.
 */
function validateUserData(userData, users, currentNumericId = null) {
    const { name, email, phone } = userData;

    // 1. Validación de Existencia (Requeridos)
    if (!name || !email || !phone) {
        return { status: 400, error: 'El nombre, correo y teléfono son obligatorios.' };
    }

    // 2. Validación de Formato y Longitud
    if (typeof name !== 'string' || name.length < MIN_NAME_LENGTH || name.length > MAX_NAME_LENGTH) {
        return { status: 400, error: `El nombre debe tener entre ${MIN_NAME_LENGTH} y ${MAX_NAME_LENGTH} caracteres.` };
    }
    
    if (!EMAIL_REGEX.test(email)) {
        return { status: 400, error: 'El formato del correo no es válido.' };
    }
    
    const digitsOnlyPhone = phone.replace(/[^\d]/g, '');
    if (!PHONE_REGEX.test(phone) || digitsOnlyPhone.length < MIN_PHONE_LENGTH || digitsOnlyPhone.length > MAX_PHONE_LENGTH) {
        return { status: 400, error: `El formato del teléfono no es válido o su longitud (${MIN_PHONE_LENGTH}-${MAX_PHONE_LENGTH} dígitos).` };
    }

    // 3. Validación de Unicidad
    const isUpdating = currentNumericId !== null;

    // Verificar unicidad de Email
    const emailExists = users.some(u => u.email === email && (!isUpdating || u.numericId !== currentNumericId));
    if (emailExists) {
        return { status: 400, error: 'El correo ya está registrado.' };
    }

    // Verificar unicidad de Teléfono
    const phoneExists = users.some(u => u.phone === phone && (!isUpdating || u.numericId !== currentNumericId));
    if (phoneExists) {
        return { status: 400, error: 'El teléfono ya está registrado.' };
    }

    // Validación exitosa
    return null;
}

module.exports = {
    validateUserData
};