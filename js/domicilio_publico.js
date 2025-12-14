// Estado global
let productos = [];
let categorias = [];
let carrito = [];
let productoActual = null;
let adicionesSeleccionadas = {};
let preciosOpciones = {}; // Guardar precios de opciones para cálculo rápido
let clienteActual = null; // Guardar datos del cliente buscado

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
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
        // Ignorar si localStorage no está disponible
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
            localStorage.setItem('precio_domicilio', window.precioDomicilio.toString());
            console.log('Precio guardado en localStorage:', window.precioDomicilio);
        } catch (e) {
            console.log('Error guardando en localStorage:', e);
            // Ignorar si localStorage no está disponible
        }

        // Forzar actualización del carrito incluso si no está visible
        setTimeout(() => {
            renderizarCarrito();
            console.log('Carrito renderizado con nuevo precio de domicilio');
        }, 100);

        // Mostrar notificación de actualización
        mostrarNotificacionRapida(`Precio de domicilio actualizado: $${formatPrice(window.precioDomicilio)}`, 'info');
    }
});

// ==================== CARGAR DATOS ====================

async function cargarCategorias() {
    try {
        const response = await fetch(API_BASE_URL + '/api/categorias-config');
        const data = await response.json();
        categorias = data.data || data;
        // Filtrar solo categorías activas
    // Filtrar solo categorías activas y visibles en el menú público
    categorias = categorias.filter(cat => (cat.activo === 1 || cat.activo === true) && (cat.visible_en_publico === 1 || cat.visible_en_publico === true || cat.visible_en_publico === undefined));
        renderizarCategorias();
        // Si hay una categoría marcada como predeterminada para domicilios, seleccionarla automáticamente
        try {
            const defaultCat = categorias.find(c => c.default_en_domicilio === 1 || c.default_en_domicilio === true);
            if (defaultCat) {
                // Ejecutar la selección después de un pequeño delay para asegurar DOM listo
                setTimeout(() => filtrarPorCategoria(defaultCat.id), 100);
            }
        } catch (e) {
            // ignorar si no existe la propiedad
        }
    } catch (error) {
        console.error('Error cargando categorías:', error);
        // Mostrar mensaje de error para categorías
        const container = document.getElementById('categorias-container');
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-exclamation-triangle text-2xl mb-2 text-red-400"></i>
                <p class="text-sm">Error al cargar categorías</p>
            </div>
        `;
    }
}

async function cargarProductos() {
    try {
        const response = await fetch(API_BASE_URL + '/api/productos-publicos');
        const data = await response.json();
        productos = data.data || data;
        console.log('Productos cargados:', productos);
        renderizarProductos();
    } catch (error) {
        console.error('Error cargando productos:', error);
        // Mostrar mensaje de error más amigable
        const container = document.getElementById('productos-container');
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

// ==================== RENDERIZADO ====================

function renderizarCategorias() {
    const container = document.getElementById('categorias-container');
    // Mostrar únicamente las categorías creadas (sin botón "Todas")
    container.innerHTML = `${categorias.map(cat => `
            <button
                onclick="filtrarPorCategoria(${cat.id})"
                class="px-3 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold hover:border-red-600 hover:text-red-600 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex flex-col items-center justify-center text-center gap-1 min-h-[80px]"
                title="${cat.descripcion || cat.nombre}"
            >
                <i class="${cat.icono || 'fas fa-tag'} text-xl"></i>
                <span class="text-xs sm:text-sm leading-tight break-words w-full">${cat.nombre}</span>
            </button>
        `).join('')}`;
}

function renderizarProductos(filtro = null) {
    const container = document.getElementById('productos-container');
    const titulo = document.getElementById('productos-titulo');
    const contador = document.getElementById('productos-contador');

    let productosFiltrados = productos;

    if (filtro) {
        // Obtener la categoría seleccionada
        const categoriaSeleccionada = categorias.find(c => c.id === filtro);
        
        // Filtrar productos por categoría seleccionada
        productosFiltrados = productos.filter(p => p.categoria_id === filtro);
        
        // Si la categoría tiene categorías compatibles, incluir también esos productos
        if (categoriaSeleccionada && categoriaSeleccionada.categorias_compatibles && categoriaSeleccionada.categorias_compatibles.length > 0) {
            // Obtener productos de categorías compatibles
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
    contador.textContent = `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''} disponible${productosFiltrados.length !== 1 ? 's' : ''}`;

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

    // Cargar grupos de adiciones desde el backend
    await cargarGruposAdiciones(productoId);

    // Cargar productos vinculados (bebidas, adicionales, etc.)
    await cargarProductosVinculados(productoId);

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
        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}/grupos-bebidas`);
        const data = await response.json();
        return data.grupos || [];
    } catch (error) {
        console.error('Error cargando grupos de bebidas:', error);
        return [];
    }
}

