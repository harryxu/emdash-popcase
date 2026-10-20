# Domain docs

## Layout and reading rules

This repo uses a single-context layout:

- `GLOSSARY.md` at the repo root defines domain terminology.
- `docs/adr/` contains architectural decision records.

Before exploring the codebase, read the glossary and ADRs relevant
to the area being changed.

If these files do not exist, proceed silently. The domain-modeling
skill creates them as terms and decisions are resolved.

## Vocabulary

Use glossary terms in issue titles, proposals, hypotheses, and test names.

When a needed concept is absent, reconsider whether it belongs to the
domain. Record real terminology gaps for domain-modeling.

## Decision conflicts

Explicitly identify any proposal that contradicts an existing ADR.
Name the ADR and explain why the decision should be reconsidered.
