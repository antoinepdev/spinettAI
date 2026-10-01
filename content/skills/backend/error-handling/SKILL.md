---
name: error-handling
description: Manejo de errores en arquitecturas en capas (controller-service-repository) con Problem Details Standard (RFC 9457). Usa esta skill SIEMPRE que se trabaje con errores en un backend: "manejar errores", error handler, errorHandler, AppError, errores de dominio, errores de librerías (pg, Telegram, etc.), mappers, validación por campo, respuestas de error, Problem Details, RFC 9457, status 422/404/409, middlewares de error, o archivos como utils/errors.ts y middlewares/errorHandler.ts. Es agnóstica de stack: aplica a cualquier lenguaje/framework con capas (Express, Fastify, NestJS, Python, Java...), aunque los ejemplos son TypeScript + Express y el frontmatter de archivos asume esa estructura.
---

# Manejo de errores en arquitectura en capas

Diseño del manejo de errores de un backend con arquitectura en capas (controller-service-repository) que responde con **Problem Details Standard (RFC 9457)**. Los principios son universales (valen para cualquier lenguaje y framework con capas): solo la implementación de ejemplo es TypeScript + Express.

## Principios

1. **Un único error handler.** Es el único punto de toda la app por el que pasa cualquier respuesta de error: los esperados (de dominio) y los inesperados. Todo lo demás deja que el error propague.
2. **Los errores inesperados NO son errores de aplicación.** Que PostgreSQL cuelga no es un "not found". El handler los separa y responde distinto: un 500 genérico (sin filtrar internals) vs el error de dominio concreto.
3. **Cada error de aplicación es una instancia de un tipo base** (en TS/JS, una subclase de `AppError` con `status` y metadata). Esto permite clasificarlos en el handler con `instanceof` (o el mecanismo equivalente del lenguaje: `catch (X)` en Java, `except X` en Python...).
4. **Solo se loguea en el errorHandler, y solo los errores 500.** Loggear en capas intermedias duplica logs y acopla; el log no es responsabilidad de service ni de repository. Solo el error que acaba en 500 merece un log.
5. **El error viaja sin traducirse entre capas.** Controller y repository no hacen try/catch: el service lanza con `throw` cuando hace falta, y el error propaga intacto hasta el handler. Solo el handler traduce a respuesta.
6. **Clasifica antes de responder.** El handler estrecha el tipo del error y, si es de una librería externa, delega en un **mapper** que lo traduce a un error de aplicación. Nunca adivinas el shape a mano.
7. **Tipa el error como `unknown` y estrecha con `instanceof`**, nunca `any` (TS).

## Responsabilidades por capa

|     Capa     | ¿try/catch? | throw | ¿loggea? | ¿responde? |
|--------------|-------------|-------|----------|------------|
| Controller   | Depende     | No    | No       | No         |
| Service      | No          | Sí    | No       | No         |
| Repository   | No          | No    | No       | No         |
| ErrorHandler | No          | No    | Sí       | Sí         |

La idea de fondo: cada capa hace **una sola cosa** con los errores. La capa que detecta el problema (normalmente el service) solo lanza; el handler es el único que conoce HTTP, logs y el formato de respuesta. Si un framework se encarga de enrutar el error al handler (Express 5 con controllers async, Fastify con `setErrorHandler`, NestJS con exception filters), no escribas try/catch para reenviarlo: déjalo fluir.

## Problem Details Standard (RFC 9457)

Toda respuesta de error tiene la misma forma. El objeto de error:

| Propiedad | Tipo | Obligatorio | Qué va aquí |
|-----------|------|-------------|-------------|
| `type`    | string (URL) | Sí | URL de doc del error. Si no hay, `"about:blank"`. |
| `title`   | string | Sí | Nombre del status code. NO se escribe a mano: se importa del mapa de status del lenguaje (`STATUS_CODES` de `node:http` en Node, `status_phrases` en Go, etc.). |
| `status`  | number | Sí | Código HTTP semánticamente correcto (404, 409, 422...). Evita errores genéricos como el 400. |
| `detail`  | string | Sí | Explicación de este fallo concreto. |
| `errors`  | `IFieldError[]` | No | Solo errores de validación. Lista de campos que fallaron y por qué. |

`errors[]` es una **member extension** permitida por RFC 9457: el standard admite miembros extra. Formato de cada campo:

| Propiedad | Tipo | Qué va aquí |
|-----------|------|-------------|
| `field`   | string | Nombre del campo. Paths anidados en dot-notation: `genres.0`. |
| `message` | string | Motivo del fallo (sale directo del issue de la librería de validación). |

