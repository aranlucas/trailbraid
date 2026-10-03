# Provenance

Source: https://github.com/dmmulroy/anti-slop

Exact commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`. Production assets copied unmodified from `skills/install-anti-slop/assets/anti-slop/` to `tools/oxlint/anti-slop/`. Root MIT license and nested ESLint Stylistic LICENSE/UPSTREAM.md are preserved.

## Integration

Oxlint and @oxlint/plugins are both exactly 1.86.0. All 18 generic custom rules plus native oxc/no-accumulating-spread are enabled. No direct Effect dependency exists, so Effect remains unregistered. Existing package manager, CI triggers, security checks and formatting commands are preserved.

Three documented boundary exception comments: no-unknown-parameters on the external coordinate parser, no-runtime-typeof on coordinate objects and saved route identity (the latter covers two checks). These preserve existing import validation without adding runtime schema infrastructure. Local tests/build are blocked by npm dependency tarball HTTP403 (Turf unavailable); CI performs the complete install and checks.

Initial diagnostic counts: {"anti-slop(no-conditional-empty-object-spread)": 4, "anti-slop(no-known-value-widening)": 1, "anti-slop(no-runtime-typeof)": 3, "anti-slop(no-unknown-parameters)": 1, "anti-slop(require-readable-spacing)": 111}. Final lint: zero diagnostics using the matching, already verified local toolchain. No deployment or merge.
