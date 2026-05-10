# Pythia — Motor de Automatización Auto-Extensible

**Velvet Software** · v2.0.0

Pythia es un motor de ejecución de flujos de automatización que interpreta y ejecuta workflows exportados de [n8n](https://n8n.io/) en formato JSON de manera local, sin necesitar una instancia de n8n activa. Su característica principal es la **síntesis automática de nodos**: cuando encuentra un tipo de nodo desconocido, genera el código JavaScript necesario usando IA, lo valida en un sandbox seguro y lo almacena para usos futuros.

---

## Tabla de contenidos

1. [Requisitos](#1-requisitos)
2. [Instalación](#2-instalación)
3. [Configuración](#3-configuración)
4. [Arranque](#4-arranque)
5. [Uso desde el navegador](#5-uso-desde-el-navegador)
6. [API REST](#6-api-rest)
7. [Cómo funciona el motor](#7-cómo-funciona-el-motor)
8. [Agregar workflows](#8-agregar-workflows)
9. [Catálogo de nodos](#9-catálogo-de-nodos)
10. [Seguridad](#10-seguridad)
11. [Arquitectura de archivos](#11-arquitectura-de-archivos)
12. [Solución de problemas](#12-solución-de-problemas)

---

## 1. Requisitos

| Requisito | Versión mínima |
|-----------|---------------|
| Node.js   | 18.x o superior |
| npm       | 9.x o superior |
| Sistema   | Windows, macOS o Linux |

**Al menos una API key activa:**
- OpenAI (`gpt-4o-mini` o superior)
- Google Gemini (`gemini-2.5-flash`)

Si tienes ambas, Pythia usa OpenAI por defecto y hace fallback a Gemini automáticamente.

---

## 2. Instalación

```bash
# 1. Clonar o copiar la carpeta del proyecto
cd pythia

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (ver sección 3)
cp .env.example .env
# Editar .env con tus claves

# 4. Poblar el catálogo inicial de nodos (ejecutar UNA SOLA VEZ)
node catalog_seed.js
```

### Dependencias incluidas

| Paquete | Uso |
|---------|-----|
| `express` | Servidor HTTP |
| `openai` | Cliente OpenAI SDK |
| `@google/generative-ai` | Cliente Google Gemini |
| `vm2` | Sandbox seguro para evaluar expresiones y nodos generados |
| `better-sqlite3` | Base de datos local para historial y catálogo |
| `chokidar` | Observador de cambios en archivos (hot-reload) |
| `dotenv` | Variables de entorno |
| `cors` | Soporte CORS para el frontend |
| `node-fetch` | HTTP para nodos generados |

---

## 3. Configuración

Edita el archivo `.env` en la raíz del proyecto:

```env
# ── APIs de IA ──────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...          # Tu clave de OpenAI (opcional si usas Gemini)
GEMINI_API_KEY=AIza...         # Tu clave de Google Gemini (opcional si usas OpenAI)

# ── Servidor ─────────────────────────────────────────────────────────────────
PORT=3001                       # Puerto del servidor (por defecto: 3001)
PROJECT_NAME=                   # Nombre de tu proyecto (aparece en la UI)

# ── Seguridad ─────────────────────────────────────────────────────────────────
# Dejar vacío = modo local sin autenticación
# Con valor = todos los endpoints /api/* requieren Authorization: Bearer <valor>
PYTHIA_SECRET=
```

**Comportamiento del fallback de IA:**
- Si solo tienes `OPENAI_API_KEY` → usa OpenAI
- Si solo tienes `GEMINI_API_KEY` → usa Gemini
- Si tienes ambas → usa OpenAI, con fallback automático a Gemini en caso de error
- El usuario puede sobreescribir las claves desde la UI del navegador sin reiniciar el servidor

---

## 4. Arranque

```bash
# Modo producción
npm start
# o
node server.js

# Modo desarrollo (reinicio automático ante cambios en server.js)
npm run dev
```

El servidor arranca en `http://127.0.0.1:3001` por defecto.

**Salida esperada en consola:**
```
🚀 Pythia corriendo en http://127.0.0.1:3001
🔒 Modo auth: LOCAL (sin auth)
🗄 SQLite: executions.db inicializado
👁 Chokidar observando: workflows/ y generated_nodes/
📋 Workflows cargados:
   • Mi Workflow 1
   • Mi Workflow 2
🤖 Meta-agente iniciado (ciclos cada 24h, primer ciclo en 5min)
```

---

## 5. Uso desde el navegador

Abre `http://127.0.0.1:3001` en tu navegador. La interfaz tiene 4 paneles:

### Panel: Flujos
Lista todos los workflows disponibles. Haz clic en **EJECUTAR** para abrir el formulario de ejecución, completar los datos de entrada y ver los logs en tiempo real.

Campos de API keys en la barra superior:
- **OpenAI** / **Gemini**: ingresa tus claves aquí para usarlas en esta sesión
- **Secret**: si configuraste `PYTHIA_SECRET`, ingrésalo aquí para autenticarte
- **Guardar claves**: persiste las claves en `localStorage` del navegador

### Panel: Historial
Tabla paginada de todas las ejecuciones pasadas con:
- Estado (`SUCCESS` / `ERROR`)
- Duración en milisegundos
- Botón **VER** para ver los logs completos y el resultado de cada ejecución
- Botón **Limpiar historial** para eliminar todos los registros

### Panel: Nodos Generados
Catálogo de nodos que Pythia ha auto-generado o promovido desde el catálogo interno. Muestra:
- Tipo de nodo (identificador n8n)
- Versión actual
- Número de usos y tasa de éxito
- **RESET**: reinicia los contadores de éxito (útil tras corrección manual)
- **DEL**: elimina el nodo del registro y fuerza re-generación la próxima vez

### Panel: Estadísticas
Métricas globales del sistema:
- Total de ejecuciones
- Tasa de éxito global
- Duración promedio de ejecuciones
- Número de nodos en el catálogo auto-generado

---

## 6. API REST

Todos los endpoints bajo `/api/` requieren `Authorization: Bearer <PYTHIA_SECRET>` si la variable está configurada.

### Workflows

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/workflows` | Lista todos los workflows disponibles |
| `POST` | `/api/execute` | Ejecuta un workflow |
| `GET` | `/api/reload` | Recarga workflows desde disco |
| `GET` | `/api/config` | Devuelve configuración del servidor (nombre del proyecto) |

**POST `/api/execute`**
```json
// Headers
Content-Type: application/json
X-OpenAI-Key: sk-...          // Opcional, sobreescribe variable de entorno
X-Gemini-Key: AIza...         // Opcional, sobreescribe variable de entorno
Authorization: Bearer <secret> // Requerido si PYTHIA_SECRET está configurado

// Body
{
  "workflowName": "Nombre del Workflow",
  "inputData": { "campo": "valor" },
  "sessionId": "usuario-123"   // Opcional: activa memoria de conversación
}

// Respuesta exitosa
{
  "success": true,
  "result": { ... },
  "logs": [{ "time": "10:30:00", "msg": "▶ Iniciando...", "type": "start" }]
}
```

### Historial

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/history` | Lista ejecuciones (params: `limit`, `offset`) |
| `GET` | `/api/history/:id` | Detalle de una ejecución con logs completos |
| `DELETE` | `/api/history` | Elimina todo el historial |

### Nodos generados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/nodes` | Lista nodos generados con métricas |
| `GET` | `/api/nodes/:type` | Detalle y código de un nodo |
| `DELETE` | `/api/nodes/:type` | Elimina un nodo (se re-generará la próxima vez) |
| `POST` | `/api/nodes/:type/reset` | Reinicia contadores de éxito |

### Catálogo interno

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/catalog` | Lista todos los nodos del catálogo |
| `GET` | `/api/catalog/:category` | Filtra por categoría |
| `POST` | `/api/catalog` | Agrega un nodo al catálogo manualmente |
| `DELETE` | `/api/catalog/:node_type` | Elimina un nodo del catálogo |

**POST `/api/catalog`**
```json
{
  "node_type": "mi-empresa.mi-nodo",
  "description": "Descripción del nodo",
  "code": "async function execute(nodeParams, inputData, nodeOutputs) { ... }",
  "category": "transform"
}
```
Categorías válidas: `communication`, `database`, `file`, `http`, `transform`, `logic`, `crm`, `storage`

### Estadísticas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/stats` | Métricas globales del sistema |

### Webhooks

Los workflows con nodo `n8n-nodes-base.webhook` exponen automáticamente:
```
POST /webhook/<path-configurado-en-n8n>
```

---

## 7. Cómo funciona el motor

### Flujo de ejecución de un workflow

```
POST /api/execute
       │
       ▼
  FlowExecutor
  Encuentra el nodo trigger (webhook / gmailTrigger)
       │
       ▼
  runChain(primerNodo, inputData)
       │
       ├─ Nodo conocido → ejecuta handler nativo
       │    ├─ @n8n/n8n-nodes-langchain.agent → runAgent() [llama IA]
       │    ├─ n8n-nodes-base.httpRequest     → runHttp()
       │    ├─ n8n-nodes-base.if              → runIf() [ramificación]
       │    ├─ n8n-nodes-base.switch          → runSwitch()
       │    ├─ n8n-nodes-base.merge           → runMerge()
       │    ├─ n8n-nodes-base.gmail           → runGmailLog()
       │    ├─ n8n-nodes-base.respondToWebhook→ runRespond()
       │    ├─ velvet.ocr-vision              → runOcrVision()
       │    ├─ n8n-nodes-base.postgres        → runPostgres()
       │    └─ velvet.sqlite                  → runSqliteNode()
       │
       └─ Nodo desconocido → NodeSynthesizer.resolve()
              │
              ├─ 1. ¿Existe en generated_nodes con tasa éxito ≥ 60%?
              │         SÍ → ejecutar desde caché SQLite
              │
              ├─ 2. ¿Existe en node_catalog (catálogo Velvet)?
              │         SÍ → promover a generated_nodes + ejecutar
              │
              └─ 3. Sintetizar con LLM (hasta 3 intentos)
                        → validate() en vm2 sandbox
                        → guardar en SQLite + archivo .js
                        → ejecutar
```

### Síntesis automática de nodos

Cuando Pythia encuentra un nodo desconocido, el proceso es:

1. **Búsqueda en caché** (`generated_nodes`): si ya fue generado anteriormente con tasa de éxito ≥ 60%, se ejecuta directamente
2. **Búsqueda en catálogo** (`node_catalog`): nodos preconstruidos por Velvet Software que no requieren LLM
3. **Síntesis LLM**: si no existe en ninguna fuente, se genera nuevo código con IA (3 intentos máximo)
4. **Validación**: el código se ejecuta en un sandbox `vm2` con datos sintéticos antes de usarlo en producción
5. **Persistencia**: el código validado se guarda en SQLite y en `generated_nodes/<tipo-nodo>.js`

### Meta-agente optimizador

El meta-agente se activa automáticamente cada 24 horas y optimiza nodos problemáticos:
- Detecta nodos con ≥ 5 usos y tasa de éxito < 70%
- Envía el código actual + historial de errores al LLM para que lo mejore
- Valida la versión mejorada antes de reemplazar la anterior
- Incrementa el número de versión al actualizar

### Memoria de conversación

Si envías `sessionId` en el body de `/api/execute`, el agente IA recibe el historial de esa sesión:
- Ventana deslizante de 10 mensajes por sesión
- Expiración automática tras 2 horas de inactividad
- Las sesiones viven en memoria (se pierden al reiniciar el servidor)

### Expresiones n8n

Pythia evalúa las expresiones n8n en un sandbox seguro (`vm2`, timeout 500ms):

```
={{ $json["campo"] }}          → Valor del campo en el nodo actual
={{ $node["NodoX"].data }}     → Output de un nodo específico
={{ $now.toFormat("yyyy-MM-dd") }} → Fecha actual formateada
Hola {{ $json["nombre"] }}     → Template con interpolación
```

---

## 8. Agregar workflows

1. Exporta tu workflow desde n8n en formato JSON (`Workflow > Export`)
2. Copia el archivo `.json` a la carpeta `workflows/`
3. Pythia detecta el cambio automáticamente (hot-reload via Chokidar) y recarga el workflow sin reiniciar el servidor

**Requisitos del workflow:**
- Debe tener un nodo trigger: `n8n-nodes-base.webhook` o `n8n-nodes-base.gmailTrigger`
- El nombre del workflow en n8n es el identificador que se usa en la UI y en la API

**Nodos soportados nativamente:**

| Tipo n8n | Descripción |
|----------|-------------|
| `n8n-nodes-base.webhook` | Trigger de entrada HTTP |
| `n8n-nodes-base.gmailTrigger` | Trigger de Gmail |
| `@n8n/n8n-nodes-langchain.agent` | Agente de IA con LLM |
| `n8n-nodes-base.respondToWebhook` | Responde la solicitud webhook |
| `n8n-nodes-base.httpRequest` | Llamada HTTP externa |
| `n8n-nodes-base.gmail` | Envío de email (modo demo) |
| `n8n-nodes-base.if` | Condicional If/Else |
| `n8n-nodes-base.switch` | Switch de múltiples ramas |
| `n8n-nodes-base.merge` | Combina múltiples flujos |
| `n8n-nodes-base.postgres` | Consultas PostgreSQL |
| `velvet.sqlite` | Base de datos SQLite local |
| `velvet.ocr-vision` | OCR con Google Vision API |

**Nodos en el catálogo inicial** (disponibles sin LLM tras ejecutar `catalog_seed.js`):

| Tipo n8n | Categoría |
|----------|-----------|
| `n8n-nodes-base.set` | transform |
| `n8n-nodes-base.code` | transform |
| `n8n-nodes-base.wait` | logic |
| `n8n-nodes-base.noOp` | logic |
| `n8n-nodes-base.dateTime` | transform |
| `n8n-nodes-base.splitInBatches` | logic |
| `n8n-nodes-base.itemLists` | transform |
| `n8n-nodes-base.markdown` | transform |

---

## 9. Catálogo de nodos

El catálogo es una base de datos interna de nodos preconstruidos que evita llamadas al LLM para tipos de nodos comunes.

### Agregar nodos al catálogo

**Opción A: Script de seed** (para instalaciones nuevas)
```bash
node catalog_seed.js
```

**Opción B: API REST** (para agregar nodos custom en producción)
```bash
curl -X POST http://localhost:3001/api/catalog \
  -H "Content-Type: application/json" \
  -d '{
    "node_type": "mi-empresa.enviar-slack",
    "description": "Envía mensajes a un canal de Slack",
    "category": "communication",
    "code": "async function execute(nodeParams, inputData, nodeOutputs) { ... }"
  }'
```

### Contrato de la función execute

Todo nodo en el catálogo debe exportar exactamente esta función:

```javascript
async function execute(nodeParams, inputData, nodeOutputs) {
  // nodeParams:   parámetros del nodo configurados en n8n
  // inputData:    datos del nodo anterior en la cadena
  // nodeOutputs:  outputs de todos los nodos ejecutados (por nombre)
  // Retorna:      objeto plano (nunca null, undefined o array)
  return { resultado: '...' };
}
```

**Restricciones de seguridad:**
- Solo puedes usar: `node-fetch`, `https`, `crypto`, `url`, `querystring`
- No puedes usar: `fs`, `child_process`, `eval`, módulos externos no listados
- Timeout máximo de ejecución: 10 segundos

---

## 10. Seguridad

### Evaluación segura de expresiones

Las expresiones n8n (`={{ $json["x"] }}`) se evalúan dentro de un sandbox `vm2` con:
- Timeout de 500ms por expresión
- Sin acceso al filesystem ni al sistema operativo
- Variables expuestas: `$json`, `$node`, `$`, `$now`

### Nodos generados

El código generado por IA o presente en el catálogo se ejecuta en `NodeVM` (vm2) con:
- Timeout de 10 segundos
- Solo puede requerir: `node-fetch`, `https`, `crypto`, `url`, `querystring`
- Sin acceso a `fs`, `child_process` ni módulos del sistema

### API Keys

Las claves de API nunca viajan en el body de las peticiones. Se envían como headers HTTP:
- `X-OpenAI-Key` para OpenAI
- `X-Gemini-Key` para Gemini

Las claves tampoco se registran en logs ni en la base de datos SQLite.

### Autenticación de endpoints

Para habilitar autenticación en todos los endpoints `/api/*` y `/webhook/*`:
```env
PYTHIA_SECRET=una-cadena-segura-aleatoria
```

El cliente debe incluir:
```
Authorization: Bearer una-cadena-segura-aleatoria
```

Si `PYTHIA_SECRET` está vacío, el servidor corre en modo local sin autenticación.

---

## 11. Arquitectura de archivos

```
pythia/
├── server.js              # Motor principal y rutas API
├── db.js                  # Singleton SQLite (executions, generated_nodes, node_catalog)
├── node_synthesizer.js    # Síntesis automática de nodos desconocidos
├── node_validator.js      # Validación de código en sandbox vm2
├── meta_agent.js          # Optimizador automático de nodos problemáticos (24h)
├── catalog_seed.js        # Script de población inicial del catálogo (ejecutar 1 vez)
│
├── workflows/             # Workflows n8n en formato JSON
│   └── *.json
│
├── generated_nodes/       # Código JS de nodos auto-generados (auto-creado)
│   └── n8n-nodes-base-set.js
│
├── public/
│   └── index.html         # Frontend (UI tipo terminal verde)
│
├── executions.db          # Base de datos SQLite (auto-creada al arrancar)
├── .env                   # Variables de entorno (no commitear)
├── package.json
└── README.md
```

### Base de datos SQLite (`executions.db`)

**Tabla `executions`**: historial de todas las ejecuciones de workflows
```
id, workflow_name, started_at, finished_at, duration_ms,
status (success|error|timeout), input_data, output_data, logs, error_message
```

**Tabla `generated_nodes`**: nodos auto-generados por síntesis IA
```
id, node_type, description, code, version, created_at, updated_at,
usage_count, success_count, last_error
```

**Tabla `node_catalog`**: catálogo interno de nodos preconstruidos por Velvet
```
node_type, description, code, category, source, version, added_at
```

---

## 12. Solución de problemas

### El servidor no arranca: `EADDRINUSE`
El puerto 3001 ya está en uso. Cambia el puerto:
```env
PORT=3002
```

### `Error: Workflow no encontrado`
El nombre del workflow en el body debe coincidir exactamente con el campo `name` del JSON del workflow. Verifica en `/api/workflows`.

### Nodo desconocido no se sintetiza
1. Verifica que al menos una API key esté configurada en `.env` o en la UI
2. El LLM puede rechazar la síntesis si el tipo de nodo es muy ambiguo. Revisa los logs de consola
3. Ejecuta `node catalog_seed.js` para agregar los nodos comunes al catálogo

### La UI muestra `ERROR DE CONEXIÓN`
El servidor no está corriendo o está en un puerto diferente. Verifica que `node server.js` esté activo.

### Los workflows no se recargan automáticamente
Chokidar puede tener problemas en sistemas de archivos de red (NAS, WSL2). Usa el endpoint manual:
```bash
curl http://localhost:3001/api/reload
```

### `No autorizado` en todos los endpoints
Tienes `PYTHIA_SECRET` configurado. Agrega el header:
```
Authorization: Bearer <valor-de-PYTHIA_SECRET>
```
O ingresa el valor en el campo **Secret** de la UI y haz clic en **Guardar claves**.

### El meta-agente no optimiza nodos
El meta-agente solo actúa sobre nodos con `usage_count >= 5` y tasa de éxito < 70%. Necesita también una API key configurada en las variables de entorno del servidor (no en la UI).

---

## Licencia

Desarrollado por **Velvet Software**. Uso interno y de clientes autorizados.
