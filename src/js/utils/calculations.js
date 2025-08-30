/**
 * Utility functions for mathematical calculations in the drone simulation
 * DTI Digital - Logistics Drone Simulation
 */

class CalculationUtils {
    /**
     * Calculate Euclidean distance between two points
     * @param {Object} point1 - {x, y} coordinates
     * @param {Object} point2 - {x, y} coordinates
     * @returns {number} Distance in units
     */
    static calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate Manhattan distance between two points
     * @param {Object} point1 - {x, y} coordinates
     * @param {Object} point2 - {x, y} coordinates
     * @returns {number} Manhattan distance
     */
    static calculateManhattanDistance(point1, point2) {
        return Math.abs(point2.x - point1.x) + Math.abs(point2.y - point1.y);
    }

    /**
     * Calculate travel time based on distance and speed
     * @param {number} distance - Distance in km
     * @param {number} speed - Speed in km/h
     * @returns {number} Time in minutes
     */
    static calculateTravelTime(distance, speed) {
        return (distance / speed) * 60; // Convert hours to minutes
    }

    /**
     * Calculate battery consumption based on distance
     * @param {number} distance - Distance in km
     * @param {number} consumptionRate - Battery consumption per km (default: 2%)
     * @returns {number} Battery consumed as percentage
     */
    static calculateBatteryConsumption(distance, consumptionRate = 2) {
        return distance * consumptionRate;
    }

