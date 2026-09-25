# Case 3 — Unificar respuestas de error (NotFoundError en service, try/catch en controller)

El cambio central: quitar el `try/catch` del controller y dejar que el error propague hasta un **único errorHandler** que responda con Problem Details (RFC 9457). El service solo lanza; el controller solo responde éxitos; el handler es el único punto que conoce HTTP y responde errores.

## Controller (sin try/catch)

Express 5 con controller async captura el rechazo y llama a `next(error)` por ti, así que no hace falta reenviar el error a mano.

```typescript
async function getMovieHandler(req: Request, res: Response) {
	const movie = await movieService.getMovie(req.params.id)
	return res.json(movie)
}
```

## errorHandler global (único punto de respuesta de error)

Registrado después de todas las rutas. Clasifica: errores de dominio → respuesta directa; inesperados → 500 genérico + log.

```typescript
export function errorHandler(error: unknown, _: Request, res: Response, __: NextFunction) {
	if (error instanceof AppError)
		return sendErrorResponse({ res, message: error.message, status: error.status })

	console.log(error) // solo errores inesperados
	return sendErrorResponse({ res, message: 'Server internal error', status: 500 })
}
```

Con `sendErrorResponse` usando `buildProblemDetailsError`, la respuesta queda uniforme: `status` HTTP, `content-type: application/problem+json`, body con `type` (`about:blank`), `title` (del mapa `STATUS_CODES` de `node:http`, no escrito a mano), `detail` y `status`.

## Respuesta resultante

```json
{
	"type": "about:blank",
	"title": "Not Found",
	"status": 404,
	"detail": "Movie not found"
}
```

El `{message}` suelto desaparece: el 404 (y todos los errores de dominio e inesperados) pasan por el mismo formato, y el handler separa los 500 de los errores de aplicación.