# Zentryx HCM — Análisis del Sistema y Hoja de Ruta de Mejoras
**Fecha:** Abril 2025  
**Versión analizada:** Stack actual (Next.js 15 · React 19 · n8n Cloud · In-memory store)

---

## 1. Estado Actual del Sistema

### 1.1 Módulos implementados

| Módulo | Estado | Persistencia | IA |
|---|---|---|---|
| Dashboard | Completo | Mock data | Insights estáticos |
| Empleados | Completo | Mock data | No |
| Nómina | Completo | Mock data | No (deducción matemática) |
| Horarios | Completo | Mock data | No |
| Desempeño + OKRs | Completo | In-memory (frontend) | Feedback 360 simulado |
| Reclutamiento | Completo | In-memory (frontend) | n8n (análisis CVs) |
| Ausencias IA | Completo | In-memory server | n8n (veredicto) |
| Contratos | Completo | Mock data | No |
| Comunicaciones | Completo | Mock data | n8n (envío Gmail) |
| PQR | Completo | In-memory server | n8n (sugerencia) |
| Portal Empleado | Completo | In-memory server | No |
| Notificaciones | Completo | In-memory server | No |

### 1.2 Arquitectura actual

```
Browser (React 19)
    │
    ├── Next.js API Routes (/api/*)           ← capa de proxy y store
    │       ├── /api/cases/absences           ← GET/POST al store global
    │       ├── /api/cases/pqr               ← GET/POST/PATCH al store global
    │       ├── /api/notifications            ← GET/POST/PATCH al store global
    │       └── /api/n8n/*                   ← proxy → n8n Cloud (evita CORS)
    │
    ├── n8n Cloud (alejandromm.app.n8n.cloud)
    │       ├── Recruitment Analyzer         ← analiza CVs con IA
    │       ├── PQR Monitor (Gmail trigger)  ← emails → store
    │       ├── Resignation Monitor          ← emails renuncia → store
    │       └── Send Document               ← genera y envía memorandos
    │
    └── Store (globalThis en Node.js)
            ├── __zx_absences[]              ← volátil, se borra al reiniciar
            ├── __zx_pqr[]                   ← volátil
            └── __zx_notifs[]               ← volátil
```

### 1.3 Problemas críticos identificados

1. **Sin base de datos real** — todo dato se pierde al reiniciar el servidor
2. **Sin autenticación** — cualquiera puede acceder a todas las rutas
3. **Un solo rol de usuario** — admin y empleado ven lo mismo
4. **Tunnel Cloudflare temporal** — la URL cambia cada reinicio, rompiendo todos los webhooks de n8n
5. **Sin auditoría** — no hay log de quién hizo qué y cuándo
6. **Sin validación de entrada robusta** — los endpoints aceptan cualquier payload
7. **Datos mock hardcodeados** — los empleados no se pueden crear/editar/eliminar

---

## 2. Prioridades de Mejora

Las mejoras están organizadas en 3 horizontes temporales.

---

## HORIZONTE 1 — Fundamentos (Crítico, implementar primero)

### M1. Base de datos persistente

**Problema:** `globalThis.__zx_*` se borra al reiniciar Next.js. En producción esto significa pérdida total de datos.

**Solución recomendada:** SQLite con Prisma ORM (sin costo, sin servidor externo)

```
Alternativas:
  · SQLite + Prisma      → ideal para empezar, local, cero costo
  · PostgreSQL + Prisma  → cuando se despliegue en la nube (Supabase free tier)
  · PlanetScale (MySQL)  → si se necesita escalar horizontalmente
```

**Pasos de implementación:**
1. `npm install prisma @prisma/client`
2. Definir schema en `prisma/schema.prisma`:
   - `Employee`, `AbsenceCase`, `PQRCase`, `Notification`, `PayrollRecord`
   - Relaciones: `Employee` 1→N `AbsenceCase`, `Employee` 1→N `PQRCase`
3. Reemplazar `src/lib/store.ts` con `src/lib/db.ts` (cliente Prisma)
4. Migrar los API routes para usar Prisma en lugar del store en memoria

**Impacto:** Elimina la pérdida de datos. Todas las demás mejoras dependen de esto.

