// ==================== DOS SABORES ====================
// Funcionalidad para pizzas de dos sabores (mitad y mitad)

let segundoSaborSeleccionado = null;
let saboresDisponibles = [];

/**
 * Cargar los sabores disponibles para un producto
 */
async function cargarSaboresDisponibles(productoId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${productoId}/sabores`);
        if (response.ok) {
            saboresDisponibles = await response.json();
            console.log('Sabores disponibles cargados:', saboresDisponibles);
            return saboresDisponibles;
        }
        return [];
    } catch (error) {
        console.error('Error cargando sabores:', error);
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

    // Cargar sabores disponibles
    const sabores = await cargarSaboresDisponibles(producto.id);
    
    if (sabores.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    // Mostrar la sección
    container.classList.remove('hidden');
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
            
            <label class="flex items-center gap-3 cursor-pointer mb-3 p-2 bg-white rounded-lg border border-orange-200 hover:border-orange-400 transition">
                <input type="checkbox" id="checkbox-dos-sabores" onchange="toggleDosSabores()" class="w-5 h-5 accent-orange-500">
                <span class="font-medium text-gray-700">Sí, quiero dos sabores</span>
            </label>
            
            <div id="selector-segundo-sabor" class="hidden">
                <p class="text-sm text-gray-600 mb-2"><i class="fas fa-hand-pointer mr-1"></i>Selecciona el segundo sabor:</p>
                <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto" id="lista-sabores-disponibles">
                    ${sabores.map(sabor => `
                        <div class="sabor-opcion p-2 border border-gray-200 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition flex items-center gap-2"
                             onclick="seleccionarSegundoSabor(${sabor.sabor_producto_id}, '${sabor.nombre.replace(/'/g, "\\'")}', this)">
                            ${sabor.imagen_url ? 
                                `<img src="${sabor.imagen_url}" class="w-10 h-10 rounded object-cover">` : 
                                `<div class="w-10 h-10 rounded bg-gray-200 flex items-center justify-center"><i class="fas fa-pizza-slice text-gray-400"></i></div>`
                            }
                            <span class="text-sm font-medium text-gray-700 truncate">${sabor.nombre}</span>
                        </div>
                    `).join('')}
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
            </div>
        </div>
    `;
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
function seleccionarSegundoSabor(saborId, saborNombre, elemento) {
    segundoSaborSeleccionado = {
        id: saborId,
        nombre: saborNombre
    };
    
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
    
    // Recalcular total
    if (typeof calcularTotalModal === 'function') {
        calcularTotalModal();
    }
    
    console.log('Segundo sabor seleccionado:', segundoSaborSeleccionado);
}

/**
 * Quitar el segundo sabor seleccionado
 */
function quitarSegundoSabor() {
    segundoSaborSeleccionado = null;
    
    // Quitar todas las selecciones visuales
    document.querySelectorAll('.sabor-opcion').forEach(el => {
        el.classList.remove('border-orange-500', 'bg-orange-100');
    });
    
    // Ocultar info
    const infoContainer = document.getElementById('sabor-seleccionado-info');
    if (infoContainer) {
        infoContainer.classList.add('hidden');
    }
    
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
    if (checkbox && checkbox.checked && segundoSaborSeleccionado) {
        return segundoSaborSeleccionado;
    }
    return null;
}

/**
 * Resetear el estado de dos sabores
 */
function resetearDosSabores() {
    segundoSaborSeleccionado = null;
    saboresDisponibles = [];
    
    const container = document.getElementById('seccion-dos-sabores');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}
