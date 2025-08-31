
class OrderService {
    constructor() {
        this.orders = new Map();
        this.completedOrders = [];
        this.orderCounter = 1;
        this.priorityQueue = [];
    }

    /**
     * Create a new order
     * @param {Object} orderData - Order data
     * @returns {Object} Result with order or error
     */
    createOrder(orderData) {
        try {
            // Validate input data
            const validation = ValidationUtils ? ValidationUtils.validateOrder(orderData) : { isValid: true, errors: [] };
            if (!validation.isValid) {
                return { success: false, errors: validation.errors };
            }

            // Create order instance
            const order = new Order({
                ...orderData,
                timestamp: Date.now()
            });

            this.orders.set(order.id, order);
            this.updatePriorityQueue();

            return { success: true, order: order };
        } catch (error) {
            return { success: false, errors: [`Erro ao criar pedido: ${error.message}`] };
        }
    }

    /**
     * Get order by ID
     * @param {string} orderId - Order ID
     * @returns {Order|null} Order instance or null
     */
    getOrder(orderId) {
        return this.orders.get(orderId) || null;
    }

    /**
     * Get all active orders
     * @returns {Array} Array of active orders
     */
    getAllOrders() {
        return Array.from(this.orders.values());
    }

    /**
     * Get orders by status
     * @param {string} status - Order status to filter
     * @returns {Array} Array of orders with specified status
     */
    getOrdersByStatus(status) {
        return this.getAllOrders().filter(order => order.status === status);
    }

    /**
     * Get pending orders sorted by priority
     * @returns {Array} Array of pending orders
     */
    getPendingOrders() {
        return this.getOrdersByStatus('pending')
            .sort((a, b) => b.getPriorityScore() - a.getPriorityScore());
    }

    /**
     * Get orders assigned to specific drone
     * @param {string} droneId - Drone ID
     * @returns {Array} Array of assigned orders
     */
    getOrdersByDrone(droneId) {
        return this.getAllOrders().filter(order => order.assignedDrone === droneId);
    }

    /**
     * Update order information
     * @param {string} orderId - Order ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Update result
     */
    updateOrder(orderId, updateData) {
        try {
            const order = this.getOrder(orderId);
            if (!order) {
                return { success: false, errors: ['Pedido não encontrado'] };
            }

            // Validate update data
            const validation = ValidationUtils ? ValidationUtils.validateOrder({...order, ...updateData}) : { isValid: true };
            if (!validation.isValid) {
                return { success: false, errors: validation.errors };
            }

            // Update order properties
            Object.assign(order, updateData);
            order.updatedAt = new Date();

            this.updatePriorityQueue();
            return { success: true, order: order };
        } catch (error) {
            return { success: false, errors: [`Erro ao atualizar pedido: ${error.message}`] };
        }
    }

    /**
     * Cancel order
     * @param {string} orderId - Order ID
     * @returns {Object} Cancellation result
     */
    cancelOrder(orderId) {
        try {
            const order = this.getOrder(orderId);
            if (!order) {
                return { success: false, errors: ['Pedido não encontrado'] };
            }

            if (order.status === 'delivered') {
                return { success: false, errors: ['Não é possível cancelar pedido entregue'] };
            }

            if (order.status === 'cancelled') {
                return { success: false, errors: ['Pedido já foi cancelado'] };
            }

            order.updateStatus('cancelled');
            this.moveToCompleted(order);

            return { success: true, message: 'Pedido cancelado com sucesso' };
        } catch (error) {
            return { success: false, errors: [`Erro ao cancelar pedido: ${error.message}`] };
        }
    }

    /**
     * Complete order delivery
     * @param {string} orderId - Order ID
     * @returns {Object} Completion result
     */
    completeOrder(orderId) {
        try {
            const order = this.getOrder(orderId);
            if (!order) {
                return { success: false, errors: ['Pedido não encontrado'] };
            }

            if (order.status === 'delivered') {
                return { success: false, errors: ['Pedido já foi entregue'] };
            }

            order.updateStatus('delivered');
            this.moveToCompleted(order);

            return { success: true, message: 'Pedido entregue com sucesso' };
        } catch (error) {
            return { success: false, errors: [`Erro ao completar pedido: ${error.message}`] };
        }
    }

