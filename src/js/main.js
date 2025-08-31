/**
 * Main JavaScript file - Application entry point
 * DTI Digital - Logistics Drone Simulation
 */

// Global controller instance
let controller;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing DTI Digital Drone Simulation...');
    
    try {
        // Check for required dependencies
        checkDependencies();
        
        // Initialize the main controller
        controller = new SimulationController();
        
        // Make controller globally accessible for UI interactions
        window.controller = controller;
        
        console.log('Application initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Falha ao inicializar a aplicação. Por favor, recarregue a página.');
    }
});

/**
 * Check if all required dependencies are available
 */
function checkDependencies() {
    const requiredClasses = [
        'CalculationUtils',
        'ValidationUtils', 
        'Order',
        'Drone',
        'SimulationEngine',
        'DroneService',
        'OrderService',
        'OptimizationService',
        'SimulationController'
    ];
    
    const missingDependencies = [];
    
    requiredClasses.forEach(className => {
        if (typeof window[className] === 'undefined') {
            missingDependencies.push(className);
        }
    });
    
    if (missingDependencies.length > 0) {
        throw new Error(`Missing dependencies: ${missingDependencies.join(', ')}`);
    }
    
    console.log('All dependencies loaded successfully');
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #e53e3e;
        color: white;
        padding: 1rem 2rem;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

/**
 * Show loading overlay
 */
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

/**
 * Utility functions for global access
 */
window.DroneSimulation = {
    // Version info
    version: '1.0.0',
    
    // Utility functions
    utils: {
        formatTime: (minutes) => {
            if (minutes < 60) {
                return `${Math.round(minutes)}min`;
            }
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);
            return `${hours}h ${remainingMinutes}min`;
        },
        
        formatCoordinates: (x, y) => {
            return `(${Math.round(x)}, ${Math.round(y)})`;
        },
        
        formatWeight: (weight) => {
            return `${weight}kg`;
        },
        
        formatDistance: (distance) => {
            return `${Math.round(distance * 100) / 100}km`;
        },
        
        formatBattery: (level) => {
            return `${Math.round(level)}%`;
        },
        
        generateId: (prefix = 'ID') => {
            return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        },
        
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        throttle: (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    },
    
    // Demo data generators
    demo: {
        generateRandomOrder: () => {
            const customers = [
                'João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Lima',
                'Carlos Oliveira', 'Lucia Pereira', 'Roberto Alves', 'Patricia Rodrigues',
                'Fernando Martins', 'Camila Fernandes', 'Diego Santos', 'Juliana Costa'
            ];
            
            const priorities = ['baixa', 'media', 'alta'];
            
            return {
                customerName: customers[Math.floor(Math.random() * customers.length)],
                weight: Math.round((Math.random() * 9 + 1) * 10) / 10, // 1-10kg
                location: {
                    x: Math.floor(Math.random() * 100),
                    y: Math.floor(Math.random() * 100)
                },
                priority: priorities[Math.floor(Math.random() * priorities.length)]
            };
        },
        
        generateMultipleOrders: (count = 5) => {
            const orders = [];
            for (let i = 0; i < count; i++) {
                orders.push(window.DroneSimulation.demo.generateRandomOrder());
            }
            return orders;
        },
        
        populateWithDemoData: () => {
            if (!controller) {
                console.error('Controller not initialized');
                return;
            }
            
            // Generate random orders
            const demoOrders = window.DroneSimulation.demo.generateMultipleOrders(10);
            
            demoOrders.forEach(orderData => {
                const result = controller.orderService.createOrder(orderData);
                if (result.success) {
                    controller.simulationEngine.addOrder(result.order);
                }
            });
            
            controller.updateUI();
            controller.showNotification(`${demoOrders.length} pedidos de demonstração adicionados!`, 'success');
        }
    },
    
    // API-like interface for external integration
    api: {
        // Drone operations
        addDrone: (droneData) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            const result = controller.droneService.createDrone(droneData);
            if (result.success) {
                controller.simulationEngine.addDrone(result.drone);
                controller.updateUI();
            }
            return result;
        },
        
        removeDrone: (droneId) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            const result = controller.droneService.deleteDrone(droneId);
            if (result.success) {
                controller.simulationEngine.removeDrone(droneId);
                controller.updateUI();
            }
            return result;
        },
        
        getDrones: () => {
            if (!controller) return [];
            return controller.droneService.getAllDrones().map(drone => drone.getDisplayInfo());
        },
        
        // Order operations
        addOrder: (orderData) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            const result = controller.orderService.createOrder(orderData);
            if (result.success) {
                controller.simulationEngine.addOrder(result.order);
                controller.updateUI();
            }
            return result;
        },
        
        cancelOrder: (orderId) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            const result = controller.orderService.cancelOrder(orderId);
            if (result.success) {
                controller.simulationEngine.cancelOrder(orderId);
                controller.updateUI();
            }
            return result;
        },
        
        getOrders: () => {
            if (!controller) return [];
            return controller.orderService.getAllOrders().map(order => order.getDisplayInfo());
        },
        
        // Simulation operations
        startSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            controller.startSimulation();
            return { success: true };
        },
        
        pauseSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            controller.pauseSimulation();
            return { success: true };
        },
        
        stopSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            controller.stopSimulation();
            return { success: true };
        },
        
        getSimulationState: () => {
            if (!controller) return null;
            return controller.simulationEngine.getState();
        },
        
        // Statistics
        getStatistics: () => {
            if (!controller) return null;
            
            return {
                drones: controller.droneService.getDroneStatistics(),
                orders: controller.orderService.getOrderStatistics(),
                simulation: controller.simulationEngine.getState().statistics
            };
        },
        
        generateReport: () => {
            if (!controller) return null;
            return controller.simulationEngine.generateReport();
        }
    },
    
    // Configuration and settings
    config: {
        simulation: {
            defaultSpeed: 1,
            maxSpeed: 10,
            updateInterval: 100
        },
        
        drone: {
            defaultCapacity: 10,
            defaultRange: 50,
            defaultSpeed: 60,
            batteryConsumptionRate: 2 // % per km
        },
        
        ui: {
            refreshInterval: 1000,
            maxNotifications: 5,
            animationDuration: 300
        }
    }
};

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Only handle shortcuts when not in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }
    
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                if (controller) controller.startSimulation();
                break;
            case 'p':
                e.preventDefault();
                if (controller) controller.pauseSimulation();
                break;
            case 'r':
                e.preventDefault();
                if (controller) controller.resetSimulation();
                break;
        }
    }
    
    // Number keys for tab switching
    if (e.key >= '1' && e.key <= '5') {
        const tabs = ['dashboard', 'orders', 'drones', 'simulation', 'reports'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex] && controller) {
            controller.switchTab(tabs[tabIndex]);
        }
    }
    
    // Escape key to close modals
    if (e.key === 'Escape') {
        if (controller) controller.hideModal();
    }
});

