<!-- Copyright (c) 2026 Manicode Worldwide, Inc. Proprietary and confidential. -->

# Forge

Claude Code plugin that detects a repo's stack and delivers matching Manicode prompts at the start of each chat.

## What it does

At every new chat, `/clear` and compaction, the plugin's `SessionStart` hook detects the languages, frameworks and libraries the repo uses, with their installed versions, and adds the matching Manicode prompts to the chat.

## What it sends

Only the detected technologies and their versions, to the Manicode prompts API. No source code or file contents leave the machine.

## API key

The plugin reads `MANICODE_REGISTRY_API_KEY` from its environment. Set it in the `env` block of the repo's gitignored `.claude/settings.local.json`:

```json
{
  "env": {
    "MANICODE_REGISTRY_API_KEY": "<demo key>"
  }
}
```
