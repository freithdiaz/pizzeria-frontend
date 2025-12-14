/**
 * Configuración y utilidades para uploads en el frontend
 * Reutilizable en cualquier página
 */

// Configuración
const UPLOAD_CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
    apiEndpoint: '/api/uploads',
    folders: {
        PRODUCTOS: 'productos',
        REPORTES: 'reportes',
        CATEGORIAS: 'categorias',
        TEMP: 'temp'
    }
};

/**
 * Subir archivo a servidor
 * @param {File} file - Archivo a subir
 * @param {string} folder - Carpeta de destino
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function uploadFile(file, folder = 'productos', onProgress = null) {
    // Validar archivo
    if (!file) {
        throw new Error('No se seleccionó archivo');
    }
    
    if (file.size > UPLOAD_CONFIG.maxFileSize) {
        throw new Error(`Archivo muy grande. Máximo: ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`);
    }
    
    if (!UPLOAD_CONFIG.allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Usa: JPG, PNG, GIF, WEBP');
    }
    
    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    
    // Hacer request
    const response = await fetch(`${UPLOAD_CONFIG.apiEndpoint}/upload`, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Error al subir archivo');
    }
    
    return data;
}

/**
 * Eliminar archivo del servidor
 * @param {string} fileUrl - URL del archivo a eliminar
 * @returns {Promise<Object>} Respuesta del servidor
 */
async function deleteFile(fileUrl) {
    const response = await fetch(`${UPLOAD_CONFIG.apiEndpoint}/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: fileUrl })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar archivo');
    }
    
    return data;
}

/**
 * Listar archivos en una carpeta
 * @param {string} folder - Carpeta a listar
 * @returns {Promise<Array>} Array de URLs de archivos
 */
async function listFiles(folder = 'productos') {
    const response = await fetch(`${UPLOAD_CONFIG.apiEndpoint}/list/${folder}`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Error al listar archivos');
    }
    
    return data.files;
}

/**
 * Obtener información del almacenamiento
 * @returns {Promise<Object>} Información de almacenamiento
 */
async function getStorageInfo() {
    const response = await fetch(`${UPLOAD_CONFIG.apiEndpoint}/info`);
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error || 'Error al obtener información');
    }
    
    return data.data;
}

/**
 * Crear preview de imagen antes de subir
 * @param {File} file - Archivo de imagen
 * @param {HTMLImageElement} imgElement - Elemento <img> donde mostrar
 */
function createImagePreview(file, imgElement) {
    if (!file.type.startsWith('image/')) {
        console.error('El archivo no es una imagen');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        imgElement.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * Crear elemento de progreso de carga
 * @returns {Object} Con métodos para actualizar progreso
 */
function createProgressTracker() {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'upload-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    
    const progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    
    progressDiv.appendChild(progressBar);
    progressDiv.appendChild(progressText);
    
    return {
        element: progressDiv,
        update: (percent) => {
            progressBar.style.width = percent + '%';
            progressText.textContent = Math.round(percent) + '%';
        },
        show: (parent) => parent.appendChild(progressDiv),
        hide: () => progressDiv.remove()
    };
}

/**
 * Manejo completo de input file con validación
 * @param {HTMLInputElement} fileInput - Input de tipo file
 * @param {string} folder - Carpeta de destino
 * @param {Function} onSuccess - Callback al subir exitosamente
 * @param {Function} onError - Callback si hay error
 */
function setupFileInput(fileInput, folder = 'productos', onSuccess = null, onError = null) {
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const data = await uploadFile(file, folder);
            
            if (onSuccess) {
                onSuccess(data);
            }
            
            // Limpiar input
            fileInput.value = '';
            
            console.log('✅ Archivo subido:', data.url);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            
            if (onError) {
                onError(error.message);
            }
            
            // Mostrar alerta
            alert('Error: ' + error.message);
        }
    });
}

// Estilos CSS para agregar al archivo styles.css
const UPLOAD_STYLES = `
.upload-progress {
    margin: 10px 0;
    padding: 10px;
    background: #f0f0f0;
    border-radius: 4px;
}

.progress-bar {
    height: 20px;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    border-radius: 3px;
    width: 0%;
    transition: width 0.3s ease;
    position: relative;
}

.progress-text {
    display: inline-block;
    margin-left: 10px;
    font-weight: bold;
    color: #333;
}

.file-input-wrapper {
    position: relative;
    display: inline-block;
    cursor: pointer;
}

.file-input-wrapper input[type="file"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.file-input-label {
    padding: 10px 20px;
    background: #2196F3;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;
}

.file-input-label:hover {
    background: #1976D2;
}

.image-preview {
    max-width: 200px;
    max-height: 200px;
    margin: 10px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
}
`;

// Exportar para Node.js si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        uploadFile,
        deleteFile,
        listFiles,
        getStorageInfo,
        createImagePreview,
        createProgressTracker,
        setupFileInput,
        UPLOAD_CONFIG
    };
}
