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
  
  if (!apiKey) throw new Error('Configura la API_KEY primero.');
  if (!folderId) throw new Error('Configura el ID_CARPETA_DRIVE primero.');

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
 * Obtiene la lista de archivos a sincronizar. Llamada desde el modal.
 */
function getFilesToSync() {
  const config = getConfig();
  const folderId = config.ID_CARPETA_DRIVE;
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const fileList = [];
  
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
      fileList.push({ id: file.getId(), name: file.getName() });
    }
  }
  
  return fileList;
}

/**
 * Sube un archivo individual por su ID. Llamada desde el modal.
 */
function uploadFileById(fileId) {
  try {
    const config = getConfig();
    const apiKey = config.API_KEY;
    let storeName = config.ID_STORE_GEMINI;

    // Crear store si no existe
    if (!storeName) {
      storeName = createFileSearchStore(apiKey);
      setConfigValue('ID_STORE_GEMINI', storeName);
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
 * Abre el modal de gestión del conocimiento.
 */
function showStoreManager() {
  const ui = SpreadsheetApp.getUi();
  const html = HtmlService.createHtmlOutputFromFile('manageStore')
    .setWidth(600)
    .setHeight(550);
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

  // Usar multipart upload para enviar metadatos (nombre) y contenido
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
                 "Content-Type: " + blob.getContentType() + "\r\n\r\n";
  
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

const VERSION = 'v1.1 (agosto 2026)';

/**
 * Añade el menú a la hoja de cálculo al abrir.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🤖 SheetsBot')
      .addItem('💬 Abrir chatbot', 'openChatbot')
      .addItem('🚀 Desplegar WebApp', 'showDeployWizard')
      .addSeparator()
      .addItem('✨ Inicializar hoja', 'setupSheet')
      .addSeparator()
      .addItem('🔄 Sincronizar conocimiento', 'syncKnowledgeBase')
      .addItem('⚙️ Gestionar conocimiento', 'showStoreManager')
      .addSeparator()
      .addItem('ℹ️ Acerca de', 'showAbout')
      .addToUi();
}

/**
 * Abre el chatbot en una nueva pestaña si la URL está guardada,
 * o muestra el asistente de despliegue si aún no se ha configurado.
 */
function openChatbot() {
  const url = getSavedWebAppUrl();
  if (url) {
    const html = HtmlService.createHtmlOutput(`
      <!DOCTYPE html>
      <html>
        <head>
          <base target="_top">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
          <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
              color: #333;
              overflow: hidden;
            }
            .header-container {
              background-color: #1a73e8;
              padding: 12px 18px;
              color: white;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .header-container i { font-size: 22px; }
            .header-container span { font-size: 16px; font-weight: 500; }
            .content {
              padding: 16px 20px;
              text-align: center;
            }
            .msg {
              font-size: 13px;
              color: #3c4043;
              margin: 0 0 14px 0;
              line-height: 1.4;
            }
            .btn-primary {
              background-color: #188038 !important;
              text-transform: none !important;
              font-weight: 500;
              border-radius: 4px;
              height: 38px;
              line-height: 38px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
            }
            .btn-grey {
              background-color: #5f6368 !important;
              text-transform: none !important;
              font-weight: 500;
              border-radius: 4px;
              height: 38px;
              line-height: 38px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
            }
            .tip {
              font-size: 11.5px;
              color: #70757a;
              margin-top: 14px;
              line-height: 1.3;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <i class="material-icons">chat</i>
            <span>Abrir SheetsBot</span>
          </div>
          <div class="content">
            <p class="msg">Tu navegador ha bloqueado la apertura automática de la ventana emergente.</p>
            <div style="display: flex; justify-content: center; gap: 8px;">
              <a href="${url}" target="_blank" class="btn waves-effect waves-light btn-primary" onclick="setTimeout(function(){ google.script.host.close(); }, 250)">
                <i class="material-icons left" style="font-size: 18px; margin-right: 4px;">open_in_new</i>
                Abrir chatbot
              </a>
              <button class="btn waves-effect waves-light btn-grey" onclick="copyUrl()">
                <i class="material-icons left" style="font-size: 18px; margin-right: 4px;">content_copy</i>
                Copiar enlace
              </button>
            </div>
            <div class="tip">💡 Puedes permitir las ventanas emergentes desde el icono en la barra de direcciones.</div>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
          <script>
            function copyUrl() {
              navigator.clipboard.writeText('${url}').then(function() {
                M.toast({html: '📋 Enlace copiado al portapapeles', classes: 'blue darken-1'});
              });
            }
            try {
              var win = window.open('${url}', '_blank');
              if (win && !win.closed && typeof win.closed !== 'undefined') {
                google.script.host.close();
              }
            } catch (e) {
              // Popup bloqueado
            }
          </script>
        </body>
      </html>
    `).setWidth(460).setHeight(230);
    SpreadsheetApp.getUi().showModalDialog(html, ' ');
  } else {
    showDeployWizard();
  }
}

/**
 * Abre el Asistente de Despliegue de la WebApp.
 */
function showDeployWizard() {
  const config = getConfig();
  const template = HtmlService.createTemplateFromFile('deployWizard');
  const savedUrl = getSavedWebAppUrl() || '';
  template.currentUrl = savedUrl;
  template.chatTitle = config.CHAT_TITULO || '🤖 SheetsBot';
  template.editorUrl = 'https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/edit';
  const initialHeight = savedUrl ? 870 : 490;
  const html = template.evaluate()
      .setWidth(600)
      .setHeight(initialHeight);
  SpreadsheetApp.getUi().showModalDialog(html, ' ');
}

/**
 * Obtiene la URL de la WebApp guardada en las propiedades del script.
 */
function getSavedWebAppUrl() {
  return PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || '';
}

/**
 * Guarda la URL de la WebApp en las propiedades del script tras validarla.
 */
function saveWebAppUrl(url) {
  try {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) {
      PropertiesService.getScriptProperties().deleteProperty('WEBAPP_URL');
      return { success: true, url: '' };
    }
    
    // Validación básica de URL de Apps Script WebApp
    if (!trimmedUrl.startsWith('https://script.google.com/macros/s/') && !trimmedUrl.startsWith('https://script.google.com/a/')) {
      return { 
        success: false, 
        error: 'La URL debe comenzar por https://script.google.com/macros/s/...' 
      };
    }
    
    PropertiesService.getScriptProperties().setProperty('WEBAPP_URL', trimmedUrl);
    return { success: true, url: trimmedUrl };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Abre el diálogo "Acerca de".
 */
function showAbout() {
  const template = HtmlService.createTemplateFromFile('acercaDe');
  template.VERSION = VERSION;
  const html = template.evaluate()
      .setWidth(540)
      .setHeight(740);
  SpreadsheetApp.getUi().showModalDialog(html, ' ');
}
