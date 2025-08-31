/**
 * Validation utilities for the drone simulation
 * DTI Digital - Logistics Drone Simulation
 */

class ValidationUtils {
    /**
     * Validate order data
     * @param {Object} orderData - Order object to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    static validateOrder(orderData) {
        const errors = [];

        // Check required fields
        if (!orderData.customerName || orderData.customerName.trim() === '') {
            errors.push('Nome do cliente é obrigatório');
        }

        if (!orderData.weight || orderData.weight <= 0) {
            errors.push('Peso deve ser maior que zero');
        } else if (orderData.weight > 50) {
            errors.push('Peso não pode exceder 50kg');
        }

        if (orderData.location) {
            if (typeof orderData.location.x !== 'number' || orderData.location.x < 0 || orderData.location.x > 100) {
                errors.push('Coordenada X deve ser um número entre 0 e 100');
            }

            if (typeof orderData.location.y !== 'number' || orderData.location.y < 0 || orderData.location.y > 100) {
                errors.push('Coordenada Y deve ser um número entre 0 e 100');
            }
        } else {
            errors.push('Localização de entrega é obrigatória');
        }

        const validPriorities = ['baixa', 'media', 'alta'];
        if (!orderData.priority || !validPriorities.includes(orderData.priority)) {
            errors.push('Prioridade deve ser: baixa, média ou alta');
        }

        // Validate delivery time if provided
        if (orderData.deliveryTime) {
            const deliveryDate = new Date(orderData.deliveryTime);
            const now = new Date();
            
            if (isNaN(deliveryDate.getTime())) {
                errors.push('Data de entrega inválida');
            } else if (deliveryDate < now) {
                errors.push('Data de entrega deve ser no futuro');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate drone data
     * @param {Object} droneData - Drone object to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    static validateDrone(droneData) {
        const errors = [];

        if (!droneData.name || droneData.name.trim() === '') {
            errors.push('Nome do drone é obrigatório');
        }

        if (!droneData.capacity || droneData.capacity <= 0) {
            errors.push('Capacidade deve ser maior que zero');
        } else if (droneData.capacity > 100) {
            errors.push('Capacidade não pode exceder 100kg');
        }

        if (!droneData.range || droneData.range <= 0) {
            errors.push('Alcance deve ser maior que zero');
        } else if (droneData.range > 500) {
            errors.push('Alcance não pode exceder 500km');
        }

        if (!droneData.speed || droneData.speed <= 0) {
            errors.push('Velocidade deve ser maior que zero');
        } else if (droneData.speed > 200) {
            errors.push('Velocidade não pode exceder 200km/h');
        }

        if (droneData.batteryLevel !== undefined) {
            if (droneData.batteryLevel < 0 || droneData.batteryLevel > 100) {
                errors.push('Nível de bateria deve estar entre 0 e 100%');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} bounds - Optional bounds {minX, maxX, minY, maxY}
     * @returns {Object} Validation result
     */
    static validateCoordinates(x, y, bounds = {minX: 0, maxX: 100, minY: 0, maxY: 100}) {
        const errors = [];

        if (typeof x !== 'number' || isNaN(x)) {
            errors.push('Coordenada X deve ser um número válido');
        } else if (x < bounds.minX || x > bounds.maxX) {
            errors.push(`Coordenada X deve estar entre ${bounds.minX} e ${bounds.maxX}`);
        }

        if (typeof y !== 'number' || isNaN(y)) {
            errors.push('Coordenada Y deve ser um número válido');
        } else if (y < bounds.minY || y > bounds.maxY) {
            errors.push(`Coordenada Y deve estar entre ${bounds.minY} e ${bounds.maxY}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate weight value
     * @param {number} weight - Weight in kg
     * @param {number} maxWeight - Maximum allowed weight
     * @returns {Object} Validation result
     */
    static validateWeight(weight, maxWeight = 50) {
        const errors = [];

        if (typeof weight !== 'number' || isNaN(weight)) {
            errors.push('Peso deve ser um número válido');
        } else if (weight <= 0) {
            errors.push('Peso deve ser maior que zero');
        } else if (weight > maxWeight) {
            errors.push(`Peso não pode exceder ${maxWeight}kg`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate priority level
     * @param {string} priority - Priority level
     * @returns {Object} Validation result
     */
    static validatePriority(priority) {
        const validPriorities = ['baixa', 'media', 'alta'];
        const errors = [];

        if (!priority || typeof priority !== 'string') {
            errors.push('Prioridade é obrigatória');
        } else if (!validPriorities.includes(priority.toLowerCase())) {
            errors.push('Prioridade deve ser: baixa, média ou alta');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {Object} Validation result
     */
    static validateEmail(email) {
        const errors = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || typeof email !== 'string') {
            errors.push('Email é obrigatório');
        } else if (!emailRegex.test(email)) {
            errors.push('Formato de email inválido');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate phone number format (Brazilian format)
     * @param {string} phone - Phone number
     * @returns {Object} Validation result
     */
    static validatePhone(phone) {
        const errors = [];
        const phoneRegex = /^(\+55\s?)?(\d{2}\s?)?\d{4,5}-?\d{4}$/;

        if (phone && typeof phone === 'string' && phone.trim() !== '') {
            if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
                errors.push('Formato de telefone inválido');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate date format and range
     * @param {string|Date} date - Date to validate
     * @param {boolean} futureOnly - Whether date must be in the future
     * @returns {Object} Validation result
     */
    static validateDate(date, futureOnly = false) {
        const errors = [];

        if (!date) {
            return { isValid: true, errors: [] }; // Date is optional
        }

        const dateObj = new Date(date);
        
        if (isNaN(dateObj.getTime())) {
            errors.push('Data inválida');
        } else if (futureOnly && dateObj < new Date()) {
            errors.push('Data deve ser no futuro');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate customer name
     * @param {string} name - Customer name
     * @returns {Object} Validation result
     */
    static validateCustomerName(name) {
        const errors = [];

        if (!name || typeof name !== 'string') {
            errors.push('Nome do cliente é obrigatório');
        } else {
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                errors.push('Nome deve ter pelo menos 2 caracteres');
            } else if (trimmedName.length > 100) {
                errors.push('Nome não pode exceder 100 caracteres');
            } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(trimmedName)) {
                errors.push('Nome deve conter apenas letras e espaços');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate drone name/ID
     * @param {string} name - Drone name
     * @returns {Object} Validation result
     */
    static validateDroneName(name) {
        const errors = [];

        if (!name || typeof name !== 'string') {
            errors.push('Nome/ID do drone é obrigatório');
        } else {
            const trimmedName = name.trim();
            if (trimmedName.length < 1) {
                errors.push('Nome/ID do drone é obrigatório');
            } else if (trimmedName.length > 50) {
                errors.push('Nome/ID não pode exceder 50 caracteres');
            } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
                errors.push('Nome/ID deve conter apenas letras, números, _ e -');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate battery level
     * @param {number} level - Battery level (0-100)
     * @returns {Object} Validation result
     */
    static validateBatteryLevel(level) {
        const errors = [];

        if (typeof level !== 'number' || isNaN(level)) {
            errors.push('Nível de bateria deve ser um número válido');
        } else if (level < 0 || level > 100) {
            errors.push('Nível de bateria deve estar entre 0 e 100%');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate speed value
     * @param {number} speed - Speed in km/h
     * @param {number} maxSpeed - Maximum allowed speed
     * @returns {Object} Validation result
     */
    static validateSpeed(speed, maxSpeed = 200) {
        const errors = [];

        if (typeof speed !== 'number' || isNaN(speed)) {
            errors.push('Velocidade deve ser um número válido');
        } else if (speed <= 0) {
            errors.push('Velocidade deve ser maior que zero');
        } else if (speed > maxSpeed) {
            errors.push(`Velocidade não pode exceder ${maxSpeed}km/h`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate range value
     * @param {number} range - Range in km
     * @param {number} maxRange - Maximum allowed range
     * @returns {Object} Validation result
     */
    static validateRange(range, maxRange = 500) {
        const errors = [];

        if (typeof range !== 'number' || isNaN(range)) {
            errors.push('Alcance deve ser um número válido');
        } else if (range <= 0) {
            errors.push('Alcance deve ser maior que zero');
        } else if (range > maxRange) {
            errors.push(`Alcance não pode exceder ${maxRange}km`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Sanitize string input
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') return '';
        return input.trim().replace(/[<>]/g, '');
    }

    /**
     * Sanitize numeric input
     * @param {any} input - Input value
     * @param {number} defaultValue - Default value if invalid
     * @returns {number} Sanitized number
     */
    static sanitizeNumber(input, defaultValue = 0) {
        const num = parseFloat(input);
        return isNaN(num) ? defaultValue : num;
    }

    /**
     * Check if string is empty or whitespace only
     * @param {string} str - String to check
     * @returns {boolean} True if empty or whitespace only
     */
    static isEmpty(str) {
        return !str || typeof str !== 'string' || str.trim().length === 0;
    }

    /**
     * Format validation errors for display
     * @param {Array} errors - Array of error messages
     * @returns {string} Formatted error message
     */
    static formatErrors(errors) {
        if (!errors || errors.length === 0) return '';
        
        if (errors.length === 1) {
            return errors[0];
        }
        
        return '• ' + errors.join('\n• ');
    }

    /**
     * Validate multiple fields at once
     * @param {Object} data - Data object to validate
     * @param {Object} rules - Validation rules
     * @returns {Object} Combined validation result
     */
    static validateFields(data, rules) {
        const allErrors = [];
        let isValid = true;

        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            const result = rule(value);
            
            if (!result.isValid) {
                isValid = false;
                allErrors.push(...result.errors.map(error => `${field}: ${error}`));
            }
        }

        return {
            isValid: isValid,
            errors: allErrors
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.ValidationUtils = ValidationUtils;
}
