---
title: Examples
sidebar_label: Overview
sidebar_position: 0
---

Small, complete plugins, each showing one part of the API. The code on these pages is the code of the example plugins in the engine's SDK (`code/plugin_api/sdk/examples`), which the engine's CI builds on every change, so it is always valid for the engine version the reference was generated from.

| Example | Kind | Shows |
|---|---|---|
| [Hello, client](hello.md) | client | the shape of a plugin: manifest, entry point, a console command |
| [Speedometer](speedometer.md) | client | drawing on the screen, reading the state of the game, cvars |
| [Hello, server](hello-server.md) | server | the smallest server plugin |
| [Best time](best-time.md) | server | events, chat commands, messages to players, the plugin's own storage |
| [HTTP and JSON](http-json.md) | server | a request to a web service and reading its answer |

## Building and installing

An example is built with `odf-build`, the compiler of the SDK (one program, nothing else is needed), and installed by putting the `.qvm` file into the `plugins` folder of the home path:

```sh
odf-build --client -o plugins/hello.qvm hello.c
odf-build --server -o plugins/best_time.qvm best_time.c
```

A client plugin is started with the game (`clplugins` in the console lists what was found and why something does not run). A server plugin is named in the startup-only cvar `sv_plugins`, with the capabilities the operator gives it, for example `+set sv_plugins "best_time:chat,storage"`. The first line of every example says how to build and run it.
