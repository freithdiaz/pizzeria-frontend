// Fallback para notificaciones si notifications.js no está cargado
if (typeof window.mostrarNotificacionRapida !== 'function') {
    window.mostrarNotificacionRapida = function (mensaje, tipo = 'info') {
        console.log(`[Notification] ${tipo.toUpperCase()}: ${mensaje}`);
        const div = document.createElement('div');
        div.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl z-[9999] transition-all duration-300 text-white font-semibold ${tipo === 'error' ? 'bg-red-600' : (tipo === 'warning' ? 'bg-orange-500' : 'bg-green-600')}`;
        div.style.zIndex = "10000";
        div.textContent = mensaje;
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            setTimeout(() => div.remove(), 300);
        }, 3000);
    };
}

// Fallback para formatPrice si no está definido
if (typeof window.formatPrice !== 'function') {
    window.formatPrice = function (price) {
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        return Math.round(numPrice || 0).toLocaleString('es-CO');
    };
}

// Estado global
let productos = [];
let categorias = [];
let carrito = [];
let productoActual = null;
let adicionesSeleccionadas = {};
let preciosOpciones = {}; // Guardar precios de opciones para cálculo rápido
let clienteActual = null; // Guardar datos del cliente buscado

function cerrarModalExito() {
    const modal = document.getElementById('modal-exito-pedido');
    const content = document.getElementById('modal-exito-content');

    if (content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
    }

    setTimeout(() => {
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        }
    }, 300);
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
});

async function inicializarApp() {
    // Esperar a que db esté disponible (supabase-client.js se carga como módulo)
    let retries = 0;
    while (typeof db === 'undefined' && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }

    await cargarCategorias();
    await cargarProductos();
    actualizarContadorCarrito();

    // Inicializar precio de domicilio
    window.precioDomicilio = 3000; // Valor por defecto

    // Intentar cargar precio desde localStorage
    try {
        const precioGuardado = localStorage.getItem('precio_domicilio');
        if (precioGuardado) {
            window.precioDomicilio = parseFloat(precioGuardado);
            console.log('Precio de domicilio cargado desde localStorage:', window.precioDomicilio);
        } else {
            console.log('No hay precio guardado, usando valor por defecto:', window.precioDomicilio);
        }
    } catch (e) {
        console.log('Error cargando precio desde localStorage:', e);
    }

    // Escuchar mensajes del admin para actualizar precio
    window.addEventListener('message', (event) => {
        if (event.data.type === 'actualizar_precio_domicilio') {
            actualizarPrecioDomicilio(event.data.precio);
        }
    });

    // También escuchar eventos personalizados
    window.addEventListener('precioDomicilioActualizado', (event) => {
        actualizarPrecioDomicilio(event.detail.precio);
    });

    // Función para actualizar precio de domicilio
    function actualizarPrecioDomicilio(nuevoPrecio) {
        const precioAnterior = window.precioDomicilio;
        window.precioDomicilio = nuevoPrecio;
        console.log('Precio de domicilio actualizado:', precioAnterior, '->', window.precioDomicilio);

        // Guardar en localStorage
        try {
            localStorage.setItem('precio_dom_supabase', window.precioDomicilio.toString());
        } catch (e) {
            console.log('Error guardando en localStorage:', e);
        }

        // Forzar actualización del carrito incluso si no está visible
        setTimeout(() => {
            renderizarCarrito();
        }, 100);

        // Mostrar notificación de actualización
        if (typeof mostrarNotificacionRapida === 'function') {
            mostrarNotificacionRapida(`Precio de domicilio actualizado: $${formatPrice(window.precioDomicilio)}`, 'info');
        }
    }
};

// ==================== CARGAR DATOS ====================

async function cargarCategorias() {
    try {
        const data = await db.getCategorias();
        categorias = data || [];
        // Filtrar solo categorías activas y visibles en el menú público
        categorias = categorias.filter(cat => (cat.activo === 1 || cat.activo === true) && (cat.visible_en_publico === 1 || cat.visible_en_publico === true || cat.visible_en_publico === undefined));
        renderizarCategorias();

        try {
            const defaultCat = categorias.find(c => c.default_en_domicilio === 1 || c.default_en_domicilio === true);
            if (defaultCat) {
                setTimeout(() => filtrarPorCategoria(defaultCat.id), 100);
            }
        } catch (e) { }
    } catch (error) {
        console.error('Error cargando categorías de Supabase:', error);
        const container = document.getElementById('categorias-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2 text-red-400"></i>
                    <p class="text-sm">Error al cargar categorías</p>
                </div>
            `;
        }
    }
}

