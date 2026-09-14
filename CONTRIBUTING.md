# Contributing

## Adding a package

Run `./scripts/new-package.sh` from the repo root. Bash, no dependencies. It'll prompt you for
each field and write `packages/<slug>/package.yml` + `packages/<slug>/package.pak`.

Field reference: [SCHEMA.md](SCHEMA.md).

The `maintainer` field is the upstream project's maintainer, not you. Not sure who that is? Check
the project's own repo or website.

## Before opening a PR

- `node scripts/lint-packages.mjs` passes locally (CI runs the same check)
- `maintainer` is the real upstream maintainer, not whoever wrote the package definition
- `license` matches what the upstream project actually uses
- one package per PR