async function cargarGruposAdiciones(productoId) {
    try {
        // Cargar grupos normales de adiciones
        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}/grupos-adiciones`);
        let gruposNormales = [];

        if (response.ok) {
            gruposNormales = await response.json();
            // Asegurar que gruposNormales es un array
            if (!Array.isArray(gruposNormales)) {
                gruposNormales = [];
            }
        } else {
            console.warn('Error cargando grupos normales:', response.status);
            gruposNormales = [];
        }

        console.log('Grupos cargados para producto', productoId, ':', gruposNormales);

        // Cargar grupos de bebidas dinámicos
        const gruposBebidas = await cargarGruposBebidas(productoId);

        // Cargar vinculaciones del producto
        const vinculacionesResponse = await fetch(`${API_BASE_URL}/api/productos/${productoId}/vinculaciones`);
        let vinculaciones = { como_principal: [], como_vinculado: [] };

        if (vinculacionesResponse.ok) {
            vinculaciones = await vinculacionesResponse.json();
        }

        // Crear grupos dinámicos basados en vinculaciones
        const gruposVinculaciones = crearGruposDesdeVinculaciones(vinculaciones.como_principal);

        // Combinar todos los tipos de grupos
        const todosLosGrupos = [...gruposNormales, ...gruposBebidas, ...gruposVinculaciones];

        const container = document.getElementById('modal-grupos-adiciones');

        if (!todosLosGrupos || todosLosGrupos.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Este producto no tiene opciones adicionales disponibles.</p>';
            return;
        }
        
        // Normalizar estructura de grupos para que todos tengan {grupo, opciones}
        const gruposNormalizados = todosLosGrupos.map(item => {
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
        
        container.innerHTML = gruposNormalizados.map(({grupo, opciones}) => {
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
                            '<i class="fas fa-chevron-down text-gray-400" id="icon-grupo-${grupo.id}"></i>'
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
                                                    onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${grupo.maximo}, event)"
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
                                                onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${grupo.maximo}, event)"
                                            >
                                            <span class="font-medium">${opcion.nombre}</span>
                                        </label>
                                    `;
                                } else {
                                    // Diseño genérico para otras adiciones (bebidas, bordes, etc.) - SIEMPRE CHECKBOXES PARA BEBIDAS
                                    const esBebida = grupo.nombre && (grupo.nombre.toLowerCase().includes('bebida') || grupo.nombre.toLowerCase().includes('gaseosa') || grupo.nombre.toLowerCase().includes('jugo') || grupo.nombre.toLowerCase().includes('limonada'));
                                    const inputType = esBebida ? 'checkbox' : (grupo.maximo === 1 ? 'radio' : 'checkbox');

                                    return `
                                        <label class="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                                            <div class="flex items-center gap-3">
                                                <input
                                                    type="${inputType}"
                                                    name="grupo-${grupo.id}"
                                                    value="${opcion.id}"
                                                    class="w-4 h-4 text-red-600"
                                                    onchange="seleccionarOpcion('${grupo.id}', '${String(opcion.id)}', ${esBebida ? 99 : grupo.maximo}, event)"
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
function seleccionarOpcion(grupoId, opcionId, maxSelecciones, event) {
    if (!adicionesSeleccionadas[grupoId]) {
        adicionesSeleccionadas[grupoId] = [];
    }

    const input = event.target;

    // Convertir opcionId a string si es necesario para comparación consistente
    const opcionIdStr = opcionId.toString();

    if (maxSelecciones === 1) {
        // Radio button - solo uno
        adicionesSeleccionadas[grupoId] = input.checked ? [opcionIdStr] : [];
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
    const tamanoSeleccionado = adicionesSeleccionadas['tamano'] || adicionesSeleccionadas['tamaño'];
    console.log('🔍 calcularTotalModal - Tamaño seleccionado:', tamanoSeleccionado);
    
    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        // Buscar el precio correspondiente en productoActual.precios usando el ID del tamaño seleccionado
        const tamanoId = tamanoSeleccionado[0];
        console.log('🔍 calcularTotalModal - Buscando precio para tamaño ID:', tamanoId);
        console.log('🔍 calcularTotalModal - Precios disponibles:', productoActual?.precios);
        
        if (productoActual.precios) {
            const precioEncontrado = productoActual.precios.find(p => p.id == tamanoId);
            console.log('🔍 calcularTotalModal - Precio encontrado:', precioEncontrado);
            
            if (precioEncontrado) {
                precioBase = precioEncontrado.precio || 0;
                console.log('🔍 calcularTotalModal - Precio base establecido:', precioBase);
            }
        }

        // Fallback: buscar en el DOM si no se encontró en los datos del producto
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

    // Si no hay tamaño seleccionado pero el producto tiene precios dinámicos, usar el más bajo
    if (precioBase === 0 && productoActual.precios && productoActual.precios.length > 0) {
        precioBase = Math.min(...productoActual.precios.map(p => p.precio || 0));
    }

    // Si aún no hay precio base, usar precio_base del producto
    if (precioBase === 0) {
        precioBase = productoActual.precio_base || productoActual.precio_venta || 0;
    }

    let precioAdicionales = 0;

    // Sumar precios de adiciones seleccionadas (excluyendo tamaños ya que están en precioBase)
    for (const grupoId in adicionesSeleccionadas) {
        if (grupoId === 'tamano' || grupoId === 'tamaño') continue; // Ya incluido en precioBase

        console.log(`🔍 Procesando grupo: ${grupoId}`, adicionesSeleccionadas[grupoId]);

        adicionesSeleccionadas[grupoId].forEach(opcionId => {
            console.log(`  - Buscando precio para opción ID: ${opcionId} en grupo ${grupoId}`);

            // Buscar el precio de esta opción en el input checked
            const input = document.querySelector(`input[name="grupo-${grupoId}"][value="${opcionId}"]:checked`);
            console.log(`  - Input encontrado:`, input);

            if (input) {
                const label = input.closest('label');
                console.log(`  - Label encontrado:`, label);

                if (label) {
                    // Buscar el precio directamente en los precios dinámicos del producto
                    console.log(`  - Buscando precio en precios dinámicos para opcionId: ${opcionId}`);

                    if (productoActual && productoActual.precios) {
                        const precioDinamico = productoActual.precios.find(p => String(p.id) === String(opcionId));
                        if (precioDinamico && precioDinamico.precio > 0) {
                            console.log(`  - Precio encontrado en precios dinámicos: ${precioDinamico.precio}`);
                            precioAdicionales += precioDinamico.precio;
                            console.log(`  - Precio adicional acumulado desde precios dinámicos: ${precioAdicionales}`);
                        } else {
                            console.log(`  - No se encontró precio dinámico para ID ${opcionId}`);
                        }
                    } else {
                        console.log(`  - No hay precios dinámicos disponibles en productoActual`);
                    }

                    // Si no encontró precio en precios dinámicos, buscar en el DOM (para bebidas dinámicas)
                    if (precioAdicionales === 0 || !productoActual.precios.some(p => String(p.id) === String(opcionId))) {
                        // Para bebidas dinámicas, buscar el precio en el atributo data o en el texto del label
                        const precioData = input.getAttribute('data-precio');
                        if (precioData) {
                            const precio = parseFloat(precioData);
                            if (!isNaN(precio)) {
                                precioAdicionales += precio;
                                console.log(`  - Precio encontrado en data-precio: ${precio}`);
                            }
                        } else {
                            // Buscar en cualquier elemento que contenga precio
                            const precioElements = label.querySelectorAll('*');
                            for (const el of precioElements) {
                                const text = el.textContent || '';
                                const precioMatch = text.match(/\$(\d+)/);
                                if (precioMatch) {
                                    const precio = parseInt(precioMatch[1]);
                                    if (!isNaN(precio)) {
                                        precioAdicionales += precio;
                                        console.log(`  - Precio encontrado en texto del label: ${precio}`);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                console.log(`  - No se encontró input para opción ${opcionId}`);
            }
        });
    }

    const cantidad = parseInt(document.getElementById('modal-cantidad').textContent);
    const precioUnitario = precioBase + precioAdicionales;
    const total = precioUnitario * cantidad;

    const totalEl = document.getElementById('modal-total');
    const precioUnitarioEl = document.getElementById('modal-producto-precio');

    if (totalEl) totalEl.textContent = `$${formatPrice(total)}`;
    if (precioUnitarioEl) precioUnitarioEl.textContent = `$${formatPrice(precioUnitario)}`;
}

function cerrarModalProducto() {
    document.getElementById('producto-modal').classList.remove('active');
    productoActual = null;
    adicionesSeleccionadas = {};
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

    // Validar que se haya seleccionado un tamaño si hay opciones de tamaño disponibles
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

    // Obtener precio base dinámico (basado en tamaño seleccionado)
    let precioBase = 0;
    const tamanoSeleccionado = adicionesSeleccionadas['tamano'] || adicionesSeleccionadas['tamaño'];
    
    console.log('🔍 Cálculo de precio base:');
    console.log('  - Tamaño seleccionado:', tamanoSeleccionado);
    console.log('  - Producto actual:', productoActual);
    console.log('  - Precios del producto:', productoActual?.precios);
    
    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        // Buscar el precio correspondiente en productoActual.precios usando el ID del tamaño seleccionado
        const tamanoId = tamanoSeleccionado[0];
        console.log('  - Buscando precio para tamaño ID:', tamanoId);
        
        if (productoActual.precios) {
            const precioEncontrado = productoActual.precios.find(p => p.id == tamanoId);
            console.log('  - Precio encontrado:', precioEncontrado);
            
            if (precioEncontrado) {
                precioBase = precioEncontrado.precio || 0;
                console.log('  - Precio base establecido:', precioBase);
            }
        }

        // Fallback: buscar en el DOM si no se encontró en los datos del producto
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

    // Fallback si no hay tamaño seleccionado
    if (precioBase === 0 && productoActual.precios && productoActual.precios.length > 0) {
        precioBase = Math.min(...productoActual.precios.map(p => p.precio || 0));
    }
    if (precioBase === 0) {
        precioBase = productoActual.precio_base || productoActual.precio_venta || 0;
    }

    let precioAdicionales = 0;
    let adicionesDetalle = [];

    // Recopilar adiciones seleccionadas con precios correctos (excluyendo tamaños)
    console.log('🔍 Adiciones seleccionadas:', adicionesSeleccionadas);

    for (const grupoId in adicionesSeleccionadas) {
        if (grupoId === 'tamano' || grupoId === 'tamaño') continue; // Tamaño ya incluido en precioBase

        console.log(`🔍 Procesando grupo: ${grupoId}`, adicionesSeleccionadas[grupoId]);

        adicionesSeleccionadas[grupoId].forEach(opcionId => {
            console.log(`  - Procesando opción ID: ${opcionId} en grupo ${grupoId}`);

            // Buscar el precio directamente en productoActual.precios (para bebidas dinámicas)
            let precio = 0;
            let nombre = `Opción ${opcionId}`;

            if (productoActual && productoActual.precios) {
                const precioDinamico = productoActual.precios.find(p => String(p.id) === String(opcionId));
                if (precioDinamico && precioDinamico.precio > 0) {
                    precio = precioDinamico.precio;
                    nombre = precioDinamico.tamano_nombre || precioDinamico.nombre || `Opción ${opcionId}`;
                    console.log(`  - Precio encontrado en precios dinámicos: ${precio} para ${nombre}`);
                }
            }

            // Si no encontró precio en precios dinámicos, buscar en el DOM
            if (precio === 0) {
                const input = document.querySelector(`input[name="grupo-${grupoId}"][value="${opcionId}"]:checked`);
                if (input) {
                    const label = input.closest('label');
                    if (label) {
                        // Obtener nombre de la adición
                        const nombreElement = label.querySelector('.font-medium, .font-semibold');
                        nombre = nombreElement ? nombreElement.textContent.trim() : `Opción ${opcionId}`;

                        // Buscar el precio en el label
                        const precioElement = label.querySelector('.text-green-600, .text-red-600');
                        if (precioElement) {
                            const precioTexto = precioElement.textContent;
                            precio = parseInt(precioTexto.replace(/[^0-9]/g, '')) || 0;
                            console.log(`  - Precio encontrado en DOM: ${precio}`);
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
            console.log(`  - Precio adicional acumulado: ${precioAdicionales}`);
        });
    }

    const precioUnitario = precioBase + precioAdicionales;
    const precioTotal = precioUnitario * cantidad;
    
    console.log('💰 Cálculo de precios:');
    console.log('  - Precio base:', precioBase);
    console.log('  - Precio adicionales:', precioAdicionales);
    console.log('  - Precio unitario:', precioUnitario);
    console.log('  - Cantidad:', cantidad);
    console.log('  - Precio total:', precioTotal);

    // Crear descripción del producto con selecciones
    let descripcionProducto = productoActual.nombre;

    // Agregar tamaño si fue seleccionado
    if (tamanoSeleccionado && tamanoSeleccionado.length > 0) {
        const inputTamano = document.querySelector(`input[name="grupo-tamano"][value="${tamanoSeleccionado[0]}"]:checked`) ||
                           document.querySelector(`input[name="grupo-tamaño"][value="${tamanoSeleccionado[0]}"]:checked`);
        if (inputTamano) {
            const label = inputTamano.closest('label');
            const nombreTamano = label.querySelector('.font-semibold')?.textContent || 'Tamaño seleccionado';
            descripcionProducto += ` (${nombreTamano})`;
        }
    }

    // Agregar al carrito
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
        tamano_id: tamanoSeleccionado ? tamanoSeleccionado[0] : null
    };

    carrito.push(item);

    // Cerrar modal y actualizar contador
    cerrarModalProducto();
    actualizarContadorCarrito();

    // Mostrar notificación mejorada
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

        // Actualizar título del header si hay productos
        const headerText = document.querySelector('header p');
        if (headerText) {
            headerText.textContent = `${totalProductos} producto${totalProductos !== 1 ? 's' : ''} en tu carrito`;
        }
    } else {
        contador.style.display = 'none';

        // Restaurar texto original del header
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

    // Actualizar contador de items
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
                        <i class="fas fa-trash mr-1"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 3000; // Costo configurable de domicilio
    const total = subtotal + domicilio;

    console.log('Calculando totales del carrito:');
    console.log('  - Subtotal productos:', subtotal);
    console.log('  - Precio domicilio:', domicilio);
    console.log('  - Total:', total);

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

// ==================== BÚSQUEDA DE CLIENTE ====================

async function buscarClientePorTelefonoInline() {
    const telefono = document.getElementById('buscar-telefono-inline').value.trim();
    
    if (!telefono) {
        mostrarNotificacionRapida('Por favor ingresa un número de teléfono', 'warning');
        return;
    }

    try {
        // Mostrar indicador de carga en el botón
        const btn = event.target;
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Buscando...';
        btn.disabled = true;

        const response = await fetch(`${API_BASE_URL}/api/delivery/usuario/por-telefono?telefono=${encodeURIComponent(telefono)}`);
        const data = await response.json();

        btn.innerHTML = textoOriginal;
        btn.disabled = false;

        if (data.success && data.data) {
            // Cliente encontrado - guardar datos y rellenar formulario
            clienteActual = data.data;
            console.log('Cliente encontrado:', clienteActual);
            
            mostrarNotificacionRapida(`¡Bienvenido de nuevo, ${clienteActual.nombre}!`, 'success');
            
            // Prellenar datos inmediatamente
            prellenaFormularioConClienteGuardado();
            
            // Ocultar la sección de búsqueda
            const seccionBusqueda = document.getElementById('seccion-busqueda-cliente');
            if (seccionBusqueda) {
                seccionBusqueda.style.display = 'none';
            }
        } else {
            // Cliente no encontrado
            clienteActual = null;
            mostrarNotificacionRapida('Este número no tiene datos guardados. Por favor completa el formulario manualmente.', 'info');
            
            // Copiar el teléfono buscado al campo del formulario
            const telefonoInput = document.getElementById('cliente-telefono');
            if (telefonoInput) {
                telefonoInput.value = telefono;
            }
        }
    } catch (error) {
        console.error('Error buscando cliente:', error);
        mostrarNotificacionRapida('Error al buscar el cliente. Por favor completa el formulario manualmente.', 'warning');
        
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

function prellenaFormularioConClienteGuardado() {
    if (!clienteActual) return;

    const nombreInput = document.getElementById('cliente-nombre');
    const telefonoInput = document.getElementById('cliente-telefono');
    const direccionInput = document.getElementById('cliente-direccion');

    if (nombreInput) {
        nombreInput.value = `${clienteActual.nombre} ${clienteActual.apellido || ''}`.trim();
        nombreInput.disabled = true; // Proteger campo
    }

    if (telefonoInput) {
        telefonoInput.value = clienteActual.telefono;
        telefonoInput.disabled = true; // Proteger campo
    }

    if (direccionInput) {
        direccionInput.value = clienteActual.nomenclatura_direccion || clienteActual.direccion || '';
        // No desactivar para permitir cambios si es necesario
    }
    
    // Prellenar datos de ubicación si están disponibles
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

    // Calcular precio de domicilio si hay datos de municipio
    if (clienteActual.municipio) {
        calcularPrecioDomicilio(clienteActual.municipio, clienteActual.barrio);
    }

    // Agregar indicador visual de datos guardados
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
            // Enfocar input cuando se muestra
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

        console.log('Ubicación GPS obtenida:', { lat, lng });

        // Hacer reverse geocoding
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
        
        if (error.code === 1) {
            mostrarNotificacionRapida('Permiso de ubicación denegado', 'warning');
        } else if (error.code === 2) {
            mostrarNotificacionRapida('No se pudo determinar tu ubicación', 'warning');
        } else if (error.code === 3) {
            mostrarNotificacionRapida('Tiempo de espera agotado obteniendo ubicación', 'warning');
        } else {
            mostrarNotificacionRapida('Error obteniendo ubicación', 'warning');
        }
    }
}

async function buscarDireccionAutocompletado(query) {
    // Debounce: esperar 500ms después de que el usuario deje de escribir
    clearTimeout(sugerenciasDireccionTimeout);
    
    if (!query || query.length < 3) {
        ocultarSugerenciasDireccion();
        return;
    }

    sugerenciasDireccionTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/delivery/suggestions?q=${encodeURIComponent(query)}`);
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
        <div 
            class="px-4 py-3 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
            onclick="seleccionarDireccionSugerida('${sug.place_id}')"
        >
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
            
            // Limpiar campo de búsqueda
            const inputBuscar = document.getElementById('buscar-direccion');
            if (inputBuscar) {
                inputBuscar.value = '';
            }
            
            mostrarNotificacionRapida('¡Dirección seleccionada exitosamente!', 'success');
        } else {
            mostrarNotificacionRapida('Error obteniendo detalles de la dirección', 'warning');
        }
    } catch (error) {
        console.error('Error seleccionando dirección:', error);
        mostrarNotificacionRapida('Error al seleccionar la dirección', 'warning');
    }
}

