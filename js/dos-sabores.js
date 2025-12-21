// ==================== DOS SABORES ====================
// Funcionalidad para pizzas de dos sabores (mitad y mitad)

let segundoSaborSeleccionado = null;
let saboresDisponibles = [];
let allowedTypesForCombined = [];
let combinadoSelections = {}; // { 'TRADICIONAL': {id,nombre}, 'ESPECIAL': {...} }
// modo: 2 => mitad/mitad (un segundo sabor). 3 => permitir hasta 2 segundos sabores (total 3 sabores)
let modoDosSabores = 2;
let segundosSaboresSeleccionados = []; // para modo 3

/**
 * Cargar los sabores disponibles para un producto
 */
async function cargarSaboresDisponibles(producto) {
    if (!window.supabaseClient) {
        console.error('supabaseClient no disponible');
        return [];
    }

    try {
        const sabores = await window.supabaseClient.getSabores(producto.id);

        // Determinar si es una pizza combinada y qué tipos permite
        // Lógica portada del backend (api_routes.py)
        let isCombinada = false;
        let allowedTypes = [];

        const prodNombre = (producto.nombre || '').toUpperCase();
        const prodCategoria = (producto.categoria?.nombre || '').toUpperCase();

        if (prodCategoria.includes('COMBINAD') || prodNombre.includes('/')) {
            isCombinada = true;

            // Extraer tipos del nombre (ej: Pizza Especial / Premium -> [ESPECIAL, PREMIUM])
            const parts = prodNombre.split(/[\/\\-]/);
            const mapTipo = (token) => {
                const t = token.trim();
                if (t.includes('ESPECIAL')) return 'ESPECIAL';
                if (t.includes('PREMI')) return 'PREMIUM';
                if (t.includes('TRADIC')) return 'TRADICIONAL';
                return null;
            };

            parts.forEach(p => {
                const m = mapTipo(p);
                if (m && !allowedTypes.includes(m)) allowedTypes.push(m);
            });
        }

        // Enriquecer los sabores con su tipo canónico para el renderizado
        const saboresEnriquecidos = sabores.map(s => {
            const catNombre = (s.categoria?.nombre || s.sabor_categoria || '').toUpperCase();
            let tipoCanonico = null;
            if (catNombre.includes('ESPECIAL')) tipoCanonico = 'ESPECIAL';
            else if (catNombre.includes('PREMI')) tipoCanonico = 'PREMIUM';
            else if (catNombre.includes('TRADIC')) tipoCanonico = 'TRADICIONAL';
            else {
                // Por nombre
                const n = s.nombre.toUpperCase();
                if (n.includes('ESPECIAL')) tipoCanonico = 'ESPECIAL';
                else if (n.includes('PREMI')) tipoCanonico = 'PREMIUM';
                else if (n.includes('TRADIC')) tipoCanonico = 'TRADICIONAL';
            }
            return { ...s, tipo_canonico: tipoCanonico };
        });

        const data = {
            combined: isCombinada,
            allowed_types: allowedTypes,
            sabores: saboresEnriquecidos
        };

        saboresDisponibles = data.sabores;
        allowedTypesForCombined = data.allowed_types;

        console.log('Sabores cargados vía Supabase:', data);
        return data;

    } catch (error) {
        console.error('Error cargando sabores vía Supabase:', error);
        return [];
    }
}

/**
 * Mostrar la sección de dos sabores en el modal si el producto lo permite
 */
