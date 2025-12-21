/**
 * Gestión de Precios de Domicilio por Zona
 * Sistema para configurar precios según municipio y barrio
 */

let zonasPrecios = [];
let configuracion = null;

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('modal-precios-zona')) {
        inicializarGestionPrecios();
    }
});

function inicializarGestionPrecios() {
    cargarConfiguracion();
    cargarZonasPrecios();

    // Event listeners
    document.getElementById('btn-agregar-zona')?.addEventListener('click', mostrarModalNuevaZona);
    document.getElementById('btn-guardar-zona')?.addEventListener('click', guardarZona);
    document.getElementById('btn-guardar-config')?.addEventListener('click', guardarConfiguracion);
}

// ==================== CARGAR DATOS ====================

async function cargarConfiguracion() {
    try {
        if (!window.supabaseClient) return;
        const data = await window.supabaseClient.getPreciosZonaConfig();
        configuracion = data;
        mostrarConfiguracion();
    } catch (error) {
        console.error('Error cargando configuración:', error);
        mostrarNotificacion('Error al cargar configuración', 'error');
    }
}

async function cargarZonasPrecios() {
    try {
        if (!window.supabaseClient) return;
        const data = await window.supabaseClient.getZonasPrecios();
        zonasPrecios = data;
        renderizarTablaZonas();
    } catch (error) {
        console.error('Error cargando zonas:', error);
        mostrarNotificacion('Error al cargar zonas de precio', 'error');
    }
}

// ==================== RENDERIZAR ====================

function mostrarConfiguracion() {
    if (!configuracion) return;

    document.getElementById('precio-default').value = configuracion.precio_default;
    document.getElementById('usar-precios-zona').checked = configuracion.usar_precios_zona;

    // Actualizar estado visual
    const estadoTexto = document.getElementById('estado-sistema');
    if (estadoTexto) {
        if (configuracion.usar_precios_zona) {
            estadoTexto.textContent = '✅ Sistema de precios por zona ACTIVO';
            estadoTexto.className = 'text-green-600 font-semibold';
        } else {
            estadoTexto.textContent = '⚠️ Usando precio fijo ($' + formatPrice(configuracion.precio_default) + ')';
            estadoTexto.className = 'text-orange-600 font-semibold';
        }
    }
}

