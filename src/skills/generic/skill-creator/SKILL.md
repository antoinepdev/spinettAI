---
name: skill-creator
description: Crea, edita y mejora skills de OpenCode. Usa siempre que te pidan crear una skill nueva desde cero ("crea una skill para...", "quiero una skill que..."), editar o mejorar una skill existente, escribir un SKILL.md, preparar test cases para validar una skill, o revisar la descripción/frontmatter de una skill para que dispare bien. También cuando haya que probar o evaluar una skill contra prompts reales antes de darla por buena.
---

# Skill Creator

Skill para crear skills nuevas y mejorarlas de forma iterativa. A alto nivel el proceso es:

1. Decidir qué debe hacer la skill y más o menos cómo.
2. Escribir un borrador del `SKILL.md`.
3. Crear 2-3 prompts de prueba realistas y ejecutarlos con la skill cargada.
4. Revisar los resultados con el usuario (cualitativa y, si aplica, cuantitativamente).
5. Reescribir la skill según el feedback.
6. Repetir hasta que el usuario esté satisfecho.

Tu trabajo al usar esta skill es averiguar en qué punto del proceso está el usuario y saltar ahí: puede que quiera crear algo desde cero, que ya tenga un borrador (entonces vas directo al loop de evaluación), o que solo quiera "improvisar" sin evaluaciones formales. Sé flexible: lo importante es terminar con una skill que funcione, no seguir el proceso al pie de la letra.

## Comunicarte con el usuario

La skill-creator la va a usar gente con niveles muy distintos de familiaridad técnica. Lee las señales del contexto para decidir cómo expresarte. Es aceptable usar "evaluación" o "benchmark"; términos como "JSON" o "frontmatter" solo úsalos sin explicarlos si el usuario muestra que los conoce. Si dudas, explica brevemente el término.

## Capturar la intención

Empieza entendiendo qué quiere el usuario. Si la conversación ya contiene un workflow a capturar (p. ej. "convierte esto en una skill"), extrae primero las respuestas del historial: herramientas usadas, secuencia de pasos, correcciones que hizo el usuario, formatos de entrada/salida observados. Llena los huecos solo con lo que falte y confirma antes de avanzar.

1. ¿Qué debe permitir hacer esta skill?
2. ¿Cuándo debe dispararse? (qué frases/contextos del usuario la activan — esta información va SIEMPRE en la `description`, no en el cuerpo)
3. ¿Cuál es el formato de salida esperado?
4. ¿Configuramos test cases para verificar que funciona? Las skills con salida objetiva y verificable (transformar archivos, extraer datos, generar código, flujos fijos) se benefician de test cases. Las de salida subjetiva (estilo de escritura, diseño) normalmente no los necesitan. Sugiere el default según el tipo, pero que decida el usuario.

## Entrevista e investigación

Pregunta de forma proactiva por casos límite, formatos de entrada/salida, archivos de ejemplo, criterios de éxito y dependencias. No escribas los prompts de prueba hasta tener esto resuelto. Si necesitas contexto externo (docs, buenas prácticas, skills similares), investiga en paralelo con un subagente `explore` antes de volver a hablar con el usuario.

## Escribir el SKILL.md

Escribe la skill en un archivo `SKILL.md` con frontmatter YAML válido. Antes de dar la skill por terminada, revisa las convenciones del repo que tengan que ver con skills (suele haber un `AGENTS.md` con ellas: categorías, idioma de las instrucciones, estructura de mirror, etc.).

### Frontmatter obligatorio

```markdown
---
name: mi-skill
description: Una frase que cubre qué hace Y cuándo se activa. Adelanta las keywords o filenames literales que el usuario va a decir.
---

# Mi Skill
```

- `name`: identificador en minúsculas separado por guiones, igual que la carpeta.
- `description`: el mecanismo principal de disparo. Cubre qué hace la skill Y cuándo usarla, en tercera persona ("Usa cuando..."). Adelanta las keywords o filenames concretos que el usuario diría.

