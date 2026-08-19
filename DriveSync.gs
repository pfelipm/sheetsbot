/**
 * DriveSync.gs
 * Sincronización de archivos de Google Drive con Gemini File Search.
 */

/**
 * Función principal para sincronizar la carpeta de Drive con el Store de Gemini.
 * Abre el diálogo de configuración y progreso.
 */
function syncKnowledgeBase() {
  const ui = SpreadsheetApp.getUi();
  const config = getConfig();
  const apiKey = config.API_KEY;
  const folderId = config.ID_CARPETA_DRIVE;
  
  if (!apiKey) {
    ui.alert(
      'API Key no configurada',
      'Por favor, introduce tu API Key de Gemini en la pestaña «Configuración» antes de sincronizar.',
      ui.ButtonSet.OK
    );
    return;
  }
  if (!folderId) {
    ui.alert(
      'Carpeta de Drive no configurada',
      'Para sincronizar una carpeta completa de Drive debes indicar su ID en la pestaña «Configuración».\n\n💡 Si deseas añadir documentos individuales (desde tu equipo o mediante enlace de Drive), puedes hacerlo desde el menú:\n\n🤖 SheetsBot > ⚙️ Gestionar conocimiento.',
      ui.ButtonSet.OK
    );
    return;
  }

  // Abrir el diálogo de progreso con más altura
  const html = HtmlService.createHtmlOutputFromFile('syncProgress')
    .setWidth(500)
    .setHeight(520);
  ui.showModalDialog(html, ' ');
}

/**
 * Prepara el store según el modo elegido (limpio o añadir).
 * Llamada desde el modal antes de empezar a subir.
 */
function prepareStore(mode) {
  const config = getConfig();
  const apiKey = config.API_KEY;
  let storeName = config.ID_STORE_GEMINI;

  if (mode === 'CLEAN' && storeName) {
    // Borrar el store actual forzando
    const deleteUrl = `https://generativelanguage.googleapis.com/v1beta/${storeName}?key=${apiKey}&force=true`;
    fetchWithBackoff(deleteUrl, { method: 'delete', muteHttpExceptions: true });
    setConfigValue('ID_STORE_GEMINI', '');
    storeName = '';
  }

  // Crear store si no existe (o si acabamos de borrarlo)
  if (!storeName) {
    storeName = createFileSearchStore(apiKey);
    setConfigValue('ID_STORE_GEMINI', storeName);
  }
  
  return { success: true, storeName: storeName };
}

/**
 * Obtiene la lista de archivos a sincronizar, comparando fechas con el almacén de Gemini.
 * Llamada desde el modal de progreso.
 */
function getFilesToSync() {
  const config = getConfig();
  const folderId = config.ID_CARPETA_DRIVE;
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const fileList = [];
  
  // Obtener documentos existentes en el store para comparar
  const existingDocs = getStoreDocuments();
  const existingMap = {};
  existingDocs.forEach(d => {
    if (d.displayName) {
      existingMap[d.displayName.toLowerCase()] = {
        name: d.name,
        createTime: d.createTime ? new Date(d.createTime).getTime() : 0
      };
    }
  });

  const supportedTypes = [
    'application/pdf',
    'application/vnd.google-apps.document',
    'text/plain',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    if (supportedTypes.indexOf(mimeType) !== -1 || mimeType.startsWith('image/') || mimeType.startsWith('text/')) {
      const fileName = file.getName();
      const lastUpdated = file.getLastUpdated() ? file.getLastUpdated().getTime() : 0;
      const key = fileName.toLowerCase();
      
      let syncStatus = 'NEW';
      let geminiDocName = '';
      
      if (existingMap[key]) {
        geminiDocName = existingMap[key].name;
        // Si la última modificación en Drive es posterior a la subida en Gemini (con margen de 2 segundos)
        if (lastUpdated > existingMap[key].createTime + 2000) {
          syncStatus = 'MODIFIED';
        } else {
          syncStatus = 'UP_TO_DATE';
        }
      }

      fileList.push({ 
        id: file.getId(), 
        name: fileName,
        url: file.getUrl(),
        status: syncStatus,
        geminiDocName: geminiDocName,
        lastUpdatedText: file.getLastUpdated() ? file.getLastUpdated().toLocaleString() : ''
      });
    }
  }
  
  return fileList;
}

