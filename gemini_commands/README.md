# Gemini Command: /v2vplan

Local Gemini CLI command that pulls Grazer metrics for `./banana-context/src/` and generates a standards-aligned plan using the provided template.

## Install (project-local)
1. Build Grazer once (required for metrics):
   - `npm --prefix grazer install`
   - `npm --prefix grazer run build`
2. Install the command into `.gemini/commands` (local only):
   - `./gemini_commands/install-local.sh`

This copies `v2vplan.toml` and `v2vplan-template.md` into `.gemini/commands/`. No global install is performed.

## Use
- From repo root: `gemini /v2vplan`
- The CLI will prompt to run the shell command that gathers metrics:
  - `cd grazer && ./bin/grazer-metrics ../banana-context/src/`
- The prompt includes `v2vplan-template.md`, expecting the model to emit exactly one file under `plans/` following the wrapper and to add a brief summary + recommendation after the plan.

## Files
- `gemini_commands/v2vplan.toml` — command definition.
- `gemini_commands/v2vplan-template.md` — plan template (includes Grazer metrics section).
- `gemini_commands/install-local.sh` — copies the command/template into `.gemini/commands` locally.
