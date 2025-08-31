/**
 * Drone model for the logistics simulation
 * DTI Digital - Logistics Drone Simulation
 */

class Drone {
    constructor(droneData) {
        this.id = droneData.id || this.generateId();
        this.name = droneData.name;
        this.capacity = parseFloat(droneData.capacity);
        this.range = parseFloat(droneData.range);
        this.speed = parseFloat(droneData.speed);
        this.batteryLevel = droneData.batteryLevel || 100;
        this.status = droneData.status || 'idle';
        this.location = droneData.location || { x: 0, y: 0 };
        this.baseLocation = droneData.baseLocation || { x: 0, y: 0 };
        this.currentOrders = [];
        this.completedDeliveries = 0;
        this.totalDistanceTraveled = 0;
        this.totalBatteryUsed = 0;
        this.currentRoute = [];
        this.routeIndex = 0;
        this.lastMaintenanceDate = new Date();
        this.lastStatusChange = 0; // Simulation time when status last changed
        this.createdAt = new Date();
        this.updatedAt = new Date();
        
        // Performance tracking
        this.stats = {
            totalFlightTime: 0,
            averageDeliveryTime: 0,
            efficiencyScore: 100,
            maintenanceNeeded: false
        };
    }

    /**
     * Generate unique ID for drone
     * @returns {string} Unique drone ID
     */
    generateId() {
        return 'DRN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Update drone status
     * @param {string} newStatus - New status
     * @param {Object} metadata - Additional metadata
     */
    updateStatus(newStatus, metadata = {}) {
        const validStatuses = ['idle', 'loading', 'flying', 'delivering', 'returning', 'charging', 'maintenance', 'offline'];
        
        if (!validStatuses.includes(newStatus)) {
            throw new Error(`Invalid drone status: ${newStatus}`);
        }

        const previousStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date();

        // Handle status-specific actions
        switch (newStatus) {
            case 'charging':
                this.startCharging();
                break;
            case 'idle':
                if (previousStatus === 'returning') {
                    this.location = { ...this.baseLocation };
                }
                break;
            case 'flying':
                this.stats.totalFlightTime += metadata.duration || 0;
                break;
        }
    }

    /**
     * Assign orders to drone
     * @param {Array} orders - Orders to assign
     * @returns {boolean} Success status
     */
    assignOrders(orders) {
        if (this.status !== 'idle') {
            return false;
        }

        const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);
        if (totalWeight > this.capacity) {
            return false;
        }

        this.currentOrders = [...orders];
        this.calculateRoute();
        this.updateStatus('loading');
        
        return true;
    }

    /**
     * Calculate optimal route for current orders
     */
    calculateRoute() {
        if (this.currentOrders.length === 0) {
            this.currentRoute = [];
            return;
        }

        const deliveryPoints = this.currentOrders.map(order => ({
            ...order.location,
            orderId: order.id
        }));

        if (typeof CalculationUtils !== 'undefined') {
            const optimizedRoute = CalculationUtils.calculateOptimalRoute(deliveryPoints, this.location);
            this.currentRoute = [this.baseLocation, ...optimizedRoute, this.baseLocation];
        } else {
            // Fallback: simple route
            this.currentRoute = [this.baseLocation, ...deliveryPoints, this.baseLocation];
        }

        this.routeIndex = 0;
    }

    /**
     * Move drone to next position in route
     * @param {number} deltaTime - Time elapsed since last update
     */
    moveAlongRoute(deltaTime) {
        if (this.currentRoute.length === 0 || this.routeIndex >= this.currentRoute.length - 1) {
            return;
        }

        const currentTarget = this.currentRoute[this.routeIndex + 1];
        const distance = this.getDistanceTo(currentTarget);
        const timeToReach = (distance / this.speed) * 60; // Convert to minutes

        if (deltaTime >= timeToReach || distance < 0.1) {
            // Reached target
            this.location = { ...currentTarget };
            this.routeIndex++;
            
            // Update battery
            const batteryConsumption = this.calculateBatteryConsumption(distance);
            this.consumeBattery(batteryConsumption);
            this.totalDistanceTraveled += distance;

            // Check if reached delivery point
            if (this.routeIndex < this.currentRoute.length - 1) {
                this.handleDeliveryPoint();
            } else {
                // Completed route
                this.completeDeliveryRun();
            }
        } else {
            // Move towards target
            const progress = deltaTime / timeToReach;
            this.moveTowards(currentTarget, progress);
        }
    }