function actualizarResumenPrecio() {
    // Actualizar el resumen del precio en el modal de confirmación
    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 3000;
    const total = subtotal + domicilio;

    const resumenDomicilioEl = document.getElementById('resumen-domicilio');
    const confirmarTotalEl = document.getElementById('confirmar-total');

    if (resumenDomicilioEl) {
        resumenDomicilioEl.textContent = `$${formatPrice(domicilio)}`;
    }
    if (confirmarTotalEl) {
        confirmarTotalEl.textContent = `$${formatPrice(total)}`;
    }
    
    console.log('📊 Resumen actualizado:', { subtotal, domicilio, total });
}

async function calcularPrecioDomicilio(municipio, barrio) {
    try {
        const params = new URLSearchParams({
            municipio: municipio || ''
        });
        
        if (barrio) {
            params.append('barrio', barrio);
        }
        
        const response = await fetch(`${API_BASE_URL}/api/delivery/calcular-precio?${params}`);
        const resultado = await response.json();
        
        if (resultado.success) {
            // Actualizar precio global
            window.precioDomicilio = resultado.precio;
            localStorage.setItem('precioDomicilio', resultado.precio);
            
            // Actualizar resumen en el modal si está abierto
            actualizarResumenPrecio();
            
            console.log('💰 Precio de domicilio calculado:', {
                precio: resultado.precio,
                municipio: resultado.municipio,
                barrio: resultado.barrio,
                metodo: resultado.metodo_calculo
            });
            
            // Mostrar notificación
            let mensaje = `Precio de domicilio: $${formatPrice(resultado.precio)}`;
            if (resultado.metodo_calculo === 'barrio_especifico') {
                mensaje += ` (${barrio}, ${municipio})`;
            } else if (resultado.metodo_calculo === 'municipio_general') {
                mensaje += ` (${municipio})`;
            }
            mostrarNotificacionRapida(mensaje, 'info');
            
            return resultado.precio;
        } else {
            console.warn('⚠️ No se pudo calcular precio:', resultado.error);
            return window.precioDomicilio || 3000;
        }
    } catch (error) {
        console.error('❌ Error calculando precio de domicilio:', error);
        return window.precioDomicilio || 3000;
    }
}

