const fs = require('fs');
let c = fs.readFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', 'utf8');

// Reemplazar función formatPrice
const oldFn = `function formatPrice(price) {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return Math.round(numPrice).toLocaleString('es-CO');
}`;

const newFn = `function formatPrice(price) {
    let numPrice = price;
    if (typeof price === 'string') {
        numPrice = parseFloat(price.replace(/[^0-9.-]/g, ''));
    }
    if (isNaN(numPrice)) numPrice = 0;
    return Math.round(numPrice).toLocaleString('es-CO');
}`;

c = c.replace(oldFn, newFn);
fs.writeFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', c);
console.log('formatPrice actualizado');
