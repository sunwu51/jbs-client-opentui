# jbs-client

`jbs-client` is the CLI client for [JVMByteSwapTool](https://github.com/sunwu51/JVMByteSwapTool).

It is built with OpenTUI and connects to JVMByteSwapTool over HTTP by default.

## Install

```bash
npm i -g jbs-client
```

## Run

```bash
jbs-client
```

By default, the client connects to:

```text
http://localhost:8000
```

Requests are sent as JSON-RPC 2.0 `tools/call` messages to `/mcp`. Runtime logs are streamed from `/log` using Server-Sent Events.

## Options

```bash
jbs-client --host localhost --port 8000 --connect true
```

Supported startup parameters:

- `--host <host>`: HTTP host, default is `localhost`
- `--port <port>`: HTTP port, default is `8000`
- `--ws_port <port>`: deprecated compatibility alias for `--port`
- `--connect <true|false>`: whether to connect to the backend on startup, default is `true`

Examples:

```bash
jbs-client --host 192.168.1.10 --port 8000
```

```bash
jbs-client --connect false
```

When `--connect false` is used, the UI starts without opening the backend HTTP/SSE connection. You can edit the HTTP base URL inside the TUI and reconnect manually.

## Keyboard

- `Ctrl+C`: exit the client
- `Tab` / `Shift+Tab`: switch focus
- `Up` / `Down`: change selected action in the menu
- `Enter`: open an action or submit the current form
- `Esc`: return from the form view to the main menu

## Release Build

This repository publishes prebuilt binaries through GitHub Releases and npm wrapper packages.

Pushing a tag like `v0.0.1` triggers the release workflow, builds all supported platforms, zips each platform binary, and uploads them to the corresponding GitHub Release.

To publish npm packages from the correct `dist/npm/*` directories, use:

```bash
bun run build
bun run publish:npm
```

The publish script always targets the official npm registry:

```text
https://registry.npmjs.org/
```

For GitHub Actions publishing, this repository is intended to use npm Trusted Publisher with the `release` environment instead of an npm access token.