    /**
     * Move order to completed list
     * @param {Order} order - Order to move
     */
    moveToCompleted(order) {
        this.orders.delete(order.id);
        this.completedOrders.push(order);
        this.updatePriorityQueue();

        // Keep only last 1000 completed orders
        if (this.completedOrders.length > 1000) {
            this.completedOrders.shift();
        }
    }

    /**
     * Update priority queue
     */
    updatePriorityQueue() {
        this.priorityQueue = this.getPendingOrders();
    }

    /**
     * Get next order from priority queue
     * @returns {Order|null} Next priority order
     */
    getNextPriorityOrder() {
        return this.priorityQueue.length > 0 ? this.priorityQueue[0] : null;
    }

    /**
     * Get orders by priority level
     * @param {string} priority - Priority level
     * @returns {Array} Array of orders with specified priority
     */
    getOrdersByPriority(priority) {
        return this.getAllOrders().filter(order => order.priority === priority);
    }

    /**
     * Get overdue orders
     * @returns {Array} Array of overdue orders
     */
    getOverdueOrders() {
        return this.getAllOrders().filter(order => order.isOverdue());
    }

    /**
     * Get orders within delivery area
     * @param {Object} center - Center point {x, y}
     * @param {number} radius - Radius from center
     * @returns {Array} Array of orders within area
     */
    getOrdersInArea(center, radius) {
        return this.getAllOrders().filter(order => {
            const distance = CalculationUtils ? 
                CalculationUtils.calculateDistance(center, order.location) :
                Math.sqrt(Math.pow(center.x - order.location.x, 2) + Math.pow(center.y - order.location.y, 2));
            return distance <= radius;
        });
    }

    /**
     * Group orders by proximity for batch delivery
     * @param {number} proximityThreshold - Maximum distance to group orders
     * @returns {Array} Array of order groups
     */
    groupOrdersByProximity(proximityThreshold = 5) {
        const pendingOrders = this.getPendingOrders();
        return CalculationUtils ? 
            CalculationUtils.groupOrdersByProximity(pendingOrders, proximityThreshold) :
            [pendingOrders];
    }

