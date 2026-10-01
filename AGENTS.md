# AGENTS.md

## Propósito
spinettAI es el repo público del workflow personal para OpenCode: skills (y en el futuro agentes, commands, plugins) que se distribuyen a los proyectos del autor. Público (MIT) pero personal: sigue las propias convenciones, sin complacer a nadie.

## Filosofía
- añadir features solo cuando se necesiten de verdad. Nada de sobre-ingeniería.
- Si una decisión no está cubierta aquí, preguntar al usuario antes de decidir.

## Estructura
- `src/skills/<categoría>/<nombre>/SKILL.md` → FUENTE DE VERDAD de cada skill.
  - `generic/`: aplicable a cualquier proyecto (ej. commits).
  - Nuevas categorías solo cuando haya una necesidad real.
- `.opencode/` → entorno LOCAL de prueba dentro de este repo: mirror de las skills para probarlas aquí. No es fuente de verdad; node_modules/ y package.json están gitignoreados.

## Añadir o editar una skill
1. Escribir/editar la FUENTE en `src/skills/<categoría>/<nombre>/SKILL.md`.
2. Sincronizar `.opencode/skills/<nombre>/SKILL.md` para poder probarla aquí.
3. Probar con `opencode` abierto en este repo.
- Frontmatter obligatorio: `name` (igual a la carpeta, minúsculas y guiones) y `description` (qué hace Y cuándo se activa, con keywords/filenames concretos).
- Instrucciones en español; mensajes de commit en inglés.