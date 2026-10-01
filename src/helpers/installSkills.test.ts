import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Skill } from '../entities.ts'
import { installSkills } from './installSkills.ts'

let srcRoot: string
let destRoot: string

function buildSkill(base: string, category: string, name: string): void {
	const dir = join(base, category, name)
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture\n---\n`)
}

function buildFile(base: string, relPath: string, content: string): void {
	const full = join(base, relPath)
	mkdirSync(join(full, '..'), { recursive: true })
	writeFileSync(full, content)
}

beforeEach(() => {
	srcRoot = mkdtempSync(join(tmpdir(), 'spinettai-src-'))
	destRoot = mkdtempSync(join(tmpdir(), 'spinettai-dest-'))
})

afterEach(() => {
	rmSync(srcRoot, { recursive: true, force: true })
	rmSync(destRoot, { recursive: true, force: true })
})

describe('installSkills', () => {
	it('copia una skill seleccionada a dest/skills/<category>/<name> con su estructura completa', () => {
		buildSkill(srcRoot, 'generic', 'commits')
		buildFile(srcRoot, 'generic/commits/README.extra', '# extra')

		const selected: Skill[] = [{ name: 'commits', path: join(srcRoot, 'generic', 'commits'), category: 'generic' }]

		installSkills(selected, destRoot)

		const skillDest = join(destRoot, 'skills', 'generic', 'commits')
		expect(existsSync(skillDest)).toBe(true)
		expect(existsSync(join(skillDest, 'SKILL.md'))).toBe(true)
		expect(readFileSync(join(skillDest, 'SKILL.md'), 'utf8')).toContain('name: commits')
		expect(existsSync(join(skillDest, 'README.extra'))).toBe(true)
	})

	it('copia skills con subdirectorios (evals/workspace/iter-1) preservando estructura', () => {
		buildSkill(srcRoot, 'backend', 'error-handling')
		buildFile(srcRoot, 'backend/error-handling/evals/evals.json', '{"cases": []}')
		buildFile(srcRoot, 'backend/error-handling/evals/workspace/iter-1/case-1.md', '# 1')
		buildFile(srcRoot, 'backend/error-handling/evals/workspace/iter-1/case-2.md', '# 2')
		buildFile(srcRoot, 'backend/error-handling/evals/workspace/iter-1/case-3.md', '# 3')

		const selected: Skill[] = [{ name: 'error-handling', path: join(srcRoot, 'backend', 'error-handling'), category: 'backend' }]

		installSkills(selected, destRoot)

		const base = join(destRoot, 'skills', 'backend', 'error-handling')
		expect(existsSync(join(base, 'evals', 'evals.json'))).toBe(true)
		expect(existsSync(join(base, 'evals', 'workspace', 'iter-1', 'case-1.md'))).toBe(true)
		expect(existsSync(join(base, 'evals', 'workspace', 'iter-1', 'case-2.md'))).toBe(true)
		expect(existsSync(join(base, 'evals', 'workspace', 'iter-1', 'case-3.md'))).toBe(true)
	})

	it('copia varias skills seleccionadas', () => {
		buildSkill(srcRoot, 'generic', 'commits')
		buildSkill(srcRoot, 'generic', 'skill-creator')
		buildSkill(srcRoot, 'backend', 'error-handling')

		const selected: Skill[] = [
			{ name: 'commits', path: join(srcRoot, 'generic', 'commits'), category: 'generic' },
			{ name: 'skill-creator', path: join(srcRoot, 'generic', 'skill-creator'), category: 'generic' },
			{ name: 'error-handling', path: join(srcRoot, 'backend', 'error-handling'), category: 'backend' },
		]

		installSkills(selected, destRoot)

		expect(existsSync(join(destRoot, 'skills', 'generic', 'commits', 'SKILL.md'))).toBe(true)
		expect(existsSync(join(destRoot, 'skills', 'generic', 'skill-creator', 'SKILL.md'))).toBe(true)
		expect(existsSync(join(destRoot, 'skills', 'backend', 'error-handling', 'SKILL.md'))).toBe(true)
	})

	it('lanza un error si ya existe dest/skills', () => {
		mkdirSync(join(destRoot, 'skills'))

		const selected: Skill[] = [{ name: 'commits', path: join(srcRoot, 'generic', 'commits'), category: 'generic' }]

		expect(() => installSkills(selected, destRoot)).toThrow(/skills/)
	})

	it('copia desde la ruta indicada (no resuelve symlinks) usando skill.path tal cual', () => {
		const real = join(srcRoot, 'real')
		mkdirSync(real)
		buildSkill(real, 'generic', 'commits')
		const link = join(srcRoot, 'link')
		symlinkSync(real, link)

		const selected: Skill[] = [{ name: 'commits', path: join(link, 'generic', 'commits'), category: 'generic' }]

		installSkills(selected, destRoot)

		expect(existsSync(join(destRoot, 'skills', 'generic', 'commits', 'SKILL.md'))).toBe(true)
	})
})
