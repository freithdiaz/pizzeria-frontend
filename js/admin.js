// Global variables
let currentSection = 'dashboard';
let dashboardData = {};
let inventoryData = {};
let reportsData = {};
let updateInterval = null;

// Función para formatear precios
function formatPrice(price) {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return Math.round(numPrice).toLocaleString('es-CO');
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing admin app...');
    
    // Ensure all modals are closed on page load
    closeAllModals();
    
    // Dashboard deshabilitado - admin_dinamico.html usa su propio sistema
    // showDashboard();
    // loadDashboard();
    
    // Initialize modal event listeners
    initializeModalEvents();
    initializeFormEvents();
    
    // Start automatic updates
    startAutoUpdates();
});

function initializeModalEvents() {
    console.log('Initializing modal events...');
    
    // Close modals when clicking outside or with Escape key
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function initializeFormEvents() {
    console.log('Initializing form events');
    // Los eventos de formularios se inicializarán dinámicamente cuando se carguen las secciones
}

// Modal utility functions
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('show');
    });
}

// Navigation functions
function showDashboard() {
    currentSection = 'dashboard';
    updateActiveNavItem('dashboard');
    loadDashboard();
}

function showInventory() {
    currentSection = 'inventory';
    updateActiveNavItem('inventory');
    loadInventory();
}

function showRecipes() {
    currentSection = 'recipes';
    updateActiveNavItem('recipes');
    loadRecipes();
}

function showReports() {
    currentSection = 'reports';
    updateActiveNavItem('reports');
    loadReports();
}

function showOrders() {
    currentSection = 'orders';
    updateActiveNavItem('orders');
    loadOrders();
}

function updateActiveNavItem(section) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to current section
    const activeItem = document.querySelector(`[onclick="show${section.charAt(0).toUpperCase() + section.slice(1)}()"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// ============= DASHBOARD =============
async function loadDashboard() {
    try {
        const response = await fetch(API_BASE_URL + '/api/dashboard/stats');
        const data = await response.json();
        dashboardData = data;
        renderDashboard();
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Error al cargar el dashboard');
    }
}

function renderDashboard() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="dashboard-container">
            <h1 class="text-3xl font-bold text-gray-800 mb-8">Dashboard</h1>
            
            <!-- Estadísticas principales -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-green-100 text-green-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Ventas Hoy</p>
                            <p class="text-2xl font-semibold text-gray-900">$${formatPrice(dashboardData.today?.sales || 0)}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Pedidos Hoy</p>
                            <p class="text-2xl font-semibold text-gray-900">${dashboardData.today?.orders_count || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Stock Bajo</p>
                            <p class="text-2xl font-semibold text-gray-900">${dashboardData.inventory?.low_stock_total || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="flex items-center">
                        <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                            </svg>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Promedio por Pedido</p>
                            <p class="text-2xl font-semibold text-gray-900">$${formatPrice(dashboardData.today?.average_order || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Gráficos y tablas -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Estado de pedidos -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Estado de Pedidos</h3>
                    <div class="space-y-3">
                        ${Object.entries(dashboardData.orders_by_status || {}).map(([status, count]) => `
                            <div class="flex justify-between items-center">
                                <span class="text-gray-600 capitalize">${status.replace('_', ' ')}</span>
                                <span class="font-semibold text-gray-900">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Inventario resumen -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Resumen de Inventario</h3>
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Masas de Pizza</span>
                            <span class="font-semibold text-gray-900">${dashboardData.inventory?.total_doughs || 0}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Bebidas</span>
                            <span class="font-semibold text-gray-900">${dashboardData.inventory?.total_beverages || 0}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Masas con Stock Bajo</span>
                            <span class="font-semibold text-red-600">${dashboardData.inventory?.low_stock_doughs || 0}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-gray-600">Bebidas con Stock Bajo</span>
                            <span class="font-semibold text-red-600">${dashboardData.inventory?.low_stock_beverages || 0}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Productos más vendidos -->
                <div class="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Productos Más Vendidos (Últimos 30 días)</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2 px-4 font-medium text-gray-600">Producto</th>
                                    <th class="text-right py-2 px-4 font-medium text-gray-600">Cantidad Vendida</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(dashboardData.popular_items || []).map(item => `
                                    <tr class="border-b">
                                        <td class="py-2 px-4 text-gray-800">${item.name}</td>
                                        <td class="py-2 px-4 text-right font-semibold text-gray-900">${item.quantity}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============= INVENTARIO =============
async function loadInventory() {
    try {
        const [doughResponse, beverageResponse] = await Promise.all([
            fetch(API_BASE_URL + '/api/pizza-dough-inventory'),
            fetch(API_BASE_URL + '/api/beverage-inventory')
        ]);
        
        const doughData = await doughResponse.json();
        const beverageData = await beverageResponse.json();
        
        inventoryData = {
            doughs: doughData,
            beverages: beverageData
        };
        
        renderInventory();
    } catch (error) {
        console.error('Error loading inventory:', error);
        showError('Error al cargar el inventario');
    }
}

function renderInventory() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="inventory-container">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Gestión de Inventario</h1>
                <div class="space-x-4">
                    <button onclick="showAddDoughModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Agregar Masa
                    </button>
                    <button onclick="showAddBeverageModal()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                        Agregar Bebida
                    </button>
                </div>
            </div>
            
            <!-- Masas de Pizza -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Inventario de Masas de Pizza</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2 px-4 font-medium text-gray-600">Tamaño</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Stock Actual</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Stock Mínimo</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Stock Máximo</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Estado</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryData.doughs.map(dough => `
                                <tr class="border-b">
                                    <td class="py-2 px-4 font-medium text-gray-800 capitalize">${dough.size}</td>
                                    <td class="py-2 px-4 text-center">
                                        <span class="font-semibold ${dough.status === 'low' ? 'text-red-600' : 'text-gray-900'}">${dough.current_stock}</span>
                                    </td>
                                    <td class="py-2 px-4 text-center text-gray-600">${dough.min_stock}</td>
                                    <td class="py-2 px-4 text-center text-gray-600">${dough.max_stock}</td>
                                    <td class="py-2 px-4 text-center">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium ${dough.status === 'low' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                            ${dough.status === 'low' ? 'Stock Bajo' : 'Normal'}
                                        </span>
                                    </td>
                                    <td class="py-2 px-4 text-center">
                                        <button onclick="editDough(${dough.id})" class="text-blue-600 hover:text-blue-800 mr-2">Editar</button>
                                        <button onclick="adjustDoughStock(${dough.id})" class="text-green-600 hover:text-green-800">Ajustar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Bebidas -->
            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Inventario de Bebidas</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2 px-4 font-medium text-gray-600">Nombre</th>
                                <th class="text-left py-2 px-4 font-medium text-gray-600">Tamaño</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Stock</th>

                                <th class="text-center py-2 px-4 font-medium text-gray-600">Estado</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventoryData.beverages.map(beverage => `
                                <tr class="border-b">
                                    <td class="py-2 px-4 font-medium text-gray-800">${beverage.name}</td>
                                    <td class="py-2 px-4 text-gray-600">${beverage.size}</td>
                                    <td class="py-2 px-4 text-center">
                                        <span class="font-semibold ${beverage.status === 'low' ? 'text-red-600' : 'text-gray-900'}">${beverage.current_stock}</span>
                                    </td>
                                 
                                    <td class="py-2 px-4 text-center">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium ${beverage.status === 'low' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                            ${beverage.status === 'low' ? 'Stock Bajo' : 'Normal'}
                                        </span>
                                    </td>
                                    <td class="py-2 px-4 text-center">
                                        <button onclick="editBeverage(${beverage.id})" class="text-blue-600 hover:text-blue-800 mr-2">Editar</button>
                                        <button onclick="adjustBeverageStock(${beverage.id})" class="text-green-600 hover:text-green-800">Ajustar</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <!-- Modales -->
        ${renderInventoryModals()}
    `;
}

function renderInventoryModals() {
    return `
        <!-- Modal para agregar masa -->
        <div id="add-dough-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-lg font-semibold mb-4">Agregar Masa de Pizza</h3>
                <form id="add-dough-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tamaño</label>
                        <select name="size" required class="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="">Seleccionar tamaño</option>
                            <option value="personal">Personal</option>
                            <option value="ejecutiva">Ejecutiva</option>
                            <option value="mediana">Mediana</option>
                            <option value="grande">Grande</option>
                            <option value="familiar">Familiar</option>
                            <option value="extra-familiar">Extra Familiar</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Inicial</label>
                        <input type="number" name="current_stock" min="0" value="0" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo</label>
                        <input type="number" name="min_stock" min="0" value="5" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Máximo</label>
                        <input type="number" name="max_stock" min="0" value="50" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="closeAllModals()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Agregar</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal para agregar bebida -->
        <div id="add-beverage-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-lg font-semibold mb-4">Agregar Bebida</h3>
                <form id="add-beverage-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                        <input type="text" name="name" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Tamaño</label>
                        <input type="text" name="size" required class="w-full p-2 border border-gray-300 rounded-lg" placeholder="ej: 400ml, 1.5L, 16oz">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Inicial</label>
                        <input type="number" name="current_stock" min="0" value="0" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Precio de Venta (en miles)</label>
                        <input type="number" name="sale_price" min="0" step="0.1" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Mínimo</label>
                        <input type="number" name="min_stock" min="0" value="10" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Stock Máximo</label>
                        <input type="number" name="max_stock" min="0" value="100" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="closeAllModals()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Agregar</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Modal para ajustar stock -->
        <div id="adjust-stock-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 class="text-lg font-semibold mb-4">Ajustar Stock</h3>
                <form id="adjust-stock-form">
                    <input type="hidden" name="item_id">
                    <input type="hidden" name="item_type">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Nuevo Stock</label>
                        <input type="number" name="current_stock" min="0" required class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                        <select name="reason" required class="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="purchase">Compra</option>
                            <option value="sale">Venta</option>
                            <option value="adjustment">Ajuste de inventario</option>
                            <option value="damage">Producto dañado</option>
                            <option value="other">Otro</option>
                        </select>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                        <textarea name="notes" class="w-full p-2 border border-gray-300 rounded-lg" rows="3"></textarea>
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="button" onclick="closeAllModals()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                        <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Ajustar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Funciones para modales de inventario
function showAddDoughModal() {
    console.log('showAddDoughModal called');
    const modal = document.getElementById('add-dough-modal');
    console.log('Modal found:', modal);
    
    if (!modal) {
        console.error('Modal add-dough-modal not found');
        alert('Error: Modal no encontrado');
        return;
    }
    
    modal.classList.add('show');
    
    // Agregar event listener al formulario
    const form = document.getElementById('add-dough-form');
    if (!form) {
        console.error('Form add-dough-form not found');
        return;
    }
    
    form.onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        console.log('Form data:', data);
        
        try {
            const response = await fetch(API_BASE_URL + '/api/pizza-dough-inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeAllModals();
                loadInventory();
                showSuccess('Masa agregada exitosamente');
            } else {
                throw new Error('Error al agregar masa');
            }
        } catch (error) {
            showError('Error al agregar masa');
        }
    };
}

function showAddBeverageModal() {
    console.log('showAddBeverageModal called');
    const modal = document.getElementById('add-beverage-modal');
    console.log('Modal found:', modal);
    
    if (!modal) {
        console.error('Modal add-beverage-modal not found');
        alert('Error: Modal no encontrado');
        return;
    }
    
    modal.classList.add('show');
    
    // Agregar event listener al formulario
    const form = document.getElementById('add-beverage-form');
    if (!form) {
        console.error('Form add-beverage-form not found');
        return;
    }
    
    form.onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        console.log('Form data:', data);
        
        try {
            const response = await fetch(API_BASE_URL + '/api/beverage-inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeAllModals();
                loadInventory();
                showSuccess('Bebida agregada exitosamente');
            } else {
                throw new Error('Error al agregar bebida');
            }
        } catch (error) {
            showError('Error al agregar bebida');
        }
    };
}

function adjustDoughStock(doughId) {
    const dough = inventoryData.doughs.find(d => d.id === doughId);
    showAdjustStockModal(doughId, 'dough', dough.current_stock);
}

function adjustBeverageStock(beverageId) {
    const beverage = inventoryData.beverages.find(b => b.id === beverageId);
    showAdjustStockModal(beverageId, 'beverage', beverage.current_stock);
}

function showAdjustStockModal(itemId, itemType, currentStock) {
    const modal = document.getElementById('adjust-stock-modal');
    modal.classList.add('show');
    
    // Llenar el formulario
    document.getElementById('adjust-item-id').value = itemId;
    document.getElementById('adjust-item-type').value = itemType;
    document.getElementById('adjust-current-stock').value = currentStock;
    
    const form = document.getElementById('adjust-stock-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const endpoint = itemType === 'dough' ? 
                `/api/pizza-dough-inventory/${itemId}` : 
                `/api/beverage-inventory/${itemId}`;
                
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeAllModals();
                loadInventory();
                showSuccess('Stock ajustado exitosamente');
            } else {
                throw new Error('Error al ajustar stock');
            }
        } catch (error) {
            showError('Error al ajustar stock');
        }
    };
}

// ============= RECETAS =============
async function loadRecipes() {
    try {
        const response = await fetch(API_BASE_URL + '/api/recipes');
        const data = await response.json();
        renderRecipes(data);
    } catch (error) {
        console.error('Error loading recipes:', error);
        showError('Error al cargar las recetas');
    }
}

function renderRecipes(recipes) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="recipes-container">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-3xl font-bold text-white">Gestión de Recetas</h1>
                <button onclick="showAddRecipeModal()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors">
                    <i class="fas fa-plus mr-2"></i>Agregar Receta
                </button>
            </div>
            
            <div class="bg-slate-800 rounded-lg shadow-lg p-6">
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b border-slate-600">
                                <th class="text-left py-3 px-4 font-medium text-gray-300">Nombre</th>
                                <th class="text-left py-3 px-4 font-medium text-gray-300">Tamaño</th>
                                <th class="text-left py-3 px-4 font-medium text-gray-300">Ingredientes</th>
                                <th class="text-right py-3 px-4 font-medium text-gray-300">Precio</th>
                                <th class="text-center py-3 px-4 font-medium text-gray-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recipes.map(recipe => `
                                <tr class="border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                    <td class="py-3 px-4 font-medium text-white">${recipe.name}</td>
                                    <td class="py-3 px-4 text-gray-300 capitalize">${recipe.size || 'N/A'}</td>
                                    <td class="py-3 px-4 text-gray-300">
                                        ${recipe.ingredients && recipe.ingredients.length > 0 ? 
                                            `<div class="space-y-1">
                                                ${recipe.ingredients.map(ing => 
                                                    `<div class="text-sm">
                                                        <span class="text-blue-400">${ing.product_name}</span>: 
                                                        <span class="text-yellow-400">${ing.quantity} ${ing.unit}</span>
                                                    </div>`
                                                ).join('')}
                                            </div>` 
                                            : '<span class="text-red-400 italic">Sin ingredientes</span>'
                                        }
                                    </td>
                                    <td class="py-3 px-4 text-right font-semibold text-green-400">$${formatPrice(recipe.sale_price )}</td>
                                    <td class="py-3 px-4 text-center">
                                        <button onclick="editRecipe(${recipe.id})" class="text-blue-400 hover:text-blue-300 mr-3 transition-colors">
                                            <i class="fas fa-edit"></i> Editar
                                        </button>
                                        <button onclick="deleteRecipe(${recipe.id})" class="text-red-400 hover:text-red-300 transition-colors">
                                            <i class="fas fa-trash"></i> Eliminar
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${recipes.length === 0 ? 
                    `<div class="text-center py-8">
                        <i class="fas fa-utensils text-4xl text-gray-500 mb-4"></i>
                        <p class="text-gray-400 text-lg">No hay recetas registradas</p>
                        <p class="text-gray-500">Agrega tu primera receta para comenzar</p>
                    </div>` 
                    : ''
                }
            </div>
        </div>
    `;
}

// ============= FUNCIONES DE RECETAS =============
function showAddRecipeModal() {
    console.log('showAddRecipeModal called');
    const modal = document.getElementById('add-recipe-modal');
    
    if (!modal) {
        console.error('Modal add-recipe-modal not found');
        alert('Error: Modal no encontrado');
        return;
    }
    
    // Limpiar el formulario
    document.getElementById('add-recipe-form').reset();
    document.getElementById('recipe-ingredients').innerHTML = '';
    
    modal.classList.add('show');
    
    // Agregar al menos un ingrediente por defecto
    addIngredientRow();
    
    // Agregar event listener al formulario
    const form = document.getElementById('add-recipe-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        
        // Recopilar datos del formulario
        const recipeName = document.getElementById('recipe-name').value;
        const recipePrice = parseFloat(document.getElementById('recipe-price').value);
        
        // Recopilar ingredientes
        const ingredients = [];
        const ingredientRows = document.querySelectorAll('.ingredient-row');
        
        ingredientRows.forEach(row => {
            const productSelect = row.querySelector('.ingredient-product');
            const quantityInput = row.querySelector('.ingredient-quantity');
            
            if (productSelect.value && quantityInput.value) {
                ingredients.push({
                    product_id: parseInt(productSelect.value),
                    product_name: productSelect.options[productSelect.selectedIndex].text,
                    quantity: parseFloat(quantityInput.value),
                    unit: 'gramos' // Por defecto, podrías agregar un selector
                });
            }
        });
        
        const recipeData = {
            name: recipeName,
            sale_price: recipePrice,
            ingredients: ingredients
        };
        
        console.log('Recipe data:', recipeData);
        
        try {
            const response = await fetch(API_BASE_URL + '/api/recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recipeData)
            });
            
            if (response.ok) {
                closeAllModals();
                loadRecipes();
                showSuccess('Receta agregada exitosamente');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al agregar receta');
            }
        } catch (error) {
            console.error('Error:', error);
            showError('Error al agregar receta: ' + error.message);
        }
    };
}

function addIngredientRow() {
    const container = document.getElementById('recipe-ingredients');
    const rowId = Date.now(); // ID único para la fila
    
    // Crear nueva fila de ingrediente
    const row = document.createElement('div');
    row.className = 'ingredient-row flex gap-3 items-center';
    row.innerHTML = `
        <select class="ingredient-product flex-1 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" required>
            <option value="">Seleccionar ingrediente...</option>
            <option value="1">Masa Personal</option>
            <option value="2">Masa Ejecutiva</option>
            <option value="3">Masa Mediana</option>
            <option value="4">Masa Grande</option>
            <option value="5">Masa Familiar</option>
            <option value="6">Masa Extra Familiar</option>
            <!-- Aquí podrías cargar dinámicamente de la base de datos -->
        </select>
        <input type="number" class="ingredient-quantity w-24 px-3 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" 
               placeholder="Cant." min="0" step="0.01" required>
        <button type="button" onclick="removeIngredientRow(this)" class="text-red-400 hover:text-red-300 px-2 py-1">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(row);
}

function removeIngredientRow(button) {
    button.closest('.ingredient-row').remove();
}

function closeAddRecipeModal() {
    closeAllModals();
}

function editRecipe(recipeId) {
    console.log('editRecipe called with ID:', recipeId);
    
    // Por ahora, simplificar la edición - solo permitir cambiar nombre y precio
    const newName = prompt('Nuevo nombre de la receta:');
    if (!newName) return;
    
    const newPrice = parseFloat(prompt('Nuevo precio de venta:'));
    if (isNaN(newPrice) || newPrice <= 0) {
        showError('Precio inválido');
        return;
    }
    
    const recipeData = {
        name: newName,
        sale_price: newPrice
    };
    
    fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadRecipes();
            showSuccess('Receta actualizada exitosamente');
        } else {
            throw new Error(data.error || 'Error al actualizar receta');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al actualizar receta: ' + error.message);
    });
}

function deleteRecipe(recipeId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta receta?')) {
        return;
    }
    
    console.log('deleteRecipe called with ID:', recipeId);
    
    fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadRecipes();
            showSuccess('Receta eliminada exitosamente');
        } else {
            throw new Error(data.error || 'Error al eliminar receta');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('Error al eliminar receta: ' + error.message);
    });
}

// ============= REPORTES =============
async function loadReports() {
    renderReports();
}

function renderReports() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="reports-container">
            <h1 class="text-3xl font-bold text-gray-800 mb-8">Reportes</h1>
            
            <!-- Filtros de reporte -->
            <div class="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Reporte de Ventas</h2>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Período</label>
                        <select id="report-period" class="w-full p-2 border border-gray-300 rounded-lg">
                            <option value="day">Por Día</option>
                            <option value="month">Por Mes</option>
                            <option value="year">Por Año</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
                        <input type="date" id="start-date" class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
                        <input type="date" id="end-date" class="w-full p-2 border border-gray-300 rounded-lg">
                    </div>
                    <div class="flex items-end">
                        <button onclick="generateSalesReport()" class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Generar Reporte
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Resultados del reporte -->
            <div id="report-results" class="hidden">
                <!-- Los resultados se cargarán aquí dinámicamente -->
            </div>
        </div>
    `;
    
    // Establecer fechas por defecto
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('start-date').value = lastWeek.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
}

async function generateSalesReport() {
    const period = document.getElementById('report-period').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    try {
        const params = new URLSearchParams({
            period,
            start_date: startDate,
            end_date: endDate
        });
        
        const response = await fetch(`${API_BASE_URL}/api/reports/sales?${params}`);
        const data = await response.json();
        
        renderSalesReport(data);
    } catch (error) {
        console.error('Error generating report:', error);
        showError('Error al generar el reporte');
    }
}

function renderSalesReport(data) {
    const resultsDiv = document.getElementById('report-results');
    resultsDiv.className = 'bg-white rounded-lg shadow-md p-6';
    resultsDiv.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Resultados del Reporte</h3>
        
        <!-- Resumen -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="text-sm font-medium text-blue-600 mb-1">Ventas Totales</h4>
                <p class="text-2xl font-bold text-blue-900">$${formatPrice(data.summary.total_sales)}</p>
            </div>
            <div class="bg-green-50 rounded-lg p-4">
                <h4 class="text-sm font-medium text-green-600 mb-1">Pedidos Totales</h4>
                <p class="text-2xl font-bold text-green-900">${data.summary.total_orders}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-4">
                <h4 class="text-sm font-medium text-purple-600 mb-1">Productos Vendidos</h4>
                <p class="text-2xl font-bold text-purple-900">${data.summary.total_items}</p>
            </div>
        </div>
        
        <!-- Productos más vendidos -->
        <div class="mb-8">
            <h4 class="text-lg font-semibold text-gray-800 mb-4">Productos Más Vendidos</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left py-2 px-4 font-medium text-gray-600">Producto</th>
                            <th class="text-right py-2 px-4 font-medium text-gray-600">Cantidad</th>
                            <th class="text-right py-2 px-4 font-medium text-gray-600">Ingresos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.popular_items.map(item => `
                            <tr class="border-b">
                                <td class="py-2 px-4 text-gray-800">${item.name}</td>
                                <td class="py-2 px-4 text-right font-semibold text-gray-900">${item.quantity_sold}</td>
                                <td class="py-2 px-4 text-right font-semibold text-gray-900">$${formatPrice(item.total_revenue)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Ventas por período -->
        <div>
            <h4 class="text-lg font-semibold text-gray-800 mb-4">Ventas por ${data.period === 'day' ? 'Día' : data.period === 'month' ? 'Mes' : 'Año'}</h4>
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left py-2 px-4 font-medium text-gray-600">Período</th>
                            <th class="text-right py-2 px-4 font-medium text-gray-600">Ventas</th>
                            <th class="text-right py-2 px-4 font-medium text-gray-600">Pedidos</th>
                            <th class="text-right py-2 px-4 font-medium text-gray-600">Productos</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.sales_by_period).map(([period, stats]) => `
                            <tr class="border-b">
                                <td class="py-2 px-4 text-gray-800">${period}</td>
                                <td class="py-2 px-4 text-right font-semibold text-gray-900">$${formatPrice(stats.total_sales)}</td>
                                <td class="py-2 px-4 text-right text-gray-600">${stats.orders_count}</td>
                                <td class="py-2 px-4 text-right text-gray-600">${stats.items_sold}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============= PEDIDOS =============
async function loadOrders() {
    try {
        const response = await fetch(API_BASE_URL + '/api/orders');
        const data = await response.json();
        renderOrders(data);
    } catch (error) {
        console.error('Error loading orders:', error);
        showError('Error al cargar los pedidos');
    }
}

function renderOrders(orders) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="orders-container">
            <h1 class="text-3xl font-bold text-gray-800 mb-8">Gestión de Pedidos</h1>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2 px-4 font-medium text-gray-600">ID</th>
                                <th class="text-left py-2 px-4 font-medium text-gray-600">Cliente</th>
                                <th class="text-right py-2 px-4 font-medium text-gray-600">Total</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Estado</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Fecha</th>
                                <th class="text-center py-2 px-4 font-medium text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${orders.map(order => `
                                <tr class="border-b">
                                    <td class="py-2 px-4 font-medium text-gray-800">#${order.id}</td>
                                    <td class="py-2 px-4 text-gray-600">${order.customer_name || 'Cliente'}</td>
                                    <td class="py-2 px-4 text-right font-semibold text-gray-900">$${formatPrice(order.total_amount)}</td>
                                    <td class="py-2 px-4 text-center">
                                        <span class="px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}">
                                            ${getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td class="py-2 px-4 text-center text-gray-600">${new Date(order.created_at).toLocaleDateString()}</td>
                                    <td class="py-2 px-4 text-center">
                                        <button onclick="viewOrderDetails(${order.id})" class="text-blue-600 hover:text-blue-800 mr-2">Ver</button>
                                        <button onclick="updateOrderStatus(${order.id})" class="text-green-600 hover:text-green-800">Estado</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function getStatusColor(status) {
    const colors = {
        'pendiente': 'bg-yellow-100 text-yellow-800',
        'en_preparacion': 'bg-blue-100 text-blue-800',
        'listo': 'bg-green-100 text-green-800',
        'entregado': 'bg-gray-100 text-gray-800',
        'cancelado': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
    const texts = {
        'pendiente': 'Pendiente',
        'en_preparacion': 'En Preparación',
        'listo': 'Listo',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return texts[status] || status;
}

// ============= FUNCIONES DE EDICIÓN =============
function editDough(doughId) {
    const dough = inventoryData.doughs.find(d => d.id === doughId);
    if (!dough) {
        showError('Masa no encontrada');
        return;
    }
    
    const modal = document.getElementById('edit-dough-modal');
    modal.classList.add('show');
    
    // Llenar el formulario con los datos actuales
    document.getElementById('edit-dough-id').value = dough.id;
    document.getElementById('edit-dough-size').value = dough.size;
    document.getElementById('edit-dough-current-stock').value = dough.current_stock;
    document.getElementById('edit-dough-min-stock').value = dough.min_stock;
    
    // Agregar event listener al formulario
    const form = document.getElementById('edit-dough-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/pizza-dough-inventory/${doughId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeAllModals();
                loadInventory();
                showSuccess('Masa actualizada exitosamente');
            } else {
                throw new Error('Error al actualizar masa');
            }
        } catch (error) {
            showError('Error al actualizar masa');
        }
    };
}

function editBeverage(beverageId) {
    const beverage = inventoryData.beverages.find(b => b.id === beverageId);
    if (!beverage) {
        showError('Bebida no encontrada');
        return;
    }
    
    const modal = document.getElementById('edit-beverage-modal');
    modal.classList.add('show');
    
    // Llenar el formulario con los datos actuales
    document.getElementById('edit-beverage-id').value = beverage.id;
    document.getElementById('edit-beverage-name').value = beverage.name;
    document.getElementById('edit-beverage-size').value = beverage.size;
    document.getElementById('edit-beverage-price').value = beverage.sale_price;
    document.getElementById('edit-beverage-current-stock').value = beverage.current_stock;
    document.getElementById('edit-beverage-min-stock').value = beverage.min_stock || '';
    
    // Agregar event listener al formulario
    const form = document.getElementById('edit-beverage-form');
    form.onsubmit = async function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/beverage-inventory/${beverageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                closeAllModals();
                loadInventory();
                showSuccess('Bebida actualizada exitosamente');
            } else {
                throw new Error('Error al actualizar bebida');
            }
        } catch (error) {
            showError('Error al actualizar bebida');
        }
    };
}

// ============= UTILIDADES =============
function startAutoUpdates() {
    // Dashboard deshabilitado
    // updateInterval = setInterval(() => {
    //     if (currentSection === 'dashboard') {
    //         loadDashboard();
    //     }
    // }, 30000);
}

function showSuccess(message) {
    // Implementar notificación de éxito
    console.log('Success:', message);
    alert(message); // Temporal, se puede mejorar con una librería de notificaciones
}

function showError(message) {
    // Implementar notificación de error
    console.error('Error:', message);
    alert(message); // Temporal, se puede mejorar con una librería de notificaciones
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

