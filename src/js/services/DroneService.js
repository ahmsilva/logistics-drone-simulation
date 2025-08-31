/**
 * Drone Service - Business logic for drone management
 * DTI Digital - Logistics Drone Simulation
 */

class DroneService {
    constructor() {
        this.drones = new Map();
        this.droneCounter = 1;
    }

    /**
     * Create a new drone
     * @param {Object} droneData - Drone configuration data
     * @returns {Object} Result with drone or error
     */
    createDrone(droneData) {
        try {
            // Validate input data
            const validation = ValidationUtils ? ValidationUtils.validateDrone(droneData) : { isValid: true, errors: [] };
            if (!validation.isValid) {
                return { success: false, errors: validation.errors };
            }

            // Generate unique name if not provided
            if (!droneData.name) {
                droneData.name = `Drone-${this.droneCounter.toString().padStart(3, '0')}`;
                this.droneCounter++;
            }

            // Check for duplicate names
            if (this.isDroneNameTaken(droneData.name)) {
                return { success: false, errors: ['Nome do drone já está em uso'] };
            }

            // Create drone instance
            const drone = new Drone(droneData);
            this.drones.set(drone.id, drone);

            return { success: true, drone: drone };
        } catch (error) {
            return { success: false, errors: [`Erro ao criar drone: ${error.message}`] };
        }
    }

    /**
     * Get drone by ID
     * @param {string} droneId - Drone ID
     * @returns {Drone|null} Drone instance or null
     */
    getDrone(droneId) {
        return this.drones.get(droneId) || null;
    }

    /**
     * Get all drones
     * @returns {Array} Array of all drones
     */
    getAllDrones() {
        return Array.from(this.drones.values());
    }

    /**
     * Get drones by status
     * @param {string} status - Drone status to filter
     * @returns {Array} Array of drones with specified status
     */
    getDronesByStatus(status) {
        return this.getAllDrones().filter(drone => drone.status === status);
    }

    /**
     * Get available drones for assignment
     * @param {number} minBattery - Minimum battery level required
     * @returns {Array} Array of available drones
     */
    getAvailableDrones(minBattery = 20) {
        return this.getAllDrones().filter(drone => 
            drone.status === 'idle' && 
            drone.batteryLevel >= minBattery &&
            !drone.needsMaintenance()
        );
    }

    /**
     * Update drone information
     * @param {string} droneId - Drone ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Update result
     */
    updateDrone(droneId, updateData) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            // Validate update data
            const validation = ValidationUtils ? ValidationUtils.validateDrone({...drone, ...updateData}) : { isValid: true };
            if (!validation.isValid) {
                return { success: false, errors: validation.errors };
            }

            // Check for name conflicts
            if (updateData.name && updateData.name !== drone.name) {
                if (this.isDroneNameTaken(updateData.name)) {
                    return { success: false, errors: ['Nome do drone já está em uso'] };
                }
            }

            // Update drone properties
            Object.assign(drone, updateData);
            drone.updatedAt = new Date();

