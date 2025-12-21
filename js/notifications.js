// Función para formatear precios como enteros
function formatPrice(price) {
    // Si el precio viene en miles (como 45.9), multiplicar por 1000
    // Si ya viene como entero (como 45900), usar tal como está
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const finalPrice = numPrice < 1000 ? Math.round(numPrice * 1000) : Math.round(numPrice);
    return finalPrice.toLocaleString('es-CO');
}

// Sistema de notificaciones en tiempo real
class NotificationSystem {
    constructor() {
        this.lastOrderId = 0;
        this.checkInterval = 5000; // 5 segundos
        this.isRunning = false;
        this.audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmHgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        this.initializeNotifications();
    }

    async initializeNotifications() {
        // Solicitar permisos para notificaciones del navegador
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        // Obtener el último ID de pedido
        await this.updateLastOrderId();

        // Iniciar el monitoreo
        this.startMonitoring();
    }

    async updateLastOrderId() {
        try {
            if (!window.supabaseClient) return;
            const orders = await window.supabaseClient.getPedidos(1);
            if (orders && orders.length > 0) {
                this.lastOrderId = orders[0].id;
            }
        } catch (error) {
            console.error('Error al obtener último ID de pedido vía Supabase:', error);
        }
    }

    startMonitoring() {
        if (this.isRunning || !window.supabaseClient) return;

        this.isRunning = true;

        // Usar Supabase Realtime en lugar de polling
        // Acceder a window.supabase (cliente raw) en lugar de window.supabaseClient (wrapper db)
        if (!window.supabase) {
            console.error('Supabase raw client no disponible para notificaciones');
            return;
        }

        const channel = window.supabase
            .channel('pedidos-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'pedidos'
            }, payload => {
                console.log('Nuevo pedido detectado vía Realtime:', payload.new);
                this.handleNewOrder(payload.new);
            })
            .subscribe();

        this.realtimeChannel = channel;
        console.log('Sistema de notificaciones Realtime iniciado');
    }

    stopMonitoring() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
            this.isRunning = false;
            console.log('Sistema de notificaciones Realtime detenido');
        }
    }

    async handleNewOrder(order) {
        if (order.id > this.lastOrderId) {
            this.lastOrderId = order.id;
            this.showNotification(order);
            this.playNotificationSound();

            // Actualizar la interfaz si estamos en la página de admin
            if (typeof loadOrders === 'function') {
                loadOrders();
            }
        }
    }

    showNotification(order) {
        const title = `Nuevo Pedido #${order.numero_pedido || order.id}`;
        const message = `Mesa ${order.table_number || order.mesa} - Total: $${formatPrice(order.total_amount || order.total_precio)}`;

        // Notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: message,
                icon: '/static/niss.ico',
                badge: '/static/niss.ico',
                tag: `order-${order.id}`,
                requireInteraction: true
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
                // Redirigir a la página de admin si no estamos ahí
                if (!window.location.pathname.includes('/admin')) {
                    window.location.href = '/admin';
                }
            };

            // Auto-cerrar después de 10 segundos
            setTimeout(() => {
                notification.close();
            }, 10000);
        }

        // Notificación visual en la página
        this.showInPageNotification(title, message, order);
    }

    showInPageNotification(title, message, order) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-bounce';
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="fas fa-bell text-xl"></i>
                <div>
                    <h4 class="font-bold">${title}</h4>
                    <p class="text-sm">${message}</p>
                    <p class="text-xs mt-1 opacity-75">Hace un momento</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Agregar al DOM
        document.body.appendChild(notification);

        // Auto-remover después de 8 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);

        // Efecto de entrada
        setTimeout(() => {
            notification.classList.remove('animate-bounce');
            notification.classList.add('animate-pulse');
        }, 1000);
    }

    playNotificationSound() {
        try {
            this.audio.currentTime = 0;
            this.audio.play().catch(e => {
                console.log('No se pudo reproducir el sonido de notificación:', e);
            });
        } catch (error) {
            console.log('Error al reproducir sonido:', error);
        }
    }

    // Método para mostrar notificaciones manuales
    showCustomNotification(title, message, type = 'info') {
        const colors = {
            'success': 'bg-green-600',
            'error': 'bg-red-600',
            'warning': 'bg-yellow-600',
            'info': 'bg-blue-600'
        };

        const icons = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 ${colors[type]} text-white p-4 rounded-lg shadow-lg z-50 max-w-sm`;
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <i class="${icons[type]} text-xl"></i>
                <div>
                    <h4 class="font-bold">${title}</h4>
                    <p class="text-sm">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Inicializar el sistema de notificaciones cuando se carga la página
let notificationSystem;

document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas de admin
    if (window.location.pathname.includes('/admin') || window.location.pathname === '/') {
        notificationSystem = new NotificationSystem();
    }
});

// Función global para mostrar notificaciones
function showNotification(title, message, type = 'info') {
    if (notificationSystem) {
        notificationSystem.showCustomNotification(title, message, type);
    }
}

