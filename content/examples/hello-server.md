---
title: Hello, server
sidebar_position: 3
---

The smallest server plugin: it prints a line to the server console when the server starts it.

{{source hello_server.c}}

## What to notice

* It is the same shape as a client plugin, with the server entry header (`odfs_entry.h`) and `--server` when building.
* A server plugin only runs when the operator lists it in `sv_plugins` (a startup-only cvar), for example `+set sv_plugins "hello_server"`. Capabilities are given there too, per plugin: `"name:cap1,cap2"`. This plugin needs none. The `plugins` command lists what was loaded and why something is not running.
* [`Print`](../api/server.mdx#print) writes to the server console and log, prefixed with the name of the plugin.