async function cargarProductos() {
    try {
        const data = await db.getProductos();
        productos = data || [];
        console.log('Productos cargados de Supabase:', productos);
        renderizarProductos();
    } catch (error) {
        console.error('Error cargando productos de Supabase:', error);
        const container = document.getElementById('productos-container');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-6xl mb-4 text-red-400"></i>
                    <h3 class="text-xl font-semibold mb-2">Error al cargar productos</h3>
                    <p class="text-gray-600 mb-4">Ha ocurrido un error al cargar los productos. Por favor intenta recargar la página.</p>
                    <button onclick="location.reload()" class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
                        Recargar página
                    </button>
                </div>
            `;
        }
    }
}

// ==================== RENDERIZADO ====================

// ==================== RENDERIZADO ====================

function renderizarCategorias() {
    const container = document.getElementById('categorias-container');
    // Mostrar Ãºnicamente las categorÃ­as creadas (sin botÃ³n "Todas")
    container.innerHTML = `${categorias.map(cat => `
            <button
                onclick="filtrarPorCategoria(${cat.id})"
                class="px-3 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold hover:border-red-600 hover:text-red-600 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex flex-col items-center justify-center text-center gap-1 min-h-[80px]"
                title="${cat.descripcion || cat.nombre}"
            >
                <i class="${cat.icono || 'fas fa-tag'} text-xl"></i>
                <span class="text-xs sm:text-sm leading-tight break-words w-full">${cat.nombre}</span>
            </button>
        `).join('')
        } `;
}

function renderizarProductos(filtro = null) {
    const container = document.getElementById('productos-container');
    const titulo = document.getElementById('productos-titulo');
    const contador = document.getElementById('productos-contador');

    let productosFiltrados = productos;

    if (filtro) {
        // Obtener la categorÃ­a seleccionada
        const categoriaSeleccionada = categorias.find(c => c.id === filtro);

        // Filtrar productos por categorÃ­a seleccionada
        productosFiltrados = productos.filter(p => p.categoria_id === filtro);

        // Si la categorÃ­a tiene categorÃ­as compatibles, incluir tambiÃ©n esos productos
        if (categoriaSeleccionada && categoriaSeleccionada.categorias_compatibles && categoriaSeleccionada.categorias_compatibles.length > 0) {
            // Obtener productos de categorÃ­as compatibles
            const productosCompatibles = productos.filter(p =>
                categoriaSeleccionada.categorias_compatibles.includes(p.categoria_id) &&
                !productosFiltrados.some(pf => pf.id === p.id)
            );

            // Agregar productos compatibles al filtro
            productosFiltrados = [...productosFiltrados, ...productosCompatibles];
        }

        const categoriaNombre = categoriaSeleccionada?.nombre || 'Categoría';
        titulo.textContent = categoriaNombre;
    } else {
        titulo.textContent = 'Nuestros Productos';
    }

    // Actualizar contador
    contador.textContent = `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''} disponible${productosFiltrados.length !== 1 ? 's' : ''} `;

    if (productosFiltrados.length === 0) {
        container.innerHTML = `
                <div class="col-span-full text-center py-16 text-gray-500">
                    <i class="fas fa-search text-6xl mb-4 text-gray-300"></i>
                    <h3 class="text-xl font-semibold mb-2">No se encontraron productos</h3>
                    <p class="text-gray-600">Intenta con otra categoría o limpia la búsqueda</p>
                    <button onclick="filtrarPorCategoria(null)" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
                        Ver todos los productos
                    </button>
                </div>
            `;
        return;
    }

    container.innerHTML = productosFiltrados.map(producto => {
        // Obtener información de la categoría del producto
        const categoriaProducto = categorias.find(c => c.id === producto.categoria_id);
        const nombreCategoria = categoriaProducto ? categoriaProducto.nombre : '';
        const esAdicion = categoriaProducto && categoriaProducto.es_adicion;

        // NO mostrar precios en el menú principal - solo "Personalizar"
        return `
            <div class="product-card" onclick="abrirModalProducto(${producto.id})">
                <div class="relative product-image-wrapper">
                    ${producto.imagen_url ? `
                        <img src="${producto.imagen_url}" alt="${producto.nombre}" loading="lazy" decoding="async">
                    ` : `
                        <div class="product-image-placeholder">
                            <i class="fas fa-pizza-slice"></i>
                            <span style="font-size: 0.75rem; margin-top: 0.25rem;">Sin imagen</span>
                        </div>
                    `}
                    <!-- Badges/Etiquetas -->
                    ${nombreCategoria ? `
                        <span class="product-badge badge-category" title="${nombreCategoria}">
                            ${nombreCategoria}
                        </span>
                    ` : ''}
                    ${esAdicion ? `
                        <span class="product-badge badge-addition">
                            <i class="fas fa-plus-circle"></i> Adición
                        </span>
                    ` : ''}
                    ${producto.permite_dos_sabores ? `
                        <span class="product-badge badge-time">
                            <i class="fas fa-star"></i> 2 Sabores
                        </span>
                    ` : `
                        <span class="product-badge badge-time">
                            <i class="fas fa-clock"></i> 15-20min
                        </span>
                    `}
                </div>
                <div class="product-info">
                    <div>
                        <h3>${producto.nombre}</h3>
                        ${producto.descripcion ? `<p>${producto.descripcion}</p>` : ''}
                    </div>
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 0.875rem; color: #6b7280;">
                                ${producto.precios && producto.precios.length > 0 ? `Desde <strong style="color: #1f2937;">$${formatPrice(Math.min(...producto.precios.map(p => p.precio || 0)))}</strong>` : 'Personalizar'}
                            </span>
                            <button style="background: #dc2626; color: white; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem;" class="btn-agregar" title="Agregar al carrito">
                                <i class="fas fa-plus"></i>
                                <span>Agregar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            `;
    }).join('');
}


// ==================== MODAL DE PRODUCTO ====================

async function abrirModalProducto(productoId) {
    productoActual = productos.find(p => p.id === productoId);
    if (!productoActual) return;

    // Resetear estado
    adicionesSeleccionadas = {};
    preciosOpciones = {}; // Resetear precios de opciones
    document.getElementById('modal-cantidad').textContent = '1';
    document.getElementById('modal-comentarios').value = '';

    // Llenar información básica
    const nombreEl = document.getElementById('modal-producto-nombre');
    const descripcionEl = document.getElementById('modal-producto-descripcion');
    const precioEl = document.getElementById('modal-producto-precio');

    if (nombreEl) nombreEl.textContent = productoActual.nombre;
    if (descripcionEl) descripcionEl.textContent = productoActual.descripcion || '';

    // NO mostrar precio base - se calcula dinámicamente
    if (precioEl) precioEl.textContent = 'Calculando...';

    // Imagen
    const imagenContainer = document.getElementById('modal-producto-imagen');
    if (productoActual.imagen_url) {
        imagenContainer.innerHTML = `<img src="${productoActual.imagen_url}" alt="${productoActual.nombre}" class="w-full h-64 object-cover rounded-lg">`;
    } else {
        imagenContainer.innerHTML = '';
    }

    // Cargar grupos de adiciones y vinculaciones desde Supabase
    await cargarGruposAdiciones(productoId);

    // Mostrar sección de dos sabores si el producto lo permite
    if (typeof mostrarSeccionDosSabores === 'function') {
        await mostrarSeccionDosSabores(productoActual);
    }

    // Mostrar selector rápido para pizzas populares
    mostrarSelectorRapido(productoActual);

    // Calcular total inicial
    calcularTotalModal();

    // Mostrar modal
    document.getElementById('producto-modal').classList.add('active');

    // Mostrar botones rápidos de adiciones DESPUÉS de que se carguen los grupos
    // Esto se hace con un pequeño delay para asegurar que los grupos estén cargados
    setTimeout(() => {
        mostrarBotonesRapidosAdiciones(productoActual);
    }, 500);
}

// Nueva función para cargar grupos de bebidas dinámicos
async function cargarGruposBebidas(productoId) {
    try {
        const grupos = await db.getGruposBebidas(productoId);
        return grupos || [];
    } catch (error) {
        console.error('Error cargando grupos de bebidas de Supabase:', error);
        return [];
    }
}

async function cargarGruposAdiciones(productoId) {
    try {
        // Usar los grupos que ya vienen procesados de db.getGruposAdiciones
        const todosLosGrupos = await db.getGruposAdiciones(productoId);

        // Normalizar estructura de grupos para que todos tengan {grupo, opciones}
        let gruposNormalizados = (todosLosGrupos || []).map(item => {
            // Si ya tiene la estructura {grupo, opciones}, mantenerla
            if (item.grupo && item.opciones !== undefined) {
                return item;
            }
            // Si es un grupo plano (grupos de bebidas), envolver en estructura estándar
            else {
                return {
                    grupo: {
                        id: item.id,
                        nombre: item.nombre,
                        descripcion: item.descripcion,
                        tipo: item.tipo,
                        minimo: item.minimo || 0,
                        maximo: item.maximo || 1,
                        orden: item.orden || 0,
                        activo: item.activo !== false,
                        es_dinamico: item.es_dinamico || false
                    },
                    opciones: item.opciones || []
                };
            }
        });

        // INYECTAR GRUPO DE TAMAÑOS SI EXISTEN PRECIOS DINÁMICOS
        if (productoActual.precios && productoActual.precios.length > 0) {
            // Verificar si ya existe un grupo de tipo tamano
            const tieneTamano = gruposNormalizados.some(g => g.grupo.tipo === 'tamano' || g.grupo.nombre.toLowerCase().includes('tamañ') || g.grupo.nombre.toLowerCase().includes('taman'));
            if (!tieneTamano) {
                console.log('🔍 Inyectando grupo de tamaños desde productoActual.precios');
                gruposNormalizados.unshift({
                    grupo: {
                        id: 'tamano',
                        nombre: 'Selecciona el Tamaño',
                        tipo: 'tamano',
                        minimo: 1,
                        maximo: 1,
                        orden: -1 // Siempre de primero
                    },
                    opciones: productoActual.precios.map(p => ({
                        id: p.id,
                        nombre: p.tamano_nombre,
                        precio_adicional: parseFloat(p.precio) || 0,
                        disponible: true
                    }))
                });
            }
        }

        const container = document.getElementById('modal-grupos-adiciones');

        if (gruposNormalizados.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Este producto no tiene opciones adicionales disponibles.</p>';
            return;
        }

        // Agregar precios de bebidas dinámicas a productoActual.precios
        if (!productoActual.precios) {
            productoActual.precios = [];
        }

        gruposNormalizados.forEach(grupoData => {
            if (grupoData.opciones && grupoData.opciones.length > 0) {
                grupoData.opciones.forEach(opcion => {
                    // Si la opción tiene precio_adicional y no está ya en productoActual.precios
                    if (opcion.precio_adicional > 0) {
                        const precioExistente = productoActual.precios.find(p => String(p.id) === String(opcion.id));
                        if (!precioExistente) {
                            productoActual.precios.push({
                                id: opcion.id,
                                tamano_nombre: opcion.nombre,
                                precio: opcion.precio_adicional,
                                valor_numerico: null,
                                descripcion: opcion.descripcion || null
                            });
                        }
                    }
                });
            }
        });

        container.innerHTML = gruposNormalizados.map(({ grupo, opciones }) => {
            const esObligatorio = grupo.minimo > 0;
            const esTamano = grupo.tipo === 'tamano';
            const esSegundoSabor = grupo.tipo === 'segundo_sabor';
            const esBorde = grupo.nombre && grupo.nombre.toLowerCase().includes('borde');
            const esBebida = grupo.tipo && grupo.tipo.startsWith('bebida_');

            return `
            <div class="mb-4">
                    <!-- Cabecera del grupo colapsable -->
                    <div class="flex justify-between items-center mb-2 cursor-pointer"
                          onclick="toggleGrupo('${grupo.id}')">
                        <div>
                            <h4 class="font-bold text-base">${grupo.nombre}</h4>
                            <p class="text-xs text-gray-500">
                                ${grupo.descripcion || ''}
                                ${esObligatorio ? '· Seleccione mínimo 1 opción' : '· Seleccione hasta ' + grupo.maximo + ' opción(es)'}
                                ${esBebida ? '· Generado dinámicamente' : ''}
                            </p>
                        </div>
                        ${esObligatorio ?
                    '<span class="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Obligatorio</span>' :
                    `<i class="fas fa-chevron-down text-gray-400" id="icon-grupo-${grupo.id}"></i>`
                }
                    </div>

                    <!-- Contenido del grupo -->
            <div id="grupo-${grupo.id}" class="${esObligatorio || esBorde || esSegundoSabor ? '' : 'hidden'}" data-obligatorio="${esObligatorio}">
                <div class="space-y-2 pl-2">
                    ${opciones.map(opcion => {
                    if (esTamano) {
                        // Diseño especial para tamaños (radio buttons)
                        return `
                                        <label class="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-red-300 transition">
                                            <div class="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="grupo-${grupo.id}"
                                                    value="${opcion.id}"
                                                    class="w-5 h-5 text-red-600"
                                                    onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${grupo.maximo}, event, ${esTamano})"
                                                >
                                                <div>
                                                    <div class="font-semibold">${opcion.nombre}</div>
                                                    ${opcion.descripcion ? `<div class="text-xs text-gray-500">${opcion.descripcion}</div>` : ''}
                                                </div>
                                            </div>
                                            <span class="text-lg font-bold text-red-600">$${formatPrice(opcion.precio_adicional)}</span>
                                        </label>
                                    `;
                    } else if (esSegundoSabor) {
                        // Diseño para segundo sabor (checkboxes de sabores)
                        return `
                                        <label class="flex items-center p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                            <input
                                                type="checkbox"
                                                name="grupo-${grupo.id}"
                                                value="${opcion.id}"
                                                class="w-4 h-4 text-red-600 mr-3"
                                                onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${grupo.maximo}, event, false)"
                                            >
                                            <span class="font-medium">${opcion.nombre}</span>
                                        </label>
                                    `;
                    } else {
                        // Diseño genérico para otras adiciones (bebidas, bordes, etc.) - SIEMPRE CHECKBOXES PARA BEBIDAS
                        const esBebidaGrupo = grupo.nombre && (grupo.nombre.toLowerCase().includes('bebida') || grupo.nombre.toLowerCase().includes('gaseosa') || grupo.nombre.toLowerCase().includes('jugo') || grupo.nombre.toLowerCase().includes('limonada'));
                        const inputType = esBebidaGrupo ? 'checkbox' : (grupo.maximo === 1 ? 'radio' : 'checkbox');

                        return `
                                        <label class="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                            <div class="flex items-center gap-3">
                                                <input
                                                    type="${inputType}"
                                                    name="grupo-${grupo.id}"
                                                    value="${opcion.id}"
                                                    class="w-4 h-4 text-red-600"
                                                    onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${esBebidaGrupo ? 99 : grupo.maximo}, event, false)"
                                                >
                                                <div>
                                                    <div class="font-medium text-sm">${opcion.nombre}</div>
                                                    ${opcion.descripcion ? `<div class="text-xs text-gray-500">${opcion.descripcion}</div>` : ''}
                                                </div>
                                            </div>
                                            ${opcion.precio_adicional > 0 ? `
                                                <span class="text-green-600 font-semibold text-sm">+ $${formatPrice(opcion.precio_adicional)}</span>
                                            ` : ''}
                                        </label>
                                    `;
                    }
                }).join('')}
                </div>
            </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error cargando adiciones:', error);
        const container = document.getElementById('modal-grupos-adiciones');
        container.innerHTML = '<p class="text-red-500 text-sm text-center py-4">Error al cargar las opciones adicionales. Intenta recargar el producto.</p>';
    }
}

