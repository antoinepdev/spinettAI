import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { IAgent, Skill } from '../entities.ts'
import { linkSkillsToAgents } from './linkSkillsToAgents.ts'

const OPENCODE: IAgent = { name: 'opencode', relativePath: ['.opencode', 'skills'] }

let destRoot: string

function installSkill(category: string, name: string): Skill {
	const dir = join(destRoot, 'skills', category, name)
	mkdirSync(join(dir, 'evals', 'workspace', 'iter-1'), { recursive: true })
	writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture\n---\n`)
	writeFileSync(join(dir, 'evals', 'evals.json'), '{"cases": []}')
	writeFileSync(join(dir, 'evals', 'workspace', 'iter-1', 'case-1.md'), '# 1')

	return { name, path: dir, category }
}

function agentSkillsDir(): string {
	return join(destRoot, ...OPENCODE.relativePath)
}

function linkPath(name: string): string {
	return join(agentSkillsDir(), name)
}

beforeEach(() => {
	destRoot = mkdtempSync(join(tmpdir(), 'spinettai-link-'))
})

afterEach(() => {
	rmSync(destRoot, { recursive: true, force: true })
})

describe('linkSkillsToAgents', () => {
	it('crea un symlink relativo por cada skill instalada en .opencode/skills', () => {
		const skill = installSkill('generic', 'commits')

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(lstatSync(linkPath('commits')).isSymbolicLink()).toBe(true)
		expect(readlinkSync(linkPath('commits'))).toBe(relative(agentSkillsDir(), skill.path))
	})

	it('omite la categoría: el enlace cuelga directamente de .opencode/skills', () => {
		const skills = [installSkill('generic', 'commits'), installSkill('backend', 'error-handling')]

		linkSkillsToAgents({ skills, agents: [OPENCODE], destRoot })

		expect(readdirSync(agentSkillsDir()).sort()).toEqual(['commits', 'error-handling'])
		expect(readlinkSync(linkPath('error-handling'))).toBe('../../skills/backend/error-handling')
		expect(readlinkSync(linkPath('commits'))).toBe('../../skills/generic/commits')
	})

	it('los enlaces resuelven el contenido real de la skill, incluidas las carpetas anidadas', () => {
		const skill = installSkill('backend', 'error-handling')

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(readFileSync(join(linkPath('error-handling'), 'SKILL.md'), 'utf8')).toContain('name: error-handling')
		expect(existsSync(join(linkPath('error-handling'), 'evals', 'evals.json'))).toBe(true)
		expect(readFileSync(join(linkPath('error-handling'), 'evals', 'workspace', 'iter-1', 'case-1.md'), 'utf8')).toBe('# 1')
	})

	it('crea .opencode/skills si no existe', () => {
		const skill = installSkill('generic', 'commits')

		expect(existsSync(agentSkillsDir())).toBe(false)

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(existsSync(linkPath('commits'))).toBe(true)
	})

	it('no crea enlaces si no se selecciona ningún agente', () => {
		const skill = installSkill('generic', 'commits')

		linkSkillsToAgents({ skills: [skill], agents: [], destRoot })

		expect(existsSync(agentSkillsDir())).toBe(false)
	})

	it('enlaza en el directorio que define cada agente', () => {
		const skill = installSkill('generic', 'commits')
		const other: IAgent = { name: 'opencode', relativePath: ['.otro-agente', 'skills'] }

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE, other], destRoot })

		expect(existsSync(join(destRoot, '.opencode', 'skills', 'commits', 'SKILL.md'))).toBe(true)
		expect(existsSync(join(destRoot, '.otro-agente', 'skills', 'commits', 'SKILL.md'))).toBe(true)
	})

	it('reemplaza un enlace existente que apunta a otro sitio', () => {
		const skill = installSkill('generic', 'commits')
		mkdirSync(agentSkillsDir(), { recursive: true })
		symlinkSync(join(destRoot, 'otro', 'commits'), linkPath('commits'))

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(readlinkSync(linkPath('commits'))).toBe('../../skills/generic/commits')
	})

	it('reemplaza un enlace roto', () => {
		const skill = installSkill('generic', 'commits')
		mkdirSync(agentSkillsDir(), { recursive: true })
		symlinkSync(join(destRoot, 'no-existe'), linkPath('commits'))

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(readFileSync(join(linkPath('commits'), 'SKILL.md'), 'utf8')).toContain('name: commits')
	})

	it('reemplaza un directorio real que ocupa el sitio del enlace', () => {
		const skill = installSkill('generic', 'commits')
		mkdirSync(linkPath('commits'), { recursive: true })
		writeFileSync(join(linkPath('commits'), 'stale.md'), '# vieja')

		linkSkillsToAgents({ skills: [skill], agents: [OPENCODE], destRoot })

		expect(lstatSync(linkPath('commits')).isSymbolicLink()).toBe(true)
		expect(existsSync(join(linkPath('commits'), 'stale.md'))).toBe(false)
	})
})
