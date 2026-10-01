import { join } from 'node:path'

import { select } from 'inquirer-select-pro'
import { getSkills } from './helpers/getSkills.ts'
import { installSkills } from './helpers/installSkills.ts'

const CONTENT_ROOT = join(import.meta.dirname, '..', 'content', 'skills')
const DEST_ROOT = process.cwd()

const skills = getSkills(CONTENT_ROOT)

const selectedSkills = await select({
	message: 'Selecciona las skills que deseas instalar en el directorio actual:',
	options: skills.map((skill) => ({ name: skill.name, value: skill })),
})

installSkills(selectedSkills, DEST_ROOT)

console.log(`Skills instaladas en ${join(DEST_ROOT, 'skills')}`)