// Nueva función para toggle de grupos colapsables
function toggleGrupo(grupoId) {
    const contenido = document.getElementById(`grupo-${grupoId}`);
    const icono = document.getElementById(`icon-grupo-${grupoId}`);

    if (contenido) {
        contenido.classList.toggle('hidden');
        if (icono) {
            icono.classList.toggle('fa-chevron-down');
            icono.classList.toggle('fa-chevron-up');
        }
    }
}

// Función actualizada para seleccionar opciones
function seleccionarOpcion(grupoId, opcionId, maxSelecciones, event, isTamano = false) {
    const input = event.target;

    if (!adicionesSeleccionadas[grupoId]) {
        adicionesSeleccionadas[grupoId] = [];
    }

    // Convertir opcionId a string si es necesario para comparación consistente
    const opcionIdStr = opcionId.toString();

    if (maxSelecciones === 1) {
        // Radio button - solo uno
        adicionesSeleccionadas[grupoId] = input.checked ? [opcionIdStr] : [];
        if (isTamano) adicionesSeleccionadas['tamano'] = adicionesSeleccionadas[grupoId];
    } else {
        // Checkbox - múltiples hasta el máximo
        const index = adicionesSeleccionadas[grupoId].indexOf(opcionIdStr);

        if (input.checked) {
            if (adicionesSeleccionadas[grupoId].length < maxSelecciones) {
                if (index === -1) {
                    adicionesSeleccionadas[grupoId].push(opcionIdStr);
                }
            } else {
                input.checked = false;
                alert(`Solo puedes seleccionar hasta ${maxSelecciones} opción(es) de este grupo`);
            }
        } else {
            if (index > -1) {
                adicionesSeleccionadas[grupoId].splice(index, 1);
            }
        }
    }

    // Recalcular total
    calcularTotalModal();
}