function llenarDatosDireccion(data) {
    console.log('Llenando datos de dirección:', data);

    // Llenar campos visibles
    const direccionInput = document.getElementById('cliente-direccion');
    if (direccionInput) {
        const direccionCompleta = data.nomenclature || data.formatted_address || '';
        direccionInput.value = direccionCompleta;
    }

    // Llenar campos ocultos
    const latInput = document.getElementById('direccion-lat');
    const lngInput = document.getElementById('direccion-lng');
    const barrioInput = document.getElementById('direccion-barrio');
    const municipioInput = document.getElementById('direccion-municipio');
    const ciudadInput = document.getElementById('direccion-ciudad');

    if (latInput) latInput.value = data.lat || '';
    if (lngInput) lngInput.value = data.lng || '';
    if (barrioInput) barrioInput.value = data.neighborhood || '';
    if (municipioInput) municipioInput.value = data.municipality || '';  // Municipio (ej: Medellín)
    if (ciudadInput) ciudadInput.value = data.city || '';  // Departamento (ej: Antioquia)
    
    console.log('📍 Datos de geocodificación:', {
        barrio: data.neighborhood,
        municipio: data.municipality,
        ciudad: data.city,
        lat: data.lat,
        lng: data.lng
    });
    
    // Calcular precio de domicilio automáticamente
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

    // Cerrar carrito y abrir modal de confirmación
    document.getElementById('carrito-modal').classList.remove('active');

    // Renderizar resumen detallado
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
    const domicilio = window.precioDomicilio || 3000;
    const total = subtotal + domicilio;

    if (resumenSubtotal) resumenSubtotal.textContent = `$${formatPrice(subtotal)}`;
    const resumenDomicilioEl = document.getElementById('resumen-domicilio');
    const confirmarTotalEl = document.getElementById('confirmar-total');

    if (resumenDomicilioEl) resumenDomicilioEl.textContent = `$${formatPrice(domicilio)}`;
    if (confirmarTotalEl) confirmarTotalEl.textContent = `$${formatPrice(total)}`;

    // Resetear estado de búsqueda
    clienteActual = null;
    
    // Mostrar la sección de búsqueda
    const seccionBusqueda = document.getElementById('seccion-busqueda-cliente');
    if (seccionBusqueda) {
        seccionBusqueda.style.display = 'block';
    }
    
    // Limpiar campo de búsqueda
    const buscarTelefonoInline = document.getElementById('buscar-telefono-inline');
    if (buscarTelefonoInline) {
        buscarTelefonoInline.value = '';
    }
    
    // Limpiar campos del formulario
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
    document.getElementById('confirmar-modal').classList.remove('active');
}