function renderizarTablaZonas() {
    const tbody = document.getElementById('tabla-zonas-body');
    if (!tbody) return;

    if (zonasPrecios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    <i class="fas fa-map-marked-alt text-4xl mb-2"></i>
                    <p>No hay zonas configuradas</p>
                    <button onclick="mostrarModalNuevaZona()" 
                            class="mt-2 text-blue-600 hover:underline">
                        Agregar primera zona
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    // Agrupar por municipio
    const zonasPorMunicipio = {};
    zonasPrecios.forEach(zona => {
        if (!zonasPorMunicipio[zona.municipio]) {
            zonasPorMunicipio[zona.municipio] = [];
        }
        zonasPorMunicipio[zona.municipio].push(zona);
    });

    tbody.innerHTML = '';

    Object.keys(zonasPorMunicipio).sort().forEach(municipio => {
        const zonas = zonasPorMunicipio[municipio];

        zonas.forEach((zona, index) => {
            const tr = document.createElement('tr');
            tr.className = zona.activo ? 'hover:bg-slate-700' : 'bg-slate-900 opacity-60';

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    ${index === 0 ? `<span class="font-semibold text-white">${zona.municipio}</span>` : ''}
                </td>
                <td class="px-6 py-4">
                    ${zona.barrio ?
                    `<span class="text-white">${zona.barrio}</span>` :
                    `<span class="text-gray-400 italic">Todos los barrios</span>`
                }
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-lg font-bold text-green-400">$${formatPrice(zona.precio)}</span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-300">
                    ${zona.observaciones || '—'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editarZona(${zona.id})" 
                            class="text-blue-400 hover:text-blue-300 mr-3">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="eliminarZona(${zona.id})" 
                            class="text-red-400 hover:text-red-300">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    });
}

// ==================== MODAL NUEVA/EDITAR ZONA ====================

function mostrarModalNuevaZona() {
    const modal = document.getElementById('modal-zona');
    const titulo = document.getElementById('modal-zona-titulo');
    const form = document.getElementById('form-zona');

    titulo.textContent = 'Nueva Zona de Precio';
    form.reset();
    form.dataset.zonaId = '';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function editarZona(zonaId) {
    try {
        if (!window.supabaseClient) return;
        const zona = await window.supabaseClient.getZonaPrecioById(zonaId);

        if (zona) {
            const modal = document.getElementById('modal-zona');
            const titulo = document.getElementById('modal-zona-titulo');
            const form = document.getElementById('form-zona');

            titulo.textContent = 'Editar Zona de Precio';
            form.dataset.zonaId = zonaId;

            document.getElementById('zona-municipio').value = zona.municipio;
            document.getElementById('zona-barrio').value = zona.barrio || '';
            document.getElementById('zona-precio').value = zona.precio;
            document.getElementById('zona-observaciones').value = zona.observaciones || '';
            document.getElementById('zona-activo').checked = (zona.activo == 1 || zona.activo === true);

            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    } catch (error) {
        console.error('Error cargando zona:', error);
        mostrarNotificacion('Error al cargar datos de la zona', 'error');
    }
}

function cerrarModalZona() {
    const modal = document.getElementById('modal-zona');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function guardarZona() {
    const form = document.getElementById('form-zona');
    const zonaId = form.dataset.zonaId;

    const datos = {
        municipio: document.getElementById('zona-municipio').value.trim(),
        barrio: document.getElementById('zona-barrio').value.trim() || null,
        precio: parseInt(document.getElementById('zona-precio').value),
        observaciones: document.getElementById('zona-observaciones').value.trim(),
        activo: document.getElementById('zona-activo')?.checked ? 1 : 0
    };

    // Validaciones
    if (!datos.municipio) {
        mostrarNotificacion('El municipio es requerido', 'warning');
        return;
    }

    if (isNaN(datos.precio) || datos.precio < 0) {
        mostrarNotificacion('El precio debe ser un valor válido', 'warning');
        return;
    }

    try {
        if (!window.supabaseClient) return;

        if (zonaId) {
            await window.supabaseClient.updateZonaPrecio(zonaId, datos);
            mostrarNotificacion('Zona actualizada correctamente', 'success');
        } else {
            await window.supabaseClient.createZonaPrecio(datos);
            mostrarNotificacion('Zona creada correctamente', 'success');
        }

        cerrarModalZona();
        cargarZonasPrecios();
    } catch (error) {
        console.error('Error guardando zona:', error);
        mostrarNotificacion('Error al guardar la zona', 'error');
    }
}

async function eliminarZona(zonaId) {
    if (!confirm('¿Estás seguro de eliminar esta zona de precio?')) {
        return;
    }

    try {
        if (!window.supabaseClient) return;
        await window.supabaseClient.deleteZonaPrecio(zonaId);
        mostrarNotificacion('Zona eliminada correctamente', 'success');
        cargarZonasPrecios();
    } catch (error) {
        console.error('Error eliminando zona:', error);
        mostrarNotificacion('Error al eliminar la zona', 'error');
    }
}

// ==================== CONFIGURACIÓN ====================

async function guardarConfiguracion() {
    const datos = {
        id: configuracion?.id || 1,
        precio_default: parseInt(document.getElementById('precio-default').value),
        usar_precios_zona: document.getElementById('usar-precios-zona').checked ? 1 : 0
    };

    if (isNaN(datos.precio_default) || datos.precio_default < 0) {
        mostrarNotificacion('El precio por defecto debe ser un valor válido', 'warning');
        return;
    }

    try {
        if (!window.supabaseClient) return;
        const data = await window.supabaseClient.updatePreciosZonaConfig(datos);
        configuracion = data || datos;
        mostrarConfiguracion();
        mostrarNotificacion('Configuración guardada correctamente', 'success');
    } catch (error) {
        console.error('Error guardando configuración:', error);
        mostrarNotificacion('Error al guardar la configuración', 'error');
    }
}

// ==================== UTILIDADES ====================

function formatPrice(value) {
    return new Intl.NumberFormat('es-CO').format(value);
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Reusar la función de notificaciones existente
    if (typeof showNotification === 'function') {
        showNotification(mensaje, tipo);
    } else if (typeof mostrarNotificacionRapida === 'function') {
        mostrarNotificacionRapida(mensaje, tipo);
    } else {
        alert(mensaje);
    }
}


