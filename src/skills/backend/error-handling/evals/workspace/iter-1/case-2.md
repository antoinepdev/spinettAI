# Case 2: Distinguir errores de node-telegram-bot-api sin `any`

## Problema

`node-telegram-bot-api` lanza errores planos `Error` con `code: 'ETELEGRAM'`. No expone una clase para `instanceof`, por lo que hay que distinguirlos con un type guard propio y traducirlos a `AppError` (clase base de dominio con `status` + `message`).

## Solución

### 1. Type guard (sin `any`)

Estrecha `unknown` a `Error & ITelegramError`:

```typescript
// helpers/isTelegramApiError.ts
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

### 2. Mapper

Función pura que recibe el error externo tipado y retorna `AppError | undefined`:

```typescript
// helpers/mapTelegramError.ts
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

### 3. Integración en el errorHandler

Único handler global. Orden de clasificación: errores externos → dominio → inesperado:

```typescript
import { isTelegramApiError } from '../helpers/isTelegramApiError.ts'
import { mapTelegramError } from '../helpers/mapTelegramError.ts'
import { AppError, type IFieldError } from '../utils/errors.ts'

export function errorHandler(error: unknown, _: Request, res: Response, __: NextFunction) {
	// 1. Librerías externas → mapper → AppError
	if (isTelegramApiError(error)) {
		const tgError = mapTelegramError(error)
		if (tgError) return sendErrorResponse({ res, message: tgError.message, status: tgError.status })
	}

	// 2. Dominio → catch-all
	if (error instanceof AppError)
		return sendErrorResponse({ res, message: error.message, status: error.status, errors: error.errors })

	// 3. Inesperados → 500 + log
	console.log(error)
	return sendErrorResponse({ res, message: 'Server internal error', status: 500 })
}
```

## Principios aplicados

- El error viaja sin traducirse entre capas: el service solo lanza, no conoce el shape del error externo.
- Clasificar antes de responder: el handler estrecha el tipo y delega en el mapper, nunca adivinas el shape a mano.
- Tipo `unknown` + estrechamiento con type guard, nunca `any`.
- Si el mapper devuelve `undefined`, el error cae al catch-all de 500 (no es un error de aplicación conocido).