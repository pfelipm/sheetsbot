/**
 * Code.gs
 * Controladores principales de la WebApp, menú y diálogos de SheetsBot.
 */

const VERSION = 'v1.5 (agosto 2026)';

/**
 * Sirve la página principal de la WebApp.
 */
function doGet() {
  const config = getConfig();
  const template = HtmlService.createTemplateFromFile('index');
  
  // Pasar personalización al template
  template.chatTitle = config.CHAT_TITULO || '🤖 SheetsBot';
  template.chatSubtitle = config.CHAT_SUBTITULO || 'Asistente impulsado por Gemini';
  template.accentColor = config.CHAT_COLOR_PRINCIPAL || '#4a90e2';
  template.chatGreeting = config.CHAT_SALUDO_ASISTENTE || '¡Hola! Soy tu asistente inteligente. ¿En qué puedo ayudarte hoy?';
  
  return template.evaluate()
      .setTitle(template.chatTitle)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Procesa el mensaje del usuario enviado desde el frontend.
 * @param {string} userMessage - El mensaje enviado.
 * @param {Array} chatHistory - Historial previo enviado por el cliente.
 */
function processMessage(userMessage, chatHistory) {
  try {
    const response = callGemini(userMessage, chatHistory);
    
    // Obtener el email del usuario o poner "Usuario anónimo" si no está disponible
    const userEmail = Session.getActiveUser().getEmail() || 'Usuario anónimo';
    
    // Registrar en el Log de la Sheet
    logInteraction(userEmail, userMessage, response.text, response.tokens);
    
    return {
      success: true,
      text: response.text,
      tokens: response.tokens,
      groundingMetadata: response.groundingMetadata
    };
  } catch (e) {
    console.error('Error procesando mensaje: ' + e.message);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Función auxiliar para incluir archivos HTML dentro de otros.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

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
