// Estado global para el pedido
let currentTable = null;
let orders = {};
let allRecipes = [];
let currentCart = [];
let tableOrders = {}; // Almacenar pedidos por mesa

// Función para obtener el carrito actual (expuesta globalmente)
window.getCurrentCart = function() {
    return currentCart;
};

// Referencias a los contenedores de vista (pueden ser null en modo domicilio)
const navBar = document.getElementById('nav-bar');
const tableView = document.getElementById('table-view');
const mainMenu = document.getElementById('main-menu-view');
const adminPanelView = document.getElementById('admin-panel-view');
const checkoutBtn = document.getElementById('checkout-btn');
const headerText = document.getElementById('header-text');

// Función para formatear precios como enteros
function formatPrice(price) {
    // Ahora los precios vienen ya en pesos enteros desde el backend
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return Math.round(numPrice).toLocaleString('es-CO');
}

// Iniciar la app mostrando la vista de selección de mesa
document.addEventListener('DOMContentLoaded', async () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.classList.remove('opacity-0');
        await loadRecipes();
        showView('table-view');
    } else {
        // Modo domicilio - solo cargar recetas
        await loadRecipes();
    }
});

// Cargar todas las recetas desde la API
async function loadRecipes() {
    try {
        // Usar el endpoint de productos dinÃ¡micos en lugar de recipes obsoleto
        const response = await fetch(API_BASE_URL + '/api/productos-publicos');
        if (!response.ok) throw new Error('Error al cargar productos');
        const result = await response.json();
        
        // Convertir productos dinÃ¡micos a formato compatible con el cÃ©Â³digo existente
        allRecipes = [];
        if (result.success && result.data) {
            result.data.forEach(producto => {
                // Crear una "receta" por cada precio/tamaÃ©Â±o del producto
                if (producto.precios && producto.precios.length > 0) {
                    producto.precios.forEach(precio => {
                        allRecipes.push({
                            id: `${producto.id}_${precio.id}`,
                            product_id: producto.id,
                            name: producto.nombre,
                            description: producto.descripcion || '',
                            size: precio.tamano_nombre || 'única',
                            sale_price: parseFloat(precio.precio) || 0,
                            category: producto.categoria_nombre,
                            image_url: producto.imagen_url,
                            permite_dos_sabores: producto.permite_dos_sabores
                        });
                    });
                } else {
                    // Producto sin precios dinÃ¡micos
                    allRecipes.push({
                        id: producto.id,
                        product_id: producto.id,
                        name: producto.nombre,
                        description: producto.descripcion || '',
                        size: 'única',
                        sale_price: producto.precio_base || 0,
                        category: producto.categoria_nombre,
                        image_url: producto.imagen_url,
                        permite_dos_sabores: producto.permite_dos_sabores
                    });
                }
            });
        }
        console.log('Productos cargados:', allRecipes.length);
    } catch (error) {
        console.error('Error cargando productos:', error);
        allRecipes = [];
    }
}

// Helper function to switch views
function showView(viewId) {
    stopOrderManagementUpdates();
    
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.style.display = 'block';
    }
    
    if (navBar) navBar.classList.remove('hidden');
    if (checkoutBtn) checkoutBtn.style.display = 'none';

    if (viewId === 'main-menu-view') {
        if (checkoutBtn) checkoutBtn.style.display = 'block';
        loadAllCategories();
        updateCartDisplay();
    }
}

function showTableView() {
    currentTable = null;
    if (headerText) headerText.textContent = `Selecciona tu mesa para comenzar.`;
    showView('table-view');
}

function startOrder(orderType) {
    currentTable = orderType;
    
    // Inicializar pedido para la mesa si no existe
    if (!tableOrders[currentTable]) {
        tableOrders[currentTable] = {
            cart: [],
            status: 'Pendiente',
            total: 0,
            created_at: new Date().toISOString()
        };
    }
    
    // Cargar el carrito existente para esta mesa
    currentCart = [...(tableOrders[currentTable].cart || [])];
    
    showView('main-menu-view');
    
    // Actualizar display de mesa actual
    const currentTableDisplay = document.getElementById('current-table-display');
    if (currentTableDisplay) {
        currentTableDisplay.textContent = (typeof currentTable === 'number') ? `Mesa ${currentTable}` : currentTable;
    }
    if (headerText) {
        headerText.textContent = (typeof currentTable === 'number') ? `Tu pedido para la Mesa ${currentTable}.` : `Tu pedido "Para Llevar".`;
    }
    
    // Actualizar el botón del carrito con los items existentes
    updateCartDisplay();
}

// Función para alternar categorÃ©Â­as
async function toggleCategory(categoryId) {
    const content = document.getElementById(`${categoryId}-content`);
    const icon = document.getElementById(`${categoryId}-icon`);
    
    // Cerrar todas las otras categorÃ©Â­as
    document.querySelectorAll('.category-content').forEach(cat => {
        if (cat.id !== `${categoryId}-content`) {
            cat.style.display = 'none';
            const otherIcon = document.getElementById(cat.id.replace('-content', '-icon'));
            if (otherIcon) {
                otherIcon.classList.remove('rotate-180');
            }
        }
    });
    
    // Alternar la categorÃ©Â­a actual
    if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        icon.classList.add('rotate-180');
        await loadCategoryProducts(categoryId);
    } else {
        content.style.display = 'none';
        icon.classList.remove('rotate-180');
    }
}

// Cargar todas las categorÃ©Â­as al inicio
async function loadAllCategories() {
    try {
        // Obtener categorías activas desde la API
        const response = await fetch(API_BASE_URL + '/api/categorias-activas');
        if (!response.ok) throw new Error('Error al cargar categorías');

        const result = await response.json();
        if (!result.success) throw new Error('Error en respuesta de categorías');

        const categorias = result.data;

        // Limpiar contenedor de categorías
        const menuContainer = document.getElementById('main-menu-view');
        if (!menuContainer) return;

        // Encontrar el contenedor específico donde se renderizan las categorías
        // (en la plantilla existe un <div class="space-y-6"> para esto)
        const categoriesWrapper = menuContainer.querySelector('.space-y-6');
        if (!categoriesWrapper) return;

        // Limpiar contenido previo para evitar duplicados cuando se vuelve a cargar la vista
        categoriesWrapper.innerHTML = '';

        // Crear categorÃ©Â­as dinÃ¡micamente
        categorias.forEach(categoria => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'menu-category bg-gray-700 rounded-2xl shadow-sm border border-gray-600 overflow-hidden';

            // Usar el nombre de la categorÃ©Â­a directamente como identificador
            const tipoCategoria = categoria.nombre.toLowerCase();

            categoryDiv.innerHTML = `
                <div class="category-header p-6 flex items-center space-x-6 cursor-pointer" onclick="toggleCategory('${tipoCategoria}')">
                    <!-- Mostrar icono definido en la categoría; si no hay, usar emoji como fallback -->
                    <div class="w-24 h-24 rounded-full shadow-lg flex items-center justify-center text-white text-3xl" style="background:#FF4500">
                        <i class="${categoria.icono || 'fas fa-pizza-slice'}"></i>
                    </div>
                    <div class="flex-1">
                        <h2 class="text-2xl font-bold text-white">${categoria.nombre}</h2>
                        <p class="text-gray-400 mt-1">${categoria.descripcion || 'Productos disponibles'}</p>
                    </div>
                    <i class="fas fa-chevron-down text-gray-400 transform transition-transform" id="${tipoCategoria}-icon"></i>
                </div>
                <div id="${tipoCategoria}-content" class="category-content p-6 bg-gray-800 border-t border-gray-700">
                    <div class="space-y-4">
                        <h3 class="text-lg font-bold text-white mb-4">Selecciona tu ${categoria.nombre.toLowerCase()}</h3>
                        <div id="${tipoCategoria}-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
                    </div>
                </div>
            `;

            // Agregar la tarjeta de categorÃ©Â­a dentro del wrapper limpiado
            categoriesWrapper.appendChild(categoryDiv);
        });

        console.log(`Categorías cargadas dinámicamente: ${categorias.length}`);

    } catch (error) {
        console.error('Error cargando categorías:', error);
        // Fallback: mostrar mensaje de error
        const menuContainer = document.getElementById('main-menu-view');
        if (menuContainer) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4 m-4';
            errorDiv.innerHTML = '<p class="text-red-300">Error al cargar categorías. Intente recargar la página.</p>';
            menuContainer.appendChild(errorDiv);
        }
    }
}