            return { success: true, drone: drone };
        } catch (error) {
            return { success: false, errors: [`Erro ao atualizar drone: ${error.message}`] };
        }
    }

    /**
     * Delete drone
     * @param {string} droneId - Drone ID
     * @returns {Object} Deletion result
     */
    deleteDrone(droneId) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            // Check if drone is busy
            if (drone.status !== 'idle' && drone.status !== 'offline') {
                return { success: false, errors: ['Não é possível remover drone ativo'] };
            }

            this.drones.delete(droneId);
            return { success: true, message: 'Drone removido com sucesso' };
        } catch (error) {
            return { success: false, errors: [`Erro ao remover drone: ${error.message}`] };
        }
    }

    /**
     * Check if drone name is taken
     * @param {string} name - Drone name to check
     * @returns {boolean} True if name is taken
     */
    isDroneNameTaken(name) {
        return this.getAllDrones().some(drone => drone.name === name);
    }

    /**
     * Find best drone for order
     * @param {Order} order - Order to assign
     * @param {Array} availableDrones - Available drones (optional)
     * @returns {Drone|null} Best suitable drone
     */
    findBestDroneForOrder(order, availableDrones = null) {
        const drones = availableDrones || this.getAvailableDrones();
        
        if (drones.length === 0) return null;

        let bestDrone = null;
        let bestScore = -1;

        for (const drone of drones) {
            if (!order.canBeAssignedTo(drone)) continue;

            const score = this.calculateDroneOrderScore(drone, order);
            if (score > bestScore) {
                bestScore = score;
                bestDrone = drone;
            }
        }

        return bestDrone;
    }

    /**
     * Calculate compatibility score between drone and order
     * @param {Drone} drone - Drone to evaluate
     * @param {Order} order - Order to evaluate
     * @returns {number} Compatibility score (0-100)
     */
    calculateDroneOrderScore(drone, order) {
        // Distance factor (closer is better)
        const distance = drone.getDistanceTo(order.location);
        const maxDistance = Math.sqrt(2) * 100; // Maximum possible distance in 100x100 grid
        const distanceScore = (1 - (distance / maxDistance)) * 100;

        // Battery factor
        const batteryScore = drone.batteryLevel;

        // Capacity utilization factor
        const capacityUtilization = (order.weight / drone.capacity) * 100;
        const capacityScore = capacityUtilization > 80 ? capacityUtilization : 100 - capacityUtilization;

        // Speed factor
        const speedScore = Math.min(drone.speed / 60 * 100, 100);

        // Efficiency factor
        const efficiencyScore = drone.stats.efficiencyScore;

        // Weighted average
        return (
            distanceScore * 0.3 +
            batteryScore * 0.25 +
            capacityScore * 0.2 +
            speedScore * 0.1 +
            efficiencyScore * 0.15
        );
    }

    /**
     * Get drone performance statistics
     * @param {string} droneId - Drone ID (optional)
     * @returns {Object} Performance statistics
     */
    getDroneStatistics(droneId = null) {
        const drones = droneId ? [this.getDrone(droneId)].filter(Boolean) : this.getAllDrones();

        if (drones.length === 0) {
            return null;
        }

        const stats = {
            totalDrones: drones.length,
            activeDrones: drones.filter(d => d.status !== 'offline').length,
            idleDrones: drones.filter(d => d.status === 'idle').length,
            busyDrones: drones.filter(d => ['flying', 'delivering', 'loading'].includes(d.status)).length,
            chargingDrones: drones.filter(d => d.status === 'charging').length,
            maintenanceDrones: drones.filter(d => d.status === 'maintenance').length,
            totalDeliveries: drones.reduce((sum, d) => sum + d.completedDeliveries, 0),
            totalDistance: drones.reduce((sum, d) => sum + d.totalDistanceTraveled, 0),
            averageBattery: drones.reduce((sum, d) => sum + d.batteryLevel, 0) / drones.length,
            averageEfficiency: drones.reduce((sum, d) => sum + d.stats.efficiencyScore, 0) / drones.length
        };

        // Calculate performance metrics
        stats.utilizationRate = (stats.busyDrones / stats.activeDrones) * 100 || 0;
        stats.maintenanceRate = (stats.maintenanceDrones / stats.totalDrones) * 100;
        stats.averageDeliveriesPerDrone = stats.totalDeliveries / stats.totalDrones || 0;

        return stats;
    }

    /**
     * Get drone fleet status summary
     * @returns {Object} Fleet status summary
     */
    getFleetStatus() {
        const drones = this.getAllDrones();
        const statusCounts = {};
        
        // Count drones by status
        for (const drone of drones) {
            statusCounts[drone.status] = (statusCounts[drone.status] || 0) + 1;
        }

        return {
            total: drones.length,
            statusCounts: statusCounts,
            lowBattery: drones.filter(d => d.batteryLevel < 20).length,
            needsMaintenance: drones.filter(d => d.needsMaintenance()).length,
            averageCapacity: drones.reduce((sum, d) => sum + d.capacity, 0) / drones.length || 0,
            averageRange: drones.reduce((sum, d) => sum + d.range, 0) / drones.length || 0
        };
    }

    /**
     * Schedule maintenance for drone
     * @param {string} droneId - Drone ID
     * @returns {Object} Scheduling result
     */
    scheduleMaintenance(droneId) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            if (drone.status !== 'idle') {
                return { success: false, errors: ['Drone deve estar disponível para manutenção'] };
            }

            drone.performMaintenance();
            return { success: true, message: 'Manutenção agendada com sucesso' };
        } catch (error) {
            return { success: false, errors: [`Erro ao agendar manutenção: ${error.message}`] };
        }
    }

    /**
     * Force drone to return to base
     * @param {string} droneId - Drone ID
     * @returns {Object} Command result
     */
    recallDrone(droneId) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            if (drone.status === 'idle') {
                return { success: false, errors: ['Drone já está na base'] };
            }

            // Cancel current orders and return to base
            for (const order of drone.currentOrders) {
                order.updateStatus('pending');
                order.assignedDrone = null;
            }

            drone.currentOrders = [];
            drone.updateStatus('returning');
            
            return { success: true, message: 'Drone retornando à base' };
        } catch (error) {
            return { success: false, errors: [`Erro ao chamar drone: ${error.message}`] };
        }
    }

    /**
     * Charge drone battery manually
     * @param {string} droneId - Drone ID
     * @returns {Object} Charge result
     */
    chargeDrone(droneId) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            if (drone.status !== 'idle') {
                return { success: false, errors: ['Drone deve estar disponível para carregamento'] };
            }

            if (drone.batteryLevel >= 100) {
                return { success: false, errors: ['Bateria já está carregada'] };
            }

            drone.updateStatus('charging');
            return { success: true, message: 'Carregamento iniciado' };
        } catch (error) {
            return { success: false, errors: [`Erro ao iniciar carregamento: ${error.message}`] };
        }
    }

    /**
     * Set drone offline/online
     * @param {string} droneId - Drone ID
     * @param {boolean} offline - Whether to set offline
     * @returns {Object} Status change result
     */
    setDroneOffline(droneId, offline = true) {
        try {
            const drone = this.getDrone(droneId);
            if (!drone) {
                return { success: false, errors: ['Drone não encontrado'] };
            }

            if (offline) {
                if (drone.status !== 'idle') {
                    return { success: false, errors: ['Drone deve estar disponível para ser desativado'] };
                }
                drone.updateStatus('offline');
            } else {
                if (drone.status !== 'offline') {
                    return { success: false, errors: ['Drone não está offline'] };
                }
                drone.updateStatus('idle');
            }

            return { success: true, message: offline ? 'Drone desativado' : 'Drone ativado' };
        } catch (error) {
            return { success: false, errors: [`Erro ao alterar status: ${error.message}`] };
        }
    }

    /**
     * Get drones that need maintenance
     * @returns {Array} Array of drones needing maintenance
     */
    getDronesNeedingMaintenance() {
        return this.getAllDrones().filter(drone => drone.needsMaintenance());
    }

    /**
     * Get drone efficiency rankings
     * @returns {Array} Array of drones sorted by efficiency
     */
    getDroneEfficiencyRankings() {
        return this.getAllDrones()
            .sort((a, b) => b.stats.efficiencyScore - a.stats.efficiencyScore)
            .map((drone, index) => ({
                rank: index + 1,
                drone: drone,
                efficiency: drone.stats.efficiencyScore,
                deliveries: drone.completedDeliveries,
                distance: drone.totalDistanceTraveled
            }));
    }

    /**
     * Get optimal fleet size recommendation
     * @param {number} expectedOrders - Expected orders per day
     * @param {number} avgOrderWeight - Average order weight
     * @param {number} avgDeliveryDistance - Average delivery distance
     * @returns {Object} Fleet recommendation
     */
    getFleetSizeRecommendation(expectedOrders, avgOrderWeight = 2, avgDeliveryDistance = 20) {
        const avgDroneCapacity = 10; // kg
        const avgDeliveryTime = 60; // minutes
        const operatingHours = 12; // hours per day
        
        const ordersPerDronePerDay = (operatingHours * 60) / avgDeliveryTime;
        const recommendedDrones = Math.ceil(expectedOrders / ordersPerDronePerDay);
        
        const currentDrones = this.getAllDrones().length;
        const utilizationRate = this.getDroneStatistics().utilizationRate;
        
        return {
            recommended: recommendedDrones,
            current: currentDrones,
            difference: recommendedDrones - currentDrones,
            utilization: utilizationRate,
            reasoning: {
                expectedOrders,
                ordersPerDrone: ordersPerDronePerDay,
                currentEfficiency: utilizationRate
            }
        };
    }

    /**
     * Simulate drone performance under different conditions
     * @param {string} droneId - Drone ID
     * @param {Object} conditions - Simulation conditions
     * @returns {Object} Performance simulation
     */
    simulateDronePerformance(droneId, conditions = {}) {
        const drone = this.getDrone(droneId);
        if (!drone) return null;

        const {
            orderWeight = 5,
            deliveryDistance = 25,
            weatherCondition = 'normal', // normal, windy, rainy
            batteryStartLevel = drone.batteryLevel
        } = conditions;

        // Weather impact factors
        const weatherFactors = {
            normal: { speedFactor: 1.0, batteryFactor: 1.0 },
            windy: { speedFactor: 0.8, batteryFactor: 1.2 },
            rainy: { speedFactor: 0.7, batteryFactor: 1.3 }
        };

        const weather = weatherFactors[weatherCondition] || weatherFactors.normal;
        const effectiveSpeed = drone.speed * weather.speedFactor;
        const batteryConsumption = (deliveryDistance * 2) * weather.batteryFactor;
        const deliveryTime = (deliveryDistance / effectiveSpeed) * 60; // minutes

        return {
            canComplete: (batteryStartLevel >= batteryConsumption && orderWeight <= drone.capacity),
            estimatedTime: deliveryTime,
            batteryUsed: batteryConsumption,
            remainingBattery: Math.max(0, batteryStartLevel - batteryConsumption),
            conditions: conditions,
            recommendations: this.generatePerformanceRecommendations(drone, {
                deliveryTime,
                batteryUsed: batteryConsumption,
                canComplete: batteryStartLevel >= batteryConsumption
            })
        };
    }

    /**
     * Generate performance improvement recommendations
     * @param {Drone} drone - Drone to analyze
     * @param {Object} performance - Performance data
     * @returns {Array} Array of recommendations
     */
    generatePerformanceRecommendations(drone, performance) {
        const recommendations = [];

        if (drone.stats.efficiencyScore < 70) {
            recommendations.push('Considere manutenção preventiva para melhorar eficiência');
        }

        if (drone.batteryLevel < 30) {
            recommendations.push('Carregue a bateria antes da próxima missão');
        }

        if (performance.deliveryTime > 90) {
            recommendations.push('Rota longa detectada - considere otimização de trajeto');
        }

        if (drone.completedDeliveries < 5) {
            recommendations.push('Drone subutilizado - considere atribuir mais entregas');
        }

        if (performance.batteryUsed > 80) {
            recommendations.push('Alto consumo de bateria - verifique condições de voo');
        }

        return recommendations;
    }

    /**
     * Export all drones data
     * @returns {Object} Export data
     */
    exportDrones() {
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            drones: this.getAllDrones().map(drone => drone.toJSON()),
            statistics: this.getDroneStatistics(),
            fleetStatus: this.getFleetStatus()
        };
    }

    /**
     * Import drones data
     * @param {Object} data - Import data
     * @returns {Object} Import result
     */
    importDrones(data) {
        try {
            if (!data.drones || !Array.isArray(data.drones)) {
                return { success: false, errors: ['Formato de dados inválido'] };
            }

            let importedCount = 0;
            const errors = [];

            for (const droneData of data.drones) {
                try {
                    const drone = Drone.fromJSON(droneData);
                    this.drones.set(drone.id, drone);
                    importedCount++;
                } catch (error) {
                    errors.push(`Erro ao importar drone ${droneData.name}: ${error.message}`);
                }
            }

            return {
                success: importedCount > 0,
                imported: importedCount,
                errors: errors,
                message: `${importedCount} drones importados com sucesso`
            };
        } catch (error) {
            return { success: false, errors: [`Erro na importação: ${error.message}`] };
        }
    }

    /**
     * Clear all drones
     * @returns {Object} Clear result
     */
    clearAllDrones() {
        const count = this.drones.size;
        this.drones.clear();
        this.droneCounter = 1;
        
        return {
            success: true,
            cleared: count,
            message: `${count} drones removidos`
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DroneService;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.DroneService = DroneService;
}
