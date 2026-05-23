/**
 * Code.gs
 * Controladores principales de la WebApp.
 */

/**
 * Sirve la página principal de la WebApp.
 */
function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('SheetsBot - Asistente Gemini')
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
