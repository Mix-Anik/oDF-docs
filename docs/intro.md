---
title: oDF documentation
slug: /
sidebar_label: Introduction
---

oDF is the DeFRaG setup made of two parts:

* **oDFs** is the mod: the game, cgame and UI modules of DeFRaG with the oDF changes.
* **oDFe** is the engine (a Quake3e fork) that runs it, with the extras the mod relies on: plugins, online records, player login and the updater.

This site documents them. It is meant to grow, so it is split by subject:

* [Plugins](plugins/overview.md): write programs that run inside the game (a HUD, a recorder, a records client) or on a server, in a sandbox that cannot touch anything it was not given. Start with [Getting started](plugins/guides/getting-started.md) to write one, or the guides [for players](plugins/players.md) and [for server operators](plugins/operators.md) to use them. Includes the [API reference](plugins/api/client.mdx), which is generated from the engine, so it always matches the version it was built from.
* [Engine](engine/login.md): features of the engine itself: [player login](engine/login.md), where players prove who they are with a key instead of a password, and the [console socket](engine/con-socket.md), to read the console and send it commands from another program.
