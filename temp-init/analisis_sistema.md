# Análisis y Oportunidades de Mejora - Zentryx HCM

Este documento detalla un análisis técnico y funcional de la plataforma actual (Zentryx HCM), construida sobre Next.js 16, React 19, y Tailwind CSS. Se han identificado varias áreas de oportunidad tanto a nivel de arquitectura como de producto, que podrían implementarse para elevar el estándar del sistema.

---

## 1. Arquitectura y Gestión de Datos (Backend / Estado)

**Estado Actual:**
- El sistema utiliza variables globales (`globalThis.__zx_absences`, `globalThis.__zx_pqr`) y arreglos en memoria (archivo `store.ts`) para almacenar la información de ausencias y PQR.
- La persistencia es nula al reiniciar el servidor en producción. Sirve como un Mock interactivo.

**Mejoras Sugeridas:**
- **Migración a Base de Datos Real:** Implementar una base de datos relacional (PostgreSQL) o NoSQL (MongoDB) utilizando un ORM moderno como **Prisma** o **Drizzle ORM**.
- **Gestión de Estado del Cliente:** Para la manipulación de estado complejo del lado del cliente, se podría introducir **Zustand** o usar **React Query / SWR** para manejar el estado de las peticiones asíncronas y caché.

## 2. Integración con IA y APIs (n8n proxy)

**Estado Actual:**
- Se realizan peticiones proxy desde Next.js a flujos de `n8n` para analizar reclutamiento, PQRs y ausencias.
- Las respuestas se confían en tipados de TypeScript estáticos (`AbsenceResponse`, `RecruitmentResponse`, etc.).

**Mejoras Sugeridas:**
- **Validación Estricta con Zod:** Los LLMs/n8n pueden en ocasiones responder con estructuras JSON inválidas o con formatos incorrectos. Incorporar `Zod` tanto del lado del cliente como del Edge/Backend aseguraría que si el LLM "alucina" en el formato, el Frontend no falle abruptamente y se pueda manejar el error con gracia.
- **Mecanismos de Reintento (Retries):** Los flujos de IA son propensos a tiempos de espera prolongados. Agregar 'polling', Server-Sent Events (SSE) o WebSockets mejoraría significativamente la UX del usuario mientras espera a que la IA procese un CV extenso.

## 3. UI, UX y Accesibilidad

**Estado Actual:**
- Interfaz moderna construida con Tailwind CSS, gráficos mediante Recharts e iconos de Lucide.

**Mejoras Sugeridas:**
- **Librería de Componentes (shadcn/ui):** Adoptar un sistema base como shadcn/ui o Radix UI para garantizar que los componentes (tablas, modales, alertas) sean accesibles (a11y) soportando navegación por teclado y lectores de pantalla.
- **Autenticación y Roles:** Implementar **NextAuth.js (Auth.js)** u otro proveedor (Clerk/Supabase) para asegurar el acceso a `/dashboard` y diferenciar entre un "Administrador de RRHH" y un "Empleado".
- **Modo Oscuro (Dark Mode):** Soportado por Tailwind, podría oficializarse con `next-themes` para mayor comodidad de lectura de los reclutadores/revisores.
- **Skeletons de Carga:** Añadir animaciones tipo "Skeleton" al momento de cargar información de la IA.

## 4. Nuevas Funcionalidades (Roadmap de Producto)

**Módulos por añadir:**
- **Portal del Empleado (Self-Service):** Un panel dedicado para que los empleados regulares ingresen, revisen el estado de sus PQR, visualicen sus nóminas, suban documentación médica y firmen contratos.
- **Evaluación de Desempeño y OKRs:** Módulo para la asignación y calificación de metas, retroalimentación 360 grados gestionada/resumida por IA.
- **Módulo de Nómina (Payroll):** Integración matemática básica o conexión por API con software financiero para aplicar penalizaciones por ausencias injustificadas, horas extras extras, etc.
- **Centro de Notificaciones en Tiempo Real:** Un sistema de 'Toasts' donde el administrador reciba alertas instantáneas (vía n8n webhooks) cada vez que un candidato sube su currículum.

## 5. Pruebas y Calidad de Código (QA & CI/CD)

**Estado Actual:**
- Herramientas básicas de TypeScript y ESLint instaladas.

**Mejoras Sugeridas:**
- **Unit Testing:** Implementar **Jest** o **Vitest** con React Testing Library para probar las funciones algorítmicas o procesamiento de archivos (como el validador de archivos en `n8n.ts`).
- **Test End-to-End (E2E):** Integrar **Playwright** o Cypress para simular el proceso entero de un PQR desde que se llena el formulario hasta que n8n devuelve la sugerencia.
- **Pre-commit Hooks:** Configurar **Husky** y `lint-staged` para asegurar que todo el código cumple y está formateado antes de cada push al repositorio.