async function enviarPedido(event) {
    event.preventDefault();

    const nombre = document.getElementById('cliente-nombre').value;
    const telefono = document.getElementById('cliente-telefono').value;
    const direccion = document.getElementById('cliente-direccion').value;
    const notas = document.getElementById('notas-entrega').value;
    const medioPago = document.querySelector('input[name="medio-pago"]:checked').value;
    
    const subtotal = carrito.reduce((sum, item) => sum + item.precio_total, 0);
    const domicilio = window.precioDomicilio || 3000;
    const total = subtotal + domicilio;

    const pedido = {
        tipo_pedido: 'domicilio',
        cliente_nombre: nombre,
        telefono_cliente: telefono,
        direccion_entrega: direccion,
        notas_entrega: notas,
        medio_pago: medioPago,
        // Incluir subtotal y domicilio por separado y el total que incluye domicilio
        subtotal: subtotal,
        valor_domicilio: domicilio,
        total_precio: total,
        total_con_descuento: total,
        items: carrito.map(item => ({
            producto_id: item.producto_id,
            tamano_id: item.tamano_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            comentarios: item.comentarios,
            adiciones: item.adiciones
        }))
    };
    
    try {
        // Si no hay cliente guardado, guardar los datos del formulario
        if (!clienteActual) {
            try {
                console.log('💾 Guardando datos del cliente para futuras compras...');
                
                // Obtener datos de geocodificación si están disponibles
                const latInput = document.getElementById('direccion-lat');
                const lngInput = document.getElementById('direccion-lng');
                const barrioInput = document.getElementById('direccion-barrio');
                const municipioInput = document.getElementById('direccion-municipio');
                const ciudadInput = document.getElementById('direccion-ciudad');

                const datosCliente = {
                    telefono: telefono,
                    nombre: nombre.split(' ')[0], // Primera palabra como nombre
                    apellido: nombre.split(' ').slice(1).join(' ') || '', // Resto como apellido
                    direccion: direccion,
                    nomenclatura_direccion: direccion,
                    ciudad: ciudadInput?.value || 'No especificado',
                    municipio: municipioInput?.value || 'No especificado',
                    barrio: barrioInput?.value || null,
                    latitud: latInput?.value ? parseFloat(latInput.value) : null,
                    longitud: lngInput?.value ? parseFloat(lngInput.value) : null,
                    referencias: notas
                };
                
                console.log('📤 Datos a enviar:', datosCliente);

                const respuestaCliente = await fetch(API_BASE_URL + '/api/delivery/usuario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosCliente)
                });
                
                if (respuestaCliente.ok) {
                    const resultadoCliente = await respuestaCliente.json();
                    console.log('✅ Cliente guardado correctamente:', resultadoCliente);
                } else {
                    const errorCliente = await respuestaCliente.json();
                    console.error('⚠️ Error guardando cliente:', errorCliente);
                }
            } catch (error) {
                console.error('❌ Error en la petición de guardado de cliente:', error);
                // No interrumpir el flujo de compra por error al guardar cliente
            }
        }

        const response = await fetch(API_BASE_URL + '/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedido)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al enviar el pedido');
        }
        
        const resultado = await response.json();
        
        // Pedido exitoso - mostrar mensaje con número de pedido
        const numeroPedido = resultado.numero_pedido || resultado.id;

        // Mostrar notificación de éxito mejorada
        const successModal = document.createElement('div');
        successModal.className = 'fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4 flex';
        successModal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-check-circle text-5xl text-green-600"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">¡Pedido Enviado!</h3>
                <p class="text-gray-600 mb-2">Número de pedido: <strong class="text-red-600">#${numeroPedido}</strong></p>
                <p class="text-gray-600 mb-6">Recibirás confirmación por WhatsApp con el estado de tu pedido.</p>
                <div class="bg-blue-50 rounded-lg p-4 mb-6">
                    <div class="flex items-center justify-center text-blue-800">
                        <i class="fas fa-clock mr-2"></i>
                        <span class="font-semibold">Tiempo estimado: 45-60 minutos</span>
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">
                    Entendido
                </button>
            </div>
        `;
        document.body.appendChild(successModal);

        // Limpiar carrito y cerrar modal
        carrito = [];
        actualizarContadorCarrito();
        cerrarModalConfirmar();

        // Auto-cerrar modal de éxito y recargar después de 3 segundos
        setTimeout(() => {
            if (successModal.parentElement) {
                successModal.remove();
            }
            window.location.reload();
        }, 3000);
        
    } catch (error) {
        console.error('Error:', error);

        // Mostrar error mejorado
        const errorModal = document.createElement('div');
        errorModal.className = 'fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4 flex';
        errorModal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-600"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-4">Error al Enviar Pedido</h3>
                <p class="text-gray-600 mb-6">${error.message || 'Ha ocurrido un error inesperado. Por favor intenta nuevamente.'}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
                    Intentar de Nuevo
                </button>
            </div>
        `;
        document.body.appendChild(errorModal);
    }
}

