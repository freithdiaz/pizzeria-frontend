/**
 * Cliente Supabase - Pizzería NISSI
 * =================================
 * Este archivo gestiona la conexión directa con Supabase y toda la lógica
 * que anteriormente residía en el backend (CRUD, Inventario, etc.)
 */

// Importar SDK de Supabase desde CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Configuración de Supabase
const SUPABASE_URL = 'https://oewtvugakueuqbkmhlpp.supabase.co'
// IMPORTANTE: Use siempre la ANON_KEY para el frontend. RLS ya ha sido configurado.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ld3R2dWdha3VldXFia21obHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2NjEzNzcsImV4cCI6MjA4MTIzNzM3N30.p9jC61u6X9lbo7noqz7DKgweLpnjfzCAL44FH7FwFvI'

// Inicializar cliente
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Objeto de base de datos con funciones de conveniencia
export const db = {
    // --- PRODUCTOS Y CATEGORÍAS ---
    async getProductos() {
        try {
            // 1. Obtener todas las tablas necesarias por separado (Zero Joins Architecture)
            const [prodsRes, catsRes, pricesRes] = await Promise.all([
                supabase.from('productos').select('*').order('nombre'),
                supabase.from('categorias_config').select('*'),
                supabase.from('producto_precios_dinamicos').select('*')
            ]);

            if (prodsRes.error) throw prodsRes.error;
            if (catsRes.error) console.warn('Error cargando categorías para productos:', catsRes.error);
            if (pricesRes.error) console.warn('Error cargando precios dinámicos:', pricesRes.error);

            const prods = prodsRes.data || [];
            const cats = catsRes.data || [];
            const prices = pricesRes.data || [];

            // 2. Unir todo en JavaScript
            return prods.map(p => {
                const categoria = cats.find(c => c.id === p.categoria_id) || null;
                const productPrices = prices.filter(pr => pr.producto_id === p.id);

                return {
                    ...p,
                    categoria: categoria,
                    precios: productPrices,
                    stock_actual: parseFloat(p.stock_actual || 0),
                    stock_minimo: parseFloat(p.stock_minimo || 0)
                };
            });
        } catch (error) {
            console.error('Error in getProductos (Zero Joins):', error);
            throw error;
        }
    },

    async getCategorias() {
        const { data, error } = await supabase
            .from('categorias_config')
            .select('*')
            .order('orden');
        if (error) throw error;
        return data;
    },

    // --- PEDIDOS Y VENTAS ---
    async createPedido(pedidoData) {
        try {
            const { items, ...orderInfo } = pedidoData;

            // 1. Insertar el pedido principal
            const { data: pedido, error: errPedido } = await supabase
                .from('pedidos')
                .insert([orderInfo])
                .select()
                .single();

            if (errPedido) throw errPedido;

            const pedidoId = pedido.id;

            // 2. Insertar los items del detalle y procesar inventario
            if (items && items.length > 0) {
                for (const item of items) {
                    const detalleItem = {
                        pedido_id: pedidoId,
                        producto_id: item.product_id || item.producto_id,
                        tamano_id: item.size_id || item.tamano_id,
                        cantidad: item.quantity || item.cantidad,
                        precio_unitario: item.unit_price || item.precio_unitario,
                        comentarios: item.comentarios || '',
                        adiciones: item.additions || item.adicionales || [],
                        segundo_sabor: item.segundo_sabor || null
                    };

                    const { error: errDetalle } = await supabase
                        .from('detalle_pedido')
                        .insert([detalleItem]);

                    if (errDetalle) console.error('Error al insertar detalle:', errDetalle);

                    // 3. Descontar inventario
                    try {
                        await this.updateStock(detalleItem.producto_id, -detalleItem.cantidad);
                    } catch (invErr) {
                        console.warn('Error al descontar inventario:', invErr);
                    }
                }
            }

            return pedido;
        } catch (error) {
            console.error('Error in createPedido:', error);
            throw error;
        }
    },

    async getPedidos(limit = 50) {
        try {
            // 1. Obtener pedidos y usuarios por separado
            const [pedidosRes, usuariosRes] = await Promise.all([
                supabase.from('pedidos').select('*').order('fecha', { ascending: false }).limit(limit),
                supabase.from('usuarios_domicilio').select('*')
            ]);

            if (pedidosRes.error) throw pedidosRes.error;

            const pedidos = pedidosRes.data || [];
            const usuarios = usuariosRes.data || [];

            // 2. Unir en JavaScript
            return pedidos.map(p => ({
                ...p,
                usuario_domicilio: usuarios.find(u => u.id === p.usuario_domicilio_id) || null
            }));
        } catch (error) {
            console.error('Error in getPedidos (Zero Joins):', error);
            throw error;
        }
    },

    async updateOrderStatus(orderId, newStatus) {
        const { data, error } = await supabase
            .from('pedidos')
            .update({ estado: newStatus })
            .eq('id', orderId)
            .select();

        if (error) throw error;
        return data?.[0];
    },

    // --- USUARIOS ---
    async getUsuarioPorTelefono(telefono) {
        const { data, error } = await supabase
            .from('usuarios_domicilio')
            .select('*')
            .eq('telefono', telefono)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async createUsuarioDomicilio(userData) {
        const { data, error } = await supabase
            .from('usuarios_domicilio')
            .insert([userData])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- INVENTARIO ---
    async updateStock(productId, quantityChange) {
        const { data: product } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', productId)
            .single();

        const currentStock = parseFloat(product?.stock_actual || 0);
        const { error } = await supabase
            .from('productos')
            .update({ stock_actual: currentStock + quantityChange })
            .eq('id', productId);

        if (error) throw error;
        return true;
    },

    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: orders, error } = await supabase
            .from('pedidos')
            .select('total_con_descuento, estado, fecha')
            .gte('fecha', today.toISOString());

        if (error) throw error;

        const { data: stockBajo } = await supabase
            .from('productos')
            .select('id')
            .filter('stock_actual', 'lte', 'stock_minimo');

        const sales = orders.reduce((acc, o) => acc + parseFloat(o.total_con_descuento || 0), 0);

        return {
            today: {
                sales: sales,
                orders_count: orders.length,
                average_order: orders.length > 0 ? sales / orders.length : 0
            },
            inventory: {
                low_stock_total: stockBajo?.length || 0
            },
            orders_by_status: orders.reduce((acc, o) => {
                acc[o.estado] = (acc[o.estado] || 0) + 1;
                return acc;
            }, {})
        };
    },

    // --- ADICIONES Y SABORES ---
    async getSabores(productId) {
        try {
            // 1. Obtener los registros de la tabla intermedia y todos los productos
            const [saboresRes, prodsRes] = await Promise.all([
                supabase.from('producto_sabores').select('*').eq('producto_id', productId).eq('activo', 1).order('orden'),
                supabase.from('productos').select('*')
            ]);

            if (saboresRes.error) throw saboresRes.error;

            const saboresIntermedia = saboresRes.data || [];
            const todosLosProductos = prodsRes.data || [];

            // 2. Unir en JavaScript
            return saboresIntermedia.map(s => {
                const productoSabor = todosLosProductos.find(p => p.id === s.sabor_producto_id);
                if (!productoSabor) return null;
                return {
                    ...productoSabor,
                    sabor_id: s.id,
                    sabor_producto_id: s.sabor_producto_id,
                    orden: s.orden
                };
            }).filter(s => s !== null);
        } catch (error) {
            console.error('Error in getSabores (Zero Joins):', error);
            throw error;
        }
    },

    async getVinculaciones(productId) {
        try {
            // 1. Obtener vinculaciones y todos los productos
            const [vincRes, prodsRes] = await Promise.all([
                supabase.from('producto_vinculaciones').select('*').eq('producto_principal_id', productId).eq('activo', 1).order('orden'),
                supabase.from('productos').select('*')
            ]);

            if (vincRes.error) throw vincRes.error;

            const vinculaciones = vincRes.data || [];
            const todosLosProductos = prodsRes.data || [];

            // 2. Unir en JavaScript
            return vinculaciones.map(v => ({
                ...v,
                producto_adicional_id: v.producto_adicional_id, // Asegurar que esté disponible
                producto_adicional: todosLosProductos.find(p => p.id === v.producto_adicional_id) || null
            }));
        } catch (error) {
            console.error('Error in getVinculaciones (Zero Joins):', error);
            throw error;
        }
    },

    async getGruposAdiciones(productId) {
        const vinculaciones = await this.getVinculaciones(productId);
        const grupos = {};
        vinculaciones.forEach(v => {
            const tipo = v.tipo_vinculacion || 'Adiciones';
            if (!grupos[tipo]) {
                grupos[tipo] = {
                    id: tipo,
                    nombre: tipo.charAt(0).toUpperCase() + tipo.slice(1),
                    tipo: 'opcional',
                    opciones: []
                };
            }
            grupos[tipo].opciones.push({
                id: v.producto_adicional.id,
                nombre: v.producto_adicional.nombre,
                precio_adicional: v.precio_fijo || 0,
                disponible: parseFloat(v.producto_adicional.stock_actual) > 0
            });
        });
        return Object.values(grupos);
    },

    // --- GESTIÓN DE PRECIOS POR ZONA ---
    async getPreciosZonaConfig() {
        const { data, error } = await supabase
            .from('config_precios_zona')
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updatePreciosZonaConfig(config) {
        const { data, error } = await supabase
            .from('config_precios_zona')
            .update(config)
            .eq('id', config.id || 1)
            .select();
        if (error) throw error;
        return data?.[0];
    },

    async getZonasPrecios() {
        const { data, error } = await supabase
            .from('precios_domicilio_zona')
            .select('*')
            .order('municipio')
            .order('barrio');
        if (error) throw error;
        return data;
    },

    async getZonaPrecioById(zonaId) {
        const { data, error } = await supabase
            .from('precios_domicilio_zona')
            .select('*')
            .eq('id', zonaId)
            .single();
        if (error) throw error;
        return data;
    },

    async createZonaPrecio(zona) {
        const { data, error } = await supabase
            .from('precios_domicilio_zona')
            .insert([zona])
            .select();
        if (error) throw error;
        return data?.[0];
    },

    async updateZonaPrecio(zonaId, zona) {
        const { data, error } = await supabase
            .from('precios_domicilio_zona')
            .update(zona)
            .eq('id', zonaId)
            .select();
        if (error) throw error;
        return data?.[0];
    },

    async deleteZonaPrecio(zonaId) {
        const { error } = await supabase
            .from('precios_domicilio_zona')
            .delete()
            .eq('id', zonaId);
        if (error) throw error;
        return true;
    }
};

// Exponer globalmente para scripts que no son módulos
window.db = db;
window.supabase = supabase;
window.supabaseClient = db;
