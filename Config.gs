/**
 * Config.gs
 * Gestión de la configuración y registros en Google Sheets.
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_CONFIG_NAME = 'Configuración';
const SHEET_LOG_NAME = 'Log';

/**
 * Punto de entrada para inicializar las pestañas de la hoja de cálculo.
 * Detecta si ya está inicializada para pedir confirmación.
 */
function setupSheet() {
  const configSheet = SS.getSheetByName(SHEET_CONFIG_NAME);
  
  // Si la hoja no existe o está vacía, inicializar directamente
  if (!configSheet || configSheet.getLastRow() < 2) {
    executeSetupSheet();
    SpreadsheetApp.getUi().alert('Estructura inicializada correctamente.');
  } else {
    // Si parece inicializada, pedir confirmación con diálogo moderno
    const html = HtmlService.createHtmlOutputFromFile('initSheet')
      .setWidth(450)
      .setHeight(360);
    SpreadsheetApp.getUi().showModalDialog(html, ' ');
  }
}

/**
 * Lógica real de inicialización. 
 * Llamada directamente o desde el modal de confirmación.
 */
function executeSetupSheet() {
  // Configuración
  let configSheet = SS.getSheetByName(SHEET_CONFIG_NAME);
  if (!configSheet) {
    configSheet = SS.insertSheet(SHEET_CONFIG_NAME);
  }
  configSheet.clear();
  const configData = [
    ['Ajuste', 'Valor', 'Descripción'],
    ['API_KEY', '', 'Tu clave de Google AI Studio (BYOK)'],
    ['MODELO', 'gemini-flash-latest', 'Escoge el modelo (gemini-flash-latest recomendado)'],
    ['FILTRO_ACOSO', 'BLOCK_MEDIUM_AND_ABOVE', 'Nivel de bloqueo para acoso'],
    ['FILTRO_ODIO', 'BLOCK_MEDIUM_AND_ABOVE', 'Nivel de bloqueo para discurso de odio'],
    ['FILTRO_SEXUAL', 'BLOCK_MEDIUM_AND_ABOVE', 'Nivel de bloqueo para contenido sexual'],
    ['FILTRO_PELIGROSO', 'BLOCK_MEDIUM_AND_ABOVE', 'Nivel de bloqueo para contenido peligroso'],
    ['MODO_RAG', 'DESACTIVADO', 'ACTIVADO / DESACTIVADO'],
    ['ID_CARPETA_DRIVE', '', 'ID de la carpeta de Drive con el conocimiento'],
    ['ID_STORE_GEMINI', '', 'ID del File Search Store (se genera automáticamente)'],
    ['INSTRUCCION_SISTEMA', 'Eres un asistente útil y amable llamado SheetsBot.', 'Instrucciones base para el comportamiento del bot'],
    ['THINKING_LEVEL', 'medium', 'Nivel de razonamiento (thinking) del modelo (low, medium, high)'],
    ['CHAT_TITLE', '🤖 SheetsBot', 'Título de la ventana del chatbot'],
    ['CHAT_SUBTITLE', 'Asistente impulsado por Gemini', 'Subtítulo de la ventana del chatbot'],
    ['CHAT_ACCENT_COLOR', '#4a90e2', 'Color de acento (primary-color CSS) de la ventana del chatbot']
  ];
  configSheet.getRange(1, 1, configData.length, 3).setValues(configData);
  
  // Añadir validación de datos (desplegable) para el modelo en B3
  const models = [
    'gemini-1.5-flash', 
    'gemini-1.5-pro',
    'gemini-3.1-flash-lite', 
    'gemini-3.1-flash-lite-preview', 
    'gemini-3.1-pro-preview', 
    'gemini-3-flash-preview', 
    'gemini-3-pro-image-preview',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(models).build();
  configSheet.getRange('B3').setDataValidation(rule);

  // También para MODO_RAG en B8 (Checkbox)
  const ragRule = SpreadsheetApp.newDataValidation()
    .requireCheckbox('ACTIVADO', 'DESACTIVADO')
    .build();
  configSheet.getRange('B8').setDataValidation(ragRule);

  // Desplegables para niveles de seguridad (B4 a B7)
  const safetyLevels = [
    'OFF', 
    'BLOCK_NONE', 
    'BLOCK_ONLY_HIGH', 
    'BLOCK_MEDIUM_AND_ABOVE', 
    'BLOCK_LOW_AND_ABOVE', 
    'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
  ];
  const safetyRule = SpreadsheetApp.newDataValidation().requireValueInList(safetyLevels).build();
  configSheet.getRange('B4:B7').setDataValidation(safetyRule);

  // Desplegable para THINKING_LEVEL en B12
  const thinkingLevels = ['low', 'medium', 'high'];
  const thinkingRule = SpreadsheetApp.newDataValidation().requireValueInList(thinkingLevels).build();
  configSheet.getRange('B12').setDataValidation(thinkingRule);

  configSheet.setColumnWidth(1, 200);
  configSheet.setColumnWidth(2, 400);
  configSheet.setColumnWidth(3, 400);
  configSheet.getRange('A1:C1').setFontWeight('bold').setBackground('#0c1a78').setFontColor('#ffffff');

  // Log
  let logSheet = SS.getSheetByName(SHEET_LOG_NAME);
  if (!logSheet) {
    logSheet = SS.insertSheet(SHEET_LOG_NAME);
  }
  logSheet.clear();
  const logHeaders = [['Fecha', 'Usuario', 'Mensaje', 'Respuesta', 'Tokens']];
  logSheet.getRange(1, 1, 1, logHeaders[0].length).setValues(logHeaders);
  logSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#0c1a78').setFontColor('#ffffff');
}

/**
 * Lee toda la configuración y la devuelve como un objeto.
 */
function getConfig() {
  const sheet = SS.getSheetByName(SHEET_CONFIG_NAME);
  const data = sheet.getDataRange().getValues();
  const config = {};
  for (let i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  
  // Normalizar color si es necesario
  if (config.CHAT_ACCENT_COLOR && !config.CHAT_ACCENT_COLOR.startsWith('#')) {
    config.CHAT_ACCENT_COLOR = '#' + config.CHAT_ACCENT_COLOR;
  }
  
  return config;
}

/**
 * Actualiza un valor específico en la configuración.
 */
function setConfigValue(key, value) {
  const sheet = SS.getSheetByName(SHEET_CONFIG_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
}

/**
 * Registra una interacción en la pestaña de Log.
 */
function logInteraction(user, message, response, tokens) {
  const sheet = SS.getSheetByName(SHEET_LOG_NAME);
  sheet.appendRow([new Date(), user, message, response, tokens]);
}

/**
 * Realiza una petición HTTP con reintentos (Exponential Backoff).
 * Útil para manejar límites de cuota (429) y errores temporales del servidor (5xx).
 */
function fetchWithBackoff(url, options = {}, maxRetries = 4) {
  let retries = 0;
  let response;
  
  while (retries <= maxRetries) {
    response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    
    // Si es éxito (2xx), devolver respuesta
    if (code >= 200 && code < 300) {
      return response;
    }
    
    // Si es un error que merece reintento (429 o 5xx)
    if (code === 429 || (code >= 500 && code < 600)) {
      if (retries === maxRetries) break;
      
      // Calcular espera: 2^retries * 1000ms + random jitter
      const waitTime = Math.pow(2, retries) * 1000 + (Math.random() * 1000);
      console.warn(`Error ${code}. Reintentando en ${Math.round(waitTime)}ms... (Intento ${retries + 1}/${maxRetries})`);
      Utilities.sleep(waitTime);
      retries++;
    } else {
      // Otros errores (400, 401, 403, 404) no se suelen reintentar
      return response;
    }
  }
  
  return response;
}