    /**
     * Move drone towards base location
     * @param {number} deltaTime - Time elapsed since last update
     */
    moveTowardsBase(deltaTime) {
        const distance = this.getDistanceTo(this.baseLocation);
        const timeToReach = (distance / this.speed) * 60; // Convert to minutes
        
        if (deltaTime >= timeToReach || distance < 0.1) {
            // Reached base
            this.location = { ...this.baseLocation };
            
            // Update battery and distance
            const batteryConsumption = this.calculateBatteryConsumption(distance);
            this.consumeBattery(batteryConsumption);
            this.totalDistanceTraveled += distance;
            
            // Check what to do next
            if (this.batteryLevel < 20) {
                this.updateStatus('charging');
            } else {
                this.updateStatus('idle');
            }
        } else {
            // Move towards base
            const progress = deltaTime / timeToReach;
            this.moveTowards(this.baseLocation, progress);
        }
    }

    /**
     * Charge battery over time
     * @param {number} deltaTime - Time elapsed since last update
     */
    chargeBattery(deltaTime) {
        const chargeRate = 10; // 10% per second for simulation
        const chargeAmount = chargeRate * deltaTime;
        
        this.batteryLevel = Math.min(100, this.batteryLevel + chargeAmount);
        
        if (this.batteryLevel >= 100) {
            this.updateStatus('idle');
        }
    }

    /**
     * Handle reaching a delivery point
     */
    handleDeliveryPoint() {
        const currentPoint = this.currentRoute[this.routeIndex];
        const orderAtPoint = this.currentOrders.find(order => 
            Math.abs(order.location.x - currentPoint.x) < 0.1 && 
            Math.abs(order.location.y - currentPoint.y) < 0.1
        );

        if (orderAtPoint) {
            this.updateStatus('delivering');
            orderAtPoint.updateStatus('delivered');
            this.completedDeliveries++;
            
            // Remove delivered order from current orders
            this.currentOrders = this.currentOrders.filter(order => order.id !== orderAtPoint.id);
        }
    }

    /**
     * Complete delivery run and return to base
     */
    completeDeliveryRun() {
        this.currentOrders = [];
        this.currentRoute = [];
        this.routeIndex = 0;
        this.location = { ...this.baseLocation };
        
        if (this.batteryLevel < 20) {
            this.updateStatus('charging');
        } else {
            this.updateStatus('idle');
        }
        
        this.calculateEfficiencyScore();
    }

    /**
     * Move drone towards target position
     * @param {Object} target - Target position {x, y}
     * @param {number} progress - Progress from 0 to 1
     */
    moveTowards(target, progress) {
        this.location.x += (target.x - this.location.x) * progress;
        this.location.y += (target.y - this.location.y) * progress;
    }

