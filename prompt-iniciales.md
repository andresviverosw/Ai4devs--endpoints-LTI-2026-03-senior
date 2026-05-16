# Prompt iniciales (historial de conversación — backend)

Este documento resume los hilos de la conversación sobre el proyecto **`backend/`**, los hallazgos de arquitectura y los requisitos e implementación de endpoints con TDD.

---

## 1. Solicitud: revisión de prácticas y arquitectura (`backend/`)

### Petición del usuario

Revisar el código fuente del backend e identificar:

- Prácticas de desarrollo: **DDD**, **SOLID**, **DRY**, **CUPID**, etc.
- Prácticas arquitectónicas (por ejemplo **hexagonal**).
- **Patrones de diseño** observados.

### Contexto del código revisado

- Stack aproximado: **Express**, **Prisma**, **PostgreSQL**, TypeScript.
- Estructura de carpetas observada:
  - `routes/` — enrutado HTTP (`candidateRoutes`, etc.).
  - `presentation/controllers/` — manejadores orientados a Express.
  - `application/` — orquestación y validación (`candidateService`, `validator`).
  - `domain/models/` — clases de entidad con métodos `save`, consultas Prisma incrustadas (estilo **Active Record**).

### Conclusiones principales del análisis

**DDD**

- Solo una adherencia **débil / nominal**: existe carpeta `domain/models`, pero las entidades mezclan modelo de datos con **persistencia Prisma** (`save`, `findOne`).
- No se vieron explícitos: agregados, value objects, repositorios como puertos del dominio, servicios de dominio dedicados.

**Hexagonal / puertos y adaptadores**

- **No** se aplicaba de forma real: sin interfaces de persistencia; dependencia directa de **Prisma** desde las “entidades” y servicios.

**SOLID**

- Alguna separación por archivos (ruta → controlador → servicio).
- **DIP** débil: el dominio de facto depende de infraestructura concreta (Prisma).
- Uso de **`any`** en payloads donde aplicaba.

**DRY**

- Duplicación de **`new PrismaClient()`** en varios modelos y en `index.ts`.

**CUPID / mantenibilidad**

- Layout por capas **predictible** para una API pequeña.
- Acoplamiento fuerte a ORM y a Express donde tocaba.

**Patrones identificados**

- **Active Record** en las entidades (persistencia en la clase).
- **Application service** en `candidateService` (validación + coordinación).
- **Cadena de middleware** Express.
- **Inyección ligera vía `req.prisma`** (contexto por petición), pero los modelos de dominio no la usaban de forma unificada.

**Inconsistencia destacada**

- En `candidateRoutes`, el **POST** importaba `addCandidate` desde el controlador, pero este exportaba la función del **servicio**, pasando por alto `addCandidateController`; el **GET** sí usaba el handler HTTP correctamente.

---

## 2. Solicitud: dos endpoints REST con TDD (AAA)

### Metodología exigida

- **Test-Driven Development**: primero tests, después **el mínimo código de producción** para pasar.
- Cada test estructurado en tres bloques:
  - **Arrange**: datos, mocks, precondiciones.
  - **Act**: ejecutar el endpoint o la función.
  - **Assert**: comprobar respuesta y efectos secundarios.

### Endpoint 1 — `GET /positions/:id/candidates`

Debe devolver todos los candidatos **en proceso** para una posición (`applications` con ese `positionId`). La respuesta debe incluir:

| Campo | Origen |
|--------|--------|
| Nombre completo del candidato | tabla **candidate** (`firstName` + `lastName`) |
| `current_interview_step` | etapa actual del proceso → tabla **application** vía relación al paso actual (nombre del **`InterviewStep`**) |
| Media de puntuaciones | tabla **interview**: media de `score` sobre entrevistas con puntuación; si no hay puntuaciones, **`null`** |

### Endpoint 2 — `PUT /candidates/:id/stage`

Actualizar la **etapa actual de la entrevista** para la aplicación del candidato. Cuerpo con **`positionId`** e **`interviewStepId`** (necesario si el candidato tiene varias aplicaciones).

Casos de prueba **mínimos** pedidos por endpoint:

