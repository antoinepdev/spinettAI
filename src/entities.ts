export interface Skill {
	name: string
	path: string
	category: string
}

export interface IAgent {
	name: 'opencode' | 'claude-code' | 'gemini-cli' | 'codex'
	relativePath: string[]
}
