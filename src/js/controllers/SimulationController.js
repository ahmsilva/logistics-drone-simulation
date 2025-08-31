/**
 * Simulation Controller - Main controller for the drone simulation
 * DTI Digital - Logistics Drone Simulation
 */

class SimulationController {
    constructor() {
        this.simulationEngine = new SimulationEngine();
        this.droneService = new DroneService();
        this.orderService = new OrderService();
        this.optimizationService = new OptimizationService();
        
        this.isInitialized = false;
        this.currentTab = 'dashboard';
        this.refreshInterval = null;
        this.charts = {};
        
        this.initialize();
    }

    /**
     * Initialize the controller and set up event listeners
     */
    initialize() {
        this.setupEventListeners();
        this.setupSimulationEvents();
        this.initializeDefaultData();
        this.updateUI();
        this.isInitialized = true;
        console.log('Simulation Controller initialized successfully');
    }

    /**
     * Set up DOM event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Order form
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
        }

        // Drone form
        const droneForm = document.getElementById('drone-form');
        if (droneForm) {
            droneForm.addEventListener('submit', (e) => this.handleDroneSubmit(e));
        }

        // Simulation controls
        this.setupSimulationControls();

        // Modal controls
        this.setupModalControls();

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Set up simulation control event listeners
     */
    setupSimulationControls() {
        const controls = {
            'start-simulation': () => this.startSimulation(),
            'pause-simulation': () => this.pauseSimulation(),
            'stop-simulation': () => this.stopSimulation(),
            'reset-simulation': () => this.resetSimulation(),
            'simulation-speed': (e) => this.setSimulationSpeed(e.target.value)
        };

        Object.keys(controls).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const eventType = element.tagName === 'SELECT' ? 'change' : 'click';
                element.addEventListener(eventType, controls[id]);
            }
        });
    }

    /**
     * Set up simulation engine event listeners
     */
    setupSimulationEvents() {
        this.simulationEngine.on('simulationStarted', () => {
            this.updateSimulationControls(true, false);
            this.showNotification('Simulação iniciada', 'success');
        });

        this.simulationEngine.on('simulationPaused', () => {
            this.updateSimulationControls(true, true);
            this.showNotification('Simulação pausada', 'warning');
        });

        this.simulationEngine.on('simulationStopped', () => {
            this.updateSimulationControls(false, false);
            this.showNotification('Simulação parada', 'error');
        });

        this.simulationEngine.on('simulationUpdated', (data) => {
            this.updateDashboard(data);
        });

        this.simulationEngine.on('orderAssigned', (data) => {
            this.showNotification(`Pedido ${data.order.id} atribuído ao ${data.drone.name}`, 'info');
        });

        this.simulationEngine.on('eventLogged', (data) => {
            this.updateEventLog(data.event);
        });
    }

    /**
     * Set up modal controls
     */
    setupModalControls() {
        const modal = document.getElementById('modal');
        const closeBtn = document.querySelector('.modal-close');
        const cancelBtn = document.getElementById('modal-cancel');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideModal();
            });
        }
    }

    /**
     * Initialize default data for demonstration
     */
    initializeDefaultData() {
        // Create default drones
        const defaultDrones = [
            { name: 'Alpha-01', capacity: 10, range: 50, speed: 60 },
            { name: 'Beta-02', capacity: 8, range: 45, speed: 65 },
            { name: 'Gamma-03', capacity: 12, range: 55, speed: 55 }
        ];

        defaultDrones.forEach(droneData => {
            const result = this.droneService.createDrone(droneData);
            if (result.success) {
                this.simulationEngine.addDrone(result.drone);
            }
        });

        // Create sample orders
        const sampleOrders = [
            { customerName: 'João Silva', weight: 2.5, location: { x: 25, y: 30 }, priority: 'alta' },
            { customerName: 'Maria Santos', weight: 1.8, location: { x: 60, y: 45 }, priority: 'media' },
            { customerName: 'Pedro Costa', weight: 3.2, location: { x: 40, y: 70 }, priority: 'baixa' },
            { customerName: 'Ana Lima', weight: 4.1, location: { x: 15, y: 55 }, priority: 'alta' }
        ];

        sampleOrders.forEach(orderData => {
            const result = this.orderService.createOrder(orderData);
            if (result.success) {
                this.simulationEngine.addOrder(result.order);
            }
        });
    }

    /**
     * Switch between tabs
     * @param {string} tabName - Tab to switch to
     */
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;
        this.updateTabContent(tabName);
    }

    /**
     * Update specific tab content
     * @param {string} tabName - Tab to update
     */
    updateTabContent(tabName) {
        switch (tabName) {
            case 'dashboard':
                this.updateDashboardContent();
                break;
            case 'orders':
                this.updateOrdersTable();
                break;
            case 'drones':
                this.updateDronesGrid();
                break;
            case 'simulation':
                this.updateSimulationGrid();
                break;
            case 'reports':
                this.updateReports();
                break;
        }
    }

    /**
     * Handle order form submission
     * @param {Event} e - Form submit event
     */
    handleOrderSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const orderData = {
            customerName: formData.get('customer-name'),
            weight: parseFloat(formData.get('package-weight')),
            location: {
                x: parseFloat(formData.get('delivery-x')),
                y: parseFloat(formData.get('delivery-y'))
            },
            priority: formData.get('priority'),
            deliveryTime: formData.get('delivery-time') || null
        };

        const result = this.orderService.createOrder(orderData);
        
        if (result.success) {
            this.simulationEngine.addOrder(result.order);
            this.showNotification('Pedido criado com sucesso!', 'success');
            e.target.reset();
            this.updateOrdersTable();
        } else {
            this.showNotification(result.errors.join(', '), 'error');
        }
    }

    /**
     * Handle drone form submission
     * @param {Event} e - Form submit event
     */
    handleDroneSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const droneData = {
            name: formData.get('drone-name'),
            capacity: parseFloat(formData.get('drone-capacity')),
            range: parseFloat(formData.get('drone-range')),
            speed: parseFloat(formData.get('drone-speed'))
        };

        const result = this.droneService.createDrone(droneData);
        
        if (result.success) {
            this.simulationEngine.addDrone(result.drone);
            this.showNotification('Drone adicionado com sucesso!', 'success');
            e.target.reset();
            this.updateDronesGrid();
        } else {
            this.showNotification(result.errors.join(', '), 'error');
        }
    }

    /**
     * Start simulation
     */
    startSimulation() {
        this.simulationEngine.start();
        this.startRefreshInterval();
    }

    /**
     * Pause simulation
     */
    pauseSimulation() {
        this.simulationEngine.pause();
    }

    /**
     * Stop simulation
     */
    stopSimulation() {
        this.simulationEngine.stop();
        this.stopRefreshInterval();
    }

    /**
     * Reset simulation
     */
    resetSimulation() {
        this.showModal(
            'Confirmar Reset',
            'Tem certeza que deseja resetar a simulação? Todos os dados atuais serão perdidos.',
            () => {
                this.simulationEngine.reset();
                this.stopRefreshInterval();
                this.updateUI();
                this.hideModal();
            }
        );
    }

    /**
     * Set simulation speed
     * @param {number} speed - Speed multiplier
     */
    setSimulationSpeed(speed) {
        this.simulationEngine.setSpeed(parseFloat(speed));
    }

    /**
     * Update simulation controls
     * @param {boolean} isRunning - Whether simulation is running
     * @param {boolean} isPaused - Whether simulation is paused
     */
    updateSimulationControls(isRunning, isPaused) {
        const startBtn = document.getElementById('start-simulation');
        const pauseBtn = document.getElementById('pause-simulation');
        const stopBtn = document.getElementById('stop-simulation');

        if (startBtn) startBtn.disabled = isRunning && !isPaused;
        if (pauseBtn) pauseBtn.disabled = !isRunning || isPaused;
        if (stopBtn) stopBtn.disabled = !isRunning;
    }

    /**
     * Update dashboard with simulation data
     * @param {Object} data - Simulation data
     */
    updateDashboard(data) {
        if (this.currentTab !== 'dashboard') return;

        const stats = data.statistics;
        
        // Update stat cards
        this.updateElement('total-deliveries', stats.totalDeliveries);
        this.updateElement('avg-delivery-time', `${Math.round(stats.averageDeliveryTime)} min`);
        this.updateElement('active-drones', stats.activeDrones);
        this.updateElement('avg-battery', `${Math.round(stats.batteryConsumption / Math.max(stats.activeDrones, 1))}%`);

        // Update drone status
        this.updateDroneStatus();

        // Update orders queue
        this.updateOrdersQueue();

        // Update simulation time
        this.updateElement('sim-time', this.simulationEngine.getFormattedTime());
        this.updateElement('processed-orders', stats.totalDeliveries);
        this.updateElement('active-drones-sim', stats.activeDrones);
    }

    /**
     * Update dashboard content
     */
    updateDashboardContent() {
        this.updateDroneStatus();
        this.updateOrdersQueue();
        this.initializeMap();
        this.initializeCharts();
    }

    /**
     * Update drone status display
     */
    updateDroneStatus() {
        const container = document.getElementById('drone-status');
        if (!container) return;

        const drones = this.droneService.getAllDrones();
        container.innerHTML = '';

        drones.forEach(drone => {
            const statusInfo = drone.getDisplayInfo();
            const droneElement = document.createElement('div');
            droneElement.className = 'drone-status-item';
            
            droneElement.innerHTML = `
                <div class="drone-info">
                    <div class="drone-avatar">${drone.name.charAt(0)}</div>
                    <div class="drone-details">
                        <h4>${drone.name}</h4>
                        <p>${statusInfo.status.display}</p>
                    </div>
                </div>
                <div class="drone-status">
                    <div class="status-indicator status-${drone.status}"></div>
                    <span>${statusInfo.batteryLevel}%</span>
                </div>
            `;
            
            container.appendChild(droneElement);
        });
    }

    /**
     * Update orders queue display
     */
    updateOrdersQueue() {
        const container = document.getElementById('orders-queue');
        if (!container) return;

        const pendingOrders = this.orderService.getPendingOrders();
        container.innerHTML = '';

        if (pendingOrders.length === 0) {
            container.innerHTML = '<p>Nenhum pedido pendente</p>';
            return;
        }

        pendingOrders.slice(0, 10).forEach(order => {
            const displayInfo = order.getDisplayInfo();
            const orderElement = document.createElement('div');
            orderElement.className = 'order-item';
            
            orderElement.innerHTML = `
                <div class="order-info">
                    <strong>${order.customerName}</strong>
                    <p>${displayInfo.weight} - ${displayInfo.location}</p>
                </div>
                <div class="order-priority ${displayInfo.priority.class}">
                    ${displayInfo.priority.display}
                </div>
            `;
            
            container.appendChild(orderElement);
        });
    }

    /**
     * Update orders table
     */
    updateOrdersTable() {
        const tbody = document.getElementById('orders-tbody');
        if (!tbody) return;

        const orders = this.orderService.getAllOrders();
        tbody.innerHTML = '';

        orders.forEach(order => {
            const displayInfo = order.getDisplayInfo();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${order.id.substr(-8)}</td>
                <td>${order.customerName}</td>
                <td>${displayInfo.weight}</td>
                <td>${displayInfo.location}</td>
                <td>
                    <span class="order-priority ${displayInfo.priority.class}">
                        ${displayInfo.priority.display}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${order.status}">
                        ${displayInfo.status}
                    </span>
                </td>
                <td>
                    <button class="btn-icon" onclick="controller.editOrder('${order.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="controller.cancelOrder('${order.id}')" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    /**
     * Update drones grid
     */
    updateDronesGrid() {
        const container = document.getElementById('drones-grid');
        if (!container) return;

        const drones = this.droneService.getAllDrones();
        container.innerHTML = '';

        drones.forEach(drone => {
            const displayInfo = drone.getDisplayInfo();
            const droneCard = document.createElement('div');
            droneCard.className = `drone-card ${drone.status}`;
            
            droneCard.innerHTML = `
                <div class="drone-header">
                    <h3 class="drone-name">${drone.name}</h3>
                    <span class="drone-status-badge ${displayInfo.status.class}">
                        ${displayInfo.status.display}
                    </span>
                </div>
                
                <div class="drone-stats">
                    <div class="drone-stat">
                        <span class="drone-stat-value">${displayInfo.completedDeliveries}</span>
                        <span class="drone-stat-label">Entregas</span>
                    </div>
                    <div class="drone-stat">
                        <span class="drone-stat-value">${displayInfo.totalDistance}km</span>
                        <span class="drone-stat-label">Distância</span>
                    </div>
                </div>
                
                <div class="drone-battery">
                    <div class="battery-bar">
                        <div class="battery-fill ${displayInfo.batteryClass}" 
                             style="width: ${displayInfo.batteryLevel}%"></div>
                        <div class="battery-percentage">${displayInfo.batteryLevel}%</div>
                    </div>
                </div>
                
                <div class="drone-actions">
                    <button class="btn btn-small btn-secondary" 
                            onclick="controller.chargeDrone('${drone.id}')"
                            ${drone.status !== 'idle' ? 'disabled' : ''}>
                        <i class="fas fa-battery-full"></i>
                        Carregar
                    </button>
                    <button class="btn btn-small btn-warning"
                            onclick="controller.scheduleMaintenance('${drone.id}')"
                            ${drone.status !== 'idle' ? 'disabled' : ''}>
                        <i class="fas fa-wrench"></i>
                        Manutenção
                    </button>
                    <button class="btn btn-small btn-danger"
                            onclick="controller.removeDrone('${drone.id}')"
                            ${drone.status !== 'idle' ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                        Remover
                    </button>
                </div>
            `;
            
            container.appendChild(droneCard);
        });
    }

    /**
     * Update simulation grid
     */
    updateSimulationGrid() {
        const container = document.getElementById('simulation-grid');
        if (!container) return;

        // Clear existing content
        container.innerHTML = '';

        // Add drone markers
        this.droneService.getAllDrones().forEach(drone => {
            const marker = document.createElement('div');
            marker.className = `drone-marker ${drone.status}`;
            marker.style.left = `${drone.location.x * 5}px`;
            marker.style.top = `${drone.location.y * 5}px`;
            marker.textContent = drone.name.charAt(0);
            marker.title = `${drone.name} - ${drone.status}`;
            
            container.appendChild(marker);
        });

        // Add delivery points
        this.orderService.getAllOrders().forEach(order => {
            if (order.status === 'pending' || order.status === 'assigned') {
                const point = document.createElement('div');
                point.className = 'delivery-point';
                point.style.left = `${order.location.x * 5}px`;
                point.style.top = `${order.location.y * 5}px`;
                point.title = `${order.customerName} - ${order.priority}`;
                
                container.appendChild(point);
            }
        });
    }

    /**
     * Update reports
     */
    updateReports() {
        this.initializeReportCharts();
        this.generateDetailedReport();
    }

    /**
     * Initialize map (placeholder for future Leaflet integration)
     */
    initializeMap() {
        // This would be implemented with Leaflet.js in a real scenario
        console.log('Map initialization placeholder');
    }

    /**
     * Initialize dashboard charts
     */
    initializeCharts() {
        this.initializePerformanceChart();
    }

    /**
     * Initialize performance chart
     */
    initializePerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas || !window.Chart) return;

        const ctx = canvas.getContext('2d');
        
        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'Entregas por Hora',
                    data: [0, 5, 12, 18, 15, 8],
                    borderColor: '#1f3a8c',
                    backgroundColor: 'rgba(31, 58, 140, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Initialize report charts
     */
    initializeReportCharts() {
        // Placeholder for report charts
        console.log('Report charts initialization placeholder');
    }

    /**
     * Generate detailed report
     */
    generateDetailedReport() {
        const container = document.getElementById('detailed-report-content');
        if (!container) return;

        const report = this.simulationEngine.generateReport();
        
        container.innerHTML = `
            <div class="report-section">
                <h4>Resumo Executivo</h4>
                <div class="metrics-row">
                    <div class="metric-item">
                        <span class="metric-value">${report.summary.totalOrders}</span>
                        <span class="metric-label">Total de Pedidos</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${Math.round(report.summary.successRate)}%</span>
                        <span class="metric-label">Taxa de Sucesso</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-value">${report.summary.simulationTime}</span>
                        <span class="metric-label">Tempo de Simulação</span>
                    </div>
                </div>
            </div>
            
            <div class="report-section">
                <h4>Performance dos Drones</h4>
                <div class="metrics-row">
                    ${report.drones.map(drone => `
                        <div class="metric-item">
                            <span class="metric-value">${drone.deliveries}</span>
                            <span class="metric-label">${drone.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Update event log
     * @param {Object} event - Event to add
     */
    updateEventLog(event) {
        const container = document.getElementById('event-log');
        if (!container) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${event.type}`;
        
        logEntry.innerHTML = `
            <span class="log-time">${new Date(event.timestamp).toLocaleTimeString()}</span>
            <span class="log-message">${event.message}</span>
        `;
        
        container.insertBefore(logEntry, container.firstChild);
        
        // Keep only last 50 entries
        while (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }
    }

    /**
     * Start UI refresh interval
     */
    startRefreshInterval() {
        if (this.refreshInterval) return;
        
        this.refreshInterval = setInterval(() => {
            this.updateTabContent(this.currentTab);
        }, 1000);
    }

    /**
     * Stop UI refresh interval
     */
    stopRefreshInterval() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Update entire UI
     */
    updateUI() {
        this.updateTabContent(this.currentTab);
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <p>${message}</p>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Show modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Function} onConfirm - Confirm callback
     */
    showModal(title, message, onConfirm) {
        const modal = document.getElementById('modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const confirmBtn = document.getElementById('modal-confirm');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        if (modal) modal.style.display = 'block';

        if (confirmBtn) {
            confirmBtn.onclick = onConfirm;
        }
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('modal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Update element content
     * @param {string} id - Element ID
     * @param {string} content - Content to set
     */
    updateElement(id, content) {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Resize charts
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }

    // Public methods for UI interactions
    editOrder(orderId) {
        // Placeholder for order editing
        console.log('Edit order:', orderId);
    }

    cancelOrder(orderId) {
        this.showModal(
            'Cancelar Pedido',
            'Tem certeza que deseja cancelar este pedido?',
            () => {
                const result = this.orderService.cancelOrder(orderId);
                if (result.success) {
                    this.showNotification('Pedido cancelado com sucesso', 'success');
                    this.updateOrdersTable();
                } else {
                    this.showNotification(result.errors.join(', '), 'error');
                }
                this.hideModal();
            }
        );
    }

    chargeDrone(droneId) {
        const result = this.droneService.chargeDrone(droneId);
        if (result.success) {
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.errors.join(', '), 'error');
        }
        this.updateDronesGrid();
    }

    scheduleMaintenance(droneId) {
        const result = this.droneService.scheduleMaintenance(droneId);
        if (result.success) {
            this.showNotification(result.message, 'success');
        } else {
            this.showNotification(result.errors.join(', '), 'error');
        }
        this.updateDronesGrid();
    }

    removeDrone(droneId) {
        this.showModal(
            'Remover Drone',
            'Tem certeza que deseja remover este drone?',
            () => {
                const result = this.droneService.deleteDrone(droneId);
                if (result.success) {
                    this.simulationEngine.removeDrone(droneId);
                    this.showNotification(result.message, 'success');
                    this.updateDronesGrid();
                } else {
                    this.showNotification(result.errors.join(', '), 'error');
                }
                this.hideModal();
            }
        );
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimulationController;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.SimulationController = SimulationController;
}
