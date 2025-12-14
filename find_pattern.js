const fs = require('fs');
let c = fs.readFileSync('c:/Users/freit/Desktop/pizzeria-frontend/js/domicilio_publico.js', 'utf8');

// Buscar el patrón exacto y agregar logs
const oldPattern = /\/\/ Si no hay tama.o seleccionado pero el producto tiene precios din.micos, usar el m.s bajo\s*\n\s*if \(precioBase === 0 && productoActual\.precios && productoActual\.precios\.length > 0\) \{\s*\n\s*precioBase = Math\.min\(\.\.\.productoActual\.precios\.map\(p => parseFloat\(p\.precio\) \|\| 0\)\);/;

const match = c.match(oldPattern);
console.log('Patrón encontrado:', match ? 'SI' : 'NO');
if (match) {
    console.log('Match:', match[0].substring(0, 100));
}

// Buscar línea específica
const lines = c.split('\n');
lines.forEach((line, i) => {
    if (line.includes('Math.min') && line.includes('precios.map')) {
        console.log(`Línea ${i+1}: ${line.trim()}`);
    }
});
