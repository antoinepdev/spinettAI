# Manejo de errores con Problem Details en Express + TypeScript

## Estructura de archivos

```
src/
├── utils/
│   └── errors.ts                      # Jerarquía base: AppError + subclases + IFieldError
├── middlewares/
│   ├── errorHandler.ts                # ÚNICO handler global, registrado tras las rutas
│   └── validate.ts                    # Validación Zod → ValidationError con errors[]
├── helpers/
│   ├── buildProblemDetailsError.ts    # Builder del body RFC 9457
│   ├── formatZodErrors.ts             # Zod issues → IFieldError[]
│   └── mapDatabaseError.ts            # Mapper pg → AppError (o undefined)
├── controllers/
│   └── movie.controller.ts            # Sin try/catch: deja fluir el error
├── services/
│   └── movie.service.ts               # throw de errores de dominio
└── repositories/
    └── movie.repository.ts            # Sin try/catch
```

## Jerarquía de errores — `src/utils/errors.ts`

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

Todo error de aplicación es un `AppError`. Nunca lances `throw new Error('...')` desnudo: el handler solo distingue con `instanceof AppError`. Si se disparan las subclases, agrupa por status o crea fábricas.

## Builder RFC 9457 — `src/helpers/buildProblemDetailsError.ts`

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
		title: STATUS_CODES[status], // no se escribe a mano
		detail: message,
		status,
		errors, // si es undefined, JSON.stringify lo omite
	}
}
```

## Error handler — `src/middlewares/errorHandler.ts`

Middleware global registrado **después de todas las rutas** (`app.use(errorHandler)`). Recibe el error como `unknown` y clasifica en este orden: librerías externas → mapper → dominio → inesperado (500 + log).

```typescript
import type { NextFunction, Request, Response } from 'express'
import { DatabaseError } from 'pg'
import { buildProblemDetailsError } from '../helpers/buildProblemDetailsError.ts'
import { mapDatabaseError } from '../helpers/mapDatabaseError.ts'
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

	// 2. Errores de dominio → catch-all
	if (error instanceof AppError)
		return sendErrorResponse({ res, message: error.message, status: error.status, errors: error.errors })

	// 3. Inesperados: no son errores de aplicación
	console.log(error)
	return sendErrorResponse({ res, message: 'Server internal error', status: 500 })
}
```

## Cómo se comportan las capas

|     Capa     | ¿try/catch? | throw | ¿loggea? | ¿responde? |
|--------------|-------------|-------|----------|------------|
| Controller   | No          | No    | No       | No         |
| Service      | No          | Sí    | No       | No         |
| Repository   | No          | No    | No       | No         |
| ErrorHandler | No          | No    | Sí       | Sí         |

```typescript
// service: lanza, no maneja
async function updateMovie(data: IMovieToUpdateParams): Promise<IMovie> {
	const updatedMovie = await movieRepository.updateMovie(data)
	if (!updatedMovie) throw new NotFoundError()
	return updatedMovie
}

// controller: delega al handler (Express 5 captura el rechazo y llama a next(error))
async function updateMovieHandler(req: Request, res: Response) {
	const updatedMovie = await movieService.updateMovie(req.body)
	return res.status(201).json(updatedMovie)
}
```

## Validación (Zod)

```typescript
// formatZodErrors.ts — path.join('.') da dot-notation: ['genres', 0] → "genres.0"
export function formatZodErrors(errors: $ZodIssue[]): IFieldError[] {
	return errors.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
}

// en el middleware de validación
const result = MovieSchema.safeParse(req.body)
if (!result.success) {
	const formattedErrors = formatZodErrors(result.error.issues)
	throw new ValidationError('Invalid request body', formattedErrors)
}

// error de negocio: NO lleva errors[], solo detail
if (!body.language_cas && !body.language_lat)
	throw new ValidationError('You need specify one language at least')
```

## Mapper de librerías externas — `mapDatabaseError.ts`

Función pura que recibe el error externo y devuelve `AppError | undefined`; si devuelve `undefined`, cae al 500:

```typescript
export function mapDatabaseError(error: DatabaseError): AppError | undefined {
	// '23505' → Duplicate value (409)
	// '23514' → Violates constraint (422)
	return new AppError(message, getErrorStatus(error.code), buildFieldError(error, message))
}
```

## Ejemplo de respuesta de error

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

En otro framework el patrón es idéntico aunque cambie la API: un único handler global que tipa y decide, aplicando el orden externos → dominio → inesperado.