/**
 * Handle window events
 */
window.addEventListener('beforeunload', function(e) {
    if (controller && controller.simulationEngine.isRunning) {
        e.preventDefault();
        e.returnValue = 'A simulação está rodando. Tem certeza que deseja sair?';
        return e.returnValue;
    }
});

/**
 * Handle visibility change (when tab becomes hidden/visible)
 */
document.addEventListener('visibilitychange', function() {
    if (controller) {
        if (document.hidden) {
            // Tab is hidden - could pause simulation or reduce updates
            console.log('Application hidden');
        } else {
            // Tab is visible - resume normal operation
            console.log('Application visible');
            controller.updateUI();
        }
    }
});

/**
 * Error handling
 */
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
    
    // Show user-friendly error message
    showError('Ocorreu um erro na aplicação. Verifique o console para mais detalhes.');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    
    // Show user-friendly error message
    showError('Erro interno da aplicação. Por favor, recarregue a página.');
});

/**
 * Console welcome message
 */
console.log(`
%c🚁 DTI Digital - Simulador de Entregas por Drone %c
%cVersão: 1.0.0
Desenvolvido para o processo seletivo da DTI Digital

APIs disponíveis:
- window.DroneSimulation.api.*
- window.DroneSimulation.demo.*
- window.DroneSimulation.utils.*

Atalhos de teclado:
- Ctrl+S: Iniciar simulação
- Ctrl+P: Pausar simulação  
- Ctrl+R: Resetar simulação
- 1-5: Trocar abas
- Esc: Fechar modal

Para demonstração rápida:
DroneSimulation.demo.populateWithDemoData()
`,
'color: #1f3a8c; font-size: 16px; font-weight: bold;',
'',
'color: #666; font-size: 12px;'
);

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DroneSimulation: window.DroneSimulation };
}
