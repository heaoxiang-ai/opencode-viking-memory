# opencode-viking-memory

OpenCode plugin for persistent memory using [VikingMemory](https://console.volcengine.com/knowledgebase/).

Your agent remembers what you tell it - across sessions, across projects.

## Credits

This project references and is based on the [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) project.

## Installation

### For Humans

```bash
bunx opencode-viking-memory@latest install
```

Then get your API key and Resource ID from [火山引擎 Viking 记忆控制台](https://console.volcengine.com/knowledgebase/) and set them:

```bash
export VIKING_MEMORY_API_KEY="..."
export VIKING_MEMORY_RESOURCE_ID="mem-..."
```

**Or let your agent do it** - paste this into OpenCode:
```
Install opencode-viking-memory by following https://raw.githubusercontent.com/volcengine/opencode-viking-memory/main/README.md
```

### For LLM Agents

<details>
<summary>Instructions for LLM Agents (click to expand)</summary>

If you're an LLM agent helping set up opencode-viking-memory, follow these steps:

#### Step 1: Run the installer

```bash
bunx opencode-viking-memory@latest install --no-tui
```

This will:
- Register the plugin in `~/.config/opencode/opencode.jsonc`
- Create the `/viking-memory-init` command

#### Step 2: Verify the config

```bash
cat ~/.config/opencode/opencode.jsonc
```

Should contain:
```json
{
  "plugin": ["opencode-viking-memory"]
}
```

If not, add it manually:

**JSONC:**
```jsonc
{
  "plugin": [
    "opencode-viking-memory"
    // ... other plugins
  ]
}
```

**JSON:**
```json
{
  "plugin": ["opencode-viking-memory"]
}
```

#### Step 3: Configure API key

Ask the user to get their API key from [火山引擎 Viking 记忆控制台](https://console.volcengine.com/knowledgebase/).

Then set them via environment variables:

```bash
export VIKING_MEMORY_API_KEY="..."
export VIKING_MEMORY_RESOURCE_ID="mem-..."
```

Or create `~/.config/opencode/viking_memory.jsonc`:

```jsonc
{
  "apiKey": "...",
  "resourceId": "mem-..."
}
```

#### Step 4: Verify setup

Tell the user to restart OpenCode and run:

```bash
opencode -c
```

They should see `viking_memory` in the tools list. If not, check:
1. Is `VIKING_MEMORY_API_KEY` set?
2. Is the plugin in `opencode.jsonc`?
3. Check logs: `tail ~/.opencode-viking-memory.log`

#### Step 5: Initialize codebase memory (optional)

Run `/viking-memory-init` to have the agent explore and memorize the codebase.

</details>

## Features

### Context Injection

On first message, the agent receives (invisible to user):
- User profile (cross-project preferences)
- Project memories (all project knowledge)
- Relevant user memories (semantic search)

Example of what the agent sees:
```
[VIKING_MEMORY]

User Profile:
- Prefers concise responses
- Expert in TypeScript

Project Knowledge:
- [100%] Uses Bun, not Node.js
- [100%] Build: bun run build

Relevant Memories:
- [82%] Build fails if .env.local missing
```

The agent uses this context automatically - no manual prompting needed.

### Keyword Detection

Say "remember", "save this", "don't forget" etc. and the agent auto-saves to memory.

```
You: "Remember that this project uses bun"
Agent: [saves to project memory]
```

Add custom triggers via `keywordPatterns` config.

### Codebase Indexing

Run `/viking-memory-init` to explore and memorize your codebase structure, patterns, and conventions.

### Preemptive Compaction

When context hits 80% capacity:
1. Triggers OpenCode's summarization
2. Injects project memories into summary context
3. Saves session summary as a memory

This preserves conversation context across compaction events.

### Privacy

```
API key is <private>sk-abc123</private>
```

Content in `<private>` tags is never stored.

## Tool Usage

The `viking_memory` tool is available to the agent:

| Mode | Args | Description |
|------|------|-------------|
| `add` | `content`, `type?`, `scope?` | Store memory |
| `search` | `query`, `scope?` | Search memories |
| `profile` | `query?` | View user profile |
| `list` | `scope?`, `limit?` | List memories |
| `forget` | `memoryId`, `scope?` | Delete memory |

**Scopes:** `user` (cross-project), `project` (default)

**Types:** `project-config`, `architecture`, `error-solution`, `preference`, `learned-pattern`, `conversation`

## Memory Scoping

| Scope | Tag | Persists |
|-------|-----|----------|
| User | `opencode_user_{sha256(git email)}` | All projects |
| Project | `opencode_project_{sha256(directory)}` | This project |

## Configuration

Create `~/.config/opencode/viking_memory.jsonc`:

```jsonc
{
  // API key (can also use VIKING_MEMORY_API_KEY env var)
  "apiKey": "...",
  
  // Resource ID (can also use VIKING_MEMORY_RESOURCE_ID env var)
  "resourceId": "mem-...",
}
```

All fields optional. Env vars `VIKING_MEMORY_API_KEY` and `VIKING_MEMORY_RESOURCE_ID` take precedence over config file.

## Usage with Oh My OpenCode

If you're using [Oh My OpenCode](https://github.com/code-yeongyu/oh-my-opencode), disable its built-in auto-compact hook to let VikingMemory handle context compaction:

Add to `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "disabled_hooks": ["anthropic-context-window-limit-recovery"]
}
```

## Development

```bash
bun install
bun run build
bun run typecheck
```

Local install:

```jsonc
{
  "plugin": ["file:///path/to/opencode-viking-memory"]
}
```

## Logs

```bash
tail -f ~/.opencode-viking-memory.log
```

## Credits

This project references and is based on the [opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) project.

## License

MIT