---

### M2. Autenticación y roles

**Problema:** No hay login. Cualquier persona con la URL puede ver nóminas, contratos y datos sensibles.

**Solución recomendada:** NextAuth.js v5 con credenciales

```
Roles a implementar:
  · ADMIN    → acceso total (Valentina Ríos)
  · RRHH     → acceso a empleados, ausencias, PQR, nómina
  · EMPLEADO → solo Portal Empleado (sus propios datos)
  · LIDER    → ver su equipo, aprobar ausencias
```

**Pasos de implementación:**
1. `npm install next-auth@beta`
2. Crear `src/app/api/auth/[...nextauth]/route.ts`
3. Crear tabla `User` en Prisma con campos `email`, `password` (bcrypt), `role`
4. Agregar middleware en `src/middleware.ts` que proteja rutas según rol:
   - `/employee-portal` → roles: EMPLEADO, RRHH, ADMIN
   - `/payroll` → roles: RRHH, ADMIN
   - `/employees` → roles: RRHH, ADMIN
5. Redirigir `/` a `/login` si no hay sesión
6. Mostrar nombre real del usuario logueado en el Header (actualmente "Valentina Ríos" hardcodeado)

**Impacto:** Seguridad básica. Requerimiento legal en Colombia (Ley 1581 de datos personales).

---

### M3. URL permanente para webhooks n8n

**Problema:** El tunnel de Cloudflare genera URLs temporales que cambian cada reinicio, rompiendo los 3 workflows de n8n. Cada vez que se reinicia hay que actualizar manualmente 3 workflows.

**Opciones:**

| Opción | Costo | Permanente | Complejidad |
|---|---|---|---|
| Render.com (free tier) | Gratis | Sí | Baja |
| Railway.app | ~$5/mes | Sí | Baja |
| Vercel (serverless) | Gratis | Sí | Media |
| Cloudflare Tunnel con nombre fijo | Gratis | Sí | Media |
| VPS + Nginx (DigitalOcean) | $6/mes | Sí | Alta |

**Recomendación:** Desplegar en Render.com o Vercel con dominio propio.

**Para Cloudflare Tunnel permanente (sin costo):**
```bash
# Crear tunnel con nombre fijo (en lugar de temporal)
cloudflared tunnel create zentryx
cloudflared tunnel route dns zentryx webhooks.zentryx.co
cloudflared tunnel run zentryx
# URL: https://webhooks.zentryx.co (permanente)
```

---

## HORIZONTE 2 — Funcionalidades Robustas

### M4. CRUD completo de empleados

**Problema:** Los empleados están hardcodeados en `src/lib/data.ts`. No se pueden crear, editar ni eliminar desde la UI.

**Implementar:**
- Formulario de creación con validación (nombre, cédula, email único, cargo, salario)
- Edición inline de campos
- Desactivación de empleados (nunca eliminar — Colombia exige conservar historial 5 años)
- Foto de perfil (upload a local o Cloudflare R2)
- Historial de cambios por empleado
- Importación masiva por CSV (para onboarding de empresas)

**API routes nuevos:**
```
POST   /api/employees          → crear empleado
PATCH  /api/employees/[id]     → actualizar
DELETE /api/employees/[id]     → desactivar (soft delete)
GET    /api/employees/[id]     → detalle
```

---

### M5. Nómina con liquidación real (Colombia)

**Problema actual:** La nómina calcula EPS/pensión pero no incluye conceptos obligatorios colombianos.

**Conceptos faltantes:**
```
Devengos:
  + Salario base
  + Horas extras diurnas (125%)
  + Horas extras nocturnas (175%)
  + Auxilio de transporte ($200,000 si salario ≤ 2 SMMLV)
  + Dominicales y festivos (200%)
  + Comisiones
  + Bonificaciones

Deducciones:
  − EPS empleado (4%)
  − Pensión empleado (4%)
  − Retención en la fuente (tabla DIAN)
  − Libranzas / créditos
  − Embargos judiciales
  − Ausencias injustificadas (ya implementado)

Aportes empleador (no descuentos al empleado):
  + EPS empleador (8.5%)
  + Pensión empleador (12%)
  + ARL (0.522% – 6.96% según riesgo)
  + CCF (4%)
  + ICBF (3%)
  + SENA (2%)
  + Parafiscales totales

Prestaciones sociales (provisión mensual):
  + Cesantías (8.33%)
  + Intereses sobre cesantías (1%)
  + Prima de servicios (8.33%)
  + Vacaciones (4.17%)
```

