import { join } from 'node:path'

import { select } from 'inquirer-select-pro'
import type { IAgent } from './entities.ts'
import { getSkills } from './helpers/getSkills.ts'
import { installSkills } from './helpers/installSkills.ts'
import { linkSkillsToAgents } from './helpers/linkSkillsToAgents.ts'

const CONTENT_ROOT = join(import.meta.dirname, '..', 'content', 'skills')
const DEST_ROOT = process.cwd()

const skills = getSkills(CONTENT_ROOT)

const selectedSkills = await select({
	message: 'Selecciona las skills que deseas instalar en el directorio actual:',
	options: skills.map((skill) => ({ name: skill.name, value: skill })),
	required: true,
})

const supportedAgents: IAgent[] = [
	{ name: 'opencode', relativePath: ['.opencode', 'skills'] },
	{ name: 'claude-code', relativePath: ['.claude', 'skills'] },
	{ name: 'gemini-cli', relativePath: ['.gemini', 'skills'] },
	{ name: 'codex', relativePath: ['.codex', 'skills'] },
]

const selectedAgents = await select({
	message: 'A qué agentes quieres dar soporte:',
	options: supportedAgents.map((agent) => ({ name: agent.name, value: agent })),
	required: true,
})

installSkills(selectedSkills, DEST_ROOT)
console.log(`Skills instaladas en ${join(DEST_ROOT, 'skills')}`)

linkSkillsToAgents({ skills: selectedSkills, agents: selectedAgents, destRoot: DEST_ROOT })
console.log(`Skills enlazadas en ${selectedAgents.map((agent) => join(DEST_ROOT, ...agent.relativePath)).join(', ')}`)