// Cargar pizzas por tipo específico desde la nueva API
async function loadPizzasByType(tipoPizza, gridId) {
    try {
        console.log(`Cargando pizzas tipo: ${tipoPizza}`);
        const response = await fetch(`${API_BASE_URL}/api/productos/tipo/${tipoPizza}`);
        if (!response.ok) throw new Error(`Error al cargar pizzas ${tipoPizza}`);
        
        const productos = await response.json();
        console.log(`Pizzas ${tipoPizza} encontradas:`, productos.length);
        
        // Convertir productos a formato recipe para compatibilidad
        const recipes = [];
        productos.forEach(producto => {
            // Incluir todos los productos que tengan precios (pizzas, calzones, bebidas, etc.)
            if (producto.precios && producto.precios.length > 0) {
                producto.precios.forEach(precio => {
                    // Determinar el prefijo según el tipo de producto
                    // IMPORTANTE: El orden importa - verificar primero los casos mÃ¡s específicos
                    let prefix = '';
                    if (producto.categoria_nombre === 'Calzone') {
                        prefix = 'Calzone ';
                    } else if (producto.categoria_nombre === 'Pastas') {  // Plural en la BD
                        prefix = '';  // Las pastas no necesitan prefijo, ya tienen nombre completo
                    } else if (producto.categoria_nombre === 'Pasta') {   // Por si acaso tambiÃ©Â©n singular
                        prefix = '';
                    } else if (producto.categoria_nombre === 'Maicitos') {
                        prefix = '';
                    } else if (producto.categoria_nombre === 'Lasana') {
                        prefix = '';
                    } else if (producto.es_bebida) {
                        prefix = '';
                    } else if (producto.es_pizza) {
                        prefix = 'Pizza ';
                    } else if (producto.es_adicion) {
                        prefix = 'Adicional ';
                    } else {
                        prefix = '';
                    }
                    
                    // Para bebidas y productos sin tamaÃ©Â±o, usar precio Ã©Âºnico
                    const size = precio.tamano_nombre ? precio.tamano_nombre.toLowerCase() : 'unico';
                    const displayName = precio.tamano_nombre ? 
                        `${prefix}${producto.nombre}` : 
                        `${prefix}${producto.nombre}`;
                    
                    recipes.push({
                        id: precio.tamano_id ? `${producto.id}_${precio.tamano_id}` : `${producto.id}_unico`,
                        name: displayName,
                        size: size,
                        description: producto.descripcion || 'Delicioso producto',
                        sale_price: parseFloat(precio.precio) || 0,
                        category: tipoPizza,
                        tipo_producto: producto.es_pizza ? 'pizza' : (producto.es_bebida ? 'bebida' : 'otro'),
                        producto_id: producto.id,
                        tamano_id: precio.tamano_id,
                        es_bebida: producto.es_bebida
                    });
                });


            }
        });
        
        renderPizzaCategory(recipes, gridId);
        return recipes;
    } catch (error) {
        console.error(`Error cargando pizzas ${tipoPizza}:`, error);
        return [];
    }
}

// Cargar productos por categorÃ©Â­a
async function loadCategoryProducts(categoryId) {
    // El categoryId ahora viene del nombre de la categorÃ©Â­a (ej: "pizza", "bebidas", "adiciones")
    // Necesitamos mapearlo al tipo correcto para la API
    const categoryTypeMap = {
        'pizza': 'especial', // Por defecto para pizzas
        'bebidas': 'bebidas',
        'adiciones': 'adiciones'
    };

    const tipoPizza = categoryTypeMap[categoryId] || categoryId;
    const gridId = `${categoryId}-grid`;

    // Para categorÃ©Â­as dinÃ¡micas, cargar productos directamente desde la API de productos pÃ©Âºblicos
    // filtrando por categorÃ©Â­a
    try {
        // Primero necesitamos obtener el ID numérico de la categoría desde el nombre
        const categoriasResponse = await fetch(API_BASE_URL + '/api/categorias-activas');
        if (!categoriasResponse.ok) throw new Error('Error al obtener categorías');

        const categoriasResult = await categoriasResponse.json();
        if (!categoriasResult.success) throw new Error('Error en respuesta de categorías');

        // Encontrar la categoría por nombre
        const categoria = categoriasResult.data.find(cat => cat.nombre.toLowerCase() === categoryId.toLowerCase());
        if (!categoria) {
            console.warn(`Categoría ${categoryId} no encontrada`);
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/productos-publicos?categoria_id=${categoria.id}`);
        if (!response.ok) throw new Error('Error al cargar productos de categoría');

        const result = await response.json();
        if (!result.success) throw new Error('Error en respuesta de productos');

        const productos = result.data;

        // Convertir productos a formato recipe para compatibilidad
        const recipes = [];
        productos.forEach(producto => {
            if (producto.precios && producto.precios.length > 0) {
                producto.precios.forEach(precio => {
                    recipes.push({
                        id: `${producto.id}_${precio.id}`,
                        product_id: producto.id,
                        name: producto.nombre,
                        description: producto.descripcion || '',
                        size: precio.nombre_precio || 'única',
                        sale_price: parseFloat(precio.precio) || 0,
                        category: producto.categoria_nombre,
                        image_url: producto.imagen_url,
                        permite_dos_sabores: producto.permite_dos_sabores,
                        es_bebida: producto.categoria_nombre.toLowerCase().includes('bebida'),
                        tamano_id: precio.id
                    });
                });
            } else {
                recipes.push({
                    id: producto.id,
                    product_id: producto.id,
                    name: producto.nombre,
                    description: producto.descripcion || '',
                    size: 'única',
                    sale_price: producto.precio_base || 0,
                    category: producto.categoria_nombre,
                    image_url: producto.imagen_url,
                    permite_dos_sabores: producto.permite_dos_sabores,
                    es_bebida: producto.categoria_nombre.toLowerCase().includes('bebida'),
                    tamano_id: null
                });
            }
        });

        renderPizzaCategory(recipes, gridId);
        console.log(`Productos cargados para categoría ${categoryId} (ID: ${categoria.id}): ${recipes.length}`);

    } catch (error) {
        console.error(`Error cargando productos para categoría ${categoryId}:`, error);
        // Fallback: intentar con el método anterior
        await loadPizzasByType(tipoPizza, gridId);
    }
}

// Renderizar categoría de pizzas (agrupadas por sabor)
function renderPizzaCategory(recipes, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    // Solo las bebidas usan renderizado simple (botón directo)
    // Verificar si la categoría es específicamente "bebidas"
    const esCategoriaBebidasDedicada = gridId === 'bebidas-grid';
    if (esCategoriaBebidasDedicada && recipes.length > 0 && recipes[0].es_bebida) {
        renderBebidasCategory(recipes, gridId);
        return;
    }
    
    // Agrupar recetas por nombre base - para pizzas y productos con tamaÃ©Â±o
    const groupedRecipes = {};
    recipes.forEach(recipe => {
        // Para agrupar correctamente, usar el nombre completo como clave
        // porque ya viene sin el tamaño incluido en el nombre
        const baseName = recipe.name.trim();
        if (!groupedRecipes[baseName]) {
            groupedRecipes[baseName] = [];
        }
        groupedRecipes[baseName].push(recipe);
    });
    
    Object.keys(groupedRecipes).forEach(baseName => {
        const recipeGroup = groupedRecipes[baseName];
        const card = document.createElement('div');
        card.className = 'bg-gray-600 rounded-xl p-4 border border-gray-500';
        
        // Ordenar por tamaño
        const sizeOrder = ['personal', 'ejecutiva', 'mediana', 'grande', 'familiar', 'extra familiar'];
        recipeGroup.sort((a, b) => {
            return sizeOrder.indexOf(a.size.toLowerCase()) - sizeOrder.indexOf(b.size.toLowerCase());
        });
        
        card.innerHTML = `
            <h4 class="text-white font-bold mb-3">${baseName}</h4>
            <p class="text-gray-300 text-sm mb-3">${recipeGroup[0].description || 'Deliciosa pizza'}</p>
            <button onclick="showPizzaSizes('${baseName}', ${JSON.stringify(recipeGroup).replace(/"/g, '&quot;')})" 
                    class="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors font-semibold">
                Seleccionar Tamaño
            </button>
            <div id="sizes-${baseName.replace(/\s+/g, '-')}" class="mt-3 space-y-2 hidden">
                ${recipeGroup.map(recipe => {
                    const sizeDisplay = recipe.size.charAt(0).toUpperCase() + recipe.size.slice(1);
                    // Pasar siempre el ID como string para evitar que el motor de templates lo trate como
                    // un literal numÃ©Â©rico (por ejemplo 75_61) y produzca valores inesperados.
                    return `
                        <button onclick="showPizzaAdicionales('${recipe.id}', '${recipe.name}', ${recipe.sale_price}, '${sizeDisplay}')" 
                                class="w-full bg-gray-700 hover:bg-green-600 text-white py-2 px-3 rounded-lg transition-colors flex justify-between items-center">
                            <span>${sizeDisplay}</span>
                            <span>$${formatPrice(recipe.sale_price)}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Renderizar bebidas y productos sin tamaÃ©Â±os
function renderBebidasCategory(recipes, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'bg-gray-600 rounded-xl p-4 border border-gray-500';
        
        card.innerHTML = `
            <h4 class="text-white font-bold mb-3">${recipe.name}</h4>
            <p class="text-gray-300 text-sm mb-3">${recipe.description || 'Deliciosa bebida'}</p>
            <div class="flex justify-between items-center">
                <span class="text-xl font-bold text-green-400">$${formatPrice(recipe.sale_price )}</span>
                <button class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-semibold add-to-cart-btn">
                    Agregar
                </button>
            </div>
        `;
        
        // Agregar event listener al botón
        const button = card.querySelector('.add-to-cart-btn');
        button.addEventListener('click', () => {
            addToCart(recipe.id, recipe.name, recipe.sale_price);
        });
        grid.appendChild(card);
    });
}

// Mostrar tamaÃ©Â±os de pizza
function showPizzaSizes(pizzaName, recipeGroup) {
    const sizesContainer = document.getElementById(`sizes-${pizzaName.replace(/\s+/g, '-')}`);
    if (sizesContainer.classList.contains('hidden')) {
        // Ocultar todos los otros tamaÃ©Â±os abiertos
        document.querySelectorAll('[id^="sizes-"]').forEach(container => {
            container.classList.add('hidden');
        });
        // Mostrar este
        sizesContainer.classList.remove('hidden');
    } else {
        sizesContainer.classList.add('hidden');
    }
}

// Renderizar categorÃ©Â­a simple (sin agrupación)
function renderSimpleCategory(recipes, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'bg-gray-600 rounded-xl p-4 border border-gray-500';
        
        card.innerHTML = `
            <h4 class="text-white font-bold mb-2">${recipe.name}</h4>
            <p class="text-gray-300 text-sm mb-3">${recipe.description || 'Delicioso producto'}</p>
        <button onclick="addToCart('${recipe.id}', '${recipe.name}', ${recipe.sale_price})" 
            class="w-full bg-gray-700 hover:bg-orange-600 text-white py-2 px-3 rounded-lg transition-colors flex justify-between items-center">
                <span>Agregar</span>
                <span>$${formatPrice(recipe.sale_price )}</span>
            </button>
        `;
        grid.appendChild(card);
    });
}

// Agregar item al carrito
function addToCart(recipeId, name, price) {
    if (!currentTable) {
        showNotification('Por favor selecciona una mesa primero', 'error');
        return;
    }
    
    console.log('Adding to cart:', { recipeId, name, price });
    console.log('Available recipes:', allRecipes.length);
    
    // Buscar la receta completa para obtener información adicional
    const recipe = allRecipes.find(r => r.id === recipeId);
    
    // Crear el item con la información disponible
    const item = {
        id: recipeId,
        name: name,
        price: price,
        quantity: 1
    };
    
    // Si encontramos la receta, agregar información adicional
    if (recipe) {
        item.product_id = recipe.product_id;
        item.size_id = recipe.size_id;
        item.sale_price = recipe.sale_price;
        console.log('Found recipe, added extra info:', recipe);
    } else {
        console.warn(`Receta no encontrada para ID: ${recipeId}, continuando sin info adicional`);
        console.log('All available recipe IDs:', allRecipes.map(r => r.id));
        // Intentar extraer product_id y size_id del recipeId compuesto
        const parts = recipeId.toString().split('_');
        if (parts.length >= 2) {
            item.product_id = parseInt(parts[0]);
            item.size_id = parseInt(parts[1]);
            if (item.size_id === 0) item.size_id = null;
            console.log('Extracted from ID:', { product_id: item.product_id, size_id: item.size_id });
        } else if (!isNaN(parseInt(recipeId))) {
            // Si es solo un nÃ©Âºmero, usarlo como product_id
            item.product_id = parseInt(recipeId);
            item.size_id = null;
            console.log('Using as product_id:', item.product_id);
        }
        item.sale_price = price;
    }
    
    // Verificar si el item ya existe en el carrito
    const existingItem = currentCart.find(cartItem => cartItem.id === recipeId);
    if (existingItem) {
        existingItem.quantity += 1;
        console.log('Updated existing item quantity:', existingItem);
    } else {
        currentCart.push(item);
        console.log('Added new item to cart:', item);
    }
    
    console.log('Current cart after adding:', currentCart);
    
    // Actualizar el pedido de la mesa
    tableOrders[currentTable].cart = [...currentCart];
    tableOrders[currentTable].total = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    updateCartDisplay();
    showNotification(`${name} agregado al carrito de ${typeof currentTable === 'number' ? 'Mesa ' + currentTable : currentTable}`);
}

// Actualizar botón del carrito
function updateCartDisplay() {
    if (!checkoutBtn) return; // Modo domicilio no tiene este botón
    
    const cartCount = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (cartCount > 0) {
        checkoutBtn.classList.add('pulse-active');
        checkoutBtn.innerHTML = `
            <i class="fas fa-shopping-cart mr-2"></i>
            Ver Carrito (${cartCount}) - $${formatPrice(cartTotal)}
        `;
    } else {
        checkoutBtn.classList.remove('pulse-active');
        checkoutBtn.innerHTML = `
            <i class="fas fa-shopping-cart mr-2"></i>
            Carrito Vacío
        `;
    }
}

// Mostrar carrito
function showCart() {
    if (currentCart.length === 0) {
        showNotification('Tu carrito está vacío. ¡Añade algunos productos!', 'error');
        return;
    }
    
    // Check if we're in modal mode (domicilio) or view mode (mesa)
    const cartModal = document.getElementById('cart-modal');
    const cartView = document.getElementById('cart-view');
    
    if (cartModal) {
        // Modal mode (domicilio)
        cartModal.classList.remove('hidden');
        renderCartItemsModal();
    } else if (cartView) {
        // View mode (mesa)
        showView('cart-view');
        
        // Actualizar la información de la mesa
        const cartTableDisplay = document.getElementById('cart-table-display');
        if (cartTableDisplay) {
            cartTableDisplay.textContent = currentTable;
        }
        
        renderCartItems();
    }
}

// Renderizar items del carrito
function renderCartItems() {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalDisplay = document.getElementById('cart-total-display');
    
    if (!cartItemsList || !cartTotalDisplay) {
        console.error('Elementos del carrito no encontrados');
        return;
    }
    
    let cartHTML = '';
    let totalPrice = 0;
    
    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        // Mostrar adicionales si los hay
        let adicionalesText = '';
        if (item.adicionales && item.adicionales.length > 0) {
            const adicionalesNames = item.adicionales.map(a => a.name).join(', ');
            adicionalesText = `<p class="text-yellow-300 text-xs mt-1">+ ${adicionalesNames}</p>`;
        }
        
        cartHTML += `
            <div class="flex justify-between items-center p-4 bg-gray-600 rounded-xl">
                <div class="flex-1">
                    <h5 class="font-semibold text-white">${item.name}</h5>
                    <p class="text-gray-300 text-sm">$${formatPrice(item.price)} c/u</p>
                    ${adicionalesText}
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})" 
                            class="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="text-white font-semibold w-8 text-center">${item.quantity}</span>
                    <button onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})" 
                            class="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
                <div class="text-right ml-4">
                    <p class="font-bold text-white">$${formatPrice(itemTotal)}</p>
                    <button onclick="removeFromCart(${index})" 
                            class="text-red-400 hover:text-red-300 text-sm">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsList.innerHTML = cartHTML;
    cartTotalDisplay.textContent = `$${formatPrice(totalPrice)}`;
}

// Renderizar items del carrito en el modal (modo domicilio)
function renderCartItemsModal() {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');
    const modalCustomerName = document.getElementById('modal-customer-name');
    
    if (!cartItems || !totalPrice) {
        console.error('Elementos del modal del carrito no encontrados');
        return;
    }
    
    // Set customer name if available
    if (modalCustomerName && currentTable) {
        modalCustomerName.textContent = currentTable;
    }
    
    let cartHTML = '';
    let total = 0;
    
    currentCart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        // Mostrar adicionales si los hay
        let adicionalesText = '';
        if (item.adicionales && item.adicionales.length > 0) {
            const adicionalesNames = item.adicionales.map(a => a.name).join(', ');
            adicionalesText = `<p class="text-yellow-300 text-xs mt-1">+ ${adicionalesNames}</p>`;
        }
        
        cartHTML += `
            <div class="flex justify-between items-center p-4 bg-gray-700 rounded-xl">
                <div class="flex-1">
                    <h5 class="font-semibold text-white">${item.name}</h5>
                    <p class="text-gray-300 text-sm">$${formatPrice(item.price)} c/u</p>
                    ${adicionalesText}
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="updateCartItemQuantity(${index}, ${item.quantity - 1})" 
                            class="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center">
                        <i class="fas fa-minus text-xs"></i>
                    </button>
                    <span class="text-white font-semibold w-8 text-center">${item.quantity}</span>
                    <button onclick="updateCartItemQuantity(${index}, ${item.quantity + 1})" 
                            class="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center">
                        <i class="fas fa-plus text-xs"></i>
                    </button>
                </div>
                <div class="text-right ml-4">
                    <p class="font-bold text-white">$${formatPrice(itemTotal)}</p>
                    <button onclick="removeFromCart(${index})" 
                            class="text-red-400 hover:text-red-300 text-sm">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = cartHTML;
    totalPrice.textContent = `$${formatPrice(total)}`;
}

// Actualizar cantidad de item en el carrito
function updateCartItemQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    currentCart[index].quantity = newQuantity;
    
    // Actualizar el carrito de la mesa si existe tableOrders
    if (typeof tableOrders !== 'undefined' && tableOrders[currentTable]) {
        tableOrders[currentTable].cart = [...currentCart];
        tableOrders[currentTable].total = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    
    // Re-render based on mode
    const cartModal = document.getElementById('cart-modal');
    if (cartModal && !cartModal.classList.contains('hidden')) {
        renderCartItemsModal();
    } else {
        renderCartItems();
    }
    updateCartDisplay();
}

// Eliminar item del carrito
function removeFromCart(index) {
    currentCart.splice(index, 1);
    
    // Actualizar el carrito de la mesa si existe tableOrders
    if (typeof tableOrders !== 'undefined' && tableOrders[currentTable]) {
        tableOrders[currentTable].cart = [...currentCart];
        tableOrders[currentTable].total = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    
    if (currentCart.length === 0) {
        // Close modal or go back to menu
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) {
            cartModal.classList.add('hidden');
        } else {
            showView('main-menu-view');
        }
        showNotification('Carrito vacío. Continúa agregando productos.', 'info');
    } else {
        // Re-render based on mode
        const cartModal = document.getElementById('cart-modal');
        if (cartModal && !cartModal.classList.contains('hidden')) {
            renderCartItemsModal();
        } else {
            renderCartItems();
        }
    }
    updateCartDisplay();
}

// Confirmar y enviar pedido (función de respaldo)
async function confirmAndSendOrder() {
    // Usar el modal de descuentos por defecto
    showDiscountModal();
}

// Enviar pedido a la API
async function submitOrderToAPI() {
    console.log('Current cart:', currentCart);
    console.log('All recipes:', allRecipes);
    
    const orderData = {
        cliente_nombre: typeof currentTable === 'string' ? currentTable : '',
        mesa: typeof currentTable === 'number' ? currentTable.toString() : 'Para Llevar',
        total_precio: calculateTotal(),
        total_amount: calculateTotal(),
        items: currentCart.map(item => {
            console.log('Processing cart item:', item);
            
            // Usar la información del item del carrito o intentar extraerla
            let product_id = item.product_id;
            let size_id = item.size_id;
            
            // Si no tiene product_id, intentar extraerlo del ID compuesto
            if (!product_id && item.id) {
                const parts = item.id.toString().split('_');
                if (parts.length >= 2) {
                    product_id = parseInt(parts[0]);
                    size_id = parseInt(parts[1]);
                    // Si size_id es 0, convertir a null
                    if (size_id === 0) size_id = null;
                    console.log('Extracted IDs from composite ID:', { product_id, size_id });
                }
            }
            
            // Ã©Å¡ltimo intento: si aÃ©Âºn no hay product_id, intentar otras formas
            if (!product_id) {
                // Si el ID es solo un nÃ©Âºmero, usarlo como product_id
                const numericId = parseInt(item.id);
                if (!isNaN(numericId)) {
                    product_id = numericId;
                    size_id = null;
                    console.log('Using numeric ID as product_id:', product_id);
                }
            }
            
            // Validar que tengamos un product_id válido
            if (!product_id) {
                console.error(`Item sin product_id válido después de todos los intentos:`, item);
                // En lugar de tirar error, usar un producto por defecto o saltar
                product_id = 1; // ID de producto por defecto
                size_id = null;
                console.warn(`Usando product_id por defecto para: ${item.name}`);
            }
            
            const orderItem = {
                product_id: product_id,
                size_id: size_id,
                quantity: item.quantity,
                unit_price: item.sale_price || item.price,
                additions: item.adicionales || []
            };
            console.log('Created order item:', orderItem);
            return orderItem;
        })
    };
    
    console.log('Enviando pedido:', orderData); // Para debug
    
    const response = await fetch(API_BASE_URL + '/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pedido');
    }
    
    return await response.json();
}

// Función para calcular el total del carrito
function calculateTotal() {
    return currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Mostrar notificación
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

async function showOrderManagement() {
    showView('order-management-view');
    currentStatusFilter = 'all'; // Resetear filtro al mostrar la vista
    await loadOrderManagement();

    // Activar el botón "Todos" por defecto
    setTimeout(() => {
        filterOrdersByStatus('all');
    }, 100);

    startOrderManagementUpdates();
}

// Función para recargar pedidos despuÃ©Â©s de crear uno nuevo
function reloadOrderManagement() {
    if (document.getElementById('order-management-view').style.display !== 'none') {
        loadOrderManagement();
    }
}

// Order Management Functions
let allOrders = [];
let currentStatusFilter = 'all';
let orderManagementInterval;
let lastCreatedOrderId = null; // Variable para guardar el ID del último pedido creado

// Función para convertir estados del backend a formato legible
function formatStatusForDisplay(backendStatus) {
    const statusDisplayMapping = {
        'pendiente': 'Pendiente',
        'preparando': 'En Preparación',
        'listo': 'Listo',
        'entregado': 'Entregado',
        'cancelado': 'Cancelado'
    };
    return statusDisplayMapping[backendStatus] || backendStatus;
}

// Función para convertir estados legibles a formato backend
function formatStatusForBackend(displayStatus) {
    const statusBackendMapping = {
        'Pendiente': 'pendiente',
        'En Preparación': 'preparando',
        'Listo': 'listo',
        'Entregado': 'entregado',
        'Cancelado': 'cancelado'
    };
    return statusBackendMapping[displayStatus] || displayStatus;
}

async function loadOrderManagement() {
    try {
        const response = await fetch(API_BASE_URL + '/api/orders');
        const orders = await response.json();
        // Convertir los estados del backend a formato legible
        allOrders = (orders.data || orders).map(order => ({
            ...order,
            status: formatStatusForDisplay(order.estado)
        }));
        renderOrderManagement();
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        const container = document.getElementById('order-management-container');
        if (container) {
            container.innerHTML = '<p class="text-center text-red-400">Error al cargar pedidos</p>';
        }
    }
}

function renderOrderManagement() {
    const container = document.getElementById('order-management-container');
    if (!container) {
        console.error('Elemento order-management-container no encontrado');
        return;
    }
    
    // Actualizar contadores en los botones de filtro
    updateFilterButtonCounts();
    
    let filteredOrders = allOrders;
    if (currentStatusFilter !== 'all') {
        filteredOrders = allOrders.filter(order => order.estado === currentStatusFilter);
    }
    
    if (filteredOrders.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400">No hay pedidos para mostrar</p>';
        return;
    }
    
    container.innerHTML = '';
    
    filteredOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'bg-gray-700 p-6 rounded-2xl shadow-md border-l-4';
        
        // Color del borde según el estado
        const borderColor = {
            'pendiente': 'border-yellow-500',
            'preparando': 'border-orange-500',
            'listo': 'border-green-500',
            'entregado': 'border-gray-500',
            // Mantener compatibilidad
            'Pendiente': 'border-yellow-500',
            'Preparando': 'border-orange-500',
            'Listo': 'border-green-500',
            'Entregado': 'border-gray-500'
        }[order.estado] || 'border-blue-500';
        
        orderCard.classList.add(borderColor);
        
        const tableInfo = order.tipo_pedido === 'domicilio' ? 'Domicilio' : (order.mesa || 'Para Llevar');
        
        // Información del cliente para domicilios
        let clienteInfo = '';
        if (order.tipo_pedido === 'domicilio') {
            clienteInfo = `
                <div class="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-3">
                    <h6 class="text-yellow-400 font-semibold mb-2"><i class="fas fa-motorcycle mr-2"></i>Información de Entrega</h6>
                    ${order.cliente_nombre ? `<p class="text-white text-sm"><i class="fas fa-user mr-2"></i><strong>Cliente:</strong> ${order.cliente_nombre}</p>` : ''}
                    ${order.telefono_cliente ? `<p class="text-white text-sm"><i class="fas fa-phone mr-2"></i><strong>Teléfono:</strong> ${order.telefono_cliente}</p>` : ''}
                    ${order.direccion_entrega ? `<p class="text-white text-sm"><i class="fas fa-map-marker-alt mr-2"></i><strong>Dirección:</strong> ${order.direccion_entrega}</p>` : ''}
                </div>
            `;
        }
        
        // Crear HTML detallado para cada item
        const itemsHTML = order.items.map(item => {
            // Obtener tamaño del item
            const tamano = item.tamano || item.size || '';
            const segundoSabor = item.segundo_sabor || '';
            let itemHTML = `
                <div class="flex justify-between items-start py-2 border-b border-gray-600 last:border-b-0">
                    <div class="flex-1">
                        <div class="flex items-center">
                            <span class="inline-block w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                                ${item.quantity}
                            </span>
                            <div>
                                <p class="text-white font-semibold">${item.name}</p>
                                ${tamano && tamano.toLowerCase() !== 'única' && tamano.toLowerCase() !== 'unica' ? `<p class="text-blue-400 text-sm"><i class="fas fa-ruler mr-1"></i>Tamaño: ${tamano}</p>` : ''}
                                ${segundoSabor ? `<p class="text-orange-400 text-sm"><i class="fas fa-pizza-slice mr-1"></i>2do Sabor: ${segundoSabor}</p>` : ''}
                                ${item.additions && item.additions.length > 0 ? `
                                    <p class="text-yellow-400 text-sm mt-1">
                                        <i class="fas fa-plus-circle mr-1"></i>
                                        : ${(() => {
                                            // Manejar diferentes shapes: {name}, {nombre} o strings
                                            const names = item.additions.map(a => (a && (a.name || a.nombre)) || a).filter(x => x && String(x).trim() !== '');
                                            return names.length ? names.join(', ') : '';
                                        })()}
                                    </p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-right ml-4">
                        <p class="text-white font-semibold">$${formatPrice(item.unit_price * item.quantity)}</p>
                        <p class="text-gray-400 text-xs">$${formatPrice(item.unit_price)} c/u</p>
                    </div>
                </div>
            `;
            return itemHTML;
        }).join('');
        
        orderCard.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-xl font-bold text-white">Pedido #${order.id}</h4>
                    <p class="text-gray-300 text-lg">
                        <i class="fas fa-utensils mr-2"></i>${tableInfo}
                    </p>
                    <p class="text-sm text-gray-400">
                        <i class="fas fa-clock mr-1"></i>${new Date(order.fecha).toLocaleString('es-CO')}
                    </p>
                </div>
                <div class="text-right">
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.estado)}">
                        ${formatStatusForDisplay(order.estado)}
                    </span>
                    ${order.descuento_porcentaje > 0 ? `
                        <p class="text-sm text-gray-400 line-through">$${formatPrice(order.total_precio || order.total_con_descuento)}</p>
                        <p class="text-xl font-bold text-white mt-2">$${formatPrice(order.total_con_descuento)}</p>
                        <p class="text-green-400 text-xs">
                            <i class="fas fa-tag mr-1"></i>${order.descuento_porcentaje}% descuento
                        </p>
                    ` : `
                        <p class="text-xl font-bold text-white mt-2">$${formatPrice(order.total_precio || order.total_con_descuento)}</p>
                    `}
                </div>
            </div>
            
            \${clienteInfo}
            
            <div class="mb-4 bg-gray-800 rounded-lg p-4">
                <h5 class="text-white font-semibold mb-3 flex items-center">
                    <i class="fas fa-list-ul mr-2"></i>
                    Detalle del pedido (${order.items.length} ${order.items.length === 1 ? 'item' : 'items'})
                </h5>
                <div class="space-y-2">
                    ${itemsHTML}
                </div>
            </div>
            <div class="flex space-x-2">
                ${order.estado !== 'entregado' ? `
                    <select onchange="handleStatusChange(${order.id}, this)" class="bg-gray-600 text-white rounded-lg px-3 py-2 border border-gray-500">
                        <option value="">Cambiar Estado</option>
                        <option value="pendiente" ${order.estado === 'pendiente' ? 'disabled' : ''}>Pendiente</option>
                        <option value="preparando" ${order.estado === 'preparando' ? 'disabled' : ''}>Preparando</option>
                        <option value="listo" ${order.estado === 'listo' ? 'disabled' : ''}>Listo</option>
                        <option value="entregado" ${order.estado === 'entregado' ? 'disabled' : ''}>Entregado</option>
                    </select>
                ` : ''}
                <button onclick="printOrder(${order.id})" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </div>
        `;
        
        container.appendChild(orderCard);
    });
}

function getStatusColor(status) {
    const colors = {
        'pendiente': 'bg-yellow-500 text-yellow-900',
        'preparando': 'bg-orange-500 text-orange-900',
        'listo': 'bg-green-500 text-green-900',
        'entregado': 'bg-gray-500 text-gray-900',
        // Mantener compatibilidad con formatos anteriores
        'Pendiente': 'bg-yellow-500 text-yellow-900',
        'Preparando': 'bg-orange-500 text-orange-900',
        'Listo': 'bg-green-500 text-green-900',
        'Entregado': 'bg-gray-500 text-gray-900'
    };
    return colors[status] || 'bg-blue-500 text-blue-900';
}

function updateFilterButtonCounts() {
    // Contar pedidos por estado
    const counts = {
        all: allOrders.length,
        pendiente: allOrders.filter(o => o.estado === 'pendiente').length,
        preparando: allOrders.filter(o => o.estado === 'preparando').length,
        listo: allOrders.filter(o => o.estado === 'listo').length,
        entregado: allOrders.filter(o => o.estado === 'entregado').length
    };
    
    // Actualizar cada botón con su contador
    Object.keys(counts).forEach(status => {
        const button = document.getElementById(`filter-${status}`);
        if (button) {
            const icon = button.querySelector('i');
            const iconHTML = icon ? icon.outerHTML : '';
            const text = button.textContent.replace(/\d+/g, '').trim();
            
            // Actualizar contenido del botón con badge de contador
            if (counts[status] > 0) {
                button.innerHTML = `
                    ${iconHTML}
                    ${text}
                    <span class="ml-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-600 rounded-full">
                        ${counts[status]}
                    </span>
                `;
            } else {
                button.innerHTML = `${iconHTML}${text}`;
            }
        }
    });
}

function filterOrdersByStatus(status) {
    currentStatusFilter = status;
    
    // Actualizar estilos de los botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('ring-4', 'ring-white', 'ring-opacity-50', 'scale-105');
    });
    
    // Destacar el botón activo
    const activeButton = document.getElementById(`filter-${status}`);
    if (activeButton) {
        activeButton.classList.add('ring-4', 'ring-white', 'ring-opacity-50', 'scale-105');
    }
    
    renderOrderManagement();
}

function handleStatusChange(orderId, selectElement) {
    const newStatus = selectElement.value;
    console.log('handleStatusChange llamada con:', { orderId, newStatus });
    
    if (newStatus) {
        updateOrderStatus(orderId, newStatus);
        // Resetear el select despuÃ©Â©s de un breve delay
        setTimeout(() => {
            selectElement.value = '';
        }, 100);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    console.log('updateOrderStatus llamada con:', { orderId, newStatus });
    
    if (!orderId || !newStatus) {
        console.error('ID de pedido o estado faltante:', { orderId, newStatus });
        showNotification('Error: Datos incompletos', 'error');
        return;
    }

    console.log('Enviando estado al backend:', newStatus);

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        console.log('Respuesta del servidor:', response.status);

        if (response.ok) {
            showNotification('Estado del pedido actualizado exitosamente', 'success');
            loadOrderManagement(); // Recargar la lista de pedidos
        } else {
            const errorData = await response.json();
            console.error('Error del servidor:', errorData);
            showNotification(`Error: ${errorData.error || 'No se pudo actualizar el estado'}`, 'error');
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        showNotification('Error de conexión al actualizar el estado', 'error');
    }
}

function startOrderManagementUpdates() {
    orderManagementInterval = setInterval(loadOrderManagement, 10000); // Actualizar cada 10 segundos
}

function stopOrderManagementUpdates() {
    if (orderManagementInterval) {
        clearInterval(orderManagementInterval);
        orderManagementInterval = null;
    }
}

// Función para mostrar el panel de administración
function showAdminPanel() {
    showView('admin-panel-view');
}

// Función para mostrar mensajes
function showMessageBox(message) {
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');
    messageText.textContent = message;
    messageBox.style.display = 'flex';
}

function closeMessageBox() {
    document.getElementById('message-box').style.display = 'none';
}

// Función para imprimir (placeholder)
async function printOrder(orderId) {
    try {
        // Si no se proporciona orderId, usar el último pedido creado
        if (!orderId && lastCreatedOrderId) {
            orderId = lastCreatedOrderId;
            console.log(`Usando último pedido creado: #${orderId}`);
        }
        
        if (!orderId) {
            showNotification('No hay pedido para imprimir', 'error');
            return;
        }
        
        console.log(`Iniciando impresión para pedido #${orderId}`);
        
        // Obtener los detalles del pedido para impresión
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
        if (!response.ok) {
            throw new Error('Error al obtener detalles del pedido');
        }
        
        const order = await response.json();
        console.log('Detalles del pedido obtenidos:', order);
        
        // Crear ventana de impresión con formato específico
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        if (!printWindow) {
            // Si la ventana emergente fue bloqueada, mostrar alternativa
            console.warn('Ventana emergente bloqueada, usando impresión alternativa');
            printAlternative(order);
            return;
        }
        
        const printContent = `
            <html>
                <head>
                    <title>Factura #${order.id}</title>
                    <style>
                        @media print {
                            @page { margin: 0.5cm; size: 80mm auto; }
                            body { margin: 0; }
                        }
                        body { 
                            font-family: 'Courier New', monospace; 
                            font-size: 12px; 
                            line-height: 1.3;
                            margin: 10px; 
                            max-width: 300px;
                        }
                        .header { 
                            text-align: center; 
                            border-bottom: 1px dashed #000; 
                            padding-bottom: 8px; 
                            margin-bottom: 8px;
                        }
                        .header h3 { 
                            margin: 0 0 5px 0; 
                            font-size: 14px; 
                            font-weight: bold;
                        }
                        .header p { 
                            margin: 2px 0; 
                            font-size: 10px;
                        }
                        .order-info { 
                            margin: 8px 0; 
                            font-size: 11px;
                        }
                        .order-info p { 
                            margin: 2px 0; 
                        }
                        .items { 
                            margin: 8px 0; 
                        }
                        .items h4 { 
                            margin: 0 0 5px 0; 
                            font-size: 12px; 
                            text-decoration: underline;
                        }
                        .item { 
                            margin: 3px 0; 
                            font-size: 11px;
                            display: flex;
                            justify-content: space-between;
                        }
                        .item-desc {
                            flex: 1;
                            margin-right: 10px;
                        }
                        .item-price {
                            white-space: nowrap;
                        }
                        .separator { 
                            border-top: 1px dashed #000; 
                            margin: 8px 0; 
                        }
                        .total { 
                            font-weight: bold; 
                            font-size: 13px;
                            text-align: center;
                            margin-top: 8px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 10px;
                            font-size: 10px;
                            border-top: 1px dashed #000;
                            padding-top: 5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h3>🍕 PIZZERÍA NISSI</h3>
                        <p>FACTURA #${order.id}</p>
                        <p>${new Date(order.created_at).toLocaleString('es-CO')}</p>
                    </div>
                    
                    <div class="order-info">
                        <p><strong>Mesa:</strong> ${order.tipo_pedido === 'domicilio' ? 'Domicilio' : (order.mesa || 'Para Llevar')}</p>
                        <p><strong>Estado:</strong> ${formatStatusForDisplay(order.estado)}</p>
                        ${order.tipo_pedido === 'domicilio' ? `
                            <div style="margin-top: 8px; padding: 5px; border: 1px dashed #000;">
                                <p style="font-weight: bold;">DATOS ENTREGA:</p>
                                ${order.cliente_nombre ? `<p>Cliente: ${order.cliente_nombre}</p>` : ''}
                                ${order.telefono_cliente ? `<p>Tel: ${order.telefono_cliente}</p>` : ''}
                                ${order.direccion_entrega ? `<p>Dir: ${order.direccion_entrega}</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="separator"></div>
                    
                    <div class="items">
                        <h4>PRODUCTOS:</h4>
                        ${order.items.map(item => {
                            const tamano = item.tamano || item.size || '';
                            const segundoSabor = item.segundo_sabor || '';
                            let additionsText = '';
                            if (item.additions && item.additions.length > 0) {
                                const names = item.additions.map(a => (a && (a.name || a.nombre)) || a).filter(x => x && String(x).trim() !== '');
                                if (names.length) additionsText = `<div class="item-additions">+ ${names.join(', ')}</div>`;
                            }
                            return `
                            <div class="item">
                                <div class="item-desc">
                                    ${item.quantity}x ${item.name}
                                    ${tamano && tamano.toLowerCase() !== 'única' ? `<div style="font-size: 0.9em;">(${tamano})</div>` : ''}
                                    ${segundoSabor ? `<div style="font-size: 0.9em;">2do Sabor: ${segundoSabor}</div>` : ''}
                                    ${additionsText}
                                </div>
                                <div class="item-price">
                                    $${formatPrice(item.unit_price * item.quantity)}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    
                    <div class="separator"></div>
                    
                    <div class="total">
                        <p>TOTAL: $${formatPrice(order.total_amount)}</p>
                    </div>
                    
                    <div class="footer">
                        <p>¡Gracias por su compra!</p>
                        <p>www.pizzerianiss.com</p>
                    </div>
                </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Esperar un momento y luego imprimir
        setTimeout(() => {
            try {
                printWindow.print();
                console.log(`Pedido #${orderId} enviado a impresión`);
                showNotification('Pedido enviado a impresión', 'success');
                setTimeout(() => printWindow.close(), 1000);
            } catch (printError) {
                console.error('Error al ejecutar print():', printError);
                showNotification('Error al imprimir - verifique la configuración de su navegador', 'error');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error al imprimir pedido:', error);
        showNotification('Error al enviar a impresión', 'error');
    }
}

// Función alternativa de impresión cuando las ventanas emergentes están bloqueadas
function printAlternative(order) {
    // Crear un elemento temporal para impresión
    const printDiv = document.createElement('div');
    printDiv.innerHTML = `
        <style>
            @media print {
                @page { margin: 0.5cm; size: 80mm auto; }
                body { margin: 0; }
            }
            .print-content { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                line-height: 1.3;
                margin: 10px; 
                max-width: 300px;
            }
            .print-header { 
                text-align: center; 
                border-bottom: 1px dashed #000; 
                padding-bottom: 8px; 
                margin-bottom: 8px;
            }
            .print-header h3 { 
                margin: 0 0 5px 0; 
                font-size: 14px; 
                font-weight: bold;
            }
            .print-header p { 
                margin: 2px 0; 
                font-size: 10px;
            }
            .print-order-info { 
                margin: 8px 0; 
                font-size: 11px;
            }
            .print-order-info p { 
                margin: 2px 0; 
            }
            .print-items { 
                margin: 8px 0; 
            }
            .print-items h4 { 
                margin: 0 0 5px 0; 
                font-size: 12px; 
                text-decoration: underline;
            }
            .print-item { 
                margin: 3px 0; 
                font-size: 11px;
                display: flex;
                justify-content: space-between;
            }
            .print-item-desc {
                flex: 1;
                margin-right: 10px;
            }
            .print-item-price {
                white-space: nowrap;
            }
            .print-separator { 
                border-top: 1px dashed #000; 
                margin: 8px 0; 
            }
            .print-total { 
                font-weight: bold; 
                font-size: 13px;
                text-align: center;
                margin-top: 8px;
            }
            .print-footer {
                text-align: center;
                margin-top: 10px;
                font-size: 10px;
                border-top: 1px dashed #000;
                padding-top: 5px;
            }
        </style>
        <div class="print-content">
            <div class="print-header">
                <h3>🍕 PIZZERÍA NISSI</h3>
                <p>FACTURA #${order.id}</p>
                <p>${new Date(order.created_at).toLocaleString('es-CO')}</p>
            </div>
            
            <div class="print-order-info">
                <p><strong>Mesa:</strong> ${order.tipo_pedido === 'domicilio' ? 'Domicilio' : (order.mesa || 'Para Llevar')}</p>
                <p><strong>Estado:</strong> ${formatStatusForDisplay(order.estado)}</p>
                ${order.tipo_pedido === 'domicilio' ? `
                    <div style="margin-top: 8px; padding: 5px; border: 1px dashed #000;">
                        <p style="font-weight: bold;">DATOS ENTREGA:</p>
                        ${order.cliente_nombre ? `<p>Cliente: ${order.cliente_nombre}</p>` : ''}
                        ${order.telefono_cliente ? `<p>Tel: ${order.telefono_cliente}</p>` : ''}
                        ${order.direccion_entrega ? `<p>Dir: ${order.direccion_entrega}</p>` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="print-separator"></div>
            
            <div class="print-items">
                <h4>PRODUCTOS:</h4>
                ${order.items.map(item => {
                    const tamano = item.tamano || item.size || '';
                    const segundoSabor = item.segundo_sabor || '';
                    let additionsText = '';
                    if (item.additions && item.additions.length > 0) {
                        const names = item.additions.map(a => (a && (a.name || a.nombre)) || a).filter(x => x && String(x).trim() !== '');
                        if (names.length) additionsText = `<div style="font-size: 0.8em; color: #666;">+ ${names.join(', ')}</div>`;
                    }
                    return `
                    <div class="print-item">
                        <div class="print-item-desc">
                            ${item.quantity}x ${item.name}
                            ${tamano && tamano.toLowerCase() !== 'única' ? `<div style="font-size: 0.9em;">(${tamano})</div>` : ''}
                            ${segundoSabor ? `<div style="font-size: 0.9em;">2do Sabor: ${segundoSabor}</div>` : ''}
                            ${additionsText}
                        </div>
                        <div class="print-item-price">
                            $${formatPrice(item.unit_price * item.quantity)}
                        </div>
                    </div>`;
                }).join('')}
            </div>
            
            <div class="print-separator"></div>
            
            <div class="print-total">
                <p>TOTAL: $${formatPrice(order.total_amount)}</p>
            </div>
            
            <div class="print-footer">
                <p>¡Gracias por su compra!</p>
                <p>www.pizzerianiss.com</p>
            </div>
        </div>
    `;
    
    // Agregar al body temporalmente
    document.body.appendChild(printDiv);
    
    // Ocultar el resto del contenido
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printDiv.innerHTML;
    
    // Imprimir
    window.print();
    
    // Restaurar contenido original
    document.body.innerHTML = originalContent;
    
    console.log(`Pedido #${order.id} enviado a impresión (método alternativo)`);
    showNotification('Pedido enviado a impresión', 'success');
}

// ============= SISTEMA DE ADICIONALES =============

let currentPizzaData = null;
let availableAdicionales = [];
let selectedAdicionales = [];
let currentPizzaSize = 'Personal'; // Tamaño actual para calcular precios de adiciones

// Mostrar modal de adicionales para pizza
async function showPizzaAdicionales(recipeId, pizzaName, basePrice, sizeDisplay) {
    currentPizzaData = {
        recipeId: recipeId,
        pizzaName: pizzaName,
        basePrice: basePrice,
        sizeDisplay: sizeDisplay
    };
    
    // Extraer el tamaÃ©Â±o base del sizeDisplay (ej: "Personal ($25.900)" -> "Personal")
    currentPizzaSize = sizeDisplay.split(' ')[0];
    
    // Actualizar información de la pizza seleccionada
    document.getElementById('pizzaSeleccionada').textContent = 
        `${pizzaName} - ${sizeDisplay} - $${formatPrice(basePrice)}`;
    
    // Cargar adicionales disponibles
    await loadAdicionales();

    // Intentar cargar vinculaciones / productos vinculados del producto para mostrarlos tambiÃ©Â©n como adiciones
    try {
        // recipeId puede ser compuesto 'productId_sizeId'
        const parts = String(recipeId).split('_');
        const productId = parseInt(parts[0]);
        if (!isNaN(productId)) {
            await loadVinculadosForProduct(productId);
        }
    } catch (e) {
        console.warn('Error cargando vinculados para el producto en mesa:', e);
    }
    
    // Limpiar selección anterior
    selectedAdicionales = [];
    updateTotalPrice();
    
    
    // Cargar seccion de dos sabores si aplica
    await mostrarSeccionDosSaboresMesa(recipeId);

    // Mostrar modal
    document.getElementById('adicionalesModal').classList.remove('hidden');
}

// Cargar adicionales desde la API
async function loadAdicionales() {
    try {
        const response = await fetch(API_BASE_URL + '/api/adiciones');
        if (!response.ok) throw new Error('Error al cargar adicionales');
        
        availableAdicionales = await response.json();
        renderAdicionales();
    } catch (error) {
        console.error('Error cargando adicionales:', error);
        showNotification('Error al cargar adicionales', 'error');
    }
}

// Cargar productos vinculados para mostrarlos como adicionales en el modal de mesa
async function loadVinculadosForProduct(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${productId}/productos-vinculados`);
        if (!response.ok) {
            console.warn('No se encontraron productos vinculados o error en la petición', response.status);
            return;
        }

        const productosVinculados = await response.json();

        // productosVinculados puede tener claves por tipo -> arrays de productos
        const nuevos = [];

        if (productosVinculados && typeof productosVinculados === 'object') {
            Object.keys(productosVinculados).forEach(tipo => {
                const lista = productosVinculados[tipo] || [];
                lista.forEach(prod => {
                    // Crear un objeto compatible con la estructura esperada por renderAdicionales
                    // Usamos un id Ã©Âºnico prefijado para evitar colisiones con adiciones normales
                    const precioVal = parseFloat(prod.precio) || parseFloat(prod.precio_venta) || 0;
                    const adicional = {
                        id: `vinc-${prod.id}`,
                        nombre: prod.nombre || prod.titulo || `Producto ${prod.id}`,
                        descripcion: prod.descripcion || prod.categoria || '',
                        // estructura de precios por tamaÃ©Â±o (fallback simple)
                        precios: {
                            [currentPizzaSize]: { precio: precioVal },
                            'Personal': { precio: precioVal }
                        }
                    };
                    nuevos.push(adicional);
                });
            });
        }

        if (nuevos.length > 0) {
            // AÃ©Â±adir al listado global de adiciones para que renderAdicionales los muestre
            // Evitar duplicados por id
            nuevos.forEach(n => {
                if (!availableAdicionales.some(a => String(a.id) === String(n.id))) {
                    availableAdicionales.push(n);
                }
            });

            // Re-renderizar las adiciones para incluir los vinculados
            renderAdicionales();
        }

    } catch (error) {
        console.error('Error cargando vinculados del producto:', error);
    }
}

// Renderizar adicionales en el modal
function renderAdicionales() {
    const grid = document.getElementById('adicionalesGrid');
    grid.innerHTML = '';
    
    if (availableAdicionales.length === 0) {
        grid.innerHTML = '<p class="text-gray-400 col-span-2 text-center">No hay adicionales disponibles</p>';
        return;
    }
    
    availableAdicionales.forEach(adicional => {
        const isSelected = selectedAdicionales.some(sel => sel.id === adicional.id);
        
        // Obtener el precio para el tamaÃ©Â±o actual
        let precio = 0;
        try {
            if (adicional.precios && typeof adicional.precios === 'object') {
                // Preferir precio por tamaÃ©Â±o actual
                if (currentPizzaSize && adicional.precios[currentPizzaSize]) {
                    precio = parseFloat(adicional.precios[currentPizzaSize].precio) || 0;
                } else if (adicional.precios['Personal']) {
                    precio = parseFloat(adicional.precios['Personal'].precio) || 0;
                } else {
                    // Si no hay key por nombre de tamaÃ©Â±o, tomar el primer precio disponible
                    const keys = Object.keys(adicional.precios);
                    if (keys.length > 0 && adicional.precios[keys[0]] && adicional.precios[keys[0]].precio) {
                        precio = parseFloat(adicional.precios[keys[0]].precio) || 0;
                    }
                }
            }
        } catch (e) {
            console.warn('Error leyendo precios de adicional', adicional, e);
            precio = 0;
        }
        
        if (precio === 0) return; // Skip if no price available
        
        const card = document.createElement('div');
        card.className = `border rounded-lg p-3 cursor-pointer transition-colors ${
            isSelected 
                ? 'border-green-500 bg-green-900/30' 
                : 'border-gray-600 bg-gray-700 hover:border-gray-500'
        }`;
        
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" 
                           id="adicional-${adicional.id}"
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleAdicional(${adicional.id})"
                           class="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded">
                    <label for="adicional-${adicional.id}" class="text-white font-medium cursor-pointer">
                        ${adicional.nombre}
                    </label>
                </div>
                <span class="text-green-400 font-semibold">
                    +$${formatPrice(precio)}
                </span>
            </div>
        `;
        
        card.onclick = () => toggleAdicional(adicional.id);
        grid.appendChild(card);
    });
}

// Alternar selección de adicional
function toggleAdicional(adicionalId) {
    const adicional = availableAdicionales.find(a => a.id === adicionalId);
    if (!adicional) return;
    
        // Obtener el precio para el tamaÃ©Â±o actual (cuando se hace toggle)
    let precioData = null;
    if (adicional.precios && typeof adicional.precios === 'object') {
        precioData = adicional.precios[currentPizzaSize] || adicional.precios['Personal'] || adicional.precios[Object.keys(adicional.precios)[0]];
    }
    if (!precioData) return;
    
    const existingIndex = selectedAdicionales.findIndex(sel => sel.id === adicionalId);
    
    if (existingIndex >= 0) {
        // Remover adicional
        selectedAdicionales.splice(existingIndex, 1);
    } else {
        // Agregar adicional con precio específico para el tamaÃ©Â±o
        selectedAdicionales.push({
            id: adicional.id,
            name: adicional.nombre,
            price: parseFloat(precioData.precio) || 0
        });
    }
    
    renderAdicionales();
    updateTotalPrice();
}

// Actualizar precio total
function updateTotalPrice() {
    const basePrice = currentPizzaData ? currentPizzaData.basePrice : 0;
    const adicionalesPrice = selectedAdicionales.reduce((total, adicional) => total + adicional.price, 0);
    const totalPrice = basePrice + adicionalesPrice;
    
    document.getElementById('totalPrecio').textContent = `$${formatPrice(totalPrice)}`;
}

// Confirmar pizza con adicionales
function confirmarPizzaConAdicionales() {
    if (!currentPizzaData) return;
    
    const basePrice = currentPizzaData.basePrice;
    const adicionalesPrice = selectedAdicionales.reduce((total, adicional) => total + adicional.price, 0);
    const totalPrice = basePrice + adicionalesPrice;
    
    // Crear nombre descriptivo con adicionales y segundo sabor
    let itemName = currentPizzaData.pizzaName;
    
    // Agregar segundo sabor si existe
    if (segundoSaborMesa) {
        itemName += ` (mitad ${segundoSaborMesa.nombre})`;
    }
    if (selectedAdicionales.length > 0) {
        const adicionalesNames = selectedAdicionales.map(a => a.name).join(', ');
        itemName += ` + ${adicionalesNames}`;
    }
    
    // Agregar al carrito con adicionales
    addToCartWithAdicionales(
        currentPizzaData.recipeId,
        itemName,
        totalPrice,
        selectedAdicionales
    );
    
    closeAdicionalesModal();
}

// Cerrar modal de adicionales
function closeAdicionalesModal() {
    const modal = document.getElementById('adicionalesModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentPizzaData = null;
    selectedAdicionales = [];
    segundoSaborMesa = null;
}

// Cerrar modal genÃ©Â©rico
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Agregar al carrito con adicionales
function addToCartWithAdicionales(recipeId, itemName, totalPrice, adicionales, segundoSabor = null) {
    // Buscar la receta completa para obtener información adicional
    const recipe = allRecipes.find(r => r.id === recipeId);
    
    const existingItem = currentCart.find(item => 
        item.id === recipeId && 
        JSON.stringify(item.adicionales || []) === JSON.stringify(adicionales)
    );
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        const newItem = {
            id: recipeId,
            name: itemName,
            price: totalPrice,
            quantity: 1,
            adicionales: adicionales,
            segundo_sabor: segundoSabor
        };
        
        // Si encontramos la receta, agregar información adicional
        if (recipe) {
            newItem.product_id = recipe.product_id;
            newItem.size_id = recipe.size_id;
            newItem.sale_price = recipe.sale_price;
            console.log('Found recipe for adicionales, added info:', recipe);
        } else {
            console.warn(`Receta no encontrada para ID: ${recipeId}, extrayendo info del ID`);
            console.log('All available recipe IDs:', allRecipes.map(r => r.id));
            // Intentar extraer product_id y size_id del recipeId compuesto
            const parts = recipeId.toString().split('_');
            if (parts.length >= 2) {
                newItem.product_id = parseInt(parts[0]);
                newItem.size_id = parseInt(parts[1]);
                if (newItem.size_id === 0) newItem.size_id = null;
                console.log('Extracted IDs from composite ID:', { product_id: newItem.product_id, size_id: newItem.size_id });
            } else if (!isNaN(parseInt(recipeId))) {
                // Si es solo un nÃ©Âºmero, usarlo como product_id
                newItem.product_id = parseInt(recipeId);
                newItem.size_id = null;
                console.log('Using as product_id:', newItem.product_id);
            }
            newItem.sale_price = totalPrice;
        }
        
        console.log('Adding item with adicionales to cart:', newItem);
        currentCart.push(newItem);
    }
    
    console.log('Current cart after adding with adicionales:', currentCart);
    updateCartDisplay();
    showNotification('Pizza agregada al carrito', 'success');
}

// =============== SISTEMA DE DESCUENTOS ===============

// Variables para manejar el descuento
let currentDiscount = 0;
let subtotalAmount = 0;

function showDiscountModal() {
    if (currentCart.length === 0) {
        showNotification('Tu carrito está vacío. ¡Añade algunos productos!', 'error');
        return;
    }
    
    // Calcular subtotal
    subtotalAmount = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Mostrar subtotal
    document.getElementById('modal-subtotal').textContent = `$${formatPrice(subtotalAmount)}`;
    document.getElementById('modal-total').textContent = `$${formatPrice(subtotalAmount)}`;
    
    // Resetear descuento
    currentDiscount = 0;
    updateDiscountDisplay();
    
    // Mostrar modal
    document.getElementById('discount-modal').classList.remove('hidden');
}

function closeDiscountModal() {
    document.getElementById('discount-modal').classList.add('hidden');
    currentDiscount = 0;
}

function applyDiscount(percentage) {
    currentDiscount = percentage;
    document.getElementById('custom-discount').value = '';
    updateDiscountDisplay();
}

function applyCustomDiscount() {
    const customValue = parseFloat(document.getElementById('custom-discount').value) || 0;
    if (customValue < 0 || customValue > 100) {
        showNotification('El descuento debe estar entre 0% y 100%', 'error');
        return;
    }
    currentDiscount = customValue;
    updateDiscountDisplay();
}

function updateDiscountDisplay() {
    const discountAmount = subtotalAmount * (currentDiscount / 100);
    const totalWithDiscount = subtotalAmount - discountAmount;
    
    // Actualizar elementos del modal
    document.getElementById('discount-percentage').textContent = currentDiscount;
    document.getElementById('discount-amount').textContent = `$${formatPrice(discountAmount)}`;
    document.getElementById('modal-total').textContent = `$${formatPrice(totalWithDiscount)}`;
    
    // Mostrar/ocultar resumen de descuento
    const discountSummary = document.getElementById('discount-summary');
    if (currentDiscount > 0) {
        discountSummary.classList.remove('hidden');
    } else {
        discountSummary.classList.add('hidden');
    }
}

async function confirmOrderWithDiscount() {
    if (currentCart.length === 0) {
        showNotification('Tu carrito está vacío. ¡Añade algunos productos!', 'error');
        return;
    }
    
    try {
        const discountAmount = subtotalAmount * (currentDiscount / 100);
        const totalWithDiscount = subtotalAmount - discountAmount;
        
        const orderResponse = await submitOrderWithDiscount(totalWithDiscount, currentDiscount);
        
        // Guardar el ID del último pedido creado para poder imprimirlo
        lastCreatedOrderId = orderResponse.id || orderResponse.pedido_id || null;
        const displayOrderNumber = orderResponse.numero_pedido || orderResponse.id || orderResponse.pedido_id || '';
        
        // Cambiar el estado del pedido a "En Preparación"
        if (tableOrders[currentTable]) {
            tableOrders[currentTable].status = 'En Preparación';
            tableOrders[currentTable].order_id = lastCreatedOrderId;
        }
        
        // Cerrar modal
        closeDiscountModal();
        
        // Limpiar el carrito despuÃ©Â©s de enviarlo
        currentCart = [];
        tableOrders[currentTable].cart = [];
        tableOrders[currentTable].total = 0;
        updateCartDisplay();
        
        // Regresar al menÃ©Âº principal
        showView('main-menu-view');
        
        // Mostrar notificación de Ã©Â©xito
    showNotification(`¡Pedido #${displayOrderNumber} enviado exitosamente!`, 'success');

        // Recargar la gestión de pedidos si estÃ¡ abierta
        reloadOrderManagement();

        // Imprimir factura automáticamente después de un breve delay
        setTimeout(async () => {
            console.log(`Imprimiendo factura automáticamente para pedido #${displayOrderNumber}`);
            try {
                // printOrder espera el ID interno; usar orderResponse.id si está disponible
                await printOrder(orderResponse.id || orderResponse.pedido_id);
            } catch (printError) {
                console.error('Error al imprimir factura:', printError);
                showNotification('Pedido enviado exitosamente, pero error al imprimir factura', 'warning');
            }
        }, 500);
        
    } catch (error) {
        console.error('Error al enviar pedido:', error);
        showNotification(`Error al enviar el pedido: ${error.message}`, 'error');
    }
}

// Enviar pedido con descuento a la API
async function submitOrderWithDiscount(totalWithDiscount, discountPercentage) {
    // Mapear los productos del carrito a productos de la base de datos
    const items = [];
    
    for (const cartItem of currentCart) {
        console.log('Processing cart item for order:', cartItem);
        
        // Usar product_id o producto_id (compatibilidad)
        let product_id = cartItem.product_id || cartItem.producto_id;
        let size_id = cartItem.size_id || cartItem.tamano_id;
        
        // Si aÃ©Âºn no hay product_id, intentar extraer del ID compuesto
        if (!product_id && cartItem.id) {
            const parts = cartItem.id.toString().split('_');
            if (parts.length >= 2) {
                product_id = parseInt(parts[0]);
                size_id = parseInt(parts[1]);
                if (size_id === 0) size_id = null;
            } else if (!isNaN(parseInt(cartItem.id))) {
                product_id = parseInt(cartItem.id);
                size_id = null;
            }
        }
        
        if (!product_id) {
            console.error('Item sin product_id válido:', cartItem);
            continue; // Saltar este item
        }
        
        // Para compatibilidad con la nueva API, necesitamos mapear los items
        const orderItem = {
            product_id: product_id,
            size_id: size_id,
            quantity: cartItem.quantity,
            unit_price: cartItem.sale_price || cartItem.price,
            additions: cartItem.adicionales || []
        };
        
        console.log('Created order item:', orderItem);
        items.push(orderItem);
    }
    
    console.log('Total items to send:', items.length);
    console.log('Items array:', items);
    
    if (items.length === 0) {
        throw new Error('No hay items válidos para enviar');
    }
    
    const orderData = {
        cliente_nombre: '',
        mesa: typeof currentTable === 'number' ? currentTable.toString() : currentTable,
        total_amount: subtotalAmount,
        discount_percentage: discountPercentage,
        total_with_discount: totalWithDiscount,
        items: items
    };
    
    console.log('Enviando pedido:', orderData);
    console.log('Items detail:', JSON.stringify(items, null, 2));
    
    const response = await fetch(API_BASE_URL + '/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pedido');
    }
    
    return await response.json();
}