**Integración sugerida:** Conectar con Siigo, Alegra o Helisa vía API para enviar la liquidación calculada y generar el PILA automáticamente.

---

### M6. Firma digital de contratos

**Problema:** Los contratos se generan como texto pero no tienen firma electrónica.

**Implementar:**
- Integración con **Docusign** o **FirmaVirtual.co** (API REST)
- Flujo: Generar PDF del contrato → enviar link de firma al empleado → n8n monitorea firma completada → marca contrato como firmado
- Guardar PDF firmado en almacenamiento (Cloudflare R2 o S3)
- Módulo de contratos actualizado para mostrar estado: borrador → enviado → firmado → vencido

---

### M7. Gestión de vacaciones y permisos

**Módulo nuevo** (actualmente no existe):
- Calendario visual de vacaciones por equipo
- Solicitud de vacaciones por empleado (desde Portal Empleado)
- Aprobación por líder con flujo de notificación
- Cálculo automático de días disponibles (Código Laboral: 15 días hábiles por año)
- Alerta cuando un empleado acumula más de 30 días pendientes
- Integración con horarios para bloquear esos días

---

### M8. Reportes y analítica avanzada

**Problema:** El dashboard solo muestra métricas estáticas mock.

**Implementar:**
- Gráficos reales con datos de la base de datos (usar Recharts que ya está en el proyecto)
- Reportes exportables en PDF (usar `@react-pdf/renderer`)
- Métricas clave:
  - Rotación por departamento (mes a mes)
  - Ausentismo real vs. proyectado
  - Costo total de nómina por período
  - Tiempo promedio de contratación
  - Distribución salarial por cargo
  - OKRs completados vs. pendientes
- Filtros por período, departamento, sede

---

### M9. Módulo de capacitaciones

**Módulo nuevo:**
- Registro de cursos internos y externos por empleado
- Seguimiento de certificaciones con fecha de vencimiento
- Alertas automáticas cuando una certificación vence en 30 días (vía n8n → email)
- Asignación de cursos obligatorios por cargo (ej: SST, SENA)
- Reporte de horas de capacitación por empleado (exigido por auditorías ISO)

---

## HORIZONTE 3 — Diferenciación y Escalabilidad

### M10. App móvil (PWA)

Convertir la app en Progressive Web App:
- Agregar `manifest.json` y service worker
- Layouts responsive mejorados para móvil
- Push notifications nativas (empleados reciben alertas en el celular)
- Modo offline para consulta de datos básicos
- Costo: $0 — solo configuración

---

### M11. Multiempresa (Multi-tenant)

Para vender Zentryx como SaaS a otras empresas:
- Agregar campo `tenantId` a todas las tablas de la BD
- Subdominio por empresa: `empresa1.zentryx.co`, `empresa2.zentryx.co`
- Panel de administración de tenants
- Billing por empleados activos (integración con Stripe o PayU Colombia)
- Separación de datos 100% garantizada en base de datos

---

### M12. Motor de reglas de nómina configurable

En lugar de tener las fórmulas hardcodeadas:
- Panel donde RRHH configura: porcentajes, conceptos, deducciones especiales
- Soporte para convenios colectivos con reglas particulares
- Historial de versiones de configuración (auditoría)
- Simulador: "¿cuánto costaría contratar a alguien con este salario?"

---

### M13. Integraciones adicionales

| Sistema | Propósito | API |
|---|---|---|
| **Siigo / Alegra** | Contabilidad → registrar nómina | REST |
| **PILA/Aportes en línea** | Pago seguridad social | SOAP |
| **Ministerio del Trabajo** | Reportes obligatorios | Web service |
| **LinkedIn** | Publicar vacantes automáticamente | REST |
| **WhatsApp Business** | Notificar empleados (más efectivo que email) | WhatsApp Cloud API |
| **Slack / Teams** | Alertas al equipo de RRHH | Webhooks |
| **Calendly** | Agendar entrevistas de reclutamiento | REST |
| **Google Workspace** | SSO + crear cuentas de correo automáticamente | OAuth2 |

