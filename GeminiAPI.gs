/**
 * GeminiAPI.gs
 * Comunicación con la API de Google Gemini.
 */

/**
 * Llama a la API de Gemini para generar una respuesta.
 * @param {string} prompt - El mensaje del usuario.
 * @param {Array} history - Historial de la conversación (opcional).
 * @return {Object} La respuesta de la API.
 */
function callGemini(prompt, history = []) {
  const config = getConfig();
  const apiKey = config.API_KEY;
  const model = config.MODELO || 'gemini-3.1-flash-lite';
  
  if (!apiKey) {
    throw new Error('La API_KEY no está configurada en la pestaña de Configuración.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Configuración de Seguridad
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: config.FILTRO_ACOSO },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: config.FILTRO_ODIO },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: config.FILTRO_SEXUAL },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: config.FILTRO_PELIGROSO }
  ];

  // Preparar contenido
  const contents = history.map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const payload = {
    contents: contents,
    safetySettings: safetySettings,
    systemInstruction: {
      parts: [{ text: config.INSTRUCCION_SISTEMA }]
    }
  };

  // Añadir herramienta de RAG si está activado
  if (config.MODO_RAG === 'ACTIVADO' && config.ID_STORE_GEMINI) {
    payload.tools = [{
      file_search: {
        file_search_store_names: [config.ID_STORE_GEMINI]
      }
    }];
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = fetchWithBackoff(url, options);
  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error('Error de Gemini API: ' + json.error.message);
  }

  if (!json.candidates || json.candidates.length === 0) {
    if (json.promptFeedback && json.promptFeedback.blockReason) {
      return { text: 'La respuesta fue bloqueada por motivos de seguridad: ' + json.promptFeedback.blockReason, blocked: true };
    }
    return { text: 'No se pudo generar una respuesta. Por favor, intenta de nuevo.', error: true };
  }

  const candidate = json.candidates[0];
  const responseText = candidate.content.parts[0].text;
  const tokenCount = json.usageMetadata ? json.usageMetadata.totalTokenCount : 0;

  return {
    text: responseText,
    tokens: tokenCount,
    groundingMetadata: candidate.groundingMetadata
  };
}