Las descripciones tienden a "disparar de menos" — a no usarse cuando serían útiles. Para contrarrestarlo, haz que las descripciones sean un poco "insistentes". Por ejemplo, en vez de "Cómo construir un dashboard rápido para mostrar métricas internas" escribe "Cómo construir un dashboard rápido para mostrar métricas internas. Usa esta skill siempre que el usuario mencione dashboards, visualización de datos, métricas internas o quiera mostrar cualquier tipo de dato de la empresa, aunque no pida un 'dashboard' explícitamente."

### Anatomía de una skill

```
nombre-skill/       (la carpeta nombre-skill suele estar dentro de src/skills/<categoría>/ o .opencode/skills/)
├── SKILL.md        (obligatorio: frontmatter + instrucciones)
└── Recursos bundleados (opcional)
    ├── scripts/    - Código ejecutable para tareas deterministas o repetitivas
    ├── references/ - Docs que se cargan en contexto según se necesiten
    └── assets/     - Archivos usados en la salida (plantillas, iconos, fuentes)
```

### Progressive disclosure (carga por niveles)

Las skills se cargan en tres niveles:
1. **Metadatos** (name + description): siempre en contexto (~100 palabras).
2. **Cuerpo del SKILL.md**: en contexto cuando la skill se activa (<500 líneas ideal).
3. **Recursos bundleados**: solo cuando hacen falta (sin límite; los scripts se ejecutan sin cargarse).

Consejos:
- Mantén el SKILL.md por debajo de 500 líneas. Al acercarte al límite, añade un nivel más de jerarquía con referencias claras de hacia dónde ir.
- Referencia los archivos desde el SKILL.md indicando cuándo leerlos.
- Para referencias grandes (>300 líneas), incluye un índice de contenidos.

Cuando la skill soporta varios dominios o frameworks, organízala por variantes:

