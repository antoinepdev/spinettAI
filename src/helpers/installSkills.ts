import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Skill } from '../entities.ts'

export function installSkills(skills: Skill[], destRoot: string): void {
	const destSkills = join(destRoot, 'skills')

	if (existsSync(destSkills)) {
		throw new Error('ya existe el directorio skills en el destino')
	}

	for (const skill of skills) {
		const destPath = join(destSkills, skill.category, skill.name)
		cpSync(skill.path, destPath, { recursive: true, preserveTimestamps: true, dereference: false })
	}
}
