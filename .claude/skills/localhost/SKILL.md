---
name: localhost
description: Open a JCLite prototype on localhost in the browser pane. Use when the user types /localhost (optionally with a server name) or asks to open, run or preview the prototype locally.
---

# /localhost — JCLite

Open the prototype in the browser pane. The user typing `/localhost` is the
go-ahead; don't ask which server unless the argument is ambiguous.

## Which server

Servers are declared in `.claude/launch.json`. Pick by the argument:

| Argument | Server name | Port |
|---|---|---|
| *(none)*, `ai`, `justcall` | `justcall-ai` | 5679 |
| `add-ons`, `addons` | `add-ons` | 5678 |
| `storybook`, `sb` | `storybook` | 6006 |
| `alt`, `2`, `3`, `4` | `justcall-ai-alt` / `-third` / `-fourth` | 5680–5682 |

An argument that names a `launch.json` entry exactly wins over this table.

## Steps

1. `mcp__Claude_Browser__preview_start` with `{ name: "<server>" }`. Never run
   `vite` / `npm run dev` from Bash — the preview tool owns the process.
2. Confirm it rendered: `get_page_text` on the returned `tabId` (first ~500
   chars is enough). If it's blank or errored, read
   `preview_logs { level: "error" }` and report what you find.
3. Reply in one or two lines: the URL and what's on screen (the launcher, for
   `justcall-ai`). No task list or wrap-up box needed — it's one action.