function cambiarCantidad(cambio) {
    const cantidadEl = document.getElementById('modal-cantidad');
    let cantidad = parseInt(cantidadEl.textContent);
    cantidad = Math.max(1, cantidad + cambio);
    cantidadEl.textContent = cantidad;
    calcularTotalModal();
}

function calcularTotalModal() {
    if (!productoActual) return;

    // Obtener precio base dinámico basado en selecciones
    let precioBase = 0;

    // Si hay tamaños seleccionados, usar el precio del tamaño
    let tamanoSeleccionado = adicionesSeleccionadas['tamano'] || adicionesSeleccionadas['tamaño'];

    // Si no se encuentra por nombre fijo, buscar qué grupo tiene el tipo 'tamano' en el DOM
    if (!tamanoSeleccionado || tamanoSeleccionado.length === 0) {
        // Buscar el input que tenga el último argumento como 'true' (que es isTamano)
        const inputTamano = document.querySelector('input[name^="grupo-"][onchange*="true"]:checked') ||
            document.querySelector('input[name="grupo-tamano"]:checked') ||
            document.querySelector('input[name="grupo-tamaño"]:checked');

        if (inputTamano) {
            const tamanoId = inputTamano.value;
            tamanoSeleccionado = [tamanoId];
            console.log('🔍 calcularTotalModal - Tamaño detectado desde DOM:', tamanoId);
        }
    }

    console.log('🔍 calcularTotalModal - Tamaño seleccionado:', tamanoSeleccionado);

    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        // Buscar el precio correspondiente en productoActual.precios usando el ID del tamaño seleccionado
        const tamanoId = tamanoSeleccionado[0];
        console.log('🔍 calcularTotalModal - Buscando precio para tamaño ID:', tamanoId);
        console.log('🔍 calcularTotalModal - Precios disponibles:', productoActual?.precios);

        if (productoActual.precios) {
            const precioEncontrado = productoActual.precios.find(p => p.id == tamanoId);
            if (precioEncontrado) {
                precioBase = parseFloat(precioEncontrado.precio) || 0;
            }
        }

        if (precioBase === 0) {
            const inputTamano = document.querySelector(`input[name="grupo-tamano"][value="${tamanoId}"]:checked`) ||
                document.querySelector(`input[name="grupo-tamaño"][value="${tamanoId}"]:checked`);
            if (inputTamano) {
                const label = inputTamano.closest('label');
                if (label) {
                    const precioElement = label.querySelector('.text-red-600, .text-lg');
                    if (precioElement) {
                        const precioTexto = precioElement.textContent;
                        precioBase = parseInt(precioTexto.replace(/[^0-9]/g, '')) || 0;
                    }
                }
            }
        }
    }

    // Si no hay tamaÃ±o seleccionado pero el producto tiene precios dinÃ¡micos, usar el mÃ¡s bajo
    if (precioBase === 0 && productoActual.precios && productoActual.precios.length > 0) {
        precioBase = Math.min(...productoActual.precios.map(p => parseFloat(p.precio) || 0));
    }

    // Si aún no hay precio base, usar precio_base del producto
    if (precioBase === 0) {
        precioBase = parseFloat(productoActual.precio_base) || parseFloat(productoActual.precio_venta) || 0;
    }

    let precioAdicionales = 0;

    // Sumar precios de adiciones seleccionadas (excluyendo tamaños ya que están en precioBase)
    for (const grupoId in adicionesSeleccionadas) {
        if (grupoId === 'tamano' || grupoId === 'tamaño') continue;

        adicionesSeleccionadas[grupoId].forEach(opcionId => {
            const input = document.querySelector(`input[name="grupo-${grupoId}"][value="${opcionId}"]:checked`);

            if (input) {
                const label = input.closest('label');

                if (label) {
                    if (productoActual && productoActual.precios) {
                        const precioDinamico = productoActual.precios.find(p => String(p.id) === String(opcionId));
                        if (precioDinamico && parseFloat(precioDinamico.precio) > 0) {
                            precioAdicionales += parseFloat(precioDinamico.precio) || 0;
                        }
                    }

                    // Si no encontró precio en precios dinámicos, buscar en el DOM
                    if (precioAdicionales === 0 || (productoActual.precios && !productoActual.precios.some(p => String(p.id) === String(opcionId)))) {
                        const precioData = input.getAttribute('data-precio');
                        if (precioData) {
                            const precio = parseFloat(precioData);
                            if (!isNaN(precio)) precioAdicionales += precio;
                        } else {
                            const precioElements = label.querySelectorAll('*');
                            for (const el of precioElements) {
                                const text = el.textContent || '';
                                const precioMatch = text.match(/\$(\d+)/);
                                if (precioMatch) {
                                    const precio = parseInt(precioMatch[1]);
                                    if (!isNaN(precio)) {
                                        precioAdicionales += precio;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    const cantidad = parseInt(document.getElementById('modal-cantidad').textContent);
    const precioUnitario = precioBase + precioAdicionales;
    const total = precioUnitario * cantidad;

    const totalEl = document.getElementById('modal-total');
    const precioUnitarioEl = document.getElementById('modal-producto-precio');

    if (totalEl) totalEl.textContent = `${formatPrice(total)}`;
    if (precioUnitarioEl) precioUnitarioEl.textContent = `$${formatPrice(precioUnitario)}`;
}

function cerrarModalProducto() {
    document.getElementById('producto-modal').classList.remove('active');
    productoActual = null;
    adicionesSeleccionadas = {};

    if (typeof resetearDosSabores === 'function') {
        resetearDosSabores();
    }
}

function agregarAlCarrito() {
    if (!productoActual) return;

    // Validar que se hayan seleccionado las opciones obligatorias
    const gruposObligatorios = document.querySelectorAll('[data-obligatorio="true"]');
    let opcionesFaltantes = [];

    gruposObligatorios.forEach(grupo => {
        const grupoId = grupo.id.replace('grupo-', '');
        if (!adicionesSeleccionadas[grupoId] || adicionesSeleccionadas[grupoId].length === 0) {
            const nombreGrupo = grupo.querySelector('h4')?.textContent || `Grupo ${grupoId}`;
            opcionesFaltantes.push(nombreGrupo);
        }
    });

    if (opcionesFaltantes.length > 0) {
        alert(`Por favor selecciona opciones para: ${opcionesFaltantes.join(', ')}`);
        return;
    }

    // Validar tamaño si es necesario
    const tamanoInputs = document.querySelectorAll('input[name="grupo-tamano"], input[name="grupo-tamaño"]');
    if (tamanoInputs.length > 0) {
        const tamanoSeleccionado = document.querySelector('input[name="grupo-tamano"]:checked, input[name="grupo-tamaño"]:checked');
        if (!tamanoSeleccionado) {
            alert('Por favor selecciona un tamaño para tu producto.');
            return;
        }
    }

    const cantidad = parseInt(document.getElementById('modal-cantidad').textContent);
    const comentarios = document.getElementById('modal-comentarios').value;

    let precioBase = 0;
    const tamanoSeleccionado = adicionesSeleccionadas['tamano'] || adicionesSeleccionadas['tamaño'];

    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        const tamanoId = tamanoSeleccionado[0];
        if (productoActual.precios) {
            const precioEncontrado = productoActual.precios.find(p => p.id == tamanoId);
            if (precioEncontrado) precioBase = parseFloat(precioEncontrado.precio) || 0;
        }

        if (precioBase === 0) {
            const inputTamano = document.querySelector(`input[name="grupo-tamano"][value="${tamanoId}"]:checked`) ||
                document.querySelector(`input[name="grupo-tamaño"][value="${tamanoId}"]:checked`);
            if (inputTamano) {
                const label = inputTamano.closest('label');
                if (label) {
                    const precioElement = label.querySelector('.text-red-600, .text-lg');
                    if (precioElement) {
                        const precioTexto = precioElement.textContent;
                        precioBase = parseInt(precioTexto.replace(/[^0-9]/g, '')) || 0;
                    }
                }
            }
        }
    }

    if (precioBase === 0 && productoActual.precios && productoActual.precios.length > 0) {
        precioBase = Math.min(...productoActual.precios.map(p => parseFloat(p.precio) || 0));
    }
    if (precioBase === 0) {
        precioBase = parseFloat(productoActual.precio_base) || parseFloat(productoActual.precio_venta) || 0;
    }

    let precioAdicionales = 0;
    let adicionesDetalle = [];

    for (const grupoId in adicionesSeleccionadas) {
        if (grupoId === 'tamano' || grupoId === 'tamaño') continue;

        adicionesSeleccionadas[grupoId].forEach(opcionId => {
            let precio = 0;
            let nombre = `Opción ${opcionId}`;

            if (productoActual && productoActual.precios) {
                const precioDinamico = productoActual.precios.find(p => String(p.id) === String(opcionId));
                if (precioDinamico && parseFloat(precioDinamico.precio) > 0) {
                    precio = parseFloat(precioDinamico.precio) || 0;
                    nombre = precioDinamico.tamano_nombre || precioDinamico.nombre || `Opción ${opcionId}`;
                }
            }

            if (precio === 0) {
                const input = document.querySelector(`input[name="grupo-${grupoId}"][value="${opcionId}"]:checked`);
                if (input) {
                    const label = input.closest('label');
                    if (label) {
                        const nombreElement = label.querySelector('.font-medium, .font-semibold');
                        nombre = nombreElement ? nombreElement.textContent.trim() : `Opción ${opcionId}`;
                        const precioElement = label.querySelector('.text-green-600, .text-red-600');
                        if (precioElement) {
                            const precioTexto = precioElement.textContent;
                            precio = parseInt(precioTexto.replace(/[^0-9]/g, '')) || 0;
                        }
                    }
                }
            }

            adicionesDetalle.push({
                grupo_id: grupoId,
                opcion_id: opcionId,
                nombre: nombre,
                precio: precio
            });
            precioAdicionales += precio;
        });
    }

    const precioUnitario = precioBase + precioAdicionales;
    const precioTotal = precioUnitario * cantidad;

    let descripcionProducto = productoActual.nombre;
    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        const inputTamano = document.querySelector(`input[name="grupo-tamano"][value="${tamanoSeleccionado[0]}"]:checked`) ||
            document.querySelector(`input[name="grupo-tamaño"][value="${tamanoSeleccionado[0]}"]:checked`);
        if (inputTamano) {
            const label = inputTamano.closest('label');
            const nombreTamano = label.querySelector('.font-semibold')?.textContent || 'Tamaño seleccionado';
            descripcionProducto += ` (${nombreTamano})`;
        }
    }

    let segundoSabor = null;
    if (typeof getSegundoSaborSeleccionado === 'function') {
        segundoSabor = getSegundoSaborSeleccionado();
        if (segundoSabor) {
            descripcionProducto += ` + Mitad ${segundoSabor.nombre}`;
        }
    }

    const item = {
        producto_id: productoActual.id,
        nombre: descripcionProducto,
        precio_base: precioBase,
        precio_adicionales: precioAdicionales,
        precio_unitario: precioUnitario,
        cantidad: cantidad,
        precio_total: precioTotal,
        adiciones: adicionesDetalle,
        comentarios: comentarios,
        tamano_id: tamanoSeleccionado ? tamanoSeleccionado[0] : null,
        segundo_sabor: segundoSabor ? { id: segundoSabor.id, nombre: segundoSabor.nombre } : null
    };

    carrito.push(item);
    cerrarModalProducto();
    actualizarContadorCarrito();
    mostrarNotificacionRapida(`¡${descripcionProducto} agregado al carrito!`, 'success');
}

// ==================== CARRITO ====================

function actualizarContadorCarrito() {
    const contador = document.getElementById('cart-count');
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const totalProductos = carrito.length;

    if (totalItems > 0) {
        contador.textContent = totalItems;
        contador.style.display = 'flex';

        const headerText = document.querySelector('header p');
        if (headerText) {
            headerText.textContent = `${totalProductos} producto${totalProductos !== 1 ? 's' : ''} en tu carrito`;
        }
    } else {
        contador.style.display = 'none';
        const headerText = document.querySelector('header p');
        if (headerText) {
            headerText.textContent = 'Pedidos a domicilio';
        }
    }
}

function toggleCart() {
    const modal = document.getElementById('carrito-modal');
    if (modal.classList.contains('active')) {
        modal.classList.remove('active');
    } else {
        renderizarCarrito();
        modal.classList.add('active');
    }
}

function renderizarCarrito() {
    const container = document.getElementById('carrito-items');
    const contadorItems = document.getElementById('carrito-items-count');

    if (carrito.length === 0) {
        container.innerHTML = `
                <div class="text-center py-16 text-gray-500">
                    <i class="fas fa-shopping-cart text-6xl mb-4 text-gray-300"></i>
                    <h3 class="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
                    <p class="text-gray-600">¡Agrega algunos productos deliciosos!</p>
                    <button onclick="toggleCart()" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition">
                        Continuar comprando
                    </button>
                </div>
            `;
        if (contadorItems) contadorItems.textContent = '0 productos';
        document.getElementById('carrito-subtotal').textContent = '$0';
        document.getElementById('carrito-total').textContent = '$0';
        return;
    }

    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    if (contadorItems) {
        contadorItems.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''}`;
    }

    container.innerHTML = carrito.map((item, index) => `
            <div class="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-200">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800 text-lg">${item.nombre}</h4>
                        <div class="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span><i class="fas fa-hashtag mr-1"></i>Cantidad: ${item.cantidad}</span>
                            <span><i class="fas fa-tag mr-1"></i>$${formatPrice(item.precio_base)} c/u</span>
                        </div>
                        ${item.adiciones.length > 0 ? `
                        <div class="bg-white rounded p-2 mt-2">
                            <p class="text-sm font-semibold text-gray-700 mb-1">Adiciones:</p>
                            <div class="text-sm text-gray-600">
                                ${item.adiciones.map(ad => `
                                    <div class="flex justify-between">
                                        <span>+ ${ad.nombre}</span>
                                        ${ad.precio > 0 ? `<span class="text-green-600">+$${formatPrice(ad.precio)}</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                        ${item.comentarios ? `
                        <div class="bg-blue-50 rounded p-2 mt-2">
                            <p class="text-sm text-blue-800">
                                <i class="fas fa-comment mr-1"></i>
                                "${item.comentarios}"
                            </p>
                        </div>
                    ` : ''}
                    </div>
                    <div class="text-right ml-4">
                        <div class="font-bold text-xl text-red-600 mb-2">$${formatPrice(item.precio_total)}</div>
                        <button onclick="eliminarDelCarrito(${index})" class="text-red-600 text-sm hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                            <i class="fas fa-trash-alt mr-1"></i> Eliminar
                        </button>
                    </div>
                </div>
            </div>
            `).join('');

    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 0;
    const total = subtotal + domicilio;

    const subtotalEl = document.getElementById('carrito-subtotal');
    const domicilioEl = document.getElementById('carrito-domicilio');
    const totalEl = document.getElementById('carrito-total');

    if (subtotalEl) subtotalEl.textContent = `$${formatPrice(subtotal)}`;
    if (domicilioEl) domicilioEl.textContent = `$${formatPrice(domicilio)}`;
    if (totalEl) totalEl.textContent = `$${formatPrice(total)}`;
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
    actualizarContadorCarrito();
}

// ==================== BÃšSQUEDA DE CLIENTE ====================

async function buscarClientePorTelefonoInline() {
    const telefonoInput = document.getElementById('buscar-telefono-inline');
    const telefono = telefonoInput ? telefonoInput.value.trim() : '';

    if (!telefono) {
        mostrarNotificacionRapida('Por favor ingresa un nÃºmero de telÃ©fono', 'warning');
        return;
    }

    try {
        const btn = document.querySelector('button[onclick="buscarClientePorTelefonoInline()"]');
        const textoOriginal = btn ? btn.innerHTML : 'Buscar';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Buscando...';
            btn.disabled = true;
        }

        const data = await db.getUsuarioPorTelefono(telefono);

        if (btn) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }

        if (data) {
            clienteActual = data;
            console.log('Cliente encontrado en Supabase:', clienteActual);
            mostrarNotificacionRapida(`Â¡Bienvenido de nuevo, ${clienteActual.nombre} !`, 'success');
            prellenaFormularioConClienteGuardado();
            const seccionBusqueda = document.getElementById('seccion-busqueda-cliente');
            if (seccionBusqueda) seccionBusqueda.style.display = 'none';
        } else {
            clienteActual = null;
            mostrarNotificacionRapida('Este número no tiene datos guardados. Por favor completa el formulario manualmente.', 'info');
            const telForm = document.getElementById('cliente-telefono');
            if (telForm) telForm.value = telefono;
        }
    } catch (error) {
        console.error('Error buscando cliente en Supabase:', error);
        mostrarNotificacionRapida('Error al buscar el cliente. Por favor completa el formulario manualmente.', 'warning');
    }
}

function prellenaFormularioConClienteGuardado() {
    if (!clienteActual) return;

    const nombreInput = document.getElementById('cliente-nombre');
    const telefonoInput = document.getElementById('cliente-telefono');
    const direccionInput = document.getElementById('cliente-direccion');

    if (nombreInput) {
        nombreInput.value = `${clienteActual.nombre} ${clienteActual.apellido || ''} `.trim();
        nombreInput.disabled = true;
    }

    if (telefonoInput) {
        telefonoInput.value = clienteActual.telefono;
        telefonoInput.disabled = true;
    }

    if (direccionInput) {
        direccionInput.value = clienteActual.nomenclatura_direccion || clienteActual.direccion || '';
    }

    if (clienteActual.latitud) {
        const latInput = document.getElementById('direccion-lat');
        if (latInput) latInput.value = clienteActual.latitud;
    }
    if (clienteActual.longitud) {
        const lngInput = document.getElementById('direccion-lng');
        if (lngInput) lngInput.value = clienteActual.longitud;
    }
    if (clienteActual.barrio) {
        const barrioInput = document.getElementById('direccion-barrio');
        if (barrioInput) barrioInput.value = clienteActual.barrio;
    }
    if (clienteActual.municipio) {
        const municipioInput = document.getElementById('direccion-municipio');
        if (municipioInput) municipioInput.value = clienteActual.municipio;
    }
    if (clienteActual.ciudad) {
        const ciudadInput = document.getElementById('direccion-ciudad');
        if (ciudadInput) ciudadInput.value = clienteActual.ciudad;
    }

    if (clienteActual.municipio) {
        calcularPrecioDomicilio(clienteActual.municipio, clienteActual.barrio);
    }

    if (nombreInput && nombreInput.parentElement) {
        const label = nombreInput.parentElement.querySelector('label');
        if (label && !label.textContent.includes('✓')) {
            label.innerHTML = label.innerHTML.replace('*', '✓');
        }
    }

    if (telefonoInput && telefonoInput.parentElement) {
        const label = telefonoInput.parentElement.querySelector('label');
        if (label && !label.textContent.includes('✓')) {
            label.innerHTML = label.innerHTML.replace('*', '✓');
        }
    }
}

// ==================== GEOCODIFICACIÓN Y GPS ====================

let sugerenciasDireccionTimeout = null;

function toggleBusquedaDireccion() {
    const autocompletado = document.getElementById('autocompletado-direccion');
    if (autocompletado) {
        autocompletado.classList.toggle('hidden');

        if (!autocompletado.classList.contains('hidden')) {
            const inputBuscar = document.getElementById('buscar-direccion');
            if (inputBuscar) {
                setTimeout(() => inputBuscar.focus(), 100);
            }
        }
    }
}

async function obtenerUbicacionGPS() {
    if (!navigator.geolocation) {
        mostrarNotificacionRapida('Tu navegador no soporta geolocalización', 'warning');
        return;
    }

    mostrarNotificacionRapida('Obteniendo tu ubicación...', 'info');

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const response = await fetch(API_BASE_URL + '/api/delivery/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng })
        });

        const data = await response.json();

        if (data.success && data.data) {
            llenarDatosDireccion(data.data);
            mostrarNotificacionRapida('¡Ubicación obtenida exitosamente!', 'success');
        } else {
            mostrarNotificacionRapida('No se pudo obtener la dirección de tu ubicación', 'warning');
        }
    } catch (error) {
        console.error('Error obteniendo ubicación GPS:', error);
        mostrarNotificacionRapida('Error obteniendo ubicación', 'warning');
    }
}

async function buscarDireccionAutocompletado(query) {
    clearTimeout(sugerenciasDireccionTimeout);

    if (!query || query.length < 3) {
        ocultarSugerenciasDireccion();
        return;
    }

    sugerenciasDireccionTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE_URL} /api/delivery / suggestions ? q = ${encodeURIComponent(query)} `);
            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                mostrarSugerenciasDireccion(data.data);
            } else {
                ocultarSugerenciasDireccion();
            }
        } catch (error) {
            console.error('Error buscando direcciones:', error);
            ocultarSugerenciasDireccion();
        }
    }, 500);
}

function mostrarSugerenciasDireccion(sugerencias) {
    const container = document.getElementById('sugerencias-direccion');
    if (!container) return;

    container.innerHTML = sugerencias.map(sug => `
    <div class="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
        onclick="seleccionarDireccionSugerida('${sug.place_id}')">
        <div class="flex items-start">
            <i class="fas fa-map-marker-alt text-purple-500 mt-1 mr-3"></i>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">${sug.description}</p>
            </div>
        </div>
    </div>
    `).join('');

    container.classList.remove('hidden');
}

function ocultarSugerenciasDireccion() {
    const container = document.getElementById('sugerencias-direccion');
    if (container) {
        container.classList.add('hidden');
    }
}

async function seleccionarDireccionSugerida(placeId) {
    try {
        mostrarNotificacionRapida('Obteniendo detalles de la dirección...', 'info');

        const response = await fetch(API_BASE_URL + '/api/delivery/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ place_id: placeId })
        });

        const data = await response.json();

        if (data.success && data.data) {
            llenarDatosDireccion(data.data);
            ocultarSugerenciasDireccion();
            const inputBuscar = document.getElementById('buscar-direccion');
            if (inputBuscar) inputBuscar.value = '';
            mostrarNotificacionRapida('¡Dirección seleccionada exitosamente!', 'success');
        } else {
            mostrarNotificacionRapida('Error obteniendo detalles de la dirección', 'warning');
        }
    } catch (error) {
        console.error('Error seleccionando dirección:', error);
        mostrarNotificacionRapida('Error al seleccionar la dirección', 'warning');
    }
}

async function calcularPrecioDomicilio(municipio, barrio) {
    try {
        const params = new URLSearchParams({ municipio: municipio || 'No especificado' });
        if (barrio) params.append('barrio', barrio);

        const response = await fetch(`${API_BASE_URL}/api/delivery/calculate-delivery-price?${params}`);

        // Si el backend responde 404 o error, usar precio por defecto 3000
        if (!response.ok) {
            console.warn('Backend de entrega no disponible (404), usando valor por defecto 3000');
            window.precioDomicilio = 3000;
            actualizarResumenPrecio();
            return 3000;
        }

        const resultado = await response.json();

        if (resultado.success) {
            window.precioDomicilio = resultado.precio;
            localStorage.setItem('precioDomicilio', resultado.precio);
            actualizarResumenPrecio();
            return resultado.precio;
        } else {
            return window.precioDomicilio || 3000;
        }
    } catch (error) {
        console.error('Error calculando precio de domicilio:', error);
        return window.precioDomicilio || 3000;
    }
}

function actualizarResumenPrecio() {
    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 0;
    const total = subtotal + domicilio;

    const resumenDomicilioEl = document.getElementById('resumen-domicilio');
    const confirmarTotalEl = document.getElementById('confirmar-total');

    if (resumenDomicilioEl) resumenDomicilioEl.textContent = `$${formatPrice(domicilio)}`;
    if (confirmarTotalEl) confirmarTotalEl.textContent = `$${formatPrice(total)}`;
}

function llenarDatosDireccion(data) {
    const direccionInput = document.getElementById('cliente-direccion');
    if (direccionInput) {
        direccionInput.value = data.nomenclature || data.formatted_address || '';
    }

    const latInput = document.getElementById('direccion-lat');
    const lngInput = document.getElementById('direccion-lng');
    const barrioInput = document.getElementById('direccion-barrio');
    const municipioInput = document.getElementById('direccion-municipio');
    const ciudadInput = document.getElementById('direccion-ciudad');

    if (latInput) latInput.value = data.lat || '';
    if (lngInput) lngInput.value = data.lng || '';
    if (barrioInput) barrioInput.value = data.neighborhood || '';
    if (municipioInput) municipioInput.value = data.municipality || '';
    if (ciudadInput) ciudadInput.value = data.city || '';

    if (data.municipality) {
        calcularPrecioDomicilio(data.municipality, data.neighborhood);
    }
}

// ==================== CONFIRMAR PEDIDO ====================

function irAConfirmar() {
    if (carrito.length === 0) {
        alert('El carrito está vacío. ¡Agrega algunos productos primero!');
        return;
    }

    document.getElementById('carrito-modal').classList.remove('active');

    const resumenContainer = document.getElementById('resumen-items');
    const resumenSubtotal = document.getElementById('resumen-subtotal');

    resumenContainer.innerHTML = carrito.map(item => `
    <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
            <div class="flex-1">
                <div class="font-medium text-gray-800">${item.cantidad}x ${item.nombre}</div>
                ${item.adiciones.length > 0 ? `
                    <div class="text-sm text-gray-600 ml-4">
                        ${item.adiciones.map(ad => `+ ${ad.nombre}`).join(', ')}
                    </div>
                ` : ''}
                ${item.comentarios ? `
                    <div class="text-sm text-blue-600 ml-4 italic">
                        "${item.comentarios}"
                    </div>
                ` : ''}
            </div>
            <div class="font-semibold text-gray-800">$${formatPrice(item.precio_total)}</div>
        </div>
    `).join('');

    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 0;
    const total = subtotal + domicilio;

    if (resumenSubtotal) resumenSubtotal.textContent = `$${formatPrice(subtotal)}`;
    const resumenDomicilioEl = document.getElementById('resumen-domicilio');
    const confirmarTotalEl = document.getElementById('confirmar-total');

    if (resumenDomicilioEl) resumenDomicilioEl.textContent = `$${formatPrice(domicilio)}`;
    if (confirmarTotalEl) confirmarTotalEl.textContent = `$${formatPrice(total)}`;

    clienteActual = null;
    const seccionBusqueda = document.getElementById('seccion-busqueda-cliente');
    if (seccionBusqueda) seccionBusqueda.style.display = 'block';

    const buscarTelefonoInline = document.getElementById('buscar-telefono-inline');
    if (buscarTelefonoInline) buscarTelefonoInline.value = '';

    const nombreInput = document.getElementById('cliente-nombre');
    const telefonoInput = document.getElementById('cliente-telefono');
    const direccionInput = document.getElementById('cliente-direccion');

    if (nombreInput) {
        nombreInput.value = '';
        nombreInput.disabled = false;
    }
    if (telefonoInput) {
        telefonoInput.value = '';
        telefonoInput.disabled = false;
    }
    if (direccionInput) {
        direccionInput.value = '';
    }

    document.getElementById('confirmar-modal').classList.add('active');
}

function cerrarModalConfirmar() {
    const modal = document.getElementById('confirmar-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.add('hidden');
    }
}

async function enviarPedido(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('cliente-nombre').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const direccion = document.getElementById('cliente-direccion').value;
    const notas = document.getElementById('notas-entrega').value;
    const medioPago = document.querySelector('input[name="medio-pago"]:checked')?.value || 'Efectivo';

    if (!nombre || !telefono || !direccion) {
        alert('Por favor completa los datos de entrega.');
        return;
    }

    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 0;
    const total = subtotal + domicilio;

    const btn = document.getElementById('btn-enviar-pedido');
    const textoOriginal = btn ? btn.innerHTML : 'Confirmar Pedido';
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';
        btn.disabled = true;
    }

    try {
        const pedido = {
            tipo_pedido: 'domicilio',
            cliente_nombre: nombre,
            telefono_cliente: telefono,
            direccion_entrega: direccion,
            notas_entrega: notas,
            medio_pago: medioPago,
            total_precio: total,
            total_con_descuento: total,
            items: carrito.map(item => ({
                producto_id: item.producto_id,
                tamano_id: item.tamano_id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                comentarios: item.comentarios,
                adiciones: item.adiciones,
                segundo_sabor: item.segundo_sabor
            }))
        };

        const result = await db.createPedido(pedido);

        if (result && result.success) {
            const pedidoCreado = result.data;
            const orderId = pedidoCreado ? pedidoCreado.id : null;

            // Intentar notificar al backend para WhatsApp
            if (orderId) {
                fetch(`${API_BASE_URL}/api/notifications/notify-order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order_id: orderId })
                }).catch(e => console.error('Error notificando pedido:', e));
            }

            mostrarNotificacionRapida('¡Pedido enviado exitosamente!', 'success');

            // Limpiar carrito y cerrar modal de compra
            if (typeof vaciarCarrito === 'function') vaciarCarrito();
            if (typeof cerrarModalFinalizar === 'function') cerrarModalFinalizar();

            // Mostrar Modal de Éxito en la misma página
            if (orderId) {
                const modal = document.getElementById('modal-exito-pedido');
                const content = document.getElementById('modal-exito-content');
                document.getElementById('exito-order-id').textContent = `#${orderId}`;

                if (modal) {
                    // Asegurar que el modal queda visible (usamos clase 'active' para sobreescribir estilos)
                    modal.classList.remove('hidden');
                    modal.classList.add('active');
                    // Animación de entrada
                    setTimeout(() => {
                        content.classList.remove('scale-95', 'opacity-0');
                        content.classList.add('scale-100', 'opacity-100');
                    }, 50);
                }
            }

            // Volver al inicio suavemente
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            throw new Error('No se recibió el ID del pedido');
        }
    } catch (error) {
        console.error('Error enviando pedido:', error);
        alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
        if (btn) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    }
}