// =============== SISTEMA DE DOS SABORES PARA MESAS ===============
let segundoSaborMesa = null;
let saboresDisponiblesMesa = [];

// Cargar sabores disponibles para un producto
async function cargarSaboresDisponiblesMesa(productId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/productos/${productId}/sabores`);
        if (!response.ok) {
            console.log('No hay sabores configurados para este producto');
            return [];
        }
        const sabores = await response.json();
        saboresDisponiblesMesa = sabores;
        return sabores;
    } catch (error) {
        console.error('Error cargando sabores:', error);
        return [];
    }
}

// Mostrar secciÃ³n de dos sabores en el modal de mesas
async function mostrarSeccionDosSaboresMesa(recipeId) {
    const seccion = document.getElementById('seccionDosSaboresMesa');
    const container = document.getElementById('saboresDisponiblesMesa');
    
    if (!seccion || !container) return;
    
    // Extraer product_id del recipeId compuesto (ej: "75_61")
    const parts = String(recipeId).split('_');
    const productId = parseInt(parts[0]);
    
    // Buscar la receta para verificar si permite dos sabores
    const recipe = allRecipes.find(r => r.id === recipeId);
    
    if (!recipe || !recipe.permite_dos_sabores) {
        seccion.classList.add('hidden');
        return;
    }
    
    // Cargar sabores disponibles
    const sabores = await cargarSaboresDisponiblesMesa(productId);
    
    if (sabores.length === 0) {
        seccion.classList.add('hidden');
        return;
    }
    
    // Renderizar sabores
    container.innerHTML = sabores.map(sabor => `
        <button onclick="seleccionarSegundoSaborMesa(${sabor.sabor_producto_id}, '${sabor.nombre.replace(/'/g, "\\'")}')"
                class="bg-gray-700 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors text-sm text-left">
            ${sabor.nombre}
        </button>
    `).join('');
    
    // Mostrar secciÃ³n
    seccion.classList.remove('hidden');
    
    // Reset
    segundoSaborMesa = null;
    document.getElementById('saborSeleccionadoMesa').classList.add('hidden');
}

// Seleccionar segundo sabor
function seleccionarSegundoSaborMesa(saborId, saborNombre) {
    segundoSaborMesa = {
        id: saborId,
        nombre: saborNombre
    };
    
    document.getElementById('nombreSegundoSaborMesa').textContent = saborNombre;
    document.getElementById('saborSeleccionadoMesa').classList.remove('hidden');
    
    // Destacar botÃ³n seleccionado
    const container = document.getElementById('saboresDisponiblesMesa');
    container.querySelectorAll('button').forEach(btn => {
        if (btn.textContent.trim() === saborNombre) {
            btn.classList.remove('bg-gray-700');
            btn.classList.add('bg-orange-600');
        } else {
            btn.classList.remove('bg-orange-600');
            btn.classList.add('bg-gray-700');
        }
    });
}

// Quitar segundo sabor
function quitarSegundoSaborMesa() {
    segundoSaborMesa = null;
    document.getElementById('saborSeleccionadoMesa').classList.add('hidden');
    
    // Reset botones
    const container = document.getElementById('saboresDisponiblesMesa');
    if (container) {
        container.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('bg-orange-600');
            btn.classList.add('bg-gray-700');
        });
    }
}




