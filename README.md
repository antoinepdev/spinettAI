# spinettai-cli

Una CLI que instala skills en el proyecto desde el que se ejecuta y las enlaza en los agentes de IA que se elijan.

Las skills son instrucciones que se le pasan a un agente para que siga una forma concreta de trabajar: cómo hacer commits, cómo estructurar el manejo de errores, cómo crear nuevas skills. Esta CLI se encarga de copiarlas al proyecto y de dejarlas visibles para los agentes que se usen.

## Cómo funciona

En tres pasos:

1. Escanea el catálogo de skills que viene con la CLI.
2. Copia las seleccionadas a `./skills/<categoría>/<skill>` del proyecto.
3. Crea un symlink en la carpeta de skills de cada agente seleccionado.

## Requisitos

- **Node 20.11 o superior**, o **Bun**
- **macOS, Linux o WSL.** Windows nativo no está soportado: los symlinks que crea son relativos y ahí no funcionan sin permisos de administrador o *Developer Mode*. Si alguna vez falla en Windows, la respuesta es que no se ejecuta ahí.
- **Una terminal interactiva.** Los dos prompts de selección lo necesitan, así que no vale con scripts ni pipes.

## Instalación

```bash
bunx spinettai-cli        # bun, sin instalar nada
npx spinettai-cli         # npm, sin instalar nada
pnpm dlx spinettai-cli    # pnpm
yarn dlx spinettai-cli    # yarn
```

También se puede instalar globalmente, y entonces el comando `spinettai-cli` queda disponible en cualquier directorio:

```bash
bun add -g spinettai-cli       # bun
npm install -g spinettai-cli   # npm
```

## Uso

```bash
cd ~/mi-proyecto
spinettai-cli
```

Las skills se instalan en el directorio desde el que se llama al comando, así que solo hay que cambiar de directorio y ejecutarla allí.

Salen dos prompts:

1. **Seleccionar las skills que se desean instalar** — las marcadas se copian.
2. **A qué agentes se quiere dar soporte** — los marcados reciben los enlaces.

Al terminar aparecen dos confirmaciones con las rutas donde se instaló cada cosa:

```
Skills instaladas en /home/usuario/mi-proyecto/skills
Skills enlazadas en /home/usuario/mi-proyecto/.opencode/skills, /home/usuario/mi-proyecto/.claude/skills
```

## Qué queda en el proyecto

Esto es lo que queda:

```
mi-proyecto/
├── skills/
│   └── generic/
│       └── commits/          <- copia real de la skill
└── .opencode/
    └── skills/
        └── commits -> ../../skills/generic/commits   <- symlink
```

## Modificar una skill

**Siempre hay que editar la copia de `skills/` y la skill se sincroniza automáticamente en todos los agentes instalados.** No se deben tocar los symlinks ni copiar archivos a `.opencode/skills/` o a la carpeta de ningún otro agente: no hace falta y el cambio se perdería.

La razón es que el symlink no guarda una copia del contenido, solo apunta a `skills/<categoría>/<skill>`. Como todos los agentes apuntan al mismo sitio, cualquier cambio en `skills/generic/commits/SKILL.md` se ve al instante en `opencode`, `claude-code`, `gemini-cli` y `codex`, sin volver a ejecutar la CLI y sin sincronizar nada a mano.

Es la ventaja de usar symlinks en lugar de copias: hay una única fuente de verdad. Y al revés también: al borrar una skill de `skills/`, deja de estar disponible en todos los agentes.

## Catálogo de skills

Estas son las skills que hay ahora mismo:

| Skill | Categoría | Qué hace |
| --- | --- | --- |
| `commits` | `generic` | Cómo hacer commits: formato, tipos permitidos, atomicidad y la regla de que cada commit sea un checkpoint funcional que se pueda revertir sin romper nada. |
| `skill-creator` | `generic` | Cómo crear y mejorar skills: escribir el `SKILL.md`, afinar el frontmatter para que la skill dispare bien, y preparar test cases para validarla antes de darla por buena. |
| `error-handling` | `backend` | Manejo de errores en arquitecturas en capas con un único error handler y Problem Details Standard (RFC 9457). Agnóstica de stack; los ejemplos son TypeScript + Express. |

Un aviso sobre el catálogo: **la mayoría de estas skills están escritas en español y están adaptadas al workflow y a las necesidades de quien las mantiene**, no a un estándar universal. `commits`, por ejemplo, refleja una forma personal de commitear. Conviene tomarlas como punto de partida y adaptarlas al contexto de cada proyecto: están en texto plano y son de libre modificación una vez instaladas.

## Agentes soportados

| Agente | Carpeta de skills |
| --- | --- |
| `opencode` | `.opencode/skills` |
| `claude-code` | `.claude/skills` |
| `gemini-cli` | `.gemini/skills` |
| `codex` | `.codex/skills` |

Se pueden marcar varios en el mismo prompt y todos recibirán los enlaces.

## Ten en cuenta

Dos cosas que conviene saber antes de ejecutarla:

- **Falla si ya existe un directorio `skills` en el destino.** No se puede reejecutar sobre un proyecto que ya tenga uno; habría que renombrarlo o borrarlo antes.
- **Borra lo que haya en `<agente>/skills/<nombre>` antes de crear el symlink.** Si ya hay ahí una skill con ese nombre, incluso como directorio real, desaparece. No hay confirmación previa.

Y un apunte: la CLI no se puede ejecutar dentro del repo, porque ahí ya existe un `skills/` con las copias que usa el propio repo para dogfoodearse.

## Desarrollo local

Para trabajar en la CLI hace falta clonarla e instalar las dependencias:

```bash
git clone git@github.com:antoinepdev/spinettai-cli.git ~/spinettai-cli
cd ~/spinettai-cli
bun install
bun run dev
```

`bun run dev` ejecuta el fuente directamente con Bun, sin compilar. El build solo hace falta para publicar el paquete:

```bash
bun run build   # emite dist/, que es lo que se publica
```

## Licencia

MIT. El código no tiene patentes asociadas.