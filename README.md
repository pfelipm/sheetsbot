<p align="center">
  <img src="assets/banner.png" alt="SheetsBot Banner">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white" alt="Google Apps Script">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Versión-v1.0_(mayo_2026)-indigo" alt="Versión">
  <img src="https://img.shields.io/badge/Licencia-GPL_v3-blue" alt="Licencia">
</p>

> 🤖 **SheetsBot**: Despliega chatbots conversacionales potentes basados en **Google Gemini**, utilizando Google Sheets como cerebro y panel de control.

---

### 🎯 ¿De qué va esto?

**SheetsBot** es una herramienta diseñada para democratizar el despliegue de asistentes inteligentes. Olvídate de servidores complejos o costes de hospedaje; con solo una hoja de cálculo de Google y una clave de API de Gemini, puedes tener un chatbot profesional funcionando en minutos.

A diferencia de otros asistentes genéricos, **SheetsBot** está diseñado para ser:
1.  **Privado y Controlado**: Todo ocurre en tu entorno de Google Apps Script. Las llamadas a la API están ocultas en el backend.
2.  **Experto en tus datos (RAG)**: Gracias a la integración con la capacidad de **File Search** de Gemini, el bot puede "aprender" de los documentos (PDF, Google Docs, hojas de cálculo) que tengas en una carpeta de Google Drive.
3.  **Seguro**: Permite ajustar los niveles de seguridad de la API para adaptar las respuestas a diferentes tipos de público (incluyendo menores).

---

### ✨ Características principales

1.  **Configuración Visual**: Gestiona todo desde la pestaña "Configuración": API Key, modelo, instrucciones de sistema y niveles de seguridad.
2.  **Motor RAG Avanzado**: Implementa *Generación Aumentada por Recuperación* de forma nativa. El bot no solo responde con su conocimiento general, sino que busca en tus archivos de Drive para dar respuestas precisas.
3.  **Gestor de Conocimiento**: Un panel moderno (Materialize CSS) para listar, revisar y eliminar los documentos que el bot ha indexado.
4.  **Sincronización Inteligente**: Proceso de subida interactivo con feedback en tiempo real archivo por archivo y desplazamiento automático.
5.  **Interfaz Web Moderna**: Una WebApp tipo "Chat" responsive, con soporte para Markdown y diseño limpio.
6.  **Arquitectura Robusta**: Incluye lógica de **Binary Exponential Backoff** para manejar reintentos automáticos ante límites de cuota o errores de red.

---

### 🚀 Cómo empezar

#### 1. Preparación de la Hoja
*   Crea una nueva Hoja de Cálculo de Google.
*   Vincula el código de este repositorio (vía Apps Script o utilizando `clasp`).
*   Refresca la hoja para que aparezca el menú **🤖 SheetsBot**.

#### 2. Inicialización
*   Ve al menú **🤖 SheetsBot > 🚀 Inicializar Hoja**. 
*   El script creará las pestañas de **Configuración** y **Log**. 
*   *Nota*: Si la hoja ya está inicializada, el sistema te avisará con un diálogo de seguridad para evitar sobrescribir tus datos.

#### 3. Configuración del Bot
*   **API_KEY**: Introduce tu clave de [Google AI Studio](https://aistudio.google.com/).
*   **MODELO**: Elige el modelo (ej: `gemini-flash-latest`).
*   **MODO_RAG**: Activa el checkbox si quieres que el bot use tus documentos.
*   **ID_CARPETA_DRIVE**: Pega el ID de la carpeta donde guardas tus documentos de conocimiento.

#### 4. Carga de Conocimiento
*   Si usas el modo RAG, selecciona **🤖 SheetsBot > 🔄 Sincronizar Conocimiento**.
*   Podrás elegir entre **Añadir nuevos** archivos o realizar una **Limpieza total** y sincronización desde cero.
*   Verás en tiempo real cómo se procesa cada documento con spinners e indicadores de éxito.

---

### ⚙️ Gestión y Auditoría

#### Gestor de Conocimiento
A través del comando **⚙️ Gestionar Conocimiento**, puedes abrir un panel que te permite:
*   Ver todos los archivos que Gemini ha indexado con su fecha de subida original.
*   Seleccionar archivos específicos para eliminarlos del almacén.
*   Borrar el almacén (Store) completo de forma segura.

#### Pestaña de Log
Cada mensaje enviado por los usuarios a través de la WebApp queda registrado automáticamente en la pestaña **Log**, incluyendo:
*   Fecha y hora.
*   Mensaje del usuario y respuesta del bot.
*   Consumo de tokens para control de costes y cuota.

---

### 🛠️ Comandos del menú

<img src="assets/banner.png" alt="Menú SheetsBot" align="right" width="250">

*   **🚀 Inicializar Hoja**: Prepara la estructura y validaciones de la hoja de cálculo.
*   **🔄 Sincronizar Conocimiento**: Sube los archivos de tu carpeta de Drive al motor de búsqueda de Gemini.
*   **⚙️ Gestionar Conocimiento**: Abre el panel de control de archivos indexados.
*   **ℹ️ Acerca de**: Información de autoría, licencia y versión.

<br clear="right">

---

### 🤝 Contribuciones

Si tienes sugerencias para mejorar la interfaz o añadir nuevas capacidades de Gemini, no dudes en abrir un *issue* o enviar un *pull request*.

### ✍️ Autoría y agradecimientos

*   **Autor:** Pablo Felip ([@pfelipm](https://twitter.com/pfelipm))
*   **Licencia:** [GNU GPL v3.0](https://github.com/pfelipm/sheetsbot/blob/main/LICENSE)
*   **Repositorio:** [https://github.com/pfelipm/sheetsbot](https://github.com/pfelipm/sheetsbot)

---
<p align="center">Hecho con ❤️, café y la inestimable ayuda estratégica de Gemini CLI.</p>
