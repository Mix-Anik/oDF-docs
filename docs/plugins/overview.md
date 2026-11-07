---
title: Plugins
sidebar_label: Overview
---

A plugin is a **QVM program** (C compiled with q3lcc, the bytecode of the Quake 3 virtual machine) that the engine runs in a sandbox. There are **client plugins** (draw into the game, read what the game shows) and **server plugins** (react to events such as a finished run or a login). The same engine runs both kinds. On x86 and x86-64 plugins run compiled to native code, on any other system they are interpreted.

## What a plugin cannot do

Whatever its author wrote:

* **Touch files or the network, or call the system.** It has no system calls. A server plugin never gets at the client's files, a client plugin never gets other players' addresses, keys or tokens.
* **Read or write memory but its own.** Every access is masked into it, and the engine checks every pointer, string and size a plugin passes to a function. The dispatcher is generated from the API files, so no function has to do it by hand.
* **Use a capability it was not given.** Client plugins get all of them (the player installs them knowingly). The operator of a server lists them per plugin: `+set sv_plugins "records:auth,chat,storage,http=api.example.com"`. The ones that give power over other people's data (`auth`, `ips`, `http`, `rawcmd`) are never given unless named.
* **Use a function marked `cheat`** when cheats are not allowed. The engine decides, not the plugin.
* **Run for ever.** Every call has a budget of instructions (5 million for a call, 100 million for the start), and a plugin that uses it up is stopped.
* **Take the game down.** A bad pointer, a division by zero, a jump to a place it may not go to, a stack overflow: the plugin is stopped (and not called again until the game restarts), the game goes on. The console says which plugin and why.

Operators and players are responsible for the plugins they install.

## Where to go next

* [Client API](api/client.mdx) and [Server API](api/server.mdx): every function, handler and event.
