# Helix plugin

Owns the Helix TOML parser, key normalization, categories, facets, labels, and
default keymap.

## Facets

The core derives the Category facet from `categories.js` and
`classifyHelixAction`.
The plugin also declares a `group` facet named Modes over the Helix mode.
Entries can be filtered or coloured by either facet.

## Data provenance

The default keymap is generated from
`helix-term/src/keymap/default.rs` in the
[Helix repository](https://github.com/helix-editor/helix).
Helix is licensed under MPL-2.0.

`update.mjs` reads the `keymap!` macros, expands `|` alternatives, and emits
nested TOML tables.
Select mode is emitted as the merged Normal bindings plus its overrides,
because that is what Helix displays at runtime.

## Custom layer

Imported `[keys.*]` tables are merged by mode and key sequence.
A custom sequence replaces the default sequence in the same mode.
New sequences are added, and every other default remains available.

## Updating

```sh
node tools/update-keymap-plugin.mjs helix
```

The shared runner fetches the source file with Node's built-in `fetch`,
writes `data/default.toml` only when it changed, and records `sourceSha` and
`outputSha` in `source.json`.

## Files

- `index.js`: plugin contract and metadata
- `parser.js`: key sequences, TOML traversal, token normalization, and merge
- `toml.js`: keymap-local TOML reader
- `categories.js`: category names
- `adapter.js`: classification and label formatting
- `data/default.toml`: generated default keymap
- `source.json`: provenance and integrity metadata
- `tests/`: parser, TOML reader, transform, and fixture tests
- `update.mjs`: Rust-to-TOML transform
