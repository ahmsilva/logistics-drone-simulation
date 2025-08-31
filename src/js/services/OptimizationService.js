/**
 * Optimization Service - Advanced algorithms for route optimization and resource allocation
 * DTI Digital - Logistics Drone Simulation
 */

class OptimizationService {
    constructor() {
        this.algorithms = {
            NEAREST_NEIGHBOR: 'nearest_neighbor',
            GENETIC_ALGORITHM: 'genetic_algorithm',
            SIMULATED_ANNEALING: 'simulated_annealing',
            BIN_PACKING: 'bin_packing'
        };
    }

    /**
     * Optimize delivery routes for multiple drones
     * @param {Array} drones - Available drones
     * @param {Array} orders - Orders to deliver
     * @param {Object} options - Optimization options
     * @returns {Object} Optimization result
     */
    optimizeDeliveryRoutes(drones, orders, options = {}) {
        const {
            algorithm = this.algorithms.NEAREST_NEIGHBOR,
            maxIterations = 1000,
            considerTraffic = false,
            considerWeather = false
        } = options;

        try {
            // Pre-process data
            const availableDrones = drones.filter(drone => 
                drone.status === 'idle' && drone.batteryLevel > 20
            );
            const pendingOrders = orders.filter(order => order.status === 'pending');

            if (availableDrones.length === 0 || pendingOrders.length === 0) {
                return { success: false, message: 'Não há drones ou pedidos disponíveis' };
            }

            // Group orders optimally for batch delivery
            const orderGroups = this.groupOrdersForOptimalDelivery(pendingOrders, availableDrones);

            // Assign order groups to drones
            const assignments = this.assignOrderGroupsToDrones(orderGroups, availableDrones);

            // Calculate optimal routes for each assignment
            const optimizedRoutes = assignments.map(assignment => ({
                drone: assignment.drone,
                orders: assignment.orders,
                route: this.calculateOptimalRoute(assignment.orders, assignment.drone.location, algorithm),
                estimatedTime: this.calculateRouteTime(assignment.route, assignment.drone),
                estimatedBattery: this.calculateBatteryConsumption(assignment.route)
            }));

            return {
                success: true,
                routes: optimizedRoutes,
                stats: this.calculateOptimizationStats(optimizedRoutes),
                algorithm: algorithm
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Group orders for optimal batch delivery
     * @param {Array} orders - Orders to group
     * @param {Array} drones - Available drones
     * @returns {Array} Grouped orders
     */
    groupOrdersForOptimalDelivery(orders, drones) {
        const sortedOrders = orders.sort((a, b) => b.getPriorityScore() - a.getPriorityScore());
        
        const groups = [];
        const maxCapacity = Math.max(...drones.map(d => d.capacity));
        
        for (const order of sortedOrders) {
            let assigned = false;
            
            for (const group of groups) {
                const totalWeight = group.reduce((sum, o) => sum + o.weight, 0);
                const totalDistance = this.calculateGroupDistance(group.concat([order]));
                
                if (totalWeight + order.weight <= maxCapacity && totalDistance <= 50) {
                    group.push(order);
                    assigned = true;
                    break;
                }
            }
            
            if (!assigned) {
                groups.push([order]);
            }
        }
        
        return groups;
    }

    /**
     * Calculate total distance for a group of orders
     * @param {Array} orders - Orders in group
     * @returns {number} Total distance
     */
    calculateGroupDistance(orders) {
        if (orders.length <= 1) return 0;
        
        let totalDistance = 0;
        for (let i = 0; i < orders.length - 1; i++) {
            totalDistance += CalculationUtils.calculateDistance(
                orders[i].location, 
                orders[i + 1].location
            );
        }
        
        return totalDistance;
    }

    /**
     * Assign order groups to drones optimally
     * @param {Array} orderGroups - Groups of orders
     * @param {Array} drones - Available drones
     * @returns {Array} Drone assignments
     */
    assignOrderGroupsToDrones(orderGroups, drones) {
        const assignments = [];
        const usedDrones = new Set();
        
        const sortedGroups = orderGroups.sort((a, b) => {
            const avgPriorityA = a.reduce((sum, order) => sum + order.getPriorityScore(), 0) / a.length;
            const avgPriorityB = b.reduce((sum, order) => sum + order.getPriorityScore(), 0) / b.length;
            return avgPriorityB - avgPriorityA;
        });
        
        for (const group of sortedGroups) {
            const bestDrone = this.findBestDroneForGroup(group, drones.filter(d => !usedDrones.has(d.id)));
            
            if (bestDrone) {
                assignments.push({
                    drone: bestDrone,
                    orders: group
                });
                usedDrones.add(bestDrone.id);
            }
        }
        
        return assignments;
    }

    /**
     * Find best drone for a group of orders
     * @param {Array} orderGroup - Group of orders
     * @param {Array} availableDrones - Available drones
     * @returns {Drone|null} Best drone
     */
    findBestDroneForGroup(orderGroup, availableDrones) {
        let bestDrone = null;
        let bestScore = -1;
        
        const totalWeight = orderGroup.reduce((sum, order) => sum + order.weight, 0);
        const centerLocation = this.calculateCenterLocation(orderGroup);
        
        for (const drone of availableDrones) {
            if (drone.capacity < totalWeight) continue;
            
            const distance = CalculationUtils.calculateDistance(drone.location, centerLocation);
            const capacityUtilization = totalWeight / drone.capacity;
            const batteryScore = drone.batteryLevel / 100;
            
            const score = (1 / (distance + 1)) * 0.4 + 
                         capacityUtilization * 0.3 + 
                         batteryScore * 0.3;
            
            if (score > bestScore) {
                bestScore = score;
                bestDrone = drone;
            }
        }
        
        return bestDrone;
    }

    /**
     * Calculate center location of order group
     * @param {Array} orders - Orders in group
     * @returns {Object} Center coordinates
     */
    calculateCenterLocation(orders) {
        const totalX = orders.reduce((sum, order) => sum + order.location.x, 0);
        const totalY = orders.reduce((sum, order) => sum + order.location.y, 0);
        
        return {
            x: totalX / orders.length,
            y: totalY / orders.length
        };
    }

    /**
     * Calculate optimal route using specified algorithm
     * @param {Array} orders - Orders to visit
     * @param {Object} startLocation - Starting location
     * @param {string} algorithm - Algorithm to use
     * @returns {Array} Optimal route
     */
    calculateOptimalRoute(orders, startLocation, algorithm = this.algorithms.NEAREST_NEIGHBOR) {
        const deliveryPoints = orders.map(order => ({
            ...order.location,
            orderId: order.id
        }));

        switch (algorithm) {
            case this.algorithms.NEAREST_NEIGHBOR:
                return this.nearestNeighborRoute(deliveryPoints, startLocation);
                
            case this.algorithms.GENETIC_ALGORITHM:
                return this.geneticAlgorithmRoute(deliveryPoints, startLocation);
                
            case this.algorithms.SIMULATED_ANNEALING:
                return this.simulatedAnnealingRoute(deliveryPoints, startLocation);
                
            default:
                return this.nearestNeighborRoute(deliveryPoints, startLocation);
        }
    }

    /**
     * Nearest Neighbor algorithm for route optimization
     * @param {Array} points - Points to visit
     * @param {Object} startPoint - Starting point
     * @returns {Array} Route
     */
    nearestNeighborRoute(points, startPoint) {
        if (points.length === 0) return [startPoint];
        
        const route = [startPoint];
        const unvisited = [...points];
        let currentPoint = startPoint;

        while (unvisited.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = CalculationUtils.calculateDistance(currentPoint, unvisited[0]);

            for (let i = 1; i < unvisited.length; i++) {
                const distance = CalculationUtils.calculateDistance(currentPoint, unvisited[i]);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }

            const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
            route.push(nearestPoint);
            currentPoint = nearestPoint;
        }

        route.push(startPoint); // Return to base
        return route;
    }

    /**
     * Genetic Algorithm for route optimization
     * @param {Array} points - Points to visit
     * @param {Object} startPoint - Starting point
     * @returns {Array} Optimized route
     */
    geneticAlgorithmRoute(points, startPoint, maxGenerations = 100) {
        if (points.length === 0) return [startPoint];
        if (points.length <= 3) return this.nearestNeighborRoute(points, startPoint);

        const populationSize = Math.min(50, points.length * 4);
        let population = this.initializePopulation(points, populationSize);
        
        for (let generation = 0; generation < maxGenerations; generation++) {
            // Evaluate fitness
            const fitness = population.map(route => 1 / this.calculateRouteDistance(route, startPoint));
            
            // Selection and crossover
            const newPopulation = [];
            
            for (let i = 0; i < populationSize; i++) {
                const parent1 = this.tournamentSelection(population, fitness);
                const parent2 = this.tournamentSelection(population, fitness);
                let child = this.orderCrossover(parent1, parent2);
                
                // Mutation
                if (Math.random() < 0.1) {
                    child = this.mutateRoute(child);
                }
                
                newPopulation.push(child);
            }
            
            population = newPopulation;
        }
        
        // Find best route
        const fitness = population.map(route => 1 / this.calculateRouteDistance(route, startPoint));
        const bestIndex = fitness.indexOf(Math.max(...fitness));
        const bestRoute = [startPoint, ...population[bestIndex], startPoint];
        
        return bestRoute;
    }

    /**
     * Initialize population for genetic algorithm
     * @param {Array} points - Points to visit
     * @param {number} populationSize - Size of population
     * @returns {Array} Initial population
     */
    initializePopulation(points, populationSize) {
        const population = [];
        
        for (let i = 0; i < populationSize; i++) {
            const route = [...points];
            this.shuffleArray(route);
            population.push(route);
        }
        
        return population;
    }

    /**
     * Tournament selection for genetic algorithm
     * @param {Array} population - Current population
     * @param {Array} fitness - Fitness scores
     * @returns {Array} Selected individual
     */
    tournamentSelection(population, fitness) {
        const tournamentSize = 3;
        let bestIndex = Math.floor(Math.random() * population.length);
        
        for (let i = 1; i < tournamentSize; i++) {
            const candidateIndex = Math.floor(Math.random() * population.length);
            if (fitness[candidateIndex] > fitness[bestIndex]) {
                bestIndex = candidateIndex;
            }
        }
        
        return population[bestIndex];
    }

    /**
     * Order crossover for genetic algorithm
     * @param {Array} parent1 - First parent
     * @param {Array} parent2 - Second parent
     * @returns {Array} Offspring
     */
    orderCrossover(parent1, parent2) {
        const length = parent1.length;
        const start = Math.floor(Math.random() * length);
        const end = Math.floor(Math.random() * (length - start)) + start;
        
        const child = new Array(length);
        const selected = new Set();
        
        // Copy segment from parent1
        for (let i = start; i <= end; i++) {
            child[i] = parent1[i];
            selected.add(parent1[i].orderId || parent1[i].id);
        }
        
        // Fill remaining positions from parent2
        let childIndex = 0;
        for (let i = 0; i < length; i++) {
            if (childIndex === start) childIndex = end + 1;
            if (childIndex >= length) break;
            
            const item = parent2[i];
            if (!selected.has(item.orderId || item.id)) {
                child[childIndex] = item;
                childIndex++;
            }
        }
        
        return child;
    }

    /**
     * Mutate route by swapping two random points
     * @param {Array} route - Route to mutate
     * @returns {Array} Mutated route
     */
    mutateRoute(route) {
        const mutated = [...route];
        const i = Math.floor(Math.random() * mutated.length);
        const j = Math.floor(Math.random() * mutated.length);
        [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
        return mutated;
    }

    /**
     * Simulated Annealing algorithm for route optimization
     * @param {Array} points - Points to visit
     * @param {Object} startPoint - Starting point
     * @returns {Array} Optimized route
     */
    simulatedAnnealingRoute(points, startPoint, maxIterations = 1000) {
        if (points.length === 0) return [startPoint];
        
        let currentRoute = [...points];
        this.shuffleArray(currentRoute);
        let currentDistance = this.calculateRouteDistance(currentRoute, startPoint);
        
        let bestRoute = [...currentRoute];
        let bestDistance = currentDistance;
        
        let temperature = 100;
        const coolingRate = 0.995;
        
        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Generate neighbor solution
            const newRoute = [...currentRoute];
            const i = Math.floor(Math.random() * newRoute.length);
            const j = Math.floor(Math.random() * newRoute.length);
            [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
            
            const newDistance = this.calculateRouteDistance(newRoute, startPoint);
            
            // Accept or reject new solution
            if (newDistance < currentDistance || Math.random() < Math.exp((currentDistance - newDistance) / temperature)) {
                currentRoute = newRoute;
                currentDistance = newDistance;
                
                if (newDistance < bestDistance) {
                    bestRoute = [...newRoute];
                    bestDistance = newDistance;
                }
            }
            
            temperature *= coolingRate;
        }
        
        return [startPoint, ...bestRoute, startPoint];
    }

    /**
     * Calculate total distance for a route
     * @param {Array} route - Route points
     * @param {Object} startPoint - Starting point
     * @returns {number} Total distance
     */
    calculateRouteDistance(route, startPoint) {
        if (route.length === 0) return 0;
        
        let totalDistance = CalculationUtils.calculateDistance(startPoint, route[0]);
        
        for (let i = 0; i < route.length - 1; i++) {
            totalDistance += CalculationUtils.calculateDistance(route[i], route[i + 1]);
        }
        
        totalDistance += CalculationUtils.calculateDistance(route[route.length - 1], startPoint);
        
        return totalDistance;
    }

    /**
     * Calculate route time including delivery time
     * @param {Array} route - Route points
     * @param {Drone} drone - Drone object
     * @returns {number} Total time in minutes
     */
    calculateRouteTime(route, drone) {
        if (!route || route.length === 0) return 0;
        
        const totalDistance = this.calculateRouteDistance(route.slice(1, -1), route[0]);
        const travelTime = (totalDistance / drone.speed) * 60; // Convert to minutes
        const deliveryTime = (route.length - 2) * 3; // 3 minutes per delivery
        const loadingTime = 5; // 5 minutes loading
        
        return travelTime + deliveryTime + loadingTime;
    }

    /**
     * Calculate battery consumption for route
     * @param {Array} route - Route points
     * @returns {number} Battery consumption percentage
     */
    calculateBatteryConsumption(route) {
        if (!route || route.length === 0) return 0;
        
        const totalDistance = this.calculateRouteDistance(route.slice(1, -1), route[0]);
        return totalDistance * 2; // 2% per km
    }

    /**
     * Calculate optimization statistics
     * @param {Array} routes - Optimized routes
     * @returns {Object} Statistics
     */
    calculateOptimizationStats(routes) {
        const totalOrders = routes.reduce((sum, route) => sum + route.orders.length, 0);
        const totalDistance = routes.reduce((sum, route) => sum + route.estimatedBattery / 2, 0);
        const totalTime = routes.reduce((sum, route) => sum + route.estimatedTime, 0);
        const averageTime = totalTime / routes.length || 0;
        
        return {
            totalRoutes: routes.length,
            totalOrders: totalOrders,
            totalDistance: Math.round(totalDistance * 100) / 100,
            averageTime: Math.round(averageTime * 100) / 100,
            efficiency: totalOrders > 0 ? (totalOrders / totalDistance) * 100 : 0,
            utilization: routes.length > 0 ? (totalOrders / routes.length) : 0
        };
    }

    /**
     * Shuffle array in place
     * @param {Array} array - Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Optimize drone fleet allocation
     * @param {Array} orders - Orders to fulfill
     * @param {Object} constraints - Fleet constraints
     * @returns {Object} Fleet optimization result
     */
    optimizeFleetAllocation(orders, constraints = {}) {
        const {
            maxDrones = 10,
            droneCapacity = 10,
            droneRange = 50,
            operatingHours = 12
        } = constraints;

        const ordersByPriority = {
            alta: orders.filter(o => o.priority === 'alta'),
            media: orders.filter(o => o.priority === 'media'),
            baixa: orders.filter(o => o.priority === 'baixa')
        };

        // Calculate required drones for each priority
        const averageDeliveryTime = 45; // minutes
        const deliveriesPerDronePerHour = 60 / averageDeliveryTime;
        const deliveriesPerDronePerDay = deliveriesPerDronePerHour * operatingHours;

        const requiredDrones = {
            alta: Math.ceil(ordersByPriority.alta.length / deliveriesPerDronePerDay),
            media: Math.ceil(ordersByPriority.media.length / deliveriesPerDronePerDay),
            baixa: Math.ceil(ordersByPriority.baixa.length / deliveriesPerDronePerDay)
        };

        const totalRequired = requiredDrones.alta + requiredDrones.media + requiredDrones.baixa;

        return {
            recommendation: {
                totalDrones: Math.min(totalRequired, maxDrones),
                allocation: requiredDrones,
                utilizationRate: Math.min(100, (totalRequired / maxDrones) * 100)
            },
            analysis: {
                currentOrders: orders.length,
                ordersByPriority: ordersByPriority,
                estimatedCapacity: deliveriesPerDronePerDay * maxDrones,
                bottleneck: totalRequired > maxDrones ? 'fleet_size' : null
            }
        };
    }

    /**
     * Optimize warehouse/base placement
     * @param {Array} deliveryPoints - Historical delivery points
     * @param {number} numBases - Number of bases to place
     * @returns {Object} Optimal base locations
     */
    optimizeBaseLocations(deliveryPoints, numBases = 1) {
        if (numBases === 1) {
            // Single base - find centroid
            const centroid = this.calculateCenterLocation(deliveryPoints.map(p => ({ location: p })));
            return {
                bases: [centroid],
                averageDistance: this.calculateAverageDistanceToPoints(centroid, deliveryPoints),
                coverage: this.calculateCoverage(centroid, deliveryPoints, 50)
            };
        }

        // Multiple bases - use k-means clustering
        return this.kMeansBasePlacement(deliveryPoints, numBases);
    }

    /**
     * K-means clustering for base placement
     * @param {Array} points - Delivery points
     * @param {number} k - Number of clusters
     * @returns {Object} Clustering result
     */
    kMeansBasePlacement(points, k) {
        let centroids = [];
        
        // Initialize centroids randomly
        for (let i = 0; i < k; i++) {
            const randomPoint = points[Math.floor(Math.random() * points.length)];
            centroids.push({ x: randomPoint.x, y: randomPoint.y });
        }

        let changed = true;
        let iterations = 0;
        const maxIterations = 100;

        while (changed && iterations < maxIterations) {
            changed = false;
            const clusters = Array(k).fill().map(() => []);

            // Assign points to nearest centroid
            for (const point of points) {
                let nearestCentroid = 0;
                let nearestDistance = CalculationUtils.calculateDistance(point, centroids[0]);

                for (let i = 1; i < centroids.length; i++) {
                    const distance = CalculationUtils.calculateDistance(point, centroids[i]);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestCentroid = i;
                    }
                }

                clusters[nearestCentroid].push(point);
            }

            // Update centroids
            for (let i = 0; i < k; i++) {
                if (clusters[i].length > 0) {
                    const newCentroid = this.calculateCenterLocation(
                        clusters[i].map(p => ({ location: p }))
                    );
                    
                    if (CalculationUtils.calculateDistance(centroids[i], newCentroid) > 0.1) {
                        centroids[i] = newCentroid;
                        changed = true;
                    }
                }
            }

            iterations++;
        }

        return {
            bases: centroids,
            clusters: clusters,
            averageDistance: centroids.reduce((sum, centroid, i) => 
                sum + this.calculateAverageDistanceToPoints(centroid, clusters[i] || []), 0) / centroids.length,
            iterations: iterations
        };
    }

    /**
     * Calculate average distance from point to array of points
     * @param {Object} center - Center point
     * @param {Array} points - Points to measure to
     * @returns {number} Average distance
     */
    calculateAverageDistanceToPoints(center, points) {
        if (points.length === 0) return 0;
        
        const totalDistance = points.reduce((sum, point) => 
            sum + CalculationUtils.calculateDistance(center, point), 0);
        
        return totalDistance / points.length;
    }

    /**
     * Calculate coverage percentage
     * @param {Object} center - Center point
     * @param {Array} points - Points to cover
     * @param {number} radius - Coverage radius
     * @returns {number} Coverage percentage
     */
    calculateCoverage(center, points, radius) {
        if (points.length === 0) return 100;
        
        const coveredPoints = points.filter(point => 
            CalculationUtils.calculateDistance(center, point) <= radius
        );
        
        return (coveredPoints.length / points.length) * 100;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizationService;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.OptimizationService = OptimizationService;
}
