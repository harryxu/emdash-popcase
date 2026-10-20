# Popcase

This repository owns the native EmDash image viewer. The npm package is `emdash-popcase`; the EmDash plugin ID is `popcase`. The blog that originally hosted development is a separate consumer.

## Development

Use Node.js 24+ and the pnpm version in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev           # Start the self-contained example site
pnpm test          # Behavioral tests
pnpm typecheck
pnpm test:package  # Install the tarball in a fresh consumer, build, and check HTTP output
```

Use `example/` and its synthetic media for development. Its SQLite database and uploads are disposable; tests must remain independent of any sibling site's database, uploads, credentials, or installed dependencies. Stop development servers you start when verification finishes, unless the user asks to leave them running.

## Implementation boundaries

- Keep the native descriptor and Astro integration paired. Plugin block renderers emit metadata; page fragments supply collection scope; middleware enhances completed public HTML. Read the relevant ADR before changing that flow.
- Keep image fallback links usable without JavaScript and on viewer-load failure. Preserve ordinary navigation links and visual-editing interactions.
- Preserve host figure layout and responsive image rendering. Viewer assets load on the first open interaction.
- The viewer uses a dark, partially transparent backdrop in both site themes. Preview entry points use the normal link pointer.
- Validate distribution with `pnpm test:package` after changing exports, dependencies, renderers, integration, or client assets. A workspace link alone does not verify a published package.

## Skills and documentation

For plugin implementation, load `.agents/skills/creating-plugins/SKILL.md` and the references relevant to the change. Its sandboxed publishing instructions apply to registry plugins; Popcase uses the native npm release procedure in `README.md`.

Before relying on an EmDash API, hook, config option, or rendering pattern, query `search_docs` from the EmDash documentation MCP server. The server is configured in `.mcp.json`, `.cursor/mcp.json`, and `.vscode/mcp.json` at `https://docs.emdashcms.com/mcp`. If the connector is unavailable, use official documentation and installed source types and report any remaining uncertainty.

## Specs, issues, and domain records

- Before changing plugin behavior, read `.scratch/popcase/spec.md`. `.scratch/popcase/validation.md` is a dated historical record from before extraction, not evidence for the current checkout. Record only checks actually performed and state browser or environment gaps.
- Before creating or updating specs or tickets under `.scratch/<feature>/`, read `docs/agents/issue-tracker.md`. Before assigning triage status, read `docs/agents/triage-labels.md`.
- Before exploring domain concepts or architectural decisions, read `docs/agents/domain.md`, `GLOSSARY.md`, and the relevant records under `docs/adr/`.

## Release

Follow `README.md` for package metadata and manual release checks. Publishing, pushing, and tagging remain explicit maintainer actions. CI verifies the package without publishing it.
