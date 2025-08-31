/**
 * Main JavaScript file - Application entry point (VERSÃO DEBUG)
 * DTI Digital - Logistics Drone Simulation
 */

// Global controller instance
let controller;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚁 Inicializando DTI Digital Drone Simulation...');
    
    // Aguardar um pouco para garantir que todos os scripts carregaram
    setTimeout(() => {
        try {
            // Check for required dependencies com mais detalhes
            const depCheck = checkDependenciesDetailed();
            
            if (depCheck.success) {
                console.log('✅ Todas as dependências OK, inicializando controller...');
                
                // Initialize the main controller
                controller = new SimulationController();
                
                // Make controller globally accessible for UI interactions
                window.controller = controller;
                
                console.log('🎉 Aplicação inicializada com sucesso!');
                showSuccess('✅ Aplicação carregada com sucesso!');
                
            } else {
                console.error('❌ Dependências faltando:', depCheck.missing);
                showError(`Dependências faltando: ${depCheck.missing.join(', ')}`);
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar aplicação:', error);
            showError(`Erro de inicialização: ${error.message}`);
        }
    }, 100); // Aguarda 100ms
});

/**
 * Check if all required dependencies are available with detailed logging
 */
function checkDependenciesDetailed() {
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
    
    const missing = [];
    const available = [];
    
    requiredClasses.forEach(className => {
        if (typeof window[className] === 'undefined') {
            missing.push(className);
            console.error(`❌ ${className} não encontrado`);
        } else {
            available.push(className);
            console.log(`✅ ${className} disponível`);
        }
    });
    
    console.log(`📊 Dependências: ${available.length}/${requiredClasses.length} carregadas`);
    
    return {
        success: missing.length === 0,
        missing: missing,
        available: available,
        total: requiredClasses.length
    };
}

/**
 * Função de verificação simples (fallback)
 */
function checkDependencies() {
    const check = checkDependenciesDetailed();
    if (!check.success) {
        throw new Error(`Missing dependencies: ${check.missing.join(', ')}`);
    }
    console.log('✅ Todas as dependências carregadas com sucesso');
}

/**
 * Show success message to user
 * @param {string} message - Success message
 */
function showSuccess(message) {
    showMessage(message, '#28a745');
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    showMessage(message, '#dc3545');
}

/**
 * Show message to user
 * @param {string} message - Message text
 * @param {string} color - Background color
 */
function showMessage(message, color) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${color};
        color: white;
        padding: 1rem 2rem;
        border-radius: 4px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 90%;
        text-align: center;
        font-family: Arial, sans-serif;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 10 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
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
    
    // Debug functions
    debug: {
        checkDependencies: checkDependenciesDetailed,
        getController: () => controller,
        reinitialize: () => {
            console.log('🔄 Reinicializando...');
            if (controller) {
                controller = null;
            }
            setTimeout(() => {
                controller = new SimulationController();
                window.controller = controller;
                console.log('✅ Reinicializado com sucesso!');
            }, 100);
        }
    },
    
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
                console.error('❌ Controller não inicializado');
                showError('Controller não foi inicializado ainda');
                return;
            }
            
            try {
                console.log('🎯 Populando com dados de demonstração...');
                
                // Generate random orders
                const demoOrders = window.DroneSimulation.demo.generateMultipleOrders(10);
                
                demoOrders.forEach(orderData => {
                    const result = controller.orderService.createOrder(orderData);
                    if (result.success) {
                        controller.simulationEngine.addOrder(result.order);
                    }
                });
                
                controller.updateUI();
                showSuccess(`${demoOrders.length} pedidos de demonstração adicionados!`);
                console.log(`✅ ${demoOrders.length} pedidos de demonstração adicionados`);
                
            } catch (error) {
                console.error('❌ Erro ao popular dados:', error);
                showError(`Erro: ${error.message}`);
            }
        }
    },
    
    // API-like interface for external integration
    api: {
        // Get status
        isReady: () => controller !== null && controller !== undefined,
        
        // Drone operations
        addDrone: (droneData) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            try {
                const result = controller.droneService.createDrone(droneData);
                if (result.success) {
                    controller.simulationEngine.addDrone(result.drone);
                    controller.updateUI();
                }
                return result;
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        getDrones: () => {
            if (!controller) return [];
            try {
                return controller.droneService.getAllDrones().map(drone => drone.getDisplayInfo());
            } catch (error) {
                console.error('Error getting drones:', error);
                return [];
            }
        },
        
        // Order operations
        addOrder: (orderData) => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            
            try {
                const result = controller.orderService.createOrder(orderData);
                if (result.success) {
                    controller.simulationEngine.addOrder(result.order);
                    controller.updateUI();
                }
                return result;
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        getOrders: () => {
            if (!controller) return [];
            try {
                return controller.orderService.getAllOrders().map(order => order.getDisplayInfo());
            } catch (error) {
                console.error('Error getting orders:', error);
                return [];
            }
        },
        
        // Simulation operations
        startSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            try {
                controller.startSimulation();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        pauseSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            try {
                controller.pauseSimulation();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        stopSimulation: () => {
            if (!controller) return { success: false, error: 'Controller not initialized' };
            try {
                controller.stopSimulation();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        },
        
        getSimulationState: () => {
            if (!controller) return null;
            try {
                return controller.simulationEngine.getState();
            } catch (error) {
                console.error('Error getting simulation state:', error);
                return null;
            }
        },
        
        // Statistics
        getStatistics: () => {
            if (!controller) return null;
            
            try {
                return {
                    drones: controller.droneService.getDroneStatistics(),
                    orders: controller.orderService.getOrderStatistics(),
                    simulation: controller.simulationEngine.getState().statistics
                };
            } catch (error) {
                console.error('Error getting statistics:', error);
                return null;
            }
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
    
    if (!controller) return;
    
    // Ctrl/Cmd + shortcuts
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case 's':
                e.preventDefault();
                controller.startSimulation();
                break;
            case 'p':
                e.preventDefault();
                controller.pauseSimulation();
                break;
            case 'r':
                e.preventDefault();
                controller.resetSimulation();
                break;
        }
    }
    
    // Number keys for tab switching
    if (e.key >= '1' && e.key <= '5') {
        const tabs = ['dashboard', 'orders', 'drones', 'simulation', 'reports'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
            controller.switchTab(tabs[tabIndex]);
        }
    }
    
    // Escape key to close modals
    if (e.key === 'Escape') {
        controller.hideModal();
    }
});

/**
 * Error handling
 */
window.addEventListener('error', function(e) {
    console.error('❌ Erro da aplicação:', e.error);
    showError('Erro interno. Verifique o console para detalhes.');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Promise rejeitada:', e.reason);
    showError('Erro interno da aplicação.');
});

/**
 * Console welcome message
 */
console.log(`
%c🚁 DTI Digital - Simulador de Entregas por Drone %c
%cVersão: 1.0.0 (DEBUG)
Desenvolvido para o processo seletivo da DTI Digital

Debug APIs disponíveis:
- DroneSimulation.debug.checkDependencies()
- DroneSimulation.debug.reinitialize()
- DroneSimulation.api.isReady()

Teste rápido:
1. DroneSimulation.demo.populateWithDemoData()
2. DroneSimulation.api.startSimulation()
`,
'color: #1f3a8c; font-size: 16px; font-weight: bold;',
'',
'color: #666; font-size: 12px;'
);

// Export for modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DroneSimulation: window.DroneSimulation };
}