```
cloud-deploy/
├── SKILL.md              (workflow + selección de framework)
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

## Guía de escritura

- Prefiere la forma imperativa en las instrucciones.
- **Explica el porqué.** Los LLM actuales son listos: con un buen andamiaje hacen más que seguir instrucciones a ciegas. Intenta entender la tarea y por qué el usuario la pide, y transmite ese entendimiento en las instrucciones. Si te encuentras escribiendo "SIEMPRE" o "NUNCA" en mayúsculas o estructuras rígidas, es una bandera amarilla: reformula y explica la razón de ser de lo que pides. Es el enfoque más efectivo.
- **Formato de salida con plantilla exacta** cuando importe:

  ```markdown
  ## Estructura del informe
  Usa SIEMPRE esta plantilla exacta:
  # [Título]
  ## Resumen ejecutivo
  ## Hallazgos clave
  ## Recomendaciones
  ```

- **Ejemplos útiles.** Incluye ejemplos en formato Input/Output:

  ```markdown
  ## Formato de mensaje de commit
  **Ejemplo 1:**
  Entrada: Añadida autenticación de usuario con tokens JWT
  Salida: feat(auth): implement JWT-based authentication
  ```

- Haz la skill general, no atada a un ejemplo concreto demasiado específico. Escribe un borrador y luego revísalo con ojos frescos para mejorarlo.

## Principio de ausencia de sorpresas

Las skills no deben contener malware, código de explotación ni nada que comprometa la seguridad del sistema. El contenido no debe sorprender al usuario respecto a su intención declarada. No crees skills engañosas ni pensadas para facilitar accesos no autorizados, exfiltración de datos u otras actividades maliciosas. (Cosas como "interpreta a un XYZ" sí son aceptables.)

## Test cases

Tras escribir el borrador, propón 2-3 prompts de prueba realistas — el tipo de cosa que diría un usuario real: "Aquí tienes unos test cases que me gustaría probar. ¿Te parecen bien o quieres añadir más?" Luego ejecútalos.

Guarda los prompts en `evals/evals.json` junto a los archivos de la skill (y, si se generan, también los resultados de ejecución en `<nombre-skill>-workspace/` con un subdirectorio por iteración y por case). De momento no escribas aserciones — solo los prompts:

```json
{
  "skill_name": "skill-de-ejemplo",
  "evals": [
    {
      "id": 1,
      "prompt": "Prompt de tarea del usuario",
      "expected_output": "Descripción del resultado esperado",
      "files": []
    }
  ]
}
```

## Ejecutar y revisar

Corre los prompts de prueba con la skill disponible en contexto. Si quieres resultados aislados e independientes del agente principal, ejecuta cada caso con un subagente `task`/`explore` indicándole la ruta de la skill, el prompt y dónde guardar la salida. Para una primera validación también vale correrlos tú mismo en la conversación.

Para cada case, presenta al usuario el prompt y la salida producida, y pídele feedback directamente en la conversación. Si la salida es un archivo (un `.docx`, un `.xlsx`, un script), guárdalo y dale la ruta para que lo abra. Como la evaluación es cualitativa, decide junto al usuario qué casos quedarían resueltos con aserciones verificables programáticamente (p. ej. "el CSV tiene las columnas A, B y C") y añádelas una a una cuando aporten valor — sin forzar aserciones sobre lo que requiere juicio humano.

## Mejorar la skill

Este es el corazón del loop. Has ejecutado los test cases, el usuario ha revisado los resultados, y ahora toca mejorar.

1. **Generaliza desde el feedback.** Estás iterando sobre unos pocos ejemplos para crear una skill que se usará mil veces en navegadores distintos. Si la skill solo funciona para estos ejemplos, no sirve. No metas cambios sobreajustados ni restricciones opresivas: si hay un problema persistente, prueba con metáforas nuevas o patrones de trabajo distintos.
2. **Mantén el prompt esbelto.** Elimina lo que no está aportando. Lee las transcripciones de las ejecuciones (no solo las salidas finales): si ves que la skill hace perder tiempo al modelo en cosas improductivas, quita la parte que lo provoca y observa qué pasa.
3. **Explica el porqué.** Nuevamente: si te encuentras escribiendo coerción en mayúsculas, reformula y explica la razón de ser. Si el feedback del usuario es escueto o frustrado, intenta entender de verdad la tarea y su trasfondo y transmite ese entendimiento.
4. **Busca trabajo repetido entre test cases.** Si en los 3 casos el modelo escribió un script helper parecido (`crear_docx.py`, `build_chart.py`), es señal fuerte de que la skill debe bundlear ese script. Escríbelo una vez, ponlo en `scripts/` e indícale a la skill que lo use. Ahorra a cada invocación futura reinventar la rueda.

Tras mejorar, repite el loop (re-ejecuta los test cases en una iteración nueva, vuelve a pedir feedback, mejora otra vez). Detente cuando: el usuario dice estar satisfecho, el feedback es todo vacío, o ya no hay progreso significativo.

## Optimización de la descripción

La `description` del frontmatter es el mecanismo principal que decide si la skill se invoca. Tras crear o mejorar una skill, ofrece revisarla para optimizar su disparo:

1. Redacta ~10 consultas should-trigger y ~10 should-not-trigger — realistas, de alguien escribiendo a un agente, con detalle concreto (paths, nombres de archivo, contexto personal), mezclando formal y casual, y centradas en casos límite, no en casos obvios. Las negativas deben ser "casi aciertos": comparten keywords o conceptos pero requieren algo distinto; no uses negativas trivialmente irrelevantes.
2. Pasa la lista al usuario para que la repase y añada/quítele casos. Basuras malas → descripciones malas.
3. Compara la descripción actual contra cada consulta ¿cuál dispararía? Identifica los falsos negativos (no dispara cuando debería) y falsos positivos (dispara cuando no debe) y reescribe la descripción — normalmente añadiendo keywords, filenames y la lista de "estos usos también", o acotando con "Usa SOLO cuando..." cuando dispara de más.
4. Aplica el resultado en el frontmatter, mostrando al usuario el antes/después.

## Convenciones de este repo

- Las instrucciones de las skills se escriben en **español** (los mensajes de commit, en inglés, por la skill `commits`).
- Tras crear o editar una skill, comprueba la estructura del repo: si existe `src/skills/<categoría>/<nombre>/SKILL.md` como fuente de verdad y un mirror `.opencode/skills/<nombre>/SKILL.md` para probarla localmente (como en el repo spinettAI), crea/actualiza AMBOS archivos con el mismo contenido.
- Recuerda al usuario que **opencode no recarga la configuración en caliente**: la skill nueva o modificada no estará disponible hasta que reinicie opencode.