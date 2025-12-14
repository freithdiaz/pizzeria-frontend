const fs = require('fs');
let c = fs.readFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', 'utf8');

// Reemplazar línea 624 para agregar log
const oldLine624 = 'precioBase = Math.min(...productoActual.precios.map(p => parseFloat(p.precio) || 0));';
const newLine624 = `console.log('DEBUG L624 - precios antes de Math.min:', productoActual.precios.map(p => ({id: p.id, precio: p.precio, parsed: parseFloat(p.precio)})));
        precioBase = Math.min(...productoActual.precios.map(p => parseFloat(p.precio) || 0));
        console.log('DEBUG L624 - precioBase después:', precioBase, typeof precioBase);`;

// Solo reemplazar la primera ocurrencia (línea 624)
const idx = c.indexOf(oldLine624);
if (idx !== -1) {
    c = c.substring(0, idx) + newLine624 + c.substring(idx + oldLine624.length);
    console.log('Línea 624 modificada');
}

fs.writeFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', c);
console.log('Archivo guardado');
