# Issue tracker: Local Markdown

Issues and specs live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`.
- Specs live at `.scratch/<feature-slug>/spec.md`.
- Implementation tickets live at
  `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`,
  with one file per ticket.
- Record triage state in a `Status:` line near the top of each issue.
  Use the role strings in `triage-labels.md`.
- Append comments and conversation history under `## Comments`.

## Publishing and fetching

When a skill says to publish to the issue tracker, create the appropriate
spec or ticket file using the conventions above.

When a skill says to fetch a ticket, read the referenced file. If given
only a number, resolve it within the relevant feature directory.

## Wayfinding operations

- Map: `.scratch/<effort>/map.md`, containing Notes,
  Decisions-so-far, and Fog.
- Child ticket: `.scratch/<effort>/issues/NN-<slug>.md`,
  numbered from `01`, with the question in its body.
- Record ticket type in `Type:`: `research`, `prototype`,
  `grilling`, or `task`.
- Record lifecycle state in `Status:`: `open`, `claimed`, or `resolved`.
  These lifecycle states are distinct from triage roles.
- Record dependencies in `Blocked by: NN, NN`. A ticket is unblocked
  when every listed ticket is resolved.
- Frontier: choose the lowest-numbered open, unblocked ticket.
- Claim: set `Status: claimed` and save before starting work.
- Resolve: append the answer under `## Answer`, set `Status: resolved`,
  and append a summary and ticket link to the map's Decisions-so-far.
