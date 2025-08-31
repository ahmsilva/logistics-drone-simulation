/**
 * Simulation Engine for the drone logistics system
 * DTI Digital - Logistics Drone Simulation
 */

class SimulationEngine {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.speed = 1;
        this.currentTime = 0;
        this.lastUpdateTime = 0;
        this.drones = new Map();
        this.orders = new Map();
        this.completedOrders = [];
        this.eventLog = [];
        this.obstacles = [];
        this.baseLocation = { x: 0, y: 0 };
        this.gridSize = { width: 100, height: 100 };
        this.statistics = this.initializeStatistics();
        this.eventListeners = new Map();
        this.updateInterval = null;
        this.updateFrequency = 100; // milliseconds
    }

    /**
     * Initialize simulation statistics
     * @returns {Object} Statistics object
     */
    initializeStatistics() {
        return {
            totalDeliveries: 0,
            successfulDeliveries: 0,
            failedDeliveries: 0,
            averageDeliveryTime: 0,
            totalDistance: 0,
            activeDrones: 0,
            pendingOrders: 0,
            batteryConsumption: 0,
            efficiency: 100,
            uptime: 0
        };
    }

    /**
     * Start the simulation
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastUpdateTime = Date.now();

        this.updateInterval = setInterval(() => {
            if (!this.isPaused) {
                this.update();
            }
        }, this.updateFrequency);

        this.logEvent('Simulação iniciada', 'success');
        this.emit('simulationStarted');
    }

    /**
     * Pause the simulation
     */
    pause() {
        this.isPaused = true;
        this.logEvent('Simulação pausada', 'warning');
        this.emit('simulationPaused');
    }

    /**
     * Resume the simulation
     */
    resume() {
        this.isPaused = false;
        this.lastUpdateTime = Date.now();
        this.logEvent('Simulação retomada', 'success');
        this.emit('simulationResumed');
    }

    /**
     * Stop the simulation
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.isPaused = false;

        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.logEvent('Simulação parada', 'error');
        this.emit('simulationStopped');
    }

    /**
     * Reset simulation to initial state
     */
    reset() {
        this.stop();
        
        this.currentTime = 0;
        this.drones.clear();
        this.orders.clear();
        this.completedOrders = [];
        this.eventLog = [];
        this.statistics = this.initializeStatistics();

        // Reset all drones to base
        for (const drone of this.drones.values()) {
            drone.location = { ...this.baseLocation };
            drone.batteryLevel = 100;
            drone.status = 'idle';
            drone.currentOrders = [];
        }

        this.logEvent('Simulação resetada', 'info');
        this.emit('simulationReset');
    }

    /**
     * Main update loop
     */
    update() {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdateTime) * this.speed / 1000; // Convert to seconds
        this.lastUpdateTime = currentTime;
        this.currentTime += deltaTime;

        // Update all drones
        for (const drone of this.drones.values()) {
            this.updateDrone(drone, deltaTime);
        }

        // Process pending orders
        this.processOrderQueue();

        // Check for completed deliveries and move them
        const completedOrderIds = [];
        for (const [orderId, order] of this.orders) {
            if (order.status === 'delivered') {
                this.completedOrders.push(order);
                completedOrderIds.push(orderId);
                this.logEvent(`Pedido ${order.id} entregue com sucesso para ${order.customerName}`, 'success');
                this.emit('deliveryCompleted', { order });
            }
        }
        
        // Remove completed orders from active orders
        completedOrderIds.forEach(orderId => {
            this.orders.delete(orderId);
        });

        // Update statistics
        this.updateStatistics();

        // Emit update event
        this.emit('simulationUpdated', {
            currentTime: this.currentTime,
            statistics: this.statistics
        });
    }

    /**
     * Update individual drone
     * @param {Drone} drone - Drone to update
     * @param {number} deltaTime - Time elapsed
     */
    updateDrone(drone, deltaTime) {
        const previousStatus = drone.status;
        
        switch (drone.status) {
            case 'loading':
                // Simulate loading time (5 seconds)
                if (this.currentTime - drone.lastStatusChange > 5) {
                    drone.updateStatus('flying');
                }
                break;
                
            case 'flying':
                drone.moveAlongRoute(deltaTime);
                break;
                
            case 'delivering':
                // Auto-transition after delivery time
                if (this.currentTime - drone.lastStatusChange > 3) {
                    if (drone.currentOrders.length > 0) {
                        drone.updateStatus('flying');
                    } else {
                        drone.updateStatus('returning');
                    }
                }
                break;
                
            case 'returning':
                drone.moveTowardsBase(deltaTime);
                break;
                
            case 'charging':
                drone.chargeBattery(deltaTime);
                break;
        }

        // Track status changes
        if (previousStatus !== drone.status) {
            drone.lastStatusChange = this.currentTime;
            this.logEvent(`Drone ${drone.name} mudou status: ${previousStatus} → ${drone.status}`);
            this.emit('droneStatusChanged', { drone, previousStatus });
        }

        // Check for low battery
        if (drone.batteryLevel < 20 && drone.status !== 'charging') {
            this.logEvent(`Drone ${drone.name} com bateria baixa (${drone.batteryLevel}%)`, 'warning');
            drone.updateStatus('returning');
        }

        // Check for maintenance needs
        if (drone.needsMaintenance() && drone.status === 'idle') {
            this.logEvent(`Drone ${drone.name} precisa de manutenção`, 'warning');
            drone.performMaintenance();
        }
    }

    /**
     * Process order queue and assign to available drones
     */
    processOrderQueue() {
        const pendingOrders = Array.from(this.orders.values())
            .filter(order => order.status === 'pending')
            .sort((a, b) => b.getPriorityScore() - a.getPriorityScore());

        const availableDrones = Array.from(this.drones.values())
            .filter(drone => drone.status === 'idle' && drone.batteryLevel > 20);

        for (const order of pendingOrders) {
            const suitableDrone = this.findBestDroneForOrder(order, availableDrones);
            
            if (suitableDrone) {
                this.assignOrderToDrone(order, suitableDrone);
                availableDrones.splice(availableDrones.indexOf(suitableDrone), 1);
            }
        }
    }

    /**
     * Find best drone for an order
     * @param {Order} order - Order to assign
     * @param {Array} availableDrones - Available drones
     * @returns {Drone|null} Best suitable drone
     */
    findBestDroneForOrder(order, availableDrones) {
        if (!availableDrones.length) return null;

        let bestDrone = null;
        let bestScore = -1;

        for (const drone of availableDrones) {
            if (!drone.canHandleOrder(order)) continue;

            const distance = drone.getDistanceTo(order.location);
            const batteryScore = drone.batteryLevel / 100;
            const capacityScore = (drone.capacity - order.weight) / drone.capacity;
            
            const score = batteryScore * 0.3 + capacityScore * 0.3 + (1 / (distance + 1)) * 0.4;

            if (score > bestScore) {
                bestScore = score;
                bestDrone = drone;
            }
        }

        return bestDrone;
    }

    /**
     * Assign order to drone
     * @param {Order} order - Order to assign
     * @param {Drone} drone - Drone to assign to
     */
    assignOrderToDrone(order, drone) {
        const success = drone.assignOrders([order]);
        
        if (success) {
            order.assignDrone(drone.id);
            this.logEvent(`Pedido ${order.id} atribuído ao drone ${drone.name}`, 'success');
            this.emit('orderAssigned', { order, drone });
        } else {
            this.logEvent(`Falha ao atribuir pedido ${order.id} ao drone ${drone.name}`, 'error');
        }
    }

    /**
     * Add drone to simulation
     * @param {Drone} drone - Drone to add
     */
    addDrone(drone) {
        this.drones.set(drone.id, drone);
        drone.location = { ...this.baseLocation };
        this.logEvent(`Drone ${drone.name} adicionado à simulação`);
        this.emit('droneAdded', { drone });
    }

    /**
     * Remove drone from simulation
     * @param {string} droneId - Drone ID to remove
     */
    removeDrone(droneId) {
        const drone = this.drones.get(droneId);
        if (drone) {
            // Cancel current orders
            for (const order of drone.currentOrders) {
                order.updateStatus('pending');
            }
            
            this.drones.delete(droneId);
            this.logEvent(`Drone ${drone.name} removido da simulação`, 'warning');
            this.emit('droneRemoved', { drone });
        }
    }

    /**
     * Add order to simulation
     * @param {Order} order - Order to add
     */
    addOrder(order) {
        this.orders.set(order.id, order);
        this.logEvent(`Pedido ${order.id} adicionado (${order.customerName})`);
        this.emit('orderAdded', { order });
    }

    /**
     * Remove/cancel order
     * @param {string} orderId - Order ID to remove
     */
    cancelOrder(orderId) {
        const order = this.orders.get(orderId);
        if (order) {
            order.updateStatus('cancelled');
            
            // Remove from assigned drone
            if (order.assignedDrone) {
                const drone = this.drones.get(order.assignedDrone);
                if (drone) {
                    drone.currentOrders = drone.currentOrders.filter(o => o.id !== orderId);
                    if (drone.currentOrders.length === 0) {
                        drone.updateStatus('returning');
                    }
                }
            }
            
            this.orders.delete(orderId);
            this.logEvent(`Pedido ${order.id} cancelado`, 'warning');
            this.emit('orderCancelled', { order });
        }
    }

    /**
     * Add obstacle to simulation
     * @param {Object} obstacle - Obstacle object {x, y, width, height}
     */
    addObstacle(obstacle) {
        this.obstacles.push(obstacle);
        this.logEvent(`Obstáculo adicionado em (${obstacle.x}, ${obstacle.y})`);
        this.emit('obstacleAdded', { obstacle });
    }

    /**
     * Set simulation speed
     * @param {number} speed - Simulation speed multiplier
     */
    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(10, speed));
        this.logEvent(`Velocidade da simulação alterada para ${this.speed}x`);
        this.emit('speedChanged', { speed: this.speed });
    }

    /**
     * Update simulation statistics
     */
    updateStatistics() {
        const drones = Array.from(this.drones.values());
        const orders = Array.from(this.orders.values());
        
        this.statistics.activeDrones = drones.filter(d => d.status !== 'offline').length;
        this.statistics.pendingOrders = orders.filter(o => o.status === 'pending').length;
        this.statistics.totalDeliveries = this.completedOrders.length;
        this.statistics.successfulDeliveries = this.completedOrders.filter(o => o.status === 'delivered').length;
        this.statistics.failedDeliveries = this.completedOrders.filter(o => o.status === 'cancelled').length;
        
        this.statistics.totalDistance = drones.reduce((sum, drone) => sum + drone.totalDistanceTraveled, 0);
        this.statistics.batteryConsumption = drones.reduce((sum, drone) => sum + drone.totalBatteryUsed, 0);
        
        // Calculate average delivery time
        const deliveredOrders = this.completedOrders.filter(o => o.actualDeliveryTime);
        if (deliveredOrders.length > 0) {
            const avgTime = deliveredOrders.reduce((sum, order) => 
                sum + (order.actualDeliveryTime - order.timestamp), 0) / deliveredOrders.length;
            this.statistics.averageDeliveryTime = avgTime / (1000 * 60); // Convert to minutes
        }
        
        // Calculate efficiency
        if (this.statistics.totalDeliveries > 0) {
            this.statistics.efficiency = (this.statistics.successfulDeliveries / this.statistics.totalDeliveries) * 100;
        }
        
        this.statistics.uptime = this.currentTime;
    }

    /**
     * Log event with timestamp
     * @param {string} message - Event message
     * @param {string} type - Event type (info, success, warning, error)
     */
    logEvent(message, type = 'info') {
        const event = {
            timestamp: new Date(),
            simulationTime: this.currentTime,
            message: message,
            type: type
        };
        
        this.eventLog.push(event);
        
        // Keep only last 1000 events
        if (this.eventLog.length > 1000) {
            this.eventLog.shift();
        }
        
        this.emit('eventLogged', { event });
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            for (const callback of this.eventListeners.get(event)) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            }
        }
    }

    /**
     * Get simulation state
     * @returns {Object} Current simulation state
     */
    getState() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            speed: this.speed,
            currentTime: this.currentTime,
            statistics: { ...this.statistics },
            dronesCount: this.drones.size,
            ordersCount: this.orders.size,
            eventLogSize: this.eventLog.length
        };
    }

    /**
     * Get formatted simulation time
     * @returns {string} Formatted time string
     */
    getFormattedTime() {
        const hours = Math.floor(this.currentTime / 3600);
        const minutes = Math.floor((this.currentTime % 3600) / 60);
        const seconds = Math.floor(this.currentTime % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Generate simulation report
     * @returns {Object} Comprehensive simulation report
     */
    generateReport() {
        const drones = Array.from(this.drones.values());
        const droneStats = drones.map(drone => ({
            name: drone.name,
            deliveries: drone.completedDeliveries,
            distance: drone.totalDistanceTraveled,
            efficiency: drone.stats.efficiencyScore,
            batteryUsed: drone.totalBatteryUsed,
            status: drone.status
        }));

        return {
            summary: {
                simulationTime: this.getFormattedTime(),
                totalDrones: this.drones.size,
                totalOrders: this.statistics.totalDeliveries,
                successRate: this.statistics.efficiency,
                averageDeliveryTime: this.statistics.averageDeliveryTime
            },
            drones: droneStats,
            performance: {
                totalDistance: this.statistics.totalDistance,
                batteryConsumption: this.statistics.batteryConsumption,
                activeDrones: this.statistics.activeDrones,
                pendingOrders: this.statistics.pendingOrders
            },
            events: this.eventLog.slice(-50) // Last 50 events
        };
    }

    /**
     * Export simulation data
     * @returns {Object} Exportable data
     */
    exportData() {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            state: this.getState(),
            drones: Array.from(this.drones.values()).map(d => d.toJSON()),
            orders: Array.from(this.orders.values()).map(o => o.toJSON()),
            completedOrders: this.completedOrders.map(o => o.toJSON()),
            obstacles: this.obstacles,
            eventLog: this.eventLog,
            statistics: this.statistics
        };
    }

    /**
     * Import simulation data
     * @param {Object} data - Data to import
     */
    importData(data) {
        this.stop();
        this.reset();
        
        // Restore drones
        if (data.drones) {
            for (const droneData of data.drones) {
                const drone = Drone.fromJSON(droneData);
                this.addDrone(drone);
            }
        }
        
        // Restore orders
        if (data.orders) {
            for (const orderData of data.orders) {
                const order = Order.fromJSON(orderData);
                this.addOrder(order);
            }
        }
        
        // Restore other state
        if (data.obstacles) {
            this.obstacles = data.obstacles;
        }
        
        if (data.statistics) {
            this.statistics = { ...this.statistics, ...data.statistics };
        }
        
        this.logEvent('Dados importados com sucesso', 'success');
    }

    /**
     * Handle delivery completion
     * @param {Order} order - Completed order
     */
    handleDeliveryCompletion(order) {
        // Move to completed orders
        this.completedOrders.push(order);
        this.orders.delete(order.id);
        
        this.logEvent(`Pedido ${order.id} entregue com sucesso para ${order.customerName}`, 'success');
        this.emit('deliveryCompleted', { order });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationEngine;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.SimulationEngine = SimulationEngine;
}