> El `content-type` de la response es `application/problem+json` y el `status` HTTP coincide con `status` del objeto.

La construcción se centraliza en un **builder** para que todos los responses salgan idénticos. Un detalle clave de JS: `JSON.stringify` elimina propiedades `undefined`, así que incluir `errors` en el literal equivale a omitirlo cuando no hay — no hace falta ningún condicional.

```typescript
import { STATUS_CODES } from 'node:http'
import type { IFieldError } from '../utils/errors.ts'

interface IProps {
	message: string
	status: number
	errors?: IFieldError[]
}

export function buildProblemDetailsError({ message, status, errors }: IProps) {
	return {
		type: 'about:blank',
		title: STATUS_CODES[status],
		detail: message,
		status,
		errors, // si es undefined, JSON.stringify lo omite
	}
}
```

## Workflow (implementación TS/Express)

### 1. `src/utils/errors.ts` — la jerarquía de errores de aplicación

Aquí vive `AppError` (tipo base), todas sus subclases y el tipo compartido `IFieldError`. Cada error de aplicación tiene `status` y `message`.

```typescript
export interface IFieldError {
	field: string
	message: string
}

export class AppError extends Error {
	readonly status
	readonly errors

	constructor(message: string, status: number, errors?: IFieldError[]) {
		super(message)
		this.status = status
		this.errors = errors
	}
}

export class NotFoundError extends AppError {
	constructor(message: string = 'Movie not found') {
		super(message, 404)
	}
}

export class ValidationError extends AppError {
	constructor(message: string, errors?: IFieldError[]) {
		super(message, 422, errors)
	}
}
```

Regla de oro: **todo error de aplicación es un `AppError`**. Si el número de subclases se dispara, agrupa por status o crea fábricas, pero nunca sueltes `throw new Error('...')` desnudo: el handler solo distingue por `instanceof AppError`.

### 2. `src/middlewares/errorHandler.ts` — el único handler

Middleware global registrado **después de todas las rutas**. Recibe el error como `unknown` y clasifica: errores de librerías externas → mapper; errores de dominio → respuesta directa; inesperados → 500 + log.

```typescript
import type { NextFunction, Request, Response } from 'express'
import { DatabaseError } from 'pg'
import { buildProblemDetailsError } from '../helpers/buildProblemDetailsError.ts'
import { isTelegramApiError } from '../helpers/isTelegramApiError.ts'
import { mapDatabaseError } from '../helpers/mapDatabaseError.ts'
import { mapTelegramError } from '../helpers/mapTelegramError.ts'
import { AppError, type IFieldError } from '../utils/errors.ts'

interface IProps {
	res: Response
	message: string
	status: number
	errors?: IFieldError[]
}

function sendErrorResponse({ res, message, status, errors }: IProps) {
	return res.status(status).type('application/problem+json').json(buildProblemDetailsError({ message, status, errors }))
}

export function errorHandler(error: unknown, _: Request, res: Response, __: NextFunction) {
	// 1. Errores de librerías externas → mapper → AppError
	if (error instanceof DatabaseError) {
		const dbError = mapDatabaseError(error)
		if (dbError) return sendErrorResponse({ res, message: dbError.message, status: dbError.status, errors: dbError.errors })
	}
	if (isTelegramApiError(error)) {
		const tgError = mapTelegramError(error)
		if (tgError) return sendErrorResponse({ res, message: tgError.message, status: tgError.status })
	}

	// 2. Errores de dominio → catch-all
	if (error instanceof AppError)
		return sendErrorResponse({ res, message: error.message, status: error.status, errors: error.errors })

	// 3. Inesperados: no son errores de aplicación
	console.log(error)
	return sendErrorResponse({ res, message: 'Server internal error', status: 500 })
}
```

En otro framework el patrón es el mismo aunque cambie la API: un único handler registrado a nivel global que recibe el error tipado y decide. El concepto a copiar es el orden de la clasificación (externos → dominio → inesperado).

### 3. Services — lanzan, no manejan

El service lanza errores de dominio con `throw` cuando lo necesita. No hay try/catch: los errores de librerías externas propagan hasta el handler, donde se clasifican y mapean. El service **nunca conoce el shape del error externo**.

```typescript
async function updateMovie(data: IMovieToUpdateParams): Promise<IMovie> {
	const updatedMovie = await movieRepository.updateMovie(data)
	if (!updatedMovie) throw new NotFoundError()
	return updatedMovie
}

const movieService = { updateMovie }
```

### 4. Controllers — delegan al handler

El controller recibe del service y devuelve la respuesta exitosa. Con Express 5, si el controller es `async`, **el framework captura el rechazo y llama a `next(error)` por ti**: no necesitas try/catch para reenviar el error.