    /**
     * Calculate distance to target
     * @param {Object} target - Target position {x, y}
     * @returns {number} Distance
     */
    getDistanceTo(target) {
        if (typeof CalculationUtils !== 'undefined') {
            return CalculationUtils.calculateDistance(this.location, target);
        }
        
        const dx = target.x - this.location.x;
        const dy = target.y - this.location.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate battery consumption for distance
     * @param {number} distance - Distance traveled
     * @returns {number} Battery consumed (percentage)
     */
    calculateBatteryConsumption(distance) {
        if (typeof CalculationUtils !== 'undefined') {
            return CalculationUtils.calculateBatteryConsumption(distance);
        }
        return distance * 2; // 2% per unit distance
    }

    /**
     * Consume battery
     * @param {number} amount - Amount to consume (percentage)
     */
    consumeBattery(amount) {
        this.batteryLevel = Math.max(0, this.batteryLevel - amount);
        this.totalBatteryUsed += amount;
        
        if (this.batteryLevel <= 0) {
            this.updateStatus('charging');
        }
    }

    /**
     * Start charging battery
     */
    startCharging() {
        if (this.batteryLevel < 100) {
            const chargeInterval = setInterval(() => {
                this.batteryLevel = Math.min(100, this.batteryLevel + 5);
                
                if (this.batteryLevel >= 100) {
                    clearInterval(chargeInterval);
                    this.updateStatus('idle');
                }
            }, 1000); // 5% per second for simulation
        } else {
            this.updateStatus('idle');
        }
    }

    /**
     * Check if drone needs maintenance
     * @returns {boolean} True if maintenance needed
     */
    needsMaintenance() {
        const daysSinceLastMaintenance = (Date.now() - this.lastMaintenanceDate) / (1000 * 60 * 60 * 24);
        const flightHoursThreshold = 100;
        const timeThreshold = 30; // days
        
        return (this.stats.totalFlightTime > flightHoursThreshold) || 
               (daysSinceLastMaintenance > timeThreshold) ||
               this.stats.efficiencyScore < 60;
    }

    /**
     * Perform maintenance
     */
    performMaintenance() {
        this.updateStatus('maintenance');
        this.lastMaintenanceDate = new Date();
        this.stats.totalFlightTime = 0;
        this.stats.efficiencyScore = 100;
        this.stats.maintenanceNeeded = false;
        
        setTimeout(() => {
            this.batteryLevel = 100;
            this.updateStatus('idle');
        }, 5000); // 5 seconds maintenance time
    }

    /**
     * Calculate efficiency score
     */
    calculateEfficiencyScore() {
        if (typeof CalculationUtils !== 'undefined') {
            this.stats.efficiencyScore = CalculationUtils.calculateEfficiencyScore(
                this.completedDeliveries,
                this.totalDistanceTraveled,
                this.totalBatteryUsed
            );
        } else {
            // Fallback calculation
            if (this.completedDeliveries === 0) {
                this.stats.efficiencyScore = 0;
            } else {
                const deliveryRate = this.completedDeliveries / Math.max(this.totalDistanceTraveled, 1);
                const batteryEfficiency = Math.max(0, 100 - this.totalBatteryUsed);
                this.stats.efficiencyScore = Math.min(100, (deliveryRate * 50) + (batteryEfficiency * 0.5));
            }
        }
        
        this.stats.maintenanceNeeded = this.needsMaintenance();
    }

    /**
     * Get remaining battery time estimate
     * @returns {number} Minutes of flight time remaining
     */
    getRemainingFlightTime() {
        const consumptionPerKm = 2; // 2% per km
        const remainingDistance = (this.batteryLevel / consumptionPerKm);
        return (remainingDistance / this.speed) * 60; // Convert to minutes
    }

    /**
     * Check if drone can handle new order
     * @param {Order} order - Order to check
     * @returns {boolean} True if can handle
     */
    canHandleOrder(order) {
        if (this.status !== 'idle') return false;
        
        const currentWeight = this.currentOrders.reduce((sum, o) => sum + o.weight, 0);
        if (currentWeight + order.weight > this.capacity) return false;
        
        const distanceToOrder = this.getDistanceTo(order.location);
        const distanceToBase = order.getDistanceFromBase ? order.getDistanceFromBase(this.baseLocation) : 0;
        const totalDistance = distanceToOrder + distanceToBase;
        
        return totalDistance <= this.range && this.batteryLevel > 20;
    }

    /**
     * Get status display information
     * @returns {Object} Display information
     */
    getStatusDisplay() {
        const statusMap = {
            'idle': { display: 'Disponível', class: 'status-idle' },
            'loading': { display: 'Carregando', class: 'status-loading' },
            'flying': { display: 'Voando', class: 'status-flying' },
            'delivering': { display: 'Entregando', class: 'status-delivering' },
            'returning': { display: 'Retornando', class: 'status-returning' },
            'charging': { display: 'Carregando Bateria', class: 'status-charging' },
            'maintenance': { display: 'Manutenção', class: 'status-maintenance' },
            'offline': { display: 'Offline', class: 'status-offline' }
        };
        
        return statusMap[this.status] || { display: this.status, class: 'status-unknown' };
    }

    /**
     * Get battery level class for styling
     * @returns {string} CSS class name
     */
    getBatteryLevelClass() {
        if (this.batteryLevel > 60) return 'battery-high';
        if (this.batteryLevel > 20) return 'battery-medium';
        return 'battery-low';
    }

    /**
     * Validate drone data
     * @returns {Object} Validation result
     */
    validate() {
        if (typeof ValidationUtils !== 'undefined') {
            return ValidationUtils.validateDrone(this);
        }
        
        // Fallback validation
        const errors = [];
        
        if (!this.name || this.name.trim() === '') {
            errors.push('Nome do drone é obrigatório');
        }
        
        if (!this.capacity || this.capacity <= 0) {
            errors.push('Capacidade deve ser maior que zero');
        }
        
        if (!this.range || this.range <= 0) {
            errors.push('Alcance deve ser maior que zero');
        }
        
        if (!this.speed || this.speed <= 0) {
            errors.push('Velocidade deve ser maior que zero');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get display information for UI
     * @returns {Object} Display information
     */
    getDisplayInfo() {
        return {
            id: this.id,
            name: this.name,
            status: this.getStatusDisplay(),
            batteryLevel: this.batteryLevel,
            batteryClass: this.getBatteryLevelClass(),
            capacity: this.capacity,
            range: this.range,
            speed: this.speed,
            location: `(${Math.round(this.location.x)}, ${Math.round(this.location.y)})`,
            completedDeliveries: this.completedDeliveries,
            totalDistance: Math.round(this.totalDistanceTraveled),
            efficiencyScore: Math.round(this.stats.efficiencyScore),
            needsMaintenance: this.needsMaintenance(),
            currentOrders: this.currentOrders.length
        };
    }

    /**
     * Export drone to JSON
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            capacity: this.capacity,
            range: this.range,
            speed: this.speed,
            batteryLevel: this.batteryLevel,
            status: this.status,
            location: this.location,
            baseLocation: this.baseLocation,
            completedDeliveries: this.completedDeliveries,
            totalDistanceTraveled: this.totalDistanceTraveled,
            totalBatteryUsed: this.totalBatteryUsed,
            stats: this.stats,
            lastMaintenanceDate: this.lastMaintenanceDate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create drone from JSON data
     * @param {Object} jsonData - JSON data
     * @returns {Drone} Drone instance
     */
    static fromJSON(jsonData) {
        const drone = new Drone(jsonData);
        drone.completedDeliveries = jsonData.completedDeliveries || 0;
        drone.totalDistanceTraveled = jsonData.totalDistanceTraveled || 0;
        drone.totalBatteryUsed = jsonData.totalBatteryUsed || 0;
        drone.stats = jsonData.stats || drone.stats;
        drone.lastMaintenanceDate = new Date(jsonData.lastMaintenanceDate);
        drone.createdAt = new Date(jsonData.createdAt);
        drone.updatedAt = new Date(jsonData.updatedAt);
        return drone;
    }

    /**
     * Get summary for notifications
     * @returns {string} Drone summary
     */
    getSummary() {
        return `Drone ${this.name} (${this.id}) - ${this.getStatusDisplay().display} - Bateria: ${this.batteryLevel}%`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Drone;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.Drone = Drone;
}