async function mostrarSeccionDosSabores(producto) {
    const container = document.getElementById('seccion-dos-sabores');
    if (!container) {
        console.log('Contenedor seccion-dos-sabores no encontrado');
        return;
    }

    // Verificar si el producto permite dos sabores
    if (!producto || !producto.permite_dos_sabores) {
        container.classList.add('hidden');
        container.innerHTML = '';
        segundoSaborSeleccionado = null;
        return;
    }

    // Cargar sabores disponibles - pasando el objeto producto para la lógica combinada
    const saboresResp = await cargarSaboresDisponibles(producto);
    const sabores = Array.isArray(saboresResp) ? saboresResp : (saboresResp.sabores || []);

    if (!sabores || sabores.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    // Mostrar la sección
    container.classList.remove('hidden');

    // Construir HTML condicional para modo 3 según bandera del producto
    const modo3Html = producto.permite_tres_sabores ? `
                <label class="inline-flex items-center">
                    <input type="radio" name="modo-dos-sabores" value="3" onchange="setModoDosSabores(3)" class="form-radio">
                    <span class="ml-2 text-sm">3 sabores (tercios)</span>
                </label>
    ` : '';

    container.innerHTML = `
        <div class="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 mt-4">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <i class="fas fa-pizza-slice text-white"></i>
                </div>
                <div>
                    <h4 class="font-bold text-gray-800">¿Quieres la pizza de dos sabores?</h4>
                    <p class="text-sm text-gray-600">Mitad ${producto.nombre} + mitad otro sabor</p>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="inline-flex items-center mr-4">
                    <input type="radio" name="modo-dos-sabores" value="2" checked onchange="setModoDosSabores(2)" class="form-radio">
                    <span class="ml-2 text-sm">2 sabores (mitad y mitad)</span>
                </label>
                ${modo3Html}
            </div>

            <label class="flex items-center gap-3 cursor-pointer mb-3 p-2 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition">
                <input type="checkbox" id="checkbox-dos-sabores" onchange="toggleDosSabores()" class="w-5 h-5 accent-orange-500">
                <span class="font-medium text-gray-700">Sí, quiero dos/mas sabores</span>
            </label>

            <div id="selector-segundo-sabor" class="hidden">
                <p class="text-sm text-gray-600 mb-2"><i class="fas fa-hand-pointer mr-1"></i>Selecciona el/los sabores:</p>
                <div id="lista-sabores-disponibles">
                    <!-- Si el producto es combinada y allowedTypesForCombined tiene tipos, renderizar selectores por tipo -->
                    ${(allowedTypesForCombined && allowedTypesForCombined.length >= 2) ? (
            allowedTypesForCombined.map((tipo) => {
                const tipoLower = tipo.toLowerCase();
                const opciones = sabores.filter(s => (s.tipo_canonico || '').toString().toUpperCase() === tipo.toUpperCase());
                return `
                                <div class="mb-3">
                                    <p class="font-medium text-gray-700 mb-2">Sabor para ${tipo}:</p>
                                    <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto" data-tipo="${tipo}">
                                        ${opciones.map(sabor => `
                                            <div class="sabor-opcion p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition flex items-center gap-2"
                                                onclick="seleccionarSegundoSaborCombinado(${sabor.sabor_producto_id}, '${sabor.nombre.replace(/'/g, "\\'")}', this, '${tipo}')">
                                                ${sabor.imagen_url ? `<img src="${sabor.imagen_url}" class="w-10 h-10 rounded object-cover">` : `<div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center"><i class="fas fa-pizza-slice text-gray-400"></i></div>`}
                                                <span class="text-sm font-medium text-gray-700 truncate">${sabor.nombre}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `
            }).join('')
        ) : (
            // Forma antigua: mostrar lista plana
            `<div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">` +
            sabores.map(sabor => `
                            <div class="sabor-opcion p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition flex items-center gap-2"
                                 onclick="seleccionarSegundoSabor(${sabor.sabor_producto_id}, '${sabor.nombre.replace(/'/g, "\\'")}', this, '${(sabor.tipo || '').replace(/'/g, "\\'")}')">
                                ${sabor.imagen_url ? `<img src="${sabor.imagen_url}" class="w-10 h-10 rounded object-cover">` : `<div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center"><i class="fas fa-pizza-slice text-gray-400"></i></div>`}
                                <span class="text-sm font-medium text-gray-700 truncate">${sabor.nombre}</span>
                            </div>
                        `).join('') + `</div>`
        )}
                </div>
                <div id="sabor-seleccionado-info" class="hidden mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-500"></i>
                            <span class="font-medium text-green-700">Segundo sabor: <span id="nombre-sabor-seleccionado"></span></span>
                        </div>
                        <button onclick="quitarSegundoSabor()" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div id="sabores-seleccionados-info" class="hidden mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-check-circle text-green-500"></i>
                            <span class="font-medium text-green-700">Sabores seleccionados: <span id="nombres-sabores-seleccionados"></span></span>
                        </div>
                        <button onclick="quitarSegundoSabor()" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Selección específica cuando el producto es combinada (por tipo)
function seleccionarSegundoSaborCombinado(saborId, saborNombre, elemento, tipo) {
    // marcar visualmente dentro del contenedor del tipo
    const container = elemento.closest('[data-tipo]') || elemento.parentElement;
    // deselect previous in this tipo
    const siblings = container.querySelectorAll('.sabor-opcion');
    siblings.forEach(s => s.classList.remove('border-orange-500', 'bg-orange-100'));
    elemento.classList.add('border-orange-500', 'bg-orange-100');

    combinadoSelections[tipo] = { id: saborId, nombre: saborNombre };

    // mostrar info compacta
    const infoContainer = document.getElementById('sabores-seleccionados-info');
    const nombresSpan = document.getElementById('nombres-sabores-seleccionados');
    if (infoContainer && nombresSpan) {
        const names = Object.keys(combinadoSelections).map(k => combinadoSelections[k].nombre);
        nombresSpan.textContent = names.join(', ');
        if (names.length > 0) infoContainer.classList.remove('hidden'); else infoContainer.classList.add('hidden');
    }
}

/**
 * Toggle para mostrar/ocultar el selector de segundo sabor
 */
function toggleDosSabores() {
    const checkbox = document.getElementById('checkbox-dos-sabores');
    const selector = document.getElementById('selector-segundo-sabor');

    if (checkbox && checkbox.checked) {
        selector.classList.remove('hidden');
    } else {
        selector.classList.add('hidden');
        quitarSegundoSabor();
    }
}

/**
 * Seleccionar el segundo sabor
 */
function seleccionarSegundoSabor(saborId, saborNombre, elemento, saborTipo) {
    // comportamiento depende del modo
    if (modoDosSabores === 2) {
        segundoSaborSeleccionado = { id: saborId, nombre: saborNombre };

        // Quitar selección anterior
        document.querySelectorAll('.sabor-opcion').forEach(el => {
            el.classList.remove('border-orange-500', 'bg-orange-100');
        });

        // Marcar el seleccionado
        elemento.classList.add('border-orange-500', 'bg-orange-100');

        // Mostrar info del sabor seleccionado
        const infoContainer = document.getElementById('sabor-seleccionado-info');
        const nombreSpan = document.getElementById('nombre-sabor-seleccionado');
        if (infoContainer && nombreSpan) {
            nombreSpan.textContent = saborNombre;
            infoContainer.classList.remove('hidden');
        }
        console.log('Segundo sabor seleccionado:', segundoSaborSeleccionado);
    } else {
        // modo 3: permitir seleccionar hasta 2 sabores (segundosSaboresSeleccionados)
        const idx = segundosSaboresSeleccionados.findIndex(s => s.id === saborId);
        if (idx !== -1) {
            // ya seleccionado: deseleccionar
            segundosSaboresSeleccionados.splice(idx, 1);
            elemento.classList.remove('border-orange-500', 'bg-orange-100');
        } else {
            // intentar agregar
            if (segundosSaboresSeleccionados.length >= 2) {
                // mostrar notificación rápida
                if (typeof mostrarNotificacionRapida === 'function') {
                    mostrarNotificacionRapida('Solo puedes seleccionar hasta 2 sabores adicionales en modo 3 sabores.', 'warning');
                }
                return;
            }
            // agregar con tipo normalizado
            const tipoNorm = (saborTipo || '').toString().trim().toLowerCase();
            segundosSaboresSeleccionados.push({ id: saborId, nombre: saborNombre, tipo: tipoNorm });
            elemento.classList.add('border-orange-500', 'bg-orange-100');

            // Si ahora hay 2 seleccionados, validar la pareja permitida
            if (segundosSaboresSeleccionados.length === 2) {
                const t1 = segundosSaboresSeleccionados[0].tipo || '';
                const t2 = segundosSaboresSeleccionados[1].tipo || '';
                const allowed = new Set([
                    'especial|premium', 'premium|especial',
                    'tradicional|especial', 'especial|tradicional',
                    'tradicional|premium', 'premium|tradicional'
                ]);
                const pair = `${t1}|${t2}`;
                if (!allowed.has(pair)) {
                    // invalid combination: deshacer la última selección
                    segundosSaboresSeleccionados.pop();
                    elemento.classList.remove('border-orange-500', 'bg-orange-100');
                    if (typeof mostrarNotificacionRapida === 'function') {
                        mostrarNotificacionRapida('Combinación no permitida. En modo 3 sabores, los dos sabores adicionales deben ser: Especial+Premium, Tradicional+Especial o Tradicional+Premium.', 'warning');
                    } else {
                        alert('Combinación no permitida. En modo 3 sabores, los dos sabores adicionales deben ser: Especial+Premium, Tradicional+Especial o Tradicional+Premium.');
                    }
                }
            }
        }

        // Actualizar info mostrada
        const infoContainer = document.getElementById('sabores-seleccionados-info');
        const nombresSpan = document.getElementById('nombres-sabores-seleccionados');
        if (infoContainer && nombresSpan) {
            nombresSpan.textContent = segundosSaboresSeleccionados.map(s => s.nombre).join(', ');
            if (segundosSaboresSeleccionados.length > 0) infoContainer.classList.remove('hidden'); else infoContainer.classList.add('hidden');
        }
        console.log('Segundos sabores seleccionados (modo 3):', segundosSaboresSeleccionados);
    }

    // Recalcular total
    if (typeof calcularTotalModal === 'function') {
        calcularTotalModal();
    }
}

/**
 * Quitar el segundo sabor seleccionado
 */
function quitarSegundoSabor() {
    segundoSaborSeleccionado = null;
    segundosSaboresSeleccionados = [];

    // Quitar todas las selecciones visuales
    document.querySelectorAll('.sabor-opcion').forEach(el => {
        el.classList.remove('border-orange-500', 'bg-orange-100');
    });

    // Ocultar info
    const infoContainer = document.getElementById('sabor-seleccionado-info');
    if (infoContainer) infoContainer.classList.add('hidden');
    const infoMulti = document.getElementById('sabores-seleccionados-info');
    if (infoMulti) infoMulti.classList.add('hidden');

    // Recalcular total
    if (typeof calcularTotalModal === 'function') {
        calcularTotalModal();
    }
}

/**
 * Obtener el segundo sabor seleccionado (para usar al agregar al carrito)
 */
function getSegundoSaborSeleccionado() {
    const checkbox = document.getElementById('checkbox-dos-sabores');
    if (!checkbox || !checkbox.checked) return null;

    if (modoDosSabores === 2) {
        // Si es producto combinada con tipos, devolver las selecciones por tipo
        if (allowedTypesForCombined && allowedTypesForCombined.length > 0) {
            // devolver array en el orden de allowedTypesForCombined
            return allowedTypesForCombined.map(t => combinadoSelections[t] || null);
        }
        return segundoSaborSeleccionado || null;
    }
    // modo 3 -> devolver array (puede ser vacio)
    return segundosSaboresSeleccionados.slice();
}

/**
 * Resetear el estado de dos sabores
 */
function resetearDosSabores() {
    segundoSaborSeleccionado = null;
    saboresDisponibles = [];
    segundosSaboresSeleccionados = [];
    combinadoSelections = {};
    allowedTypesForCombined = [];

    const container = document.getElementById('seccion-dos-sabores');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}

// Cambiar modo de dos sabores (2 o 3)
function setModoDosSabores(modo) {
    modoDosSabores = parseInt(modo) === 3 ? 3 : 2;
    // reset visualizaciones relacionadas
    quitarSegundoSabor();
}
