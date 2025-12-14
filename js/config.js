/**
 * Configuración global del Frontend - Pizzería NISSI
 * ================================================
 * Este archivo contiene la configuración de la API y otras constantes
 */

// URL base de la API en Render
const API_BASE_URL = 'https://pizzeria-w9k6.onrender.com';

// Función helper para hacer peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        mode: 'cors',
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        return response;
    } catch (error) {
        console.error(`Error en petición a ${endpoint}:`, error);
        throw error;
    }
}

// Función para obtener JSON de la API
async function apiGet(endpoint) {
    const response = await apiRequest(endpoint, { method: 'GET' });
    return response.json();
}

// Función para enviar datos a la API
async function apiPost(endpoint, data) {
    const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return response.json();
}

// Función para actualizar datos en la API
async function apiPut(endpoint, data) {
    const response = await apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return response.json();
}

// Función para eliminar datos en la API
async function apiDelete(endpoint) {
    const response = await apiRequest(endpoint, { method: 'DELETE' });
    return response.json();
}

// Exportar para uso en otros archivos (si se usa como módulo)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL, apiRequest, apiGet, apiPost, apiPut, apiDelete };
}

console.log('[Config] API configurada:', API_BASE_URL);
