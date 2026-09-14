# package.yml / package.pak schema

Every package is `packages/<slug>/package.yml` + `packages/<slug>/package.pak`. Both files are
required. `./scripts/new-package.sh` generates both from prompts; this doc is the reference for
what each field means and whether it's required.

## package.yml

YAML. Fields, in the order `new-package.sh` writes them:

| field | required | notes |
| --- | --- | --- |
| `name` | yes | display name of the upstream project |
| `slug` | yes | url-safe id, must match the directory name (`packages/<slug>/`) |
| `version` | yes | upstream version string |
| `description` | yes | one line, what the thing is |
| `homepage` | yes | upstream project URL |
| `license` | yes | SPDX identifier if there is one (`MIT`, `GPL-3.0`, `X11`, ...) |
| `maintainer` | yes | the upstream project's maintainer, not whoever wrote this package definition — that's already in git history (submitter/last packager) |
| `dependencies` | no | YAML list of other package slugs in this repo, empty by default |

Example (`packages/cmatrix/package.yml`):

```yaml
name: cmatrix
slug: cmatrix
version: 2.0
description: Terminal based Matrix rain animation
homepage: https://github.com/abishekvashok/cmatrix
license: GPL-3.0
maintainer: abishekvashok
dependencies:
  - ncurses
```

## package.pak

Shell-flavored `KEY=value` build recipe. Fields, in the order `new-package.sh` writes them:

| field | required | notes |
| --- | --- | --- |
| `CC` | no | compiler, e.g. `gcc`, blank if not applicable |
| `SRC` | yes | upstream source repo URL |
| `DEPENDENCIES` | no | package slugs, space-separated, parens on one line: `(ncurses)`. Same set as `package.yml`'s `dependencies`, order doesn't matter. Blank if none. |
| `BUILDDIR` | yes | scratch directory the build runs in |
| `BIN` | yes | path to the built binary |
| `LIB` | yes | path to a built library, or `0` if there isn't one |
| `INSTALL_BIN` | yes | `y` or `n` |
| `INSTALL_LIB` | yes | `y` or `n` |
| `BUILD_SCRIPT` | yes | parenthesized, one shell command per line, at least one — `true` works as a no-op |

Example (`packages/cmatrix/package.pak`):

```
CC=gcc
SRC=https://github.com/abishekvashok/cmatrix
DEPENDENCIES=(ncurses)
BUILDDIR=/tmp/pak/imports/cmatrix
BIN=./build/cmatrix
LIB=0
INSTALL_BIN=y
INSTALL_LIB=n
BUILD_SCRIPT=(
    mkdir -p build
    cd build
    cmake ..
    make -j16
)
```

## Validating locally

`node scripts/lint-packages.mjs` checks all of this — required fields, `slug` matching the
directory, dependencies matching between the two files. CI runs the same thing on every push/PR,
so just run it before opening one.