/**
 * Sube un archivo individual de Drive por su ID.
 * Si se indica replaceDocName, borra la versión antigua en Gemini antes de subir.
 * Llamada desde el modal de progreso.
 */
function uploadFileById(fileId, replaceDocName) {
  try {
    const config = getConfig();
    const apiKey = config.API_KEY;
    let storeName = config.ID_STORE_GEMINI;

    // Crear store si no existe
    if (!storeName) {
      storeName = createFileSearchStore(apiKey);
      setConfigValue('ID_STORE_GEMINI', storeName);
    }

    // Si es una actualización, eliminar documento antiguo primero
    if (replaceDocName) {
      try {
        deleteDocumentByName(replaceDocName);
      } catch (delErr) {
        console.warn('No se pudo borrar documento antiguo antes de reemplazar: ' + delErr.message);
      }
    }

    const file = DriveApp.getFileById(fileId);
    uploadFileToGeminiStore(file, storeName, apiKey);
    return { success: true };
  } catch (e) {
    console.error('Error subiendo archivo ' + fileId + ': ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Sube un archivo individual proporcionado mediante enlace o ID de Drive.
 * Llamada desde el Gestor de Conocimiento.
 */
function uploadDriveFileByUrlOrId(urlOrId) {
  try {
    const config = getConfig();
    const apiKey = config.API_KEY;
    if (!apiKey) throw new Error('Configura la API_KEY primero en la hoja de Configuración.');
    
    let raw = (urlOrId || '').trim();
    if (!raw) throw new Error('Introduce un enlace o ID de archivo válido.');
    
    // Extraer ID si es URL completa de Drive o cadena de ID
    let fileId = raw;
    const match = raw.match(/[-\w]{25,}/);
    if (match) {
      fileId = match[0];
    }
    
    let storeName = config.ID_STORE_GEMINI;
    if (!storeName) {
      storeName = createFileSearchStore(apiKey);
      setConfigValue('ID_STORE_GEMINI', storeName);
    }
    
    const file = DriveApp.getFileById(fileId);
    uploadFileToGeminiStore(file, storeName, apiKey);
    return { success: true, fileName: file.getName() };
  } catch (e) {
    console.error('Error subiendo archivo de Drive: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Sube un archivo local enviado en Base64 desde el navegador.
 * Llamada desde el Gestor de Conocimiento.
 */
function uploadLocalFile(fileData) {
  try {
    const config = getConfig();
    const apiKey = config.API_KEY;
    if (!apiKey) throw new Error('Configura la API_KEY primero en la hoja de Configuración.');
    
    if (!fileData || !fileData.base64) {
      throw new Error('No se han recibido datos de archivo válidos.');
    }
    
    let storeName = config.ID_STORE_GEMINI;
    if (!storeName) {
      storeName = createFileSearchStore(apiKey);
      setConfigValue('ID_STORE_GEMINI', storeName);
    }
    
    const decodedBytes = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decodedBytes, fileData.type || 'application/octet-stream', fileData.name);
    
    uploadBlobToGeminiStore(blob, fileData.name, storeName, apiKey);
    return { success: true, fileName: fileData.name };
  } catch (e) {
    console.error('Error subiendo archivo local: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Abre el modal de gestión del conocimiento.
 */
function showStoreManager() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutputFromFile('manageStore')
    .setWidth(620)
    .setHeight(620);
  ui.showModalDialog(html, ' ');
}

/**
 * Obtiene la lista de documentos del store, ordenados alfabéticamente.
 */
function getStoreDocuments() {
  const config = getConfig();
  const apiKey = config.API_KEY;
  const storeName = config.ID_STORE_GEMINI;

  if (!storeName) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/${storeName}/documents?key=${apiKey}`;
  
  try {
    const response = fetchWithBackoff(url, { method: 'get', muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return [];
    
    const data = JSON.parse(response.getContentText());
    if (!data.documents) return [];

    // Ordenar alfabéticamente por displayName
    return data.documents.sort((a, b) => {
      const nameA = (a.displayName || '').toLowerCase();
      const nameB = (b.displayName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } catch (e) {
    console.error('Error al obtener documentos: ' + e.message);
    return [];
  }
}

/**
 * Elimina un documento específico del store por su nombre completo.
 * Llamada desde el modal para feedback granular.
 */
function deleteDocumentByName(docName) {
  try {
    const config = getConfig();
    const apiKey = config.API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/${docName}?key=${apiKey}&force=true`;
    
    const response = fetchWithBackoff(url, { method: 'delete', muteHttpExceptions: true });
    
    if (response.getResponseCode() === 200 || response.getResponseCode() === 404) {
      return { success: true };
    } else {
      return { success: false, error: response.getContentText() };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Elimina el store completo y limpia la configuración.
 */
function deleteStoreComplete() {
  const config = getConfig();
  const apiKey = config.API_KEY;
  const storeName = config.ID_STORE_GEMINI;

  if (!storeName) return true;

  const url = `https://generativelanguage.googleapis.com/v1beta/${storeName}?key=${apiKey}&force=true`;
  const response = fetchWithBackoff(url, { method: 'delete', muteHttpExceptions: true });
  
  if (response.getResponseCode() === 200 || response.getResponseCode() === 404) {
    setConfigValue('ID_STORE_GEMINI', '');
    return true;
  } else {
    throw new Error('No se pudo eliminar el store: ' + response.getContentText());
  }
}

/**
 * Crea un File Search Store en Gemini.
 */
function createFileSearchStore(apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key=${apiKey}`;
  const payload = {
    "displayName": "SheetsBot Knowledge Base",
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  const response = fetchWithBackoff(url, options);
  const result = JSON.parse(response.getContentText());
  return result.name;
}

/**
 * Sube un archivo de Drive al Store de Gemini.
 */
function uploadFileToGeminiStore(file, storeName, apiKey) {
  let blob;
  const mimeType = file.getMimeType();
  const fileName = file.getName();
  
  if (mimeType === 'application/vnd.google-apps.document' || 
      mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Convertir Google Docs y Sheets a PDF para la API de Gemini
    blob = file.getAs('application/pdf');
  } else {
    blob = file.getBlob();
  }

  uploadBlobToGeminiStore(blob, fileName, storeName, apiKey);
}

/**
 * Sube cualquier Blob al Store de Gemini usando multipart upload.
 */
function uploadBlobToGeminiStore(blob, fileName, storeName, apiKey) {
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}:uploadToFileSearchStore?uploadType=multipart&key=${apiKey}`;
  
  const boundary = "-------" + Utilities.getUuid();
  const metadata = JSON.stringify({
    "displayName": fileName
  });

  // Construir el cuerpo multipart combinando bytes
  const header = "--" + boundary + "\r\n" +
                 "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
                 metadata + "\r\n" +
                 "--" + boundary + "\r\n" +
                 "Content-Type: " + (blob.getContentType() || "application/octet-stream") + "\r\n\r\n";
  
  const footer = "\r\n--" + boundary + "--\r\n";

  const requestBody = Utilities.newBlob(header).getBytes()
    .concat(blob.getBytes())
    .concat(Utilities.newBlob(footer).getBytes());

  const options = {
    method: "post",
    contentType: "multipart/related; boundary=" + boundary,
    payload: requestBody,
    muteHttpExceptions: true
  };

  const response = fetchWithBackoff(url, options);
  if (response.getResponseCode() !== 200) {
    let errorMsg = response.getContentText();
    try {
      const errorObj = JSON.parse(errorMsg);
      if (errorObj.error && errorObj.error.message) {
        errorMsg = errorObj.error.message;
      }
    } catch (e) {
      // No es JSON
    }
    throw new Error('Error en upload: ' + errorMsg);
  }
}
