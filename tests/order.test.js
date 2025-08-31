/**
 * Order Model Tests
 * DTI Digital - Logistics Drone Simulation
 */

describe('Order Model', () => {
    let order;

    beforeEach(() => {
        // Mock dependencies if needed
        if (typeof ValidationUtils === 'undefined') {
            global.ValidationUtils = {
                validateOrder: () => ({ isValid: true, errors: [] })
            };
        }

        if (typeof Order === 'undefined') {
            global.Order = require('../src/js/models/Order');
        }

        order = new Order({
            customerName: 'João Silva',
            weight: 2.5,
            location: { x: 25, y: 30 },
            priority: 'alta'
        });
    });

    describe('Constructor', () => {
        test('should create order with valid data', () => {
            expect(order.customerName).toBe('João Silva');
            expect(order.weight).toBe(2.5);
            expect(order.location).toEqual({ x: 25, y: 30 });
            expect(order.priority).toBe('alta');
            expect(order.status).toBe('pending');
        });

        test('should generate unique ID', () => {
            const order1 = new Order({
                customerName: 'Cliente 1',
                weight: 1,
                location: { x: 0, y: 0 },
                priority: 'baixa'
            });
            const order2 = new Order({
                customerName: 'Cliente 2',
                weight: 1,
                location: { x: 0, y: 0 },
                priority: 'baixa'
            });
            
            expect(order1.id).not.toBe(order2.id);
            expect(order1.id).toMatch(/^ORD-\d+-\w+$/);
        });
    });

    describe('Status Management', () => {
        test('should update status correctly', () => {
            order.updateStatus('assigned');
            expect(order.status).toBe('assigned');
            expect(order.updatedAt).toBeInstanceOf(Date);
        });

        test('should throw error for invalid status', () => {
            expect(() => {
                order.updateStatus('invalid-status');
            }).toThrow('Invalid status: invalid-status');
        });

        test('should handle delivered status', () => {
            order.updateStatus('delivered');
            expect(order.status).toBe('delivered');
            expect(order.actualDeliveryTime).toBeTruthy();
        });
    });

    describe('Priority Scoring', () => {
        test('should calculate priority score for alta', () => {
            const score = order.getPriorityScore();
            expect(score).toBeGreaterThan(100);
        });

        test('should score higher priority orders higher', () => {
            const altaOrder = new Order({
                customerName: 'Cliente Alta',
                weight: 2,
                location: { x: 10, y: 10 },
                priority: 'alta'
            });
            
            const baixaOrder = new Order({
                customerName: 'Cliente Baixa',
                weight: 2,
                location: { x: 10, y: 10 },
                priority: 'baixa'
            });

            expect(altaOrder.getPriorityScore()).toBeGreaterThan(baixaOrder.getPriorityScore());
        });
    });

    describe('Distance Calculations', () => {
        test('should calculate distance from base', () => {
            const distance = order.getDistanceFromBase({ x: 0, y: 0 });
            expect(distance).toBeCloseTo(39.05, 2); // sqrt(25² + 30²)
        });
    });

    describe('Age Calculations', () => {
        test('should calculate order age', () => {
            // Mock timestamp to be 1 hour ago
            order.timestamp = Date.now() - (60 * 60 * 1000);
            const age = order.getAge();
            expect(age).toBeCloseTo(60, 0); // 60 minutes
        });
    });

    describe('Overdue Detection', () => {
        test('should detect overdue orders', () => {
            // Set delivery time to 1 hour ago
            order.deliveryTime = new Date(Date.now() - (60 * 60 * 1000));
            expect(order.isOverdue()).toBe(true);
        });

        test('should not be overdue if delivered', () => {
            order.deliveryTime = new Date(Date.now() - (60 * 60 * 1000));
            order.updateStatus('delivered');
            expect(order.isOverdue()).toBe(false);
        });

        test('should not be overdue without delivery time', () => {
            expect(order.isOverdue()).toBe(false);
        });
    });

    describe('Drone Assignment', () => {
        test('should assign drone correctly', () => {
            order.assignDrone('DRONE-123', Date.now() + 3600000);
            expect(order.assignedDrone).toBe('DRONE-123');
            expect(order.status).toBe('assigned');
            expect(order.estimatedDeliveryTime).toBeTruthy();
        });
    });

    describe('Display Information', () => {
        test('should get priority display', () => {
            const display = order.getPriorityDisplay();
            expect(display.display).toBe('Alta');
            expect(display.class).toBe('priority-alta');
        });

        test('should get status display', () => {
            const display = order.getStatusDisplay();
            expect(display).toBe('Pendente');
            
            order.updateStatus('delivered');
            expect(order.getStatusDisplay()).toBe('Entregue');
        });
    });

    describe('Urgency Level', () => {
        test('should calculate urgency for alta priority', () => {
            order.timestamp = Date.now() - (90 * 60 * 1000); // 90 minutes ago
            expect(order.getUrgencyLevel()).toBe('critical');
            
            order.timestamp = Date.now() - (40 * 60 * 1000); // 40 minutes ago
            expect(order.getUrgencyLevel()).toBe('high');
        });

        test('should calculate urgency for baixa priority', () => {
            const baixaOrder = new Order({
                customerName: 'Cliente',
                weight: 1,
                location: { x: 0, y: 0 },
                priority: 'baixa'
            });
            
            expect(baixaOrder.getUrgencyLevel()).toBe('low');
        });
    });

    describe('Cost Calculation', () => {
        test('should calculate delivery cost', () => {
            const cost = order.calculateEstimatedCost(10, 0.5);
            expect(cost).toBeGreaterThan(10);
        });

        test('should apply priority multiplier', () => {
            const altaCost = order.calculateEstimatedCost(10, 0.5);
            
            const baixaOrder = new Order({
                customerName: 'Cliente',
                weight: 2.5,
                location: { x: 25, y: 30 },
                priority: 'baixa'
            });
            
            const baixaCost = baixaOrder.calculateEstimatedCost(10, 0.5);
            expect(altaCost).toBeGreaterThan(baixaCost);
        });
    });

    describe('Validation', () => {
        test('should validate correct order data', () => {
            const result = order.validate();
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Cloning', () => {
        test('should clone order with new ID', () => {
            const cloned = order.clone();
            expect(cloned.customerName).toBe(order.customerName);
            expect(cloned.weight).toBe(order.weight);
            expect(cloned.location).toEqual(order.location);
            expect(cloned.id).not.toBe(order.id);
        });
    });

    describe('Serialization', () => {
        test('should export to JSON', () => {
            const json = order.toJSON();
            expect(json).toHaveProperty('id');
            expect(json).toHaveProperty('customerName');
            expect(json).toHaveProperty('weight');
            expect(json).toHaveProperty('location');
            expect(json.customerName).toBe('João Silva');
        });

        test('should create from JSON', () => {
            const json = order.toJSON();
            const newOrder = Order.fromJSON(json);
            expect(newOrder.customerName).toBe(order.customerName);
            expect(newOrder.weight).toBe(order.weight);
            expect(newOrder.location).toEqual(order.location);
        });
    });

    describe('Display Info', () => {
        test('should get comprehensive display info', () => {
            const displayInfo = order.getDisplayInfo();
            expect(displayInfo).toHaveProperty('id');
            expect(displayInfo).toHaveProperty('customer');
            expect(displayInfo).toHaveProperty('weight');
            expect(displayInfo).toHaveProperty('location');
            expect(displayInfo).toHaveProperty('priority');
            expect(displayInfo).toHaveProperty('status');
            expect(displayInfo).toHaveProperty('urgency');
        });
    });

    describe('Summary', () => {
        test('should generate summary string', () => {
            const summary = order.getSummary();
            expect(summary).toContain('João Silva');
            expect(summary).toContain('2.5kg');
            expect(summary).toContain('ALTA');
        });
    });
});
