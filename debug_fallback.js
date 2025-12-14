const fs = require('fs');
let c = fs.readFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', 'utf8');

// Agregar log detallado antes de la asignación final en calcularTotalModal
const oldCode = `    // Si aún no hay precio base, usar precio_base del producto
    if (precioBase === 0) {
        precioBase = parseFloat(productoActual.precio_base) || parseFloat(productoActual.precio_venta) || 0;
    }

    let precioAdicionales = 0;`;

const newCode = `    // Si aún no hay precio base, usar precio_base del producto
    if (precioBase === 0) {
        console.log('DEBUG FALLBACK:', {
            precio_base: productoActual.precio_base,
            precio_venta: productoActual.precio_venta,
            precios: productoActual.precios,
            preciosLength: productoActual.precios?.length
        });
        precioBase = parseFloat(productoActual.precio_base) || parseFloat(productoActual.precio_venta) || 0;
        console.log('DEBUG precioBase después de parseFloat:', precioBase, typeof precioBase);
    }

    let precioAdicionales = 0;`;

c = c.replace(oldCode, newCode);

fs.writeFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', c);
console.log('Debug agregado para entender el fallback');