---

### M14. Auditoría y cumplimiento legal

Requerimiento legal en Colombia (Ley 1581, SG-SST):
- Log inmutable de todos los cambios: quién, qué, cuándo, desde qué IP
- Tabla `AuditLog` en BD: `userId`, `action`, `entity`, `entityId`, `before`, `after`, `timestamp`
- Retención de datos: empleados inactivos → 5 años (C.S.T. Art. 264)
- Exportación de datos personales por solicitud del empleado (HABEAS DATA)
- Cifrado de campos sensibles: salarios, cédulas, datos médicos (AES-256)

---

## 3. Tabla de Priorización

| # | Mejora | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| M1 | Base de datos (Prisma + SQLite) | Crítico | Medio | **P0** |
| M2 | Autenticación y roles | Crítico | Medio | **P0** |
| M3 | URL webhook permanente | Alto | Bajo | **P0** |
| M4 | CRUD empleados | Alto | Medio | P1 |
| M5 | Nómina colombiana completa | Alto | Alto | P1 |
| M14 | Auditoría y logs | Alto | Bajo | P1 |
| M6 | Firma digital contratos | Medio | Medio | P2 |
| M7 | Vacaciones y permisos | Alto | Medio | P2 |
| M8 | Reportes y analítica real | Medio | Medio | P2 |
| M9 | Módulo capacitaciones | Medio | Bajo | P3 |
| M10 | PWA móvil | Medio | Bajo | P3 |
| M13 | Integraciones externas | Alto | Alto | P3 |
| M11 | Multi-tenant SaaS | Alto | Muy alto | P4 |
| M12 | Motor de reglas configurable | Medio | Alto | P4 |

---

## 4. Stack Técnico Recomendado para Producción

```
Frontend:     Next.js 15 + React 19 (actual) ✓
Estilos:      Tailwind CSS + design tokens Zentryx (actual) ✓
Base de datos:Prisma ORM + PostgreSQL (Supabase)
Auth:         NextAuth.js v5 (credentials + Google OAuth)
Storage:      Cloudflare R2 (archivos, PDFs, fotos)
Email:        Resend.com (transaccional) + Gmail (ya integrado vía n8n)
Automatización:n8n Cloud (actual) ✓
Deploy:       Vercel (frontend) + Supabase (BD) — ambos con free tier generoso
Dominio:      zentryx.co (para webhooks permanentes)
Monitoreo:    Vercel Analytics + Sentry (errores)
CI/CD:        GitHub Actions → deploy automático en push a main
```

**Costo estimado mensual en producción (hasta 50 empleados):**
```
Vercel (Hobby)     → $0
Supabase (Free)    → $0
n8n Cloud (Starter)→ $20
Cloudflare R2      → $0 (primeros 10GB)
Dominio .co        → $2
─────────────────────
Total              → ~$22/mes
```

---

## 5. Deuda Técnica Actual

| Problema | Archivo | Severidad |
|---|---|---|
| Store en memoria (`globalThis`) | `src/lib/store.ts` | Crítica |
| Sin validación de schemas en API routes | `/api/cases/*` | Alta |
| Datos mock hardcodeados como fuente de verdad | `src/lib/data.ts` | Alta |
| Sin manejo de errores global | Toda la app | Media |
| Sin tests (unit/integration) | — | Media |
| Sin rate limiting en endpoints públicos | `/api/n8n/*` | Alta |
| Tunnel Cloudflare temporal hardcodeado en n8n | Workflows n8n | Alta |
| Sin variable de entorno para N8N_BASE | `src/app/api/n8n/_proxy.ts` | Media |
| Sin loading states en fetches iniciales | Páginas ausencias/PQR | Baja |
| Polling cada 60s (ineficiente) | absences/pqr pages | Baja → usar WebSockets |

---

*Documento generado como análisis técnico de Zentryx HCM — Abril 2025*