// ==================== UTILIDADES ====================

function formatPrice(price) {
    let numPrice = price;
    if (typeof price === 'string') {
        numPrice = parseFloat(price.replace(/\./g, '').replace(',', '.'));
    }
    if (isNaN(numPrice)) numPrice = 0;
    return Math.round(numPrice).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function filtrarPorCategoria(categoriaId) {
    renderizarProductos(categoriaId);
}

function filtrarProductos() {
    const busqueda = document.getElementById('search-input').value.toLowerCase();
    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busqueda) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda))
    );

    const container = document.getElementById('productos-container');

    if (productosFiltrados.length === 0) {
        container.innerHTML = `
        <div class="col-span-full text-center py-12 text-gray-500">
            <i class="fas fa-search text-4xl mb-4 text-gray-300"></i>
            <p>No se encontraron productos con "${busqueda}"</p>
        </div>
    `;
        return;
    }

    // Reuse the map logic from renderizarProductos but for filtered list
    renderizarProductosFiltrados(productosFiltrados);
}

function renderizarProductosFiltrados(productosFiltrados) {
    const container = document.getElementById('productos-container');
    container.innerHTML = productosFiltrados.map(producto => {
        const categoriaProducto = categorias.find(c => c.id === producto.categoria_id);
        const nombreCategoria = categoriaProducto ? categoriaProducto.nombre : '';

        return `
            <div class="product-card" onclick="abrirModalProducto(${producto.id})">
                <div class="relative product-image-wrapper">
                    ${producto.imagen_url ? `
                        <img src="${producto.imagen_url}" alt="${producto.nombre}" loading="lazy">
                    ` : `
                        <div class="product-image-placeholder">
                            <i class="fas fa-pizza-slice"></i>
                        </div>
                    `}
                    ${nombreCategoria ? `<span class="product-badge badge-category">${nombreCategoria}</span>` : ''}
                </div>
                <div class="product-info">
                    <h3>${producto.nombre}</h3>
                    ${producto.descripcion ? `<p>${producto.descripcion}</p>` : ''}
                    <div class="price-action">
                         <span class="price-tag">
                            ${producto.precios && producto.precios.length > 0 ? `Desde $${formatPrice(Math.min(...producto.precios.map(p => p.precio || 0)))}` : 'Personalizar'}
                        </span>
                        <button class="btn-primary-sm">Personalizar</button>
                    </div>
                </div>
            </div>
            `;
    }).join('');
}

