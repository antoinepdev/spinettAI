# AGENTS.md

## Qué es

CLI (Node + TypeScript) que instala skills en el proyecto donde se ejecuta. Entry point: `src/index.ts`. No es librería: todo se ejecuta por terminal.

## Plataformas: solo macOS, Linux y WSL

Este proyecto se desarrolla y se ejecuta **exclusivamente en macOS, Linux y WSL** (WSL se trata como Linux). Windows nativo queda **fuera de scope**.

**Nunca compliques el código para dar soporte a Windows.** No añadas fallbacks a `junction`, no introduzcas ramas por `process.platform`, no normalices separadores ni hacks de permisos. Si algo falla en Windows, la respuesta es «no se ejecuta ahí», no un parche.

El motivo es concreto: los symlinks son el corazón de `linkSkillsToAgents`, y los symlinks **relativos** no son viables en Windows sin *Developer Mode* o admin. La única alternativa sin privilegios, `'junction'`, **exige target absoluto** y por tanto contradice el diseño relativo. Soporte real en Windows obligaría a abandonar los symlinks relativos, que es la decisión de diseño que hace posible el auto-dogfooding del repo. No está en scope.

Corolario: evita `preserveTimestamps` y cualquier otra opción de `node:fs` cuyo comportamiento en NTFS no esté garantizado.

## Comandos (verificados)

- `bun run dev` → `node ./src/index.ts`. Es **interactivo** (inquirer) y necesita TTY, así que no se puede testear de forma automatizada: prueba con un temp dir.
- `bun run test` → `vitest run`. No hay config de vitest: usa defaults y recoge los `*.test.ts` colocados junto al fuente.
- Un solo test: `bunx vitest run src/helpers/getSkills.test.ts`
- Lint/formato: `bunx biome check src` — **solo `src`**. `bun biome check .` falla por formato *preexistente* en `biome.json`, `package.json`, `tsconfig.json` y `content/skills/**/evals.json`.
- Tipos: `bunx tsc --noEmit` (TypeScript 7 va como peerDependency).
- Orden al verificar: `biome check src` → `tsc --noEmit` → `bun run test`.
- `inquirer-select-pro` está pinado a una alpha exacta (`1.0.0-alpha.9`, sin `^`): no la actualices sin avisar.

## No ejecutes la CLI dentro de este repo

- `installSkills` lanza si `./skills` ya existe, y aquí `skills/generic/commits/SKILL.md` **está versionado**: `bun run dev` en este repo falla siempre.
- `linkSkillsToAgents` **borra** lo que haya en `<agent>/skills/<nombre>` (incluido un directorio real) antes de crear el symlink.

## Flujo

`src/index.ts` orquesta 3 helpers de `src/helpers/` (sin red, fáciles de testear):

1. `getSkills(root)` → `Skill[]`. Escanea 2 niveles (`categoría/skill`), exige `SKILL.md`, ignora carpetas ocultas, devuelve `path` como ruta completa **sin resolver symlinks** y ordena por `path`.
2. `installSkills(skills, destRoot)` → copia cada skill a `<cwd>/skills/<category>/<name>`, con todo su contenido anidado.
3. `linkSkillsToAgents({ skills, agents, destRoot })` → symlinks **relativos** en `<destRoot>/<agent.relativePath>/<name>` → `../../skills/<category>/<name>`. Un solo nivel: la categoría se omite porque los agentes solo leen un nivel de carpetas.

Entidades en `src/entities.ts`: `Skill { name, path, category }` e `IAgent { name, relativePath }`.

## Catálogo: `content/skills/` es la fuente de verdad

- `content/skills/<categoría>/<nombre>/SKILL.md`, más carpetas propias (`evals/`, etc.) que se copian tal cual.
- Una carpeta solo cuenta como skill si tiene `SKILL.md`. El escaneo es de 2 niveles, así que `evals/` nunca aparece como skill.
- Frontmatter obligatorio: `name` (igual a la carpeta, minúsculas y guiones) y `description` (qué hace **y** cuándo se activa, con keywords/filenames concretos).
- `.opencode/skills/commits` es un symlink a `skills/generic/commits`: el repo se dogfoodea a sí mismo. En `.opencode/` solo se versionan symlinks de skills; su `node_modules`/`package.json` están gitignoreados.

## Añadir un agente

1. Añadir el nombre al union `IAgent['name']` en `src/entities.ts`.
2. Añadir su `relativePath` a `supportedAgents` en `src/index.ts`.

No hay más puntos de cambio: el resto se deriva de `agent.relativePath`.

## Convenciones

- Imports con extensión explícita (`.ts`) e `import type` para lo type-only: lo exigen el type-stripping nativo de Node y `verbatimModuleSyntax`.
- Biome: tabs, comillas simples, sin semicolons, `lineWidth` 130 y `organizeImports` activo. `bunx biome check --write src` corrige formato e imports.
- Código, comentarios y mensajes al usuario en **español**; mensajes de commit en **inglés**.
- Helpers con 3+ argumentos usan objeto de parámetros, para que el orden no importe.
- Tests junto al fuente (`src/helpers/*.test.ts`), con fixtures en `mkdtempSync(tmpdir())` y limpieza en `afterEach`.

## Commits

Lee `.opencode/skills/commits/SKILL.md` antes de commitear: Conventional Commits en inglés, commits atómicos y la regla de que la única autorización para modificar el repo es aprobar el plan con la herramienta `question`.