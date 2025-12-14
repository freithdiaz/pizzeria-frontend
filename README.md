# Pizzeria Nissi - Frontend

Frontend estático para GitHub Pages que se conecta al backend en Render.

## Estructura

- index.html - Página principal de pedidos
- dmin.html - Panel de administración
- domicilio.html - Página de domicilios públicos
- js/ - Archivos JavaScript
  - config.js - **CONFIGURACIÓN DE API** (modificar URL del backend aquí)
- css/ - Estilos CSS
- images/ - Imágenes estáticas

## Configuración

Editar js/config.js para configurar la URL del backend:

```javascript
const API_BASE_URL = 'https://pizzeria-w9k6.onrender.com';
```

## Despliegue en GitHub Pages

1. Crear un repositorio en GitHub (ej: pizzeria-frontend)
2. Subir todos los archivos de esta carpeta
3. Ir a Settings > Pages
4. Seleccionar la rama main y carpeta / (root)
5. Guardar y esperar que se despliegue
6. Tu sitio estará disponible en: https://TU_USUARIO.github.io/pizzeria-frontend/

## Configurar CORS en Render

En Render, agregar la variable de entorno:

- **Nombre:** ALLOWED_ORIGINS
- **Valor:** https://TU_USUARIO.github.io

(Reemplaza TU_USUARIO con tu nombre de usuario de GitHub)

## Archivos importantes

| Archivo | Descripción |
|---------|-------------|
| js/config.js | URL del backend |
| js/app.js | Lógica de la página principal |
| js/admin.js | Lógica del panel de administración |
| js/domicilio_publico.js | Lógica de domicilios |