// ==================== SELECTOR RÁPIDO PARA PIZZAS ====================

function mostrarSelectorRapido(producto) {
    const selectorRapido = document.getElementById('selector-rapido-pizza');

    // Mostrar solo para pizzas hawaianas o productos que contengan "hawaiana"
    if (producto && producto.nombre && producto.nombre.toLowerCase().includes('hawaiana')) {
        selectorRapido.classList.remove('hidden');
    } else {
        selectorRapido.classList.add('hidden');
    }
}

function mostrarBotonesRapidosAdiciones(producto) {
    const botonesRapidos = document.getElementById('botones-rapidos-adiciones');
    const btnBorde = document.getElementById('btn-agregar-borde');
    const btnSegundoSabor = document.getElementById('btn-agregar-segundo-sabor');

    // Verificar si el producto tiene grupos de borde o segundo sabor
    let tieneBorde = false;
    let tieneSegundoSabor = false;

    // Buscar en los grupos de adiciones del producto
    if (producto && producto.grupos_adiciones) {
        producto.grupos_adiciones.forEach(grupoData => {
            const grupo = grupoData.grupo;
            if (grupo.nombre && grupo.nombre.toLowerCase().includes('borde')) {
                tieneBorde = true;
            }
            if (grupo.tipo === 'segundo_sabor') {
                tieneSegundoSabor = true;
            }
        });
    }

    // Mostrar/ocultar botones según disponibilidad
    if (btnBorde) {
        if (tieneBorde) {
            btnBorde.style.display = 'block';
        } else {
            btnBorde.style.display = 'none';
        }
    }

    if (btnSegundoSabor) {
        if (tieneSegundoSabor) {
            btnSegundoSabor.style.display = 'block';
        } else {
            btnSegundoSabor.style.display = 'none';
        }
    }

    // Mostrar el contenedor si al menos uno de los botones está disponible
    if (tieneBorde || tieneSegundoSabor) {
        botonesRapidos.classList.remove('hidden');
        console.log('Botones rápidos mostrados:', { tieneBorde, tieneSegundoSabor });
    } else {
        botonesRapidos.classList.add('hidden');
        console.log('Botones rápidos ocultos - no hay opciones disponibles');
    }
}