    /**
     * Get order statistics
     * @param {Object} filters - Optional filters
     * @returns {Object} Order statistics
     */
    getOrderStatistics(filters = {}) {
        const allOrders = [...this.getAllOrders(), ...this.completedOrders];
        let filteredOrders = allOrders;

        // Apply filters
        if (filters.priority) {
            filteredOrders = filteredOrders.filter(order => order.priority === filters.priority);
        }

        if (filters.status) {
            filteredOrders = filteredOrders.filter(order => order.status === filters.status);
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            filteredOrders = filteredOrders.filter(order => new Date(order.timestamp) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            filteredOrders = filteredOrders.filter(order => new Date(order.timestamp) <= toDate);
        }

        // Calculate statistics
        const stats = {
            total: filteredOrders.length,
            pending: filteredOrders.filter(o => o.status === 'pending').length,
            assigned: filteredOrders.filter(o => o.status === 'assigned').length,
            inTransit: filteredOrders.filter(o => o.status === 'in_transit').length,
            delivered: filteredOrders.filter(o => o.status === 'delivered').length,
            cancelled: filteredOrders.filter(o => o.status === 'cancelled').length,
            overdue: filteredOrders.filter(o => o.isOverdue()).length,
            
            // Priority breakdown
            priorityBreakdown: {
                alta: filteredOrders.filter(o => o.priority === 'alta').length,
                media: filteredOrders.filter(o => o.priority === 'media').length,
                baixa: filteredOrders.filter(o => o.priority === 'baixa').length
            },

            // Weight statistics
            totalWeight: filteredOrders.reduce((sum, order) => sum + order.weight, 0),
            averageWeight: filteredOrders.length > 0 ? 
                filteredOrders.reduce((sum, order) => sum + order.weight, 0) / filteredOrders.length : 0,

            // Delivery time statistics
            averageDeliveryTime: this.calculateAverageDeliveryTime(filteredOrders),
            
            // Success rate
            successRate: filteredOrders.length > 0 ? 
                (filteredOrders.filter(o => o.status === 'delivered').length / filteredOrders.length) * 100 : 0
        };

        return stats;
    }

    /**
     * Calculate average delivery time for completed orders
     * @param {Array} orders - Orders to calculate
     * @returns {number} Average delivery time in minutes
     */
    calculateAverageDeliveryTime(orders) {
        const deliveredOrders = orders.filter(order => 
            order.status === 'delivered' && order.actualDeliveryTime
        );

        if (deliveredOrders.length === 0) return 0;

        const totalTime = deliveredOrders.reduce((sum, order) => {
            return sum + (order.actualDeliveryTime - order.timestamp);
        }, 0);

        return totalTime / deliveredOrders.length / (1000 * 60); // Convert to minutes
    }

    /**
     * Get delivery performance metrics
     * @returns {Object} Performance metrics
     */
    getDeliveryPerformance() {
        const allOrders = [...this.getAllOrders(), ...this.completedOrders];
        const delivered = allOrders.filter(o => o.status === 'delivered');
        const total = allOrders.filter(o => o.status !== 'pending');

        return {
            deliveryRate: total.length > 0 ? (delivered.length / total.length) * 100 : 0,
            onTimeDelivery: this.calculateOnTimeDeliveryRate(delivered),
            averageDeliveryTime: this.calculateAverageDeliveryTime(allOrders),
            customerSatisfaction: this.calculateCustomerSatisfaction(delivered)
        };
    }

    /**
     * Calculate on-time delivery rate
     * @param {Array} deliveredOrders - Delivered orders
     * @returns {number} On-time delivery rate percentage
     */
    calculateOnTimeDeliveryRate(deliveredOrders) {
        const ordersWithDeadline = deliveredOrders.filter(order => order.deliveryTime);
        if (ordersWithDeadline.length === 0) return 100;

        const onTimeOrders = ordersWithDeadline.filter(order => 
            order.actualDeliveryTime <= new Date(order.deliveryTime).getTime()
        );

        return (onTimeOrders.length / ordersWithDeadline.length) * 100;
    }

    /**
     * Calculate customer satisfaction score
     * @param {Array} deliveredOrders - Delivered orders
     * @returns {number} Satisfaction score (0-100)
     */
    calculateCustomerSatisfaction(deliveredOrders) {
        if (deliveredOrders.length === 0) return 100;

        // Simulate satisfaction based on delivery performance
        let totalScore = 0;

        for (const order of deliveredOrders) {
            let score = 100;
            const deliveryTime = (order.actualDeliveryTime - order.timestamp) / (1000 * 60);
            
            // Penalize for long delivery times
            if (deliveryTime > 120) score -= 30;
            else if (deliveryTime > 60) score -= 15;
            
            // Penalize for overdue deliveries
            if (order.deliveryTime && order.actualDeliveryTime > new Date(order.deliveryTime).getTime()) {
                score -= 25;
            }
            
            // Bonus for high priority deliveries completed quickly
            if (order.priority === 'alta' && deliveryTime < 30) {
                score += 10;
            }

            totalScore += Math.max(0, score);
        }

        return totalScore / deliveredOrders.length;
    }

    /**
     * Generate order recommendations
     * @returns {Array} Array of recommendations
     */
    generateOrderRecommendations() {
        const recommendations = [];
        const stats = this.getOrderStatistics();
        const pendingOrders = this.getPendingOrders();
        const overdueOrders = this.getOverdueOrders();

        if (pendingOrders.length > 10) {
            recommendations.push({
                type: 'warning',
                message: `${pendingOrders.length} pedidos pendentes. Considere adicionar mais drones.`,
                priority: 'high'
            });
        }

        if (overdueOrders.length > 0) {
            recommendations.push({
                type: 'error',
                message: `${overdueOrders.length} pedidos em atraso. Ação imediata necessária.`,
                priority: 'critical'
            });
        }

        if (stats.priorityBreakdown.alta > stats.priorityBreakdown.media + stats.priorityBreakdown.baixa) {
            recommendations.push({
                type: 'info',
                message: 'Alto volume de pedidos prioritários. Otimize a alocação de drones.',
                priority: 'medium'
            });
        }

        if (stats.averageWeight > 8) {
            recommendations.push({
                type: 'info',
                message: 'Peso médio dos pedidos alto. Verifique capacidade dos drones.',
                priority: 'low'
            });
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Bulk create orders from array
     * @param {Array} ordersData - Array of order data
     * @returns {Object} Bulk creation result
     */
    bulkCreateOrders(ordersData) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < ordersData.length; i++) {
            const result = this.createOrder(ordersData[i]);
            if (result.success) {
                results.success++;
            } else {
                results.failed++;
                results.errors.push(`Pedido ${i + 1}: ${result.errors.join(', ')}`);
            }
        }

        return results;
    }

    /**
     * Search orders by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Array} Matching orders
     */
    searchOrders(criteria) {
        let orders = this.getAllOrders();

        if (criteria.customer) {
            const searchTerm = criteria.customer.toLowerCase();
            orders = orders.filter(order => 
                order.customerName.toLowerCase().includes(searchTerm)
            );
        }

        if (criteria.priority) {
            orders = orders.filter(order => order.priority === criteria.priority);
        }

        if (criteria.status) {
            orders = orders.filter(order => order.status === criteria.status);
        }

        if (criteria.weightMin !== undefined) {
            orders = orders.filter(order => order.weight >= criteria.weightMin);
        }

        if (criteria.weightMax !== undefined) {
            orders = orders.filter(order => order.weight <= criteria.weightMax);
        }

        if (criteria.location) {
            const { x, y, radius } = criteria.location;
            orders = this.getOrdersInArea({ x, y }, radius);
        }

        return orders;
    }

    /**
     * Export orders data
     * @param {Object} options - Export options
     * @returns {Object} Export data
     */
    exportOrders(options = {}) {
        const { includeCompleted = true, format = 'json' } = options;
        
        let ordersToExport = this.getAllOrders();
        if (includeCompleted) {
            ordersToExport = [...ordersToExport, ...this.completedOrders];
        }

        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            orders: ordersToExport.map(order => order.toJSON()),
            statistics: this.getOrderStatistics(),
            performance: this.getDeliveryPerformance()
        };

        return format === 'csv' ? this.convertToCSV(exportData.orders) : exportData;
    }