    /**
     * Calculate optimal route using Nearest Neighbor heuristic
     * @param {Array} points - Array of delivery points
     * @param {Object} startPoint - Starting position
     * @returns {Array} Optimized route
     */
    static calculateOptimalRoute(points, startPoint) {
        if (!points || points.length === 0) return [];
        if (points.length === 1) return [points[0]];

        const route = [];
        const unvisited = [...points];
        let currentPoint = startPoint;

        while (unvisited.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = this.calculateDistance(currentPoint, unvisited[0]);

            for (let i = 1; i < unvisited.length; i++) {
                const distance = this.calculateDistance(currentPoint, unvisited[i]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }

            const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
            route.push(nearestPoint);
            currentPoint = nearestPoint;
        }

        return route;
    }

    /**
     * Calculate total route distance including return to base
     * @param {Array} route - Array of points in order
     * @param {Object} basePoint - Base station coordinates
     * @returns {number} Total distance
     */
    static calculateTotalRouteDistance(route, basePoint) {
        if (!route || route.length === 0) return 0;

        let totalDistance = 0;
        let currentPoint = basePoint;

        // Distance from base to first point
        if (route.length > 0) {
            totalDistance += this.calculateDistance(currentPoint, route[0]);
            currentPoint = route[0];
        }

        // Distance between consecutive points
        for (let i = 1; i < route.length; i++) {
            totalDistance += this.calculateDistance(currentPoint, route[i]);
            currentPoint = route[i];
        }

        // Distance back to base
        if (route.length > 0) {
            totalDistance += this.calculateDistance(currentPoint, basePoint);
        }

        return totalDistance;
    }

    /**
     * Check if point is within drone's range
     * @param {Object} dronePosition - Current drone position
     * @param {Object} targetPoint - Target delivery point
     * @param {number} maxRange - Maximum drone range in km
     * @returns {boolean} Whether point is reachable
     */
    static isPointInRange(dronePosition, targetPoint, maxRange) {
        const distance = this.calculateDistance(dronePosition, targetPoint);
        return distance <= maxRange;
    }

    /**
     * Calculate delivery priority score
     * @param {Object} order - Order object with priority, timestamp, weight
     * @returns {number} Priority score (higher = more priority)
     */
    static calculatePriorityScore(order) {
        const priorityWeights = {
            'alta': 100,
            'media': 50,
            'baixa': 10
        };

        const priorityScore = priorityWeights[order.priority] || 10;
        const timeScore = Date.now() - order.timestamp; // Older orders get higher score
        const weightPenalty = order.weight * 2; // Heavier packages get slight penalty

        return priorityScore + (timeScore / 1000) - weightPenalty;
    }

    /**
     * Group orders by proximity for batch delivery
     * @param {Array} orders - Array of orders
     * @param {number} proximityThreshold - Maximum distance to group orders
     * @returns {Array} Array of order groups
     */
    static groupOrdersByProximity(orders, proximityThreshold = 5) {
        const groups = [];
        const processed = new Set();

        for (let i = 0; i < orders.length; i++) {
            if (processed.has(i)) continue;

            const group = [orders[i]];
            processed.add(i);

            for (let j = i + 1; j < orders.length; j++) {
                if (processed.has(j)) continue;

                const distance = this.calculateDistance(
                    orders[i].location,
                    orders[j].location
                );

                if (distance <= proximityThreshold) {
                    group.push(orders[j]);
                    processed.add(j);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Check if orders can fit in drone capacity
     * @param {Array} orders - Array of orders
     * @param {number} droneCapacity - Drone weight capacity in kg
     * @returns {boolean} Whether all orders fit
     */
    static canFitInDrone(orders, droneCapacity) {
        const totalWeight = orders.reduce((sum, order) => sum + order.weight, 0);
        return totalWeight <= droneCapacity;
    }

    /**
     * Optimize order loading using bin packing algorithm
     * @param {Array} orders - Available orders
     * @param {number} capacity - Drone capacity
     * @returns {Array} Optimally packed orders
     */
    static optimizeOrderPacking(orders, capacity) {
        // Sort orders by priority score (descending)
        const sortedOrders = orders
            .map(order => ({
                ...order,
                priorityScore: this.calculatePriorityScore(order)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore);

        const packed = [];
        let remainingCapacity = capacity;

        for (const order of sortedOrders) {
            if (order.weight <= remainingCapacity) {
                packed.push(order);
                remainingCapacity -= order.weight;
            }
        }

        return packed;
    }

    /**
     * Calculate estimated delivery time
     * @param {Object} drone - Drone object
     * @param {Array} orders - Orders to deliver
     * @param {number} baseX - Base X coordinate
     * @param {number} baseY - Base Y coordinate
     * @returns {number} Estimated time in minutes
     */
    static estimateDeliveryTime(drone, orders, baseX = 0, baseY = 0) {
        if (!orders || orders.length === 0) return 0;

        const basePoint = { x: baseX, y: baseY };
        const deliveryPoints = orders.map(order => order.location);
        const route = this.calculateOptimalRoute(deliveryPoints, basePoint);
        const totalDistance = this.calculateTotalRouteDistance(route, basePoint);
        
        const travelTime = this.calculateTravelTime(totalDistance, drone.speed);
        const deliveryTime = orders.length * 3; // 3 minutes per delivery
        const loadingTime = 5; // 5 minutes loading time

        return travelTime + deliveryTime + loadingTime;
    }

    /**
     * Calculate efficiency score for drone
     * @param {number} deliveriesCompleted - Number of deliveries
     * @param {number} totalDistance - Total distance traveled
     * @param {number} batteryUsed - Battery consumption
     * @returns {number} Efficiency score (0-100)
     */
    static calculateEfficiencyScore(deliveriesCompleted, totalDistance, batteryUsed) {
        if (deliveriesCompleted === 0) return 0;
        
        const deliveryRate = deliveriesCompleted / Math.max(totalDistance, 1);
        const batteryEfficiency = Math.max(0, 100 - batteryUsed);
        const score = (deliveryRate * 50) + (batteryEfficiency * 0.5);
        
        return Math.min(100, Math.max(0, score));
    }

    /**
     * Generate random coordinates within bounds
     * @param {number} maxX - Maximum X coordinate
     * @param {number} maxY - Maximum Y coordinate
     * @returns {Object} Random coordinates
     */
    static generateRandomCoordinates(maxX = 100, maxY = 100) {
        return {
            x: Math.floor(Math.random() * maxX),
            y: Math.floor(Math.random() * maxY)
        };
    }

    /**
     * Format time from minutes to human readable format
     * @param {number} minutes - Time in minutes
     * @returns {string} Formatted time
     */
    static formatTime(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)}min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = Math.round(minutes % 60);
        return `${hours}h ${remainingMinutes}min`;
    }

    /**
     * Convert coordinates to display format
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Formatted coordinates
     */
    static formatCoordinates(x, y) {
        return `(${Math.round(x)}, ${Math.round(y)})`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculationUtils;
}
