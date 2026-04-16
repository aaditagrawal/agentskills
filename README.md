# Agent Skills

Opinionated agent skills for code quality, writing standards, and AI-assisted development.

Compatible with [Claude Code](https://claude.ai/code), [OpenAI Codex](https://openai.com/codex), [Cursor](https://cursor.com), [Windsurf](https://windsurf.com), and any agent following the [Agent Skills specification](https://agentskills.io/specification.md).

## Skills

### Code Quality

| Skill | Description |
|-------|-------------|
| [no-useeffect](skills/no-useeffect/SKILL.md) | Bans direct `useEffect` in React. Enforces derived state, event handlers, data-fetching libraries, and key-based remounting instead. |

### Writing Standards

| Skill | Description |
|-------|-------------|
| [no-slop](skills/no-slop/SKILL.md) | 20 non-negotiable rules for AI-generated content. No emdashes, no filler, no fabrication, no weasel words. |
| [ai-taste](skills/ai-taste/SKILL.md) | Framework for developing judgment and curation when working with AI. Generate, destroy, and build a rejection vocabulary. |

## Installation

### CLI Install

```bash
npx skills add aaditagrawal/agentskills

# Install specific skills
npx skills add aaditagrawal/agentskills --skill no-slop no-useeffect

# List available skills
npx skills add aaditagrawal/agentskills --list
```

Skills install to `.agents/skills/` in your project.

### Claude Code Plugin

```bash
/plugin marketplace add aaditagrawal/agentskills
/plugin install agent-skills
```

### Clone and Copy

```bash
git clone https://github.com/aaditagrawal/agentskills.git
cp -r agentskills/skills/* your-project/.agents/skills/
```

### Git Submodule

```bash
git submodule add https://github.com/aaditagrawal/agentskills.git .agents/agentskills
```

## License

MIT