    /**
     * Convert orders to CSV format
     * @param {Array} orders - Orders to convert
     * @returns {string} CSV string
     */
    convertToCSV(orders) {
        if (orders.length === 0) return '';

        const headers = [
            'ID', 'Cliente', 'Peso', 'Localização X', 'Localização Y', 
            'Prioridade', 'Status', 'Data Criação', 'Drone Atribuído'
        ];

        const rows = orders.map(order => [
            order.id,
            order.customerName,
            order.weight,
            order.location.x,
            order.location.y,
            order.priority,
            order.status,
            new Date(order.timestamp).toISOString(),
            order.assignedDrone || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Import orders from data
     * @param {Object} data - Import data
     * @returns {Object} Import result
     */
    importOrders(data) {
        try {
            if (!data.orders || !Array.isArray(data.orders)) {
                return { success: false, errors: ['Formato de dados inválido'] };
            }

            let importedCount = 0;
            const errors = [];

            for (const orderData of data.orders) {
                try {
                    const order = Order.fromJSON(orderData);
                    this.orders.set(order.id, order);
                    importedCount++;
                } catch (error) {
                    errors.push(`Erro ao importar pedido ${orderData.id}: ${error.message}`);
                }
            }

            this.updatePriorityQueue();

            return {
                success: importedCount > 0,
                imported: importedCount,
                errors: errors,
                message: `${importedCount} pedidos importados com sucesso`
            };
        } catch (error) {
            return { success: false, errors: [`Erro na importação: ${error.message}`] };
        }
    }

    /**
     * Clear all orders
     * @returns {Object} Clear result
     */
    clearAllOrders() {
        const activeCount = this.orders.size;
        const completedCount = this.completedOrders.length;
        
        this.orders.clear();
        this.completedOrders = [];
        this.priorityQueue = [];
        this.orderCounter = 1;
        
        return {
            success: true,
            cleared: {
                active: activeCount,
                completed: completedCount,
                total: activeCount + completedCount
            },
            message: `${activeCount + completedCount} pedidos removidos`
        };
    }

    /**
     * Get order queue status
     * @returns {Object} Queue status information
     */
    getQueueStatus() {
        return {
            total: this.priorityQueue.length,
            highPriority: this.priorityQueue.filter(o => o.priority === 'alta').length,
            mediumPriority: this.priorityQueue.filter(o => o.priority === 'media').length,
            lowPriority: this.priorityQueue.filter(o => o.priority === 'baixa').length,
            overdue: this.priorityQueue.filter(o => o.isOverdue()).length,
            averageAge: this.priorityQueue.length > 0 ? 
                this.priorityQueue.reduce((sum, order) => sum + order.getAge(), 0) / this.priorityQueue.length : 0,
            nextOrder: this.getNextPriorityOrder()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrderService;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.OrderService = OrderService;
}
