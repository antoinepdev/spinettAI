import { existsSync, readdirSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Skill } from '../entities.ts'

function isVisibleDir(name: string): boolean {
	return !name.startsWith('.')
}

export function getSkills(root: string): Skill[] {
	if (!existsSync(root)) {
		throw new Error(`no existe el directorio de skills: ${root}`)
	}

	const skills: Skill[] = []

	for (const category of readdirSync(root, { withFileTypes: true })) {
		if (!category.isDirectory() || !isVisibleDir(category.name)) continue

		const categoryPath = join(root, category.name)

		for (const entry of readdirSync(categoryPath, { withFileTypes: true })) {
			if (!entry.isDirectory() || !isVisibleDir(entry.name)) continue
			if (!existsSync(join(categoryPath, entry.name, 'SKILL.md'))) continue

			skills.push({ name: entry.name, value: posix.join(category.name, entry.name) })
		}
	}

	return skills.sort((a, b) => a.value.localeCompare(b.value))
}