function mostrarGrupoAdicion(tipo) {
    // Buscar el grupo correspondiente y expandirlo
    const gruposContainer = document.getElementById('modal-grupos-adiciones');
    const grupos = gruposContainer.querySelectorAll('[id^="grupo-"]');

    let grupoEncontrado = null;

    if (tipo === 'borde') {
        // Buscar grupo que contenga "borde" en el nombre
        grupoEncontrado = Array.from(grupos).find(grupo => {
            const header = grupo.querySelector('h4');
            return header && header.textContent.toLowerCase().includes('borde');
        });
    } else if (tipo === 'segundo_sabor') {
        // Buscar grupo de tipo segundo_sabor
        grupoEncontrado = Array.from(grupos).find(grupo => {
            return grupo.id === 'grupo-segundo_sabor' || grupo.querySelector('h4')?.textContent.toLowerCase().includes('segundo sabor');
        });
    }

    if (grupoEncontrado) {
        // Expandir el grupo
        grupoEncontrado.classList.remove('hidden');

        // Hacer scroll al grupo
        grupoEncontrado.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Mostrar notificación
        const tipoTexto = tipo === 'borde' ? 'bordes' : 'segundos sabores';
        mostrarNotificacionRapida(`¡Sección de ${tipoTexto} expandida! Selecciona tus opciones.`, 'info');
    } else {
        mostrarNotificacionRapida(`No se encontraron opciones de ${tipo === 'borde' ? 'bordes' : 'segundos sabores'} para este producto.`, 'warning');
    }
}