function mostrarSelectorRapido(producto) {
    const selectorRapido = document.getElementById('selector-rapido-pizza');
    if (!selectorRapido) return;

    if (producto && producto.nombre && producto.nombre.toLowerCase().includes('hawaiana')) {
        selectorRapido.classList.remove('hidden');
    } else {
        selectorRapido.classList.add('hidden');
    }
}

function mostrarBotonesRapidosAdiciones(producto) {
    const botonesRapidos = document.getElementById('botones-rapidos-adiciones');
    if (!botonesRapidos) return;

    const btnBorde = document.getElementById('btn-agregar-borde');
    const btnSegundoSabor = document.getElementById('btn-agregar-segundo-sabor');

    let tieneBorde = false;
    let tieneSegundoSabor = false;

    // Check currently loaded groups in DOM
    const groupsInDom = document.querySelectorAll('[id^="grupo-"]');
    groupsInDom.forEach(group => {
        const h4 = group.parentElement.querySelector('h4');
        if (h4) {
            if (h4.textContent.toLowerCase().includes('borde')) tieneBorde = true;
            if (h4.textContent.toLowerCase().includes('segundo sabor') || h4.textContent.toLowerCase().includes('2 sabores')) tieneSegundoSabor = true;
        }
    });

    if (btnBorde) btnBorde.style.display = tieneBorde ? 'block' : 'none';
    if (btnSegundoSabor) btnSegundoSabor.style.display = tieneSegundoSabor ? 'block' : 'none';

    if (tieneBorde || tieneSegundoSabor) {
        botonesRapidos.classList.remove('hidden');
    } else {
        botonesRapidos.classList.add('hidden');
    }
}

