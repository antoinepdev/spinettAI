import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Skill } from '../entities.ts'
import { getSkills } from './getSkills.ts'

interface CatalogCase {
	title: string
	build: (root: string) => void
	expected: (root: string) => Skill[]
}

let root: string

function buildSkill(base: string, category: string, name: string): void {
	const dir = join(base, category, name)
	mkdirSync(dir, { recursive: true })
	writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture\n---\n`)
}

function buildDir(base: string, ...segments: string[]): void {
	mkdirSync(join(base, ...segments), { recursive: true })
}

function buildFile(base: string, path: string, content: string): void {
	writeFileSync(join(base, path), content)
}

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'spinettai-content-'))
})

afterEach(() => {
	rmSync(root, { recursive: true, force: true })
})

describe('getSkills', () => {
	it.for<CatalogCase>([
		{
			title: 'devuelve name = carpeta del SKILL.md, category = carpeta que contiene la skill y path = ruta completa',
			build: (base) => buildSkill(base, 'generic', 'commits'),
			expected: (base) => [{ name: 'commits', path: join(base, 'generic', 'commits'), category: 'generic' }],
		},
		{
			title: 'usa como category el nombre de la carpeta que contiene la skill, sea cual sea',
			build: (base) => buildSkill(base, 'backend', 'error-handling'),
			expected: (base) => [{ name: 'error-handling', path: join(base, 'backend', 'error-handling'), category: 'backend' }],
		},
		{
			title: 'devuelve las skills de todas las categorías ordenadas alfabéticamente por path',
			build: (base) => {
				buildSkill(base, 'generic', 'skill-creator')
				buildSkill(base, 'generic', 'commits')
				buildSkill(base, 'backend', 'error-handling')
			},
			expected: (base) => [
				{ name: 'error-handling', path: join(base, 'backend', 'error-handling'), category: 'backend' },
				{ name: 'commits', path: join(base, 'generic', 'commits'), category: 'generic' },
				{ name: 'skill-creator', path: join(base, 'generic', 'skill-creator'), category: 'generic' },
			],
		},
		{
			title: 'ignora las carpetas de una categoría que no tienen SKILL.md',
			build: (base) => {
				buildDir(base, 'generic', 'not-a-skill')
				buildSkill(base, 'generic', 'commits')
			},
			expected: (base) => [{ name: 'commits', path: join(base, 'generic', 'commits'), category: 'generic' }],
		},
		{
			title: 'ignora las carpetas de apoyo que cuelgan de una skill',
			build: (base) => {
				buildSkill(base, 'backend', 'error-handling')
				buildDir(base, 'backend', 'error-handling', 'evals')
				buildDir(base, 'backend', 'error-handling', 'evals', 'workspace', 'iter-1')
			},
			expected: (base) => [{ name: 'error-handling', path: join(base, 'backend', 'error-handling'), category: 'backend' }],
		},
		{
			title: 'ignora las carpetas ocultas de la raíz y de las categorías',
			build: (base) => {
				buildSkill(base, 'generic', 'commits')
				buildDir(base, '.git')
				buildDir(base, 'generic', '.cache')
			},
			expected: (base) => [{ name: 'commits', path: join(base, 'generic', 'commits'), category: 'generic' }],
		},
		{
			title: 'ignora los ficheros sueltos de la raíz y de las categorías',
			build: (base) => {
				buildSkill(base, 'generic', 'commits')
				buildFile(base, 'README.md', '# content')
				buildFile(base, join('generic', 'notes.md'), 'notas')
			},
			expected: (base) => [{ name: 'commits', path: join(base, 'generic', 'commits'), category: 'generic' }],
		},
		{
			title: 'devuelve un array vacío si la raíz no tiene categorías',
			build: () => {},
			expected: () => [],
		},
	])('$title', ({ build, expected }) => {
		build(root)

		expect(getSkills(root)).toEqual(expected(root))
	})

	it('no resuelve symlinks: path mantiene la raíz tal cual se le pasa', () => {
		const real = join(root, 'real')
		mkdirSync(real)
		buildSkill(real, 'generic', 'commits')
		const link = join(root, 'link')
		symlinkSync(real, link)

		expect(getSkills(link)).toEqual([{ name: 'commits', path: join(link, 'generic', 'commits'), category: 'generic' }])
	})

	it('lanza un error que incluye la ruta si la raíz no existe', () => {
		const missing = join(root, 'missing')

		expect(() => getSkills(missing)).toThrow(missing)
	})
})
