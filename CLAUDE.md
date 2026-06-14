# Mindcraft

Multi-process LLM Minecraft bots via Mineflayer. Each bot runs in an isolated child process.

## Commands

- `node main.js` - Start with profiles from settings.js
- `node main.js --profiles andy.json` - Start specific profile
- `node main.js --task_path tasks/basic/single_agent.json --task_id gather_oak_logs` - Run a task

## Architecture

- `src/mindcraft/` - Orchestration: MindServer (WebSocket hub + web UI), agent lifecycle
- `src/process/` - Process isolation: spawns each agent as child process with auto-restart
- `src/agent/` - Core agent logic: `agent.js` wires Prompter, History, Coder, ActionManager, Memory
  - `commands/` - LLM output parser and action/query dispatcher
  - `library/` - Skill library, world state, knowledge retrieval
  - `npc/` - NPC goal system + construction blueprints
  - `vision/` - Camera, browser viewer, vision interpretation
- `src/models/` - LLM provider adapters, auto-discovered via `_model_map.js`
- `src/utils/` - Keys, math, MC data, text processing, translation

## Configuration

**Profiles** (JSON, layered override):
- `profiles/defaults/_default.json` → base profile → individual `profiles/*.json`
- Profiles set: name, model, embedding, prompts, behavior modes, examples

**Settings** (`settings.js`): host, port, auth, profiles array, feature flags (allow_insecure_coding, allow_vision, etc.)

## Conventions

- ES Modules, no TypeScript
- Semicolons required, floating promises disallowed (see `eslint.config.js`)
- `patch-package` patches in `patches/` for mineflayer/prismarine deps
- No test framework — validation is via running bots in Minecraft
- New LLM provider: create `src/models/{name}.js` with the same interface as existing adapters