- Happy path.
- Recurso no encontrado (candidato o posición, según endpoint).
- Entrada inválida.

---

## 3. Implementación realizada (resumen técnico)

### Herramientas

- **Jest** + **Supertest** para tests HTTP contra la aplicación Express.
- **`createApp(prisma)`** en [`backend/src/app.ts`](backend/src/app.ts) para poder testear sin arrancar el servidor.

### Arranque en modo test

- En [`backend/src/index.ts`](backend/src/index.ts), **`app.listen`** solo si **`NODE_ENV !== 'test'`**, para que Jest no reserve puerto.

### Archivos relevantes añadidos o tocados

- [`backend/src/app.ts`](backend/src/app.ts) — composición Express + rutas + middleware (`req.prisma`).
- [`backend/src/application/errors/AppError.ts`](backend/src/application/errors/AppError.ts) — errores HTTP tipados + **`isAppError`** y **`Object.setPrototypeOf`** (compatibilidad con **`target: ES5`** e `instanceof`).
- [`backend/src/application/services/positionCandidatesService.ts`](backend/src/application/services/positionCandidatesService.ts) — lógica `GET` candidatos por posición.
- [`backend/src/application/services/candidateInterviewStageService.ts`](backend/src/application/services/candidateInterviewStageService.ts) — lógica `PUT` etapa.
- [`backend/src/presentation/controllers/positionCandidatesController.ts`](backend/src/presentation/controllers/positionCandidatesController.ts)
- [`backend/src/presentation/controllers/candidateStageController.ts`](backend/src/presentation/controllers/candidateStageController.ts)
- [`backend/src/routes/positionRoutes.ts`](backend/src/routes/positionRoutes.ts) — `GET /:id/candidates` montado bajo **`/positions`**.
- [`backend/src/routes/candidateRoutes.ts`](backend/src/routes/candidateRoutes.ts) — `PUT /:id/stage`.
- Tests:
  - [`backend/src/__tests__/positionsCandidates.test.ts`](backend/src/__tests__/positionsCandidates.test.ts)
  - [`backend/src/__tests__/candidateStage.test.ts`](backend/src/__tests__/candidateStage.test.ts)
- [`backend/jest.config.js`](backend/jest.config.js) — `testMatch: ['**/*.test.ts']`.

### Contratos HTTP implementados

**GET `/positions/:id/candidates`**

- `400` — `Invalid position id`
- `404` — `Position not found`
- `200` — `{ candidates: [{ full_name, current_interview_step, average_score }] }`
  - `average_score`: media de scores no nulos; sin ninguno → `null`.

**PUT `/candidates/:id/stage`**

- Body: `{ positionId: number, interviewStepId: number }`.
- `400` — id de candidato inválido en path; o body inválido (`Invalid positionId` / `Invalid interviewStepId`); o paso que no pertenece al flujo de la posición (`Invalid interview step for this position`).
- `404` — `Candidate not found`, `Position not found`, `Application not found`.
- `200` — `{ applicationId, candidateId, positionId, currentInterviewStep }`.

Los tests usan **Prisma mockeado** por petición (sin base de datos real en CI/local obligatorio para estos tests).

---

## 4. Ampliación de tests pedida después (“yes, add them”)

Se añadieron (manteniendo **Arrange / Act / Assert**):

1. **404** cuando **no existe aplicación** para la pareja candidato + posición (`Application not found`; sin llamada a `update`).
2. **400** cuando el **`interviewStepId` existe pero su flujo no coincide** con el de la posición.
3. **400** cuando el **`interviewStepId` no existe** en BD (`findUnique` → `null`), mismo mensaje de negocio que el caso anterior (`Invalid interview step for this position`).

Total de tests en suite backend tras estos cambios: **11** (al momento de escribir este archivo).

---

## 5. Comandos útiles

```bash
cd backend
npm test
npm run build
```

---

## 6. Ubicación del documento

Este archivo se mantiene en la **raíz del repositorio** como **`prompt-iniciales.md`**.

---

*Documento generado como referencia única del hilo de conversación sobre auditoría del backend y endpoints con TDD.*
