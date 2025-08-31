/**
 * Optimization Service Tests
 * DTI Digital - Logistics Drone Simulation
 */

describe('OptimizationService', () => {
    let optimizationService;
    let mockDrones;
    let mockOrders;

    beforeEach(() => {
        // Mock dependencies
        if (typeof CalculationUtils === 'undefined') {
            global.CalculationUtils = {
                calculateDistance: (p1, p2) => {
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    return Math.sqrt(dx * dx + dy * dy);
                },
                calculateOptimalRoute: (points, startPoint) => {
                    return [startPoint, ...points, startPoint];
                }
            };
        }

        if (typeof OptimizationService === 'undefined') {
            global.OptimizationService = require('../src/js/services/OptimizationService');
        }

        optimizationService = new OptimizationService();

        // Mock drones
        mockDrones = [
            {
                id: 'drone1',
                name: 'Alpha',
                capacity: 10,
                range: 50,
                speed: 60,
                status: 'idle',
                batteryLevel: 100,
                location: { x: 0, y: 0 }
            },
            {
                id: 'drone2',
                name: 'Beta',
                capacity: 8,
                range: 45,
                speed: 65,
                status: 'idle',
                batteryLevel: 80,
                location: { x: 5, y: 5 }
            }
        ];

        // Mock orders
        mockOrders = [
            {
                id: 'order1',
                weight: 3,
                location: { x: 10, y: 15 },
                priority: 'alta',
                status: 'pending',
                getPriorityScore: () => 120
            },
            {
                id: 'order2',
                weight: 4,
                location: { x: 25, y: 30 },
                priority: 'media',
                status: 'pending',
                getPriorityScore: () => 80
            },
            {
                id: 'order3',
                weight: 2,
                location: { x: 12, y: 18 },
                priority: 'baixa',
                status: 'pending',
                getPriorityScore: () => 40
            }
        ];
    });

    describe('Route Optimization', () => {
        test('should optimize delivery routes successfully', () => {
            const result = optimizationService.optimizeDeliveryRoutes(mockDrones, mockOrders);
            
            expect(result.success).toBe(true);
            expect(result.routes).toBeDefined();
            expect(result.routes.length).toBeGreaterThan(0);
            expect(result.algorithm).toBe('nearest_neighbor');
        });

        test('should handle no available drones', () => {
            const busyDrones = mockDrones.map(drone => ({ ...drone, status: 'flying' }));
            const result = optimizationService.optimizeDeliveryRoutes(busyDrones, mockOrders);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('não há drones');
        });

        test('should handle no pending orders', () => {
            const completedOrders = mockOrders.map(order => ({ ...order, status: 'delivered' }));
            const result = optimizationService.optimizeDeliveryRoutes(mockDrones, completedOrders);
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('não há drones');
        });
    });

    describe('Order Grouping', () => {
        test('should group orders optimally', () => {
            const groups = optimizationService.groupOrdersForOptimalDelivery(mockOrders, mockDrones);
            
            expect(Array.isArray(groups)).toBe(true);
            expect(groups.length).toBeGreaterThan(0);
            
            // Check that all orders are grouped
            const totalOrders = groups.reduce((sum, group) => sum + group.length, 0);
            expect(totalOrders).toBe(mockOrders.length);
        });

        test('should respect capacity constraints', () => {
            const heavyOrders = [
                { id: 'heavy1', weight: 15, location: { x: 10, y: 10 }, getPriorityScore: () => 100 },
                { id: 'heavy2', weight: 12, location: { x: 15, y: 15 }, getPriorityScore: () => 90 }
            ];
            
            const groups = optimizationService.groupOrdersForOptimalDelivery(heavyOrders, mockDrones);
            
            // Should be in separate groups due to weight
            expect(groups.length).toBe(2);
        });
    });

    describe('Drone Assignment', () => {
        test('should assign order groups to drones', () => {
            const orderGroups = [[mockOrders[0]], [mockOrders[1]]];
            const assignments = optimizationService.assignOrderGroupsToDrones(orderGroups, mockDrones);
            
            expect(Array.isArray(assignments)).toBe(true);
            expect(assignments.length).toBeGreaterThan(0);
            
            assignments.forEach(assignment => {
                expect(assignment).toHaveProperty('drone');
                expect(assignment).toHaveProperty('orders');
                expect(Array.isArray(assignment.orders)).toBe(true);
            });
        });

        test('should find best drone for group', () => {
            const orderGroup = [mockOrders[0]];
            const bestDrone = optimizationService.findBestDroneForGroup(orderGroup, mockDrones);
            
            expect(bestDrone).toBeTruthy();
            expect(bestDrone.capacity).toBeGreaterThanOrEqual(mockOrders[0].weight);
        });
    });

    describe('Route Algorithms', () => {
        test('should calculate optimal route with nearest neighbor', () => {
            const points = [
                { x: 10, y: 10, orderId: '1' },
                { x: 20, y: 20, orderId: '2' },
                { x: 30, y: 30, orderId: '3' }
            ];
            const startPoint = { x: 0, y: 0 };
            
            const route = optimizationService.calculateOptimalRoute(
                points.map(p => ({ location: p, id: p.orderId })),
                startPoint,
                'nearest_neighbor'
            );
            
            expect(Array.isArray(route)).toBe(true);
            expect(route.length).toBeGreaterThan(3);
            expect(route[0]).toEqual(startPoint);
            expect(route[route.length - 1]).toEqual(startPoint);
        });

        test('should use nearest neighbor algorithm', () => {
            const points = [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 5, y: 5 }
            ];
            const startPoint = { x: 0, y: 0 };
            
            const route = optimizationService.nearestNeighborRoute(points, startPoint);
            
            expect(route[0]).toEqual(startPoint);
            expect(route[route.length - 1]).toEqual(startPoint);
            expect(route.length).toBe(points.length + 2);
        });

        test('should handle empty points array', () => {
            const route = optimizationService.nearestNeighborRoute([], { x: 0, y: 0 });
            expect(route).toEqual([{ x: 0, y: 0 }]);
        });
    });

    describe('Distance Calculations', () => {
        test('should calculate route distance correctly', () => {
            const route = [
                { x: 0, y: 0 },
                { x: 3, y: 4 },
                { x: 6, y: 8 }
            ];
            const startPoint = { x: 0, y: 0 };
            
            const distance = optimizationService.calculateRouteDistance(route, startPoint);
            expect(distance).toBeCloseTo(15, 1); // 5 + 5 + 10 (3-4-5 triangles)
        });

        test('should calculate group distance', () => {
            const orders = [
                { location: { x: 0, y: 0 } },
                { location: { x: 3, y: 4 } },
                { location: { x: 6, y: 8 } }
            ];
            
            const distance = optimizationService.calculateGroupDistance(orders);
            expect(distance).toBeCloseTo(10, 1); // 5 + 5
        });
    });

    describe('Center Location Calculation', () => {
        test('should calculate center of order group', () => {
            const orders = [
                { location: { x: 0, y: 0 } },
                { location: { x: 10, y: 0 } },
                { location: { x: 5, y: 10 } }
            ];
            
            const center = optimizationService.calculateCenterLocation(orders);
            expect(center.x).toBe(5);
            expect(center.y).toBeCloseTo(3.33, 1);
        });
    });

    describe('Fleet Optimization', () => {
        test('should optimize fleet allocation', () => {
            const result = optimizationService.optimizeFleetAllocation(mockOrders);
            
            expect(result).toHaveProperty('recommendation');
            expect(result).toHaveProperty('analysis');
            expect(result.recommendation).toHaveProperty('totalDrones');
            expect(result.recommendation).toHaveProperty('allocation');
        });

        test('should handle constraints', () => {
            const constraints = {
                maxDrones: 5,
                droneCapacity: 8,
                operatingHours: 10
            };
            
            const result = optimizationService.optimizeFleetAllocation(mockOrders, constraints);
            expect(result.recommendation.totalDrones).toBeLessThanOrEqual(constraints.maxDrones);
        });
    });

    describe('Base Location Optimization', () => {
        test('should optimize single base location', () => {
            const deliveryPoints = [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 30 }
            ];
            
            const result = optimizationService.optimizeBaseLocations(deliveryPoints, 1);
            
            expect(result).toHaveProperty('bases');
            expect(result.bases.length).toBe(1);
            expect(result).toHaveProperty('averageDistance');
            expect(result).toHaveProperty('coverage');
        });

        test('should optimize multiple base locations', () => {
            const deliveryPoints = [
                { x: 0, y: 0 },
                { x: 10, y: 10 },
                { x: 50, y: 50 },
                { x: 60, y: 60 }
            ];
            
            const result = optimizationService.optimizeBaseLocations(deliveryPoints, 2);
            
            expect(result).toHaveProperty('bases');
            expect(result.bases.length).toBe(2);
            expect(result).toHaveProperty('clusters');
        });
    });

    describe('K-means Clustering', () => {
        test('should perform k-means clustering', () => {
            const points = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 10, y: 10 },
                { x: 11, y: 11 }
            ];
            
            const result = optimizationService.kMeansBasePlacement(points, 2);
            
            expect(result).toHaveProperty('bases');
            expect(result).toHaveProperty('clusters');
            expect(result.bases.length).toBe(2);
            expect(result.clusters.length).toBe(2);
        });
    });

    describe('Statistics and Metrics', () => {
        test('should calculate optimization stats', () => {
            const routes = [
                {
                    orders: [mockOrders[0], mockOrders[1]],
                    estimatedTime: 60,
                    estimatedBattery: 40
                },
                {
                    orders: [mockOrders[2]],
                    estimatedTime: 30,
                    estimatedBattery: 20
                }
            ];
            
            const stats = optimizationService.calculateOptimizationStats(routes);
            
            expect(stats).toHaveProperty('totalRoutes');
            expect(stats).toHaveProperty('totalOrders');
            expect(stats).toHaveProperty('totalDistance');
            expect(stats).toHaveProperty('averageTime');
            expect(stats).toHaveProperty('efficiency');
            expect(stats.totalRoutes).toBe(2);
            expect(stats.totalOrders).toBe(3);
        });

        test('should calculate average distance to points', () => {
            const center = { x: 0, y: 0 };
            const points = [
                { x: 3, y: 4 },
                { x: 0, y: 5 },
                { x: 4, y: 0 }
            ];
            
            const avgDistance = optimizationService.calculateAverageDistanceToPoints(center, points);
            expect(avgDistance).toBeCloseTo(5, 1);
        });

        test('should calculate coverage percentage', () => {
            const center = { x: 0, y: 0 };
            const points = [
                { x: 3, y: 4 }, // distance = 5, within radius 10
                { x: 6, y: 8 }, // distance = 10, within radius 10
                { x: 15, y: 0 } // distance = 15, outside radius 10
            ];
            
            const coverage = optimizationService.calculateCoverage(center, points, 10);
            expect(coverage).toBeCloseTo(66.67, 1);
        });
    });

    describe('Genetic Algorithm', () => {
        test('should initialize population', () => {
            const points = [
                { x: 10, y: 10 },
                { x: 20, y: 20 },
                { x: 30, y: 30 }
            ];
            
            const population = optimizationService.initializePopulation(points, 10);
            
            expect(population.length).toBe(10);
            population.forEach(individual => {
                expect(individual.length).toBe(points.length);
            });
        });

        test('should perform tournament selection', () => {
            const population = [
                [{ x: 1, y: 1 }],
                [{ x: 2, y: 2 }],
                [{ x: 3, y: 3 }]
            ];
            const fitness = [0.8, 0.6, 0.9];
            
            const selected = optimizationService.tournamentSelection(population, fitness);
            expect(population).toContain(selected);
        });
    });

    describe('Utility Methods', () => {
        test('should shuffle array', () => {
            const originalArray = [1, 2, 3, 4, 5];
            const arrayToShuffle = [...originalArray];
            
            optimizationService.shuffleArray(arrayToShuffle);
            
            // Array should contain same elements but possibly different order
            expect(arrayToShuffle.sort()).toEqual(originalArray.sort());
        });

        test('should mutate route', () => {
            const originalRoute = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 }
            ];
            
            const mutatedRoute = optimizationService.mutateRoute(originalRoute);
            
            expect(mutatedRoute.length).toBe(originalRoute.length);
            expect(mutatedRoute).not.toBe(originalRoute); // Should be different array
        });
    });
});
