/**
 * Drone Model Tests
 * DTI Digital - Logistics Drone Simulation
 */

describe('Drone Model', () => {
    let drone;

    beforeEach(() => {
        // Mock dependencies if running in Node.js environment
        if (typeof CalculationUtils === 'undefined') {
            global.CalculationUtils = {
                calculateDistance: (p1, p2) => {
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    return Math.sqrt(dx * dx + dy * dy);
                }
            };
        }

        if (typeof ValidationUtils === 'undefined') {
            global.ValidationUtils = {
                validateDrone: () => ({ isValid: true, errors: [] })
            };
        }

        if (typeof Drone === 'undefined') {
            global.Drone = require('../src/js/models/Drone');
        }

        drone = new Drone({
            name: 'Test-Drone',
            capacity: 10,
            range: 50,
            speed: 60
        });
    });

    describe('Constructor', () => {
        test('should create drone with valid data', () => {
            expect(drone.name).toBe('Test-Drone');
            expect(drone.capacity).toBe(10);
            expect(drone.range).toBe(50);
            expect(drone.speed).toBe(60);
            expect(drone.batteryLevel).toBe(100);
            expect(drone.status).toBe('idle');
        });

        test('should generate unique ID', () => {
            const drone1 = new Drone({ name: 'Drone1', capacity: 5, range: 25, speed: 30 });
            const drone2 = new Drone({ name: 'Drone2', capacity: 5, range: 25, speed: 30 });
            
            expect(drone1.id).not.toBe(drone2.id);
            expect(drone1.id).toMatch(/^DRN-\d+-\w+$/);
        });
    });

    describe('Status Management', () => {
        test('should update status correctly', () => {
            drone.updateStatus('flying');
            expect(drone.status).toBe('flying');
            expect(drone.updatedAt).toBeInstanceOf(Date);
        });

        test('should throw error for invalid status', () => {
            expect(() => {
                drone.updateStatus('invalid-status');
            }).toThrow('Invalid drone status: invalid-status');
        });

        test('should handle charging status', () => {
            drone.batteryLevel = 50;
            drone.updateStatus('charging');
            expect(drone.status).toBe('charging');
        });
    });

    describe('Battery Management', () => {
        test('should consume battery correctly', () => {
            const initialBattery = drone.batteryLevel;
            drone.consumeBattery(20);
            expect(drone.batteryLevel).toBe(initialBattery - 20);
        });

        test('should not go below 0% battery', () => {
            drone.consumeBattery(150);
            expect(drone.batteryLevel).toBe(0);
        });

        test('should calculate battery consumption', () => {
            const consumption = drone.calculateBatteryConsumption(10);
            expect(consumption).toBe(20); // 2% per km * 10km
        });
    });

    describe('Order Assignment', () => {
        test('should assign orders when idle', () => {
            const mockOrders = [
                { id: '1', weight: 3, location: { x: 10, y: 10 } },
                { id: '2', weight: 4, location: { x: 20, y: 20 } }
            ];

            const result = drone.assignOrders(mockOrders);
            expect(result).toBe(true);
            expect(drone.currentOrders).toHaveLength(2);
            expect(drone.status).toBe('loading');
        });

        test('should reject orders when not idle', () => {
            drone.updateStatus('flying');
            const mockOrders = [{ id: '1', weight: 3 }];

            const result = drone.assignOrders(mockOrders);
            expect(result).toBe(false);
        });

        test('should reject orders exceeding capacity', () => {
            const heavyOrders = [
                { id: '1', weight: 8, location: { x: 10, y: 10 } },
                { id: '2', weight: 5, location: { x: 20, y: 20 } }
            ];

            const result = drone.assignOrders(heavyOrders);
            expect(result).toBe(false);
        });
    });

    describe('Route Calculation', () => {
        test('should calculate route for orders', () => {
            const orders = [
                { id: '1', weight: 2, location: { x: 10, y: 10 } },
                { id: '2', weight: 3, location: { x: 20, y: 20 } }
            ];

            drone.assignOrders(orders);
            expect(drone.currentRoute.length).toBeGreaterThan(0);
            expect(drone.currentRoute[0]).toEqual(drone.baseLocation);
        });
    });

    describe('Distance Calculations', () => {
        test('should calculate distance to target', () => {
            const target = { x: 30, y: 40 };
            const distance = drone.getDistanceTo(target);
            expect(distance).toBe(50); // 3-4-5 triangle
        });
    });

    describe('Maintenance', () => {
        test('should detect maintenance need', () => {
            drone.stats.totalFlightTime = 150; // Above threshold
            expect(drone.needsMaintenance()).toBe(true);
        });

        test('should not need maintenance when new', () => {
            expect(drone.needsMaintenance()).toBe(false);
        });

        test('should perform maintenance', () => {
            drone.stats.totalFlightTime = 150;
            drone.performMaintenance();
            expect(drone.status).toBe('maintenance');
            expect(drone.stats.totalFlightTime).toBe(0);
        });
    });

    describe('Validation', () => {
        test('should validate correct drone data', () => {
            const result = drone.validate();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Display Information', () => {
        test('should provide display info', () => {
            const displayInfo = drone.getDisplayInfo();
            expect(displayInfo).toHaveProperty('name');
            expect(displayInfo).toHaveProperty('status');
            expect(displayInfo).toHaveProperty('batteryLevel');
            expect(displayInfo).toHaveProperty('completedDeliveries');
        });

        test('should get battery level class', () => {
            drone.batteryLevel = 80;
            expect(drone.getBatteryLevelClass()).toBe('battery-high');
            
            drone.batteryLevel = 40;
            expect(drone.getBatteryLevelClass()).toBe('battery-medium');
            
            drone.batteryLevel = 15;
            expect(drone.getBatteryLevelClass()).toBe('battery-low');
        });
    });

    describe('Serialization', () => {
        test('should export to JSON', () => {
            const json = drone.toJSON();
            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('name');
            expect(json).toHaveProperty('capacity');
            expect(json.name).toBe('Test-Drone');
        });

        test('should create from JSON', () => {
            const json = drone.toJSON();
            const newDrone = Drone.fromJSON(json);
            expect(newDrone.name).toBe(drone.name);
            expect(newDrone.capacity).toBe(drone.capacity);
        });
    });

    describe('Performance Tracking', () => {
        test('should calculate efficiency score', () => {
            drone.completedDeliveries = 5;
            drone.totalDistanceTraveled = 50;
            drone.totalBatteryUsed = 30;
            drone.calculateEfficiencyScore();
            
            expect(drone.stats.efficiencyScore).toBeGreaterThan(0);
            expect(drone.stats.efficiencyScore).toBeLessThanOrEqual(100);
        });
    });
});