function seleccionarConfiguracionRapida(tipo) {
    if (tipo === 'hawaiana') {
        // Configuración automática para pizza hawaiana
        // Tamaño: Personal (asumiendo que es el primero)
        // Adiciones: Piña y Jamón (si están disponibles)

        // Buscar y seleccionar el tamaño Personal
        const radioPersonal = document.querySelector('input[name="grupo-tamano"][value]');
        if (radioPersonal) {
            radioPersonal.checked = true;
            // Simular el evento change
            radioPersonal.dispatchEvent(new Event('change'));
        }

        // Buscar y seleccionar Piña
        const pinaOption = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(input => {
            const label = input.closest('label');
            return label && label.textContent.toLowerCase().includes('piña');
        });
        if (pinaOption) {
            pinaOption.checked = true;
            pinaOption.dispatchEvent(new Event('change'));
        }

        // Buscar y seleccionar Jamón
        const jamonOption = Array.from(document.querySelectorAll('input[type="checkbox"]')).find(input => {
            const label = input.closest('label');
            return label && label.textContent.toLowerCase().includes('jamón');
        });
        if (jamonOption) {
            jamonOption.checked = true;
            jamonOption.dispatchEvent(new Event('change'));
        }

        // Ocultar el selector rápido
        document.getElementById('selector-rapido-pizza').classList.add('hidden');

        // Mostrar notificación
        mostrarNotificacionRapida('¡Pizza Hawaiana configurada automáticamente!', 'success');

        // Recalcular total
        calcularTotalModal();
    }
}

function personalizarManualmente() {
    // Ocultar selector rápido y mostrar opciones normales
    document.getElementById('selector-rapido-pizza').classList.add('hidden');

    // Hacer scroll a las opciones de personalización
    const gruposContainer = document.getElementById('modal-grupos-adiciones');
    if (gruposContainer) {
        gruposContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function mostrarNotificacionRapida(mensaje, tipo) {
    // Crear notificación temporal
    const notif = document.createElement('div');
    notif.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 ${
        tipo === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
    }`;
    notif.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i>
            <span>${mensaje}</span>
        </div>
    `;

    document.body.appendChild(notif);

    // Animar entrada
    setTimeout(() => notif.classList.remove('translate-x-full'), 100);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        notif.classList.add('translate-x-full');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ==================== UTILIDADES ====================

// Función para cargar productos vinculados
async function cargarProductosVinculados(productoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}/productos-vinculados`);
        const productosVinculados = await response.json();

        console.log('Productos vinculados cargados:', productosVinculados);

        // Agregar los productos vinculados a los precios del producto actual
        if (!productoActual.precios) {
            productoActual.precios = [];
        }

        // Procesar cada tipo de vinculación
        Object.keys(productosVinculados).forEach(tipo => {
            productosVinculados[tipo].forEach(producto => {
                // Agregar precio dinámico para este producto vinculado
                const precioExistente = productoActual.precios.find(p => String(p.id) === String(producto.id));
                if (!precioExistente) {
                    productoActual.precios.push({
                        id: producto.id,
                        tamano_nombre: producto.nombre,
                        precio: producto.precio || 0,
                        valor_numerico: null,
                        descripcion: producto.descripcion || null,
                        tipo_vinculacion: tipo,
                        vinculacion: producto.vinculacion
                    });
                }
            });
        });

    } catch (error) {
        console.error('Error cargando productos vinculados:', error);
    }
}

// Función para crear grupos dinámicos desde vinculaciones
function crearGruposDesdeVinculaciones(vinculaciones) {
    const gruposPorTipo = {};

    vinculaciones.forEach(vinc => {
        const tipo = vinc.tipo_vinculacion;
        if (!gruposPorTipo[tipo]) {
            gruposPorTipo[tipo] = {
                grupo: {
                    id: `vinc-${tipo}`,
                    nombre: tipo.charAt(0).toUpperCase() + tipo.slice(1) + 's',
                    descripcion: `Productos ${tipo}s vinculados`,
                    tipo: tipo,
                    minimo: vinc.obligatorio ? 1 : 0,
                    maximo: vinc.maximo_seleccion > 0 ? vinc.maximo_seleccion : 99, // Múltiples opciones
                    orden: 10,
                    activo: true,
                    es_dinamico: true
                },
                opciones: []
            };
        }

        gruposPorTipo[tipo].opciones.push({
            id: vinc.producto_adicional.id,
            nombre: vinc.producto_adicional.nombre,
            descripcion: vinc.producto_adicional.categoria || '',
            precio_adicional: vinc.producto_adicional.precio || 0,
            disponible: true,
            orden: vinc.orden || 0
        });
    });

    return Object.values(gruposPorTipo);
}

function formatPrice(price) {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return Math.round(numPrice).toLocaleString('es-CO');
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
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>No se encontraron productos con "${busqueda}"</p>
            </div>
        `;
        return;
    }

    container.innerHTML = productosFiltrados.map(producto => `
        <div class="product-card bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100" onclick="abrirModalProducto(${producto.id})">
            <div class="product-image-wrapper">
                ${producto.imagen_url ? `
                    <img src="${producto.imagen_url}" alt="${producto.nombre}">
                ` : `
                    <div class="bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center w-full h-full">
                        <i class="fas fa-pizza-slice text-6xl text-gray-400"></i>
                    </div>
                `}
            </div>
                <h3 class="font-bold text-lg mb-2 text-gray-800 line-clamp-2">${producto.nombre}</h3>
                ${producto.descripcion ? `<p class="text-sm text-gray-600 mb-4 line-clamp-2">${producto.descripcion}</p>` : ''}
                <div class="flex justify-between items-center">
                    <div>
                        <span class="text-lg font-semibold text-gray-700">
                            Personalizar
                        </span>
                        ${producto.precios && producto.precios.length > 0 ? `
                            <p class="text-xs text-gray-500">Desde $${formatPrice(Math.min(...producto.precios.map(p => p.precio || 0)))}</p>
                        ` : ''}
                    </div>
                    <button class="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105">
                        <i class="fas fa-plus mr-1"></i>
                        <span class="hidden sm:inline">Agregar</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}


