<p align="center">
  <img src="assets/banner-1000.png" alt="SheetsBot Banner">
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
2.  **Accesible y Anónimo**: Los usuarios finales **no necesitan iniciar sesión** en su cuenta de Google ni en ninguna otra plataforma para interactuar con el bot.
3.  **Experto en tus datos (RAG)**: Gracias a la integración con la capacidad de [**File Search**](https://ai.google.dev/gemini-api/docs/file-search) de Gemini, el bot puede "aprender" de los documentos que tengas en una carpeta de Google Drive.
4.  **Seguro**: Permite ajustar los niveles de seguridad de la API para adaptar las respuestas a diferentes tipos de público.

<p align="center">
  <img src="assets/infografía.png" alt="Infografía de SheetsBot" width="800">
</p>

---

### ✨ Características principales

1.  **Configuración Visual**: Gestiona todo desde la pestaña "Configuración": API Key, modelo, instrucciones de sistema y niveles de seguridad.
    <p align="center">
      <img src="assets/hdc-configuración.png" alt="Panel de Configuración de SheetsBot" width="100%">
    </p>

2.  **Motor RAG Avanzado**: Implementa *Generación Aumentada por Recuperación* de forma nativa. El bot busca en tus archivos de Drive para dar respuestas precisas. Consulta aquí los [tipos de archivos soportados](https://ai.google.dev/gemini-api/docs/file-search#supported-files).

3.  **Gestor de Conocimiento**: Un panel moderno para listar, revisar y eliminar los documentos que el bot ha indexado.
    <p align="center">
      <img src="assets/diálogo-gestionar.png" alt="Gestor de Conocimiento" width="500">
    </p>

4.  **Sincronización Inteligente**: Proceso de subida interactivo con feedback en tiempo real y desplazamiento automático.
    <p align="center">
      <img src="assets/diálogo-sincronizar.png" alt="Proceso de Sincronización" width="500">
    </p>

5.  **Interfaz Web Moderna**: Una WebApp tipo "Chat" responsive, con soporte para Markdown.
    <p align="center">
      <img src="assets/chatbot.png" alt="Interfaz de Chat de SheetsBot" width="400">
    </p>

6.  **Arquitectura Robusta**: Incluye lógica de **Binary Exponential Backoff** para manejar reintentos automáticos.

---

### 🚀 Cómo empezar

#### 1. Preparación de la Hoja
La forma más rápida de empezar es duplicar esta plantilla, que ya incorpora todo el código necesario:

> 👉 **[Plantilla de SheetsBot](https://docs.google.com/spreadsheets/d/1o9wLge7oQktrh9rWH0I8bcbnu_o8lXflzNgcu6nR8vw/edit?usp=sharing)**

#### 2. Configuración del Bot
*   **Ajustes de Inteligencia**:
    *   **API_KEY**: Obtén tu clave en [Google AI Studio](https://aistudio.google.com/api-keys).
    *   **MODELO**: Elige el modelo (ej: `gemini-flash-latest`). Puedes consultar aquí la lista completa de [modelos y sus fechas de disponibilidad o cierre](https://ai.google.dev/gemini-api/docs/deprecations).
    *   **MODO_RAG**: Activa el checkbox si quieres que el bot use tus documentos de Drive.
    *   **ID_CARPETA_DRIVE**: Pega el ID de la carpeta donde guardas tus documentos de conocimiento.
    *   **Conocimiento**: El chatbot "sabe" todo lo que el modelo de Gemini seleccionado conoce de forma nativa. Al activar el **modo RAG**, este conocimiento se enriquece con tus propios contenidos. En este sentido, SheetsBot se comporta de forma similar a una **Gema de Gemini** a la que se le han facilitado archivos en su definición, más que a una aplicación de RAG estricto como NotebookLM.
*   **Ajustes de Aspecto**:
    *   **CHAT_TITLE**: Personaliza el nombre que aparece en la cabecera del chat.
    *   **CHAT_SUBTITLE**: Añade una descripción o lema bajo el título.
    *   **CHAT_ACCENT_COLOR**: Define el color de acento de la interfaz (en formato hexadecimal, ej: `#0c1a78`).

#### 3. Carga de Conocimiento
*   Si usas el modo RAG, selecciona **🤖 SheetsBot > 🔄 Sincronizar Conocimiento**.
*   Podrás elegir entre **Añadir nuevos** archivos o realizar una **Limpieza total**.
*   Verás en tiempo real cómo se procesa cada documento.

#### 4. Despliegue de la WebApp
En el editor de Apps Script, ve a **Implementar > Nueva implementación**, selecciona **Aplicación web** y elige el tipo de acceso:
*   **Cualquiera**: Uso anónimo. Ideal para bots públicos. Los usuarios no necesitan iniciar sesión y se registrarán como "Usuario anónimo" en el Log.
*   **Usuarios con cuenta del dominio (Google Workspace)**: El uso del chatbot requiere inicio de sesión y permite capturar la identidad (email) del usuario en cada interacción para su registro en el Log. *Nota: Si seleccionas "Cualquier persona con una cuenta de Google", se exigirá inicio de sesión pero el script no podrá capturar el email del usuario por limitaciones de privacidad de Google.*

---

### ⚙️ Gestión y Auditoría

#### Gestor de Conocimiento
A través del panel de gestión, puedes revisar el estado de indexación de cada archivo y realizar limpiezas selectivas o totales.

#### Pestaña de Log
Cada interacción queda registrada automáticamente en la pestaña **Log**, incluyendo:
*   **Identificación del Usuario**: 
    *   Si el despliegue es público, los usuarios se registran como **Usuario anónimo**.
    *   En entornos **Google Workspace**, si el bot se despliega para el dominio, se capturará el **email del usuario** automáticamente para una trazabilidad completa.
*   **Consumo de tokens**: Registro detallado para control de cuota y costes.
<p align="center">
  <img src="assets/hdc-log.png" alt="Registro de Actividad (Log)" width="100%">
</p>

---

### 🛠️ Comandos del menú

*   **🚀 Inicializar Hoja**: Prepara la estructura y validaciones (opcional si usas la plantilla).
*   **🔄 Sincronizar Conocimiento**: Sube los archivos de Drive al motor de Gemini.
*   **⚙️ Gestionar Conocimiento**: Panel de control de archivos indexados.
*   **ℹ️ Acerca de**: Información de autoría, licencia y versión.

---

### 🤝 Contribuciones

Si tienes sugerencias o encuentras errores, por favor abre un *issue* o envía un *pull request*.

### ✍️ Créditos

*   **Autor:** Pablo Felip ([@pfelipm](https://twitter.com/pfelipm))
*   **Agradecimiento especial:** A mi amigo y compañero en GEG Spain, [Alfredo Gilsanz](https://transformacioneducativa.es/equipo-coordinacion/), por darme el "empujoncito" final necesario para abordar este proyecto.
*   **Licencia:** [GNU GPL v3.0](https://github.com/pfelipm/sheetsbot/blob/main/LICENSE)
*   **Repositorio:** [https://github.com/pfelipm/sheetsbot](https://github.com/pfelipm/sheetsbot)

---
<p align="center">Hecho con ❤️, café y la inestimable ayuda estratégica de Gemini CLI.</p>
