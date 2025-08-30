/**
 * Order model for the drone simulation
 * DTI Digital - Logistics Drone Simulation
 */

class Order {
    constructor(orderData) {
        this.id = orderData.id || this.generateId();
        this.customerName = orderData.customerName;
        this.weight = parseFloat(orderData.weight);
        this.location = {
            x: parseFloat(orderData.location.x),
            y: parseFloat(orderData.location.y)
        };
        this.priority = orderData.priority.toLowerCase();
        this.status = orderData.status || 'pending';
        this.timestamp = orderData.timestamp || Date.now();
        this.deliveryTime = orderData.deliveryTime || null;
        this.assignedDrone = null;
        this.estimatedDeliveryTime = null;
        this.actualDeliveryTime = null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    /**
     * Generate unique ID for order
     * @returns {string} Unique order ID
     */
    generateId() {
        return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Update order status
     * @param {string} newStatus - New status
     * @param {Object} metadata - Additional metadata
     */
    updateStatus(newStatus, metadata = {}) {
        const validStatuses = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];
        
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}`);
        }

        this.status = newStatus;
        this.updatedAt = new Date();

        // Handle status-specific updates
        switch (newStatus) {
            case 'assigned':
                this.assignedDrone = metadata.droneId;
                this.estimatedDeliveryTime = metadata.estimatedTime;
                break;
            case 'delivered':
                this.actualDeliveryTime = Date.now();
                break;
            case 'cancelled':
                this.assignedDrone = null;
                this.estimatedDeliveryTime = null;
                break;
        }
    }

    /**
     * Assign drone to order
     * @param {string} droneId - ID of assigned drone
     * @param {number} estimatedTime - Estimated delivery time
     */
    assignDrone(droneId, estimatedTime = null) {
        this.assignedDrone = droneId;
        this.estimatedDeliveryTime = estimatedTime;
        this.updateStatus('assigned', { droneId, estimatedTime });
    }

    /**
     * Calculate priority score for sorting
     * @returns {number} Priority score
     */
    getPriorityScore() {
        if (typeof CalculationUtils !== 'undefined') {
            return CalculationUtils.calculatePriorityScore(this);
        }
        
        // Fallback calculation
        const priorityWeights = { 'alta': 100, 'media': 50, 'baixa': 10 };
        const priorityScore = priorityWeights[this.priority] || 10;
        const timeScore = Date.now() - this.timestamp;
        return priorityScore + (timeScore / 1000);
    }

    /**
     * Get delivery distance from base
     * @param {Object} baseLocation - Base coordinates {x, y}
     * @returns {number} Distance in units
     */
    getDistanceFromBase(baseLocation = {x: 0, y: 0}) {
        if (typeof CalculationUtils !== 'undefined') {
            return CalculationUtils.calculateDistance(baseLocation, this.location);
        }
        
        // Fallback calculation
        const dx = this.location.x - baseLocation.x;
        const dy = this.location.y - baseLocation.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if order is overdue
     * @returns {boolean} True if order is overdue
     */
    isOverdue() {
        if (!this.deliveryTime) return false;
        return new Date() > new Date(this.deliveryTime) && this.status !== 'delivered';
    }

    /**
     * Get time since order was created
     * @returns {number} Time in minutes
     */
    getAge() {
        return (Date.now() - this.timestamp) / (1000 * 60);
    }

    /**
     * Get estimated delivery time in minutes from now
     * @returns {number|null} Minutes until delivery or null
     */
    getEstimatedMinutesToDelivery() {
        if (!this.estimatedDeliveryTime) return null;
        const now = Date.now();
        const estimatedTime = typeof this.estimatedDeliveryTime === 'number' 
            ? this.estimatedDeliveryTime 
            : new Date(this.estimatedDeliveryTime).getTime();
        return Math.max(0, (estimatedTime - now) / (1000 * 60));
    }

    /**
     * Get formatted status display
     * @returns {string} Formatted status
     */
    getStatusDisplay() {
        const statusMap = {
            'pending': 'Pendente',
            'assigned': 'Designado',
            'picked_up': 'Coletado',
            'in_transit': 'Em Transporte',
            'delivered': 'Entregue',
            'cancelled': 'Cancelado'
        };
        return statusMap[this.status] || this.status;
    }

    /**
     * Get priority display with color class
     * @returns {Object} Priority info with display and class
     */
    getPriorityDisplay() {
        const priorityMap = {
            'alta': { display: 'Alta', class: 'priority-alta' },
            'media': { display: 'Média', class: 'priority-media' },
            'baixa': { display: 'Baixa', class: 'priority-baixa' }
        };
        return priorityMap[this.priority] || { display: 'Desconhecida', class: 'priority-baixa' };
    }

    /**
     * Check if order can be assigned to drone
     * @param {Object} drone - Drone object to check
     * @returns {boolean} True if can be assigned
     */
    canBeAssignedTo(drone) {
        if (!drone || drone.status !== 'idle') return false;
        if (drone.batteryLevel < 20) return false;
        if (this.weight > drone.capacity) return false;
        
        const distance = this.getDistanceFromBase(drone.location);
        return distance <= drone.range;
    }

    /**
     * Get delivery urgency level
     * @returns {string} Urgency level: low, medium, high, critical
     */
    getUrgencyLevel() {
        const age = this.getAge();
        
        if (this.priority === 'alta') {
            if (age > 60) return 'critical';
            if (age > 30) return 'high';
            return 'medium';
        } else if (this.priority === 'media') {
            if (age > 120) return 'high';
            if (age > 60) return 'medium';
            return 'low';
        } else {
            if (age > 240) return 'medium';
            return 'low';
        }
    }

    /**
     * Calculate estimated cost for delivery
     * @param {number} baseCost - Base delivery cost
     * @param {number} distanceRate - Cost per distance unit
     * @returns {number} Estimated cost
     */
    calculateEstimatedCost(baseCost = 10, distanceRate = 0.5) {
        const distance = this.getDistanceFromBase();
        const priorityMultiplier = {
            'alta': 1.5,
            'media': 1.2,
            'baixa': 1.0
        };
        
        const basePrice = baseCost + (distance * distanceRate);
        return basePrice * (priorityMultiplier[this.priority] || 1.0);
    }

    /**
     * Validate order data
     * @returns {Object} Validation result
     */
    validate() {
        if (typeof ValidationUtils !== 'undefined') {
            return ValidationUtils.validateOrder(this);
        }
        
        // Fallback validation
        const errors = [];
        
        if (!this.customerName || this.customerName.trim() === '') {
            errors.push('Nome do cliente é obrigatório');
        }
        
        if (!this.weight || this.weight <= 0) {
            errors.push('Peso deve ser maior que zero');
        }
        
        if (!this.location || typeof this.location.x !== 'number' || typeof this.location.y !== 'number') {
            errors.push('Localização inválida');
        }
        
        const validPriorities = ['baixa', 'media', 'alta'];
        if (!validPriorities.includes(this.priority)) {
            errors.push('Prioridade inválida');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Clone order object
     * @returns {Order} Cloned order
     */
    clone() {
        return new Order({
            ...this,
            id: this.generateId()
        });
    }

    /**
     * Export order to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            customerName: this.customerName,
            weight: this.weight,
            location: this.location,
            priority: this.priority,
            status: this.status,
            timestamp: this.timestamp,
            deliveryTime: this.deliveryTime,
            assignedDrone: this.assignedDrone,
            estimatedDeliveryTime: this.estimatedDeliveryTime,
            actualDeliveryTime: this.actualDeliveryTime,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create order from JSON data
     * @param {Object} jsonData - JSON data
     * @returns {Order} Order instance
     */
    static fromJSON(jsonData) {
        const order = new Order(jsonData);
        order.createdAt = new Date(jsonData.createdAt);
        order.updatedAt = new Date(jsonData.updatedAt);
        return order;
    }

    /**
     * Get display information for UI
     * @returns {Object} Display information
     */
    getDisplayInfo() {
        return {
            id: this.id,
            customer: this.customerName,
            weight: `${this.weight}kg`,
            location: `(${this.location.x}, ${this.location.y})`,
            priority: this.getPriorityDisplay(),
            status: this.getStatusDisplay(),
            age: this.getAge(),
            urgency: this.getUrgencyLevel(),
            isOverdue: this.isOverdue(),
            estimatedDelivery: this.getEstimatedMinutesToDelivery()
        };
    }

    /**
     * Get summary for notifications
     * @returns {string} Order summary
     */
    getSummary() {
        return `Pedido ${this.id} - ${this.customerName} - ${this.weight}kg - Prioridade ${this.priority.toUpperCase()}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Order;
}
