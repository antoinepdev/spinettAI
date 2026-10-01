import { lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { IAgent, Skill } from '../entities.ts'

interface LinkSkillsToAgentsParams {
	skills: Skill[]
	agents: IAgent[]
	destRoot: string
}

export function linkSkillsToAgents({ skills, agents, destRoot }: LinkSkillsToAgentsParams): void {
	for (const agent of agents) {
		const agentSkillsDir = join(destRoot, ...agent.relativePath)
		mkdirSync(agentSkillsDir, { recursive: true })

		for (const skill of skills) {
			const link = join(agentSkillsDir, skill.name)
			const target = relative(agentSkillsDir, join(destRoot, 'skills', skill.category, skill.name))

			if (lstatSync(link, { throwIfNoEntry: false })) {
				rmSync(link, { recursive: true, force: true })
			}

			symlinkSync(target, link, 'dir')
		}
	}
}