function mostrarGrupoAdicion(tipo) {
    const gruposContainer = document.getElementById('modal-grupos-adiciones');
    const grupos = gruposContainer.querySelectorAll('div[id^="grupo-"]');

    let grupoEncontrado = null;

    if (tipo === 'borde') {
        grupoEncontrado = Array.from(grupos).find(g => {
            const h4 = g.parentElement.querySelector('h4');
            return h4 && h4.textContent.toLowerCase().includes('borde');
        });
    } else if (tipo === 'segundo_sabor') {
        grupoEncontrado = Array.from(grupos).find(g => {
            const h4 = g.parentElement.querySelector('h4');
            return h4 && (h4.textContent.toLowerCase().includes('segundo sabor') || h4.textContent.toLowerCase().includes('2 sabores'));
        });
    }

    if (grupoEncontrado) {
        const id = grupoEncontrado.id.replace('grupo-', '');
        const contenido = document.getElementById(`grupo-${id}`);
        const icono = document.getElementById(`icon-grupo-${id}`);

        if (contenido) {
            contenido.classList.remove('hidden');
            if (icono) {
                icono.classList.remove('fa-chevron-down');
                icono.classList.add('fa-chevron-up');
            }
            contenido.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Global functions for confirmation and UI
window.irAConfirmar = irAConfirmar;
window.enviarPedido = enviarPedido;
window.cerrarModalConfirmar = cerrarModalConfirmar;
window.filtrarPorCategoria = filtrarPorCategoria;
window.filtrarProductos = filtrarProductos;
window.mostrarGrupoAdicion = mostrarGrupoAdicion;
window.cambiarCantidad = cambiarCantidad;
window.abrirModalProducto = abrirModalProducto;
window.cerrarModalProducto = cerrarModalProducto;
window.agregarAlCarrito = agregarAlCarrito;
window.toggleCart = toggleCart;
window.eliminarDelCarrito = eliminarDelCarrito;
window.buscarClientePorTelefonoInline = buscarClientePorTelefonoInline;
window.toggleBusquedaDireccion = toggleBusquedaDireccion;
window.obtenerUbicacionGPS = obtenerUbicacionGPS;
window.seleccionarDireccionSugerida = seleccionarDireccionSugerida;