```typescript
async function updateMovieHandler(req: Request, res: Response) {
	const updatedMovie = await movieService.updateMovie(req.body)
	return res.status(201).json(updatedMovie)
}

const movieController = { updateMovieHandler }
```

### 5. Middlewares de validación — Zod

Validan el body con un schema y, en caso de fallo, construyen un `ValidationError` con los campos fallidos (ver sección de abajo).

## Mappers: errores de librerías externas → AppError

Los errores que lanzan librerías externas (pg, Telegram Bot API, AWS SDK...) **no son** `AppError`. El handler los detecta con `instanceof` (si la librería expone la clase) o un type guard propio, y delega en un **mapper**.

### El mapper

Función pura que recibe el error externo tipado y retorna `AppError | undefined`:

| Retorno | Significado |
|---------|-------------|
| `AppError` | El error externo se traduce a un error de aplicación (status + message + errors). |
| `undefined` | No se sabe mapear → cae al catch-all de 500. |

Ejemplo — PostgreSQL (decide por `error.code`):

```typescript
// mapDatabaseError.ts
export function mapDatabaseError(error: DatabaseError): AppError | undefined {
	// '23505' → Duplicate value (409)
	// '23514' → Violates constraint (422)
	// ...
	return new AppError(message, getErrorStatus(error.code), buildFieldError(error, message))
}
```

Ejemplo — Telegram Bot API (decide por `error.response.body`):

```typescript
// mapTelegramError.ts
export function mapTelegramError(error: Error & ITelegramError): AppError | undefined {
	const { error_code: code = 0, description = '' } = error.response.body
	if (code !== 400) return undefined

	if (description.includes('wrong type of the web page content'))
		return new AppError('Invalid poster url', 422)
	if (description.includes('message to copy not found'))
		return new AppError('Invalid telegram_file_id', 422)

	return undefined
}
```

## Type guards para librerías sin `instanceof`

Cuando la librería no expone una clase para `instanceof` (p. ej. `node-telegram-bot-api` lanza un `Error` plano con `code: 'ETELEGRAM'`), se crea un **type guard** que estrecha el tipo para el handler, sin `any`:

```typescript
export interface ITelegramError {
	code: string
	response: {
		body: { error_code?: number; description?: string }
	}
}

export function isTelegramApiError(error: unknown): error is Error & ITelegramError {
	return (
		error instanceof Error &&
		'code' in error &&
		error.code === 'ETELEGRAM' &&
		'response' in error &&
		typeof error.response === 'object' &&
		error.response !== null
	)
}
```

El narrow producido por el type guard es exactamente el tipo que consume el mapper. Ningún service importa el guard ni conoce la estructura del error externo.

## Validación: errores de schema vs de negocio

Son DOS tipos de errores de validación y se comportan distinto:

| Tipo | ¿Lleva `errors[]`? | Ejemplo |
|------|--------------------|---------|
| Error de **schema** (Zod) | Sí → `IFieldError[]` con cada campo fallido | `title_en` esperaba string |
| Error de **negocio** (regla ad-hoc) | No → solo `detail` | "You need specify one language at least" |

### `formatZodErrors`

Convierte los issues de Zod en `IFieldError[]`. `path.join('.')` produce la dot-notation: `['title_en']` → `"title_en"`, `['genres', 0]` → `"genres.0"`. NO uses `path[0]`: pierde paths anidados y falla con paths vacíos (refines a nivel raíz).

```typescript
import type { $ZodIssue } from 'zod/v4/core'
import type { IFieldError } from '../utils/errors.ts'

export function formatZodErrors(errors: $ZodIssue[]): IFieldError[] {
	return errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
}
```

### Uso en los middlewares

```typescript
const result = MovieSchema.safeParse(req.body)

if (!result.success) {
	const formattedErrors = formatZodErrors(result.error.issues)
	throw new ValidationError('Invalid request body', formattedErrors)
}

// error de negocio: NO lleva errors[], solo detail
if (!body.language_cas && !body.language_lat)
	throw new ValidationError('You need specify one language at least')
```

### Responses resultantes

Error de schema:

```json
{
	"type": "about:blank",
	"title": "Unprocessable Content",
	"status": 422,
	"detail": "Invalid request body",
	"errors": [
		{ "field": "title_en", "message": "Expected string, received number" },
		{ "field": "poster", "message": "Invalid input: expected string to start with 'https://'" }
	]
}
```

Error de negocio:

```json
{
	"type": "about:blank",
	"title": "Unprocessable Content",
	"status": 422,
	"detail": "You need specify one language at least"
}
```