// Variables globales
let dailySalesChart = null;
let topProductsChart = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fechas por defecto (último mes)
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('start-date').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
    
    // Cargar reportes iniciales
    loadSalesReport();
    loadInventoryReport();
});

// ============= REPORTES DE VENTAS =============

async function loadSalesReport() {
    try {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        let url = '/api/reports/sales';
        const params = new URLSearchParams();
        
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al cargar reporte de ventas');
        
        const data = await response.json();
        renderSalesStats(data);
        renderDailySalesChart(data.daily_sales);
        renderTopProductsChart(data.top_products);
        renderTopProductsTable(data.top_products);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar reporte de ventas', 'danger');
    }
}

function renderSalesStats(data) {
    const statsContainer = document.getElementById('stats-cards');
    
    statsContainer.innerHTML = `
        <div class="col-md-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Ventas Totales</h6>
                        <h3 class="mb-0">$${formatPrice(data.total_sales)}</h3>
                    </div>
                    <i class="fas fa-dollar-sign fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card success">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Total Pedidos</h6>
                        <h3 class="mb-0">${data.total_orders}</h3>
                    </div>
                    <i class="fas fa-shopping-cart fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card warning">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Promedio por Pedido</h6>
                        <h3 class="mb-0">$${formatPrice(data.average_order)}</h3>
                    </div>
                    <i class="fas fa-chart-line fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card info">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Productos Vendidos</h6>
                        <h3 class="mb-0">${data.top_products.reduce((sum, p) => sum + p.quantity, 0)}</h3>
                    </div>
                    <i class="fas fa-pizza-slice fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    `;
}

function renderDailySalesChart(dailySales) {
    const ctx = document.getElementById('daily-sales-chart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (dailySalesChart) {
        dailySalesChart.destroy();
    }
    
    const dates = Object.keys(dailySales).sort();
    const amounts = dates.map(date => dailySales[date].amount);
    const orders = dates.map(date => dailySales[date].orders);
    
    dailySalesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(date => new Date(date).toLocaleDateString('es-ES')),
            datasets: [{
                label: 'Ventas ($)',
                data: amounts,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.1,
                yAxisID: 'y'
            }, {
                label: 'Pedidos',
                data: orders,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Fecha'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Ventas ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Número de Pedidos'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}

function renderTopProductsChart(topProducts) {
    const ctx = document.getElementById('top-products-chart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (topProductsChart) {
        topProductsChart.destroy();
    }
    
    const top5 = topProducts.slice(0, 5);
    const labels = top5.map(p => p.name);
    const quantities = top5.map(p => p.quantity);
    
    topProductsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: quantities,
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function renderTopProductsTable(topProducts) {
    const tbody = document.getElementById('top-products-table');
    
    tbody.innerHTML = topProducts.map((product, index) => `
        <tr>
            <td>
                <span class="badge bg-primary me-2">${index + 1}</span>
                ${product.name}
            </td>
            <td>${product.quantity}</td>
            <td>$${formatPrice(product.revenue)}</td>
        </tr>
    `).join('');
}

// ============= REPORTES DE INVENTARIO =============

async function loadInventoryReport() {
    try {
        const response = await fetch(API_BASE_URL + '/api/reports/inventory');
        if (!response.ok) throw new Error('Error al cargar reporte de inventario');
        
        const data = await response.json();
        renderInventoryStats(data);
        renderLowStockTable(data.low_stock_products);
        renderInventoryByCategory(data.by_category);
        
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error al cargar reporte de inventario', 'danger');
    }
}

function renderInventoryStats(data) {
    // Agregar estadísticas de inventario a las tarjetas existentes
    const statsContainer = document.getElementById('stats-cards');
    
    statsContainer.innerHTML += `
        <div class="col-md-3 mt-3">
            <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Valor Inventario</h6>
                        <h3 class="mb-0">$${formatPrice(data.total_value)}</h3>
                    </div>
                    <i class="fas fa-warehouse fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
        <div class="col-md-3 mt-3">
            <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">Stock Bajo</h6>
                        <h3 class="mb-0">${data.low_stock_count}</h3>
                    </div>
                    <i class="fas fa-exclamation-triangle fa-2x opacity-75"></i>
                </div>
            </div>
        </div>
    `;
}

function renderLowStockTable(lowStockProducts) {
    const tbody = document.getElementById('low-stock-table');
    
    if (lowStockProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">
                    <i class="fas fa-check-circle text-success"></i> No hay productos con stock bajo
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = lowStockProducts.map(product => `
        <tr class="low-stock">
            <td>${product.name}</td>
            <td>
                <span class="badge bg-warning">${product.current_stock} ${product.unit}</span>
            </td>
            <td>${product.min_stock} ${product.unit}</td>
            <td>
                <span class="badge bg-danger">
                    <i class="fas fa-exclamation-triangle"></i> Crítico
                </span>
            </td>
        </tr>
    `).join('');
}

function renderInventoryByCategory(byCategory) {
    const container = document.getElementById('inventory-by-category');
    
    container.innerHTML = Object.keys(byCategory).map(category => {
        const products = byCategory[category];
        const totalValue = products.reduce((sum, p) => sum + p.value, 0);
        const lowStockCount = products.filter(p => p.is_low_stock).length;
        
        return `
            <div class="mb-4">
                <h6 class="text-uppercase text-muted mb-3">
                    ${category} 
                    <span class="badge bg-secondary">${products.length} productos</span>
                    <span class="badge bg-success">$${formatPrice(totalValue)}</span>
                    ${lowStockCount > 0 ? `<span class="badge bg-warning">${lowStockCount} con stock bajo</span>` : ''}
                </h6>
                <div class="row">
                    ${products.map(product => `
                        <div class="col-md-4 mb-2">
                            <div class="card ${product.is_low_stock ? 'border-warning' : ''}">
                                <div class="card-body py-2">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h6 class="mb-0">${product.name}</h6>
                                            <small class="text-muted">${product.current_stock} ${product.unit}</small>
                                        </div>
                                        <div class="text-end">
                                            <small class="text-success">$${formatPrice(product.value)}</small>
                                            ${product.is_low_stock ? '<br><span class="badge bg-warning">Bajo</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// ============= UTILIDADES =============

function resetDates() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('start-date').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('end-date').value = today.toISOString().split('T')[0];
    
    loadSalesReport();
}

function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

