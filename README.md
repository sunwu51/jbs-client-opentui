# jbs-client

OpenTUI client application with npm-ready multi-platform binary packaging.

## Build publishable packages

```bash
bun run build:npm
```

This generates:

- `dist/npm/jbs-client` - root wrapper npm package
- `dist/npm/jbs-client-windows-x64`
- `dist/npm/jbs-client-windows-arm64`
- `dist/npm/jbs-client-linux-x64`
- `dist/npm/jbs-client-linux-arm64`
- `dist/npm/jbs-client-darwin-x64`
- `dist/npm/jbs-client-darwin-arm64`

## Publish order

1. Publish each platform package from `dist/npm/jbs-client-<platform>-<arch>`
2. Publish the root wrapper package from `dist/npm/jbs-client`

The root wrapper package resolves the current platform and launches the matching prebuilt binary.
