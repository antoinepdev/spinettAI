# spinettai-cli

Una CLI que instala skills en el proyecto desde el que la ejecutas y las enlaza en los agentes de IA que elijas.

Las skills son instrucciones que le pasas a tu agente para que siga tu forma de trabajar: cómo hacer commits, cómo estructurar el manejo de errores, cómo crear nuevas skills. Esta CLI se encarga de copiarlas a tu proyecto y de dejarlas visibles para los agentes que uses.

## Cómo funciona

En tres pasos:

1. Escanea el catálogo de skills que viene con la CLI.
2. Copia las que elijas a `./skills/<categoría>/<skill>` en tu proyecto.
3. Crea un symlink en la carpeta de skills de cada agente que hayas seleccionado.

## Requisitos

- **Bun** para ejecutarla.
- **macOS, Linux o WSL.** Windows nativo no está soportado: los symlinks que crea son relativos y ahí no funcionan sin permisos de administrador o *Developer Mode*. Si alguna vez falla en Windows, la respuesta es que no se ejecuta ahí.
- **Una terminal interactiva.** Los dos prompts de selección lo necesitan, así que no vale con scripts ni pipes.

## Instalación

Clona el repo e instala las dependencias:

```bash
git clone git@github.com:antoinepdev/spinettAI.git ~/spinettai-cli
cd ~/spinettai-cli
bun install
```

## Uso

Muévete al proyecto donde quieras las skills y llama a la CLI desde ahí:

```bash
cd ~/mi-proyecto
bun ~/spinettai-cli/src/index.ts
```

El catálogo se lee desde el repo clonado, pero **las skills se instalan en el directorio desde el que llamas al comando**. Por eso puedes tener el repo en `~/spinettai-cli` y ejecutarla desde cualquier proyecto.

Te salen dos prompts:

1. **Selecciona las skills que deseas instalar** — las que marques se copian.
2. **A qué agentes quieres dar soporte** — los que marques reciben los enlaces.

Al terminar verás dos confirmaciones con las rutas donde se instaló cada cosa:

```
Skills instaladas en /home/tu-usuario/mi-proyecto/skills
Skills enlazadas en /home/tu-usuario/mi-proyecto/.opencode/skills, /home/tu-usuario/mi-proyecto/.claude/skills
```

## Qué queda en tu proyecto

Esto es lo que acabas teniendo:

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

**Edita siempre la copia de `skills/` y la skill se sincroniza automáticamente en todos los agentes instalados.** No toques los symlinks ni copies archivos a `.opencode/skills/` o a la carpeta de ningún otro agente: no hace falta y se perdería el cambio.

La razón es que el symlink no guarda una copia del contenido, solo apunta a `skills/<categoría>/<skill>`. Como todos los agentes apuntan al mismo sitio, cualquier cambio que hagas en `skills/generic/commits/SKILL.md` se ve al instante en `opencode`, `claude-code`, `gemini-cli` y `codex`, sin volver a ejecutar la CLI y sin sincronizar nada a mano.

Es la ventaja de usar symlinks en lugar de copias: hay una única fuente de verdad. Y al revés también, si borras una skill de `skills/`, deja de estar disponible en todos los agentes.

## Catálogo de skills

Estas son las skills que hay ahora mismo:

| Skill | Categoría | Qué hace |
| --- | --- | --- |
| `commits` | `generic` | Cómo hacer commits: formato, tipos permitidos, atomicidad y la regla de que cada commit sea un checkpoint funcional que se pueda revertir sin romper nada. |
| `skill-creator` | `generic` | Cómo crear y mejorar skills: escribir el `SKILL.md`, afinar el frontmatter para que la skill dispare bien, y preparar test cases para validarla antes de darla por buena. |
| `error-handling` | `backend` | Manejo de errores en arquitecturas en capas con un único error handler y Problem Details Standard (RFC 9457). Agnóstica de stack; los ejemplos son TypeScript + Express. |

Un aviso sobre el catálogo: **la mayoría de estas skills están escritas en español y están adaptadas a mi workflow y a mis necesidades personales**, no a un estándar universal. `commits`, por ejemplo, refleja cómo commiteo yo. Tómalas como un punto de partida y adáptalas a lo tuyo: están en texto plano y son tuyas una vez instaladas.

## Agentes soportados

| Agente | Carpeta de skills |
| --- | --- |
| `opencode` | `.opencode/skills` |
| `claude-code` | `.claude/skills` |
| `gemini-cli` | `.gemini/skills` |
| `codex` | `.codex/skills` |

Puedes marcar varios en el mismo prompt y todos recibirán los enlaces.

## Ten en cuenta

Dos cosas que conviene saber antes de ejecutarla:

- **Falla si ya existe un directorio `skills` en el destino.** No se puede reejecutar sobre un proyecto que ya tenga uno; tendrías que renombrarlo o borrarlo antes.
- **Borra lo que haya en `<agente>/skills/<nombre>` antes de crear el symlink.** Si ya tienes ahí una skill con ese nombre, incluso como directorio real, desaparece. No hay confirmación previa.

Y un apunte de futuro: la instalación por clonación es temporal. Esto acabará siendo un paquete de npm y se instalará con `npx` o `bunx`.

## Licencia

MIT. El código no tiene patentes asociadas.