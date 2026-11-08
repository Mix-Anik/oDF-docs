---
title: Using plugins (players)
sidebar_label: For players
description: Installing, switching on and off and trusting client plugins.
---

Client plugins add things to your game: a HUD that shows your speed, a helper that draws where a rocket will go, a recorder. They run in the engine, next to the game, and need no change to the mod you play.

## Are they safe?

A plugin runs in a [sandbox](architecture.mdx). Whatever its author wrote, it cannot:

* touch your files or the network, or call anything of your system;
* read your other data in the game or the engine's memory: it has a block of memory of its own;
* press keys, change your view or send commands. The API only lets it read what the game shows and draw, with the cheats-only exceptions described below;
* use a function marked `cheat` unless cheats are allowed (see below);
* take the game down: if it makes a mistake or runs too long, that plugin is stopped and the game goes on.

You are still responsible for what you install. A plugin you do not trust is a plugin you should not put in the folder, as with any other program.

## Installing

Put the `.qvm` file of the plugin into the `plugins` folder of your home path (type `fs_homepath` in the console to see where it is; create the folder if it is not there). Every client plugin in that folder is loaded when the game starts. A server plugin in the same folder is skipped without a message, and at most 64 programs are looked at.

## Seeing what runs

In the console:

```
clplugins           lists every plugin found, whether it runs, and why not if it does not
clplugins stats     the time each plugin has used, to find one that slows the game down, and the most steps and engine work one call used (of 5 million)
```

A plugin that does not run has a reason in that list: it could not start, it asked for something it is not allowed, or it was stopped after an error. The console also printed the reason at the moment it happened.

## Switching on and off

* **In the menu.** The main menu of the oDFs mod has a **Plugins** entry. It lists the plugins, shows the state of each, and switches them on and off while the game runs. It can also look for plugins you copied into the folder since the start, so you do not have to restart.
* **By file.** The names of the switched off plugins are in the text file `plugins/disabled`, one per line (a blank line or a line that starts with `#` is ignored, and names of plugins that are gone are dropped). A name is the file name without `.qvm`.

Switching a plugin off tells it to shut down, removes its console commands and frees it. Switching it on starts it again, and it is told about the map that is loaded.

## Settings of a plugin

A plugin keeps its settings in cvars of its own and tells you their names in its documentation, for example `speedo_draw 0` in the console. A plugin can create up to 256 cvars. It can read the cvars it created and a few game settings (`cg_*`, `r_*`, `df_*`, `m_*`), nothing else. Some plugins add console commands of their own as well.

## Cheats

What a plugin can see depends on whether cheats are allowed: you are playing a demo, or you are on a server with `sv_cheats 1` (`devmap`). The engine decides, a plugin cannot change it.

* **Without cheats** a plugin sees the missiles of the player being watched and nothing else of the other entities: no other players, no items. That is enough for helpers such as the paths of rockets and grenades.
* **With cheats** it sees every entity of the snapshot.
* **Functions marked `cheat`** do nothing, and return 0, unless cheats are allowed. This is what keeps a helper that would give an unfair advantage on a normal server from doing so, whatever the plugin wants.

Some features are for cheats only by nature: saving and restoring the whole state of a local game (`devmap`, no other player) so you can retry a part of a run, and recording a demo of such a game. A demo of a game with cheats always has `[tas]` in its name, and says in the demo itself that it was recorded with cheats, even if `sv_cheats` is turned off later in it.

## When a plugin stops

A plugin that makes a mistake (a bad pointer, a division by zero, a call it may not make) or uses up its budget of instructions or of engine work is stopped, and is not called again until the game restarts. The console says which plugin and why. Tell the author, or switch it off in the menu.

## Logging in

Plugins are separate from your account on the records website. How your key works, and how to register it, is in [Player login](../engine/login.md).
