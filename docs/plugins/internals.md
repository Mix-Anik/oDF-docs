---
title: Game module contract
sidebar_label: Game module contract
description: What the mod (game, cgame, ui) hands to the engine so plugins can see it, and the engine mechanisms behind snapshots and demo routes.
---

This page is for people who write a game module or change the engine. A plugin only knows what the engine knows. Some of what plugins want, such as the predicted state of the player, the path of a ghost or the finish of a run, only the mod knows, so the mod hands it over. This page is that contract.

## Extension syscalls

The mod gives data to the engine with **extension syscalls**: engine functions that are not in the Quake 3 list, which the mod looks up by name at run time with `trap_GetValue`.

```c
char value[16];
trap_GetValue( value, sizeof( value ), "trap_Event_ODF" );   // the syscall number, or false if the engine does not know it
```

Look the number up, never hard-code it: a mod that does this works with engines that do not have the extension, and the matching plugin function just returns 0. The numbers below are what the current engine gives. The engine also announces what it has in the read-only cvar `//trap_GetValue`.

## Server: events from the game module

The game module raises an event with `trap_Event( name, data )`, found as `trap_Event_ODF` (710 in the game module).

* **Name**: lower case words, `a-z`, `0-9` and `_`, at most 31 characters.
* **Data**: a Quake info string, `\key\value\key\value`, at most 1023 characters.
* Anything else is dropped.

Which plugin gets it is not decided by the game: every running plugin that subscribed to the name gets it (an event that needs a capability only if the plugin has it). The game module is trusted to send what it wants, and an event name the engine does not know is passed to the plugins as it is. The keys of `player_finish`, the one the mod sends, are in the [Server API](api/server.mdx#events).

A plugin never sees the game module's memory: only the info string.

## Client: what the cgame publishes

The cgame hands its state to the engine once per frame, so that the plugin functions that need it can answer. Without it they return 0 and a plugin has to do without.

| Extension syscall | Number | What it is for |
|---|---|---|
| `trap_ODF_SetPlayerState( ps, viewFlags )` | 710 | The predicted player state of the watched player for the frame being drawn, and the view flags (scoreboard up, not first person). Behind `GetPlayerState`, `GetMoveState`, `GetWeaponState` and `GetPlayerStats`. |
| `trap_ODF_GhostPath( slot, first, count, points, complete )` | 712 | A part of the path of a replay ghost: a point per sample, with the race time, the position and a flag for a teleport. |
| `trap_ODF_GhostTime( slot, ms )` | 713 | The exact race time of the run the path was recorded from, which `GetGhostInfo` gives as `raceMs`. |
| `trap_ODF_SetStatsTime` | 714 | The server time of the snapshot the predicted state starts from, for working out the race time for a frame. |

**The engine does not predict, the game module does.** `GetPlayerState` gives the position and aim you see now, which is what a plugin needs to work out what a shot fired now would do. That is why it is only there when the game module publishes it. The oDFs cgame hands over `cg.predictedPlayerState` once per frame.

**Ghosts.** The oDFs cgame reads the ghost file of a ghost that starts to play a second time, a few hundred frames per client frame, and gives each part to the engine. `first` 0 starts a new path, and a later part has to continue where the last ended. The engine keeps up to `ODFC_GHOST_MAX_POINTS` (131072) points per slot after the ghost has stopped, until the slot gets another ghost, and frees them with the game module. `GetGhostInfo` and `GetGhostPath` need no cheats: the path is the one of a ghost the player sees anyway.

**Race time.** The oDFs cgame publishes the race time in `stats[7]` and `stats[8]` of the player state decoded, as a plain value, also on servers that scramble it (the cgame has to decode it for its own timer). So `GetPlayerStats` gives a usable race time in any game of oDFs, not only with cheats. It belongs to the snapshot the predicted state starts from, whose server time is the `snapshotTime` given with `trap_ODF_SetStatsTime`: a plugin that compares the race time with the predicted position adds `commandTime` minus `snapshotTime`.

## UI: the plugin menu

The menu of the oDFs mod ("Plugins" in the main menu) uses four extension syscalls of the UI module:

* `trap_ODF_PluginCount`
* `trap_ODF_PluginInfo( index, field, buf, size )`: field 0 is the name, 1 the version, 2 the reason why it is not running, 3 is "1" when it is switched off. It returns the state: 0 running, 1 stopped, 2 failed, 3 stopped by the engine, 4 disabled.
* `trap_ODF_PluginSetEnabled( name, enable )`: saves the choice in `plugins/disabled`.
* `trap_ODF_PluginRescan`: starts programs that were put into the folder since.

## Game snapshots and demo routes

The functions `SnapshotCreate`, `SnapshotApply` and `SnapshotFree` (capability `state`, cheats only) are built from three engine mechanisms that a mod has to cooperate with.

**The state of the game.** `SnapshotCreate( 0 )` saves the whole state of the running game and returns a handle: the player's position, speed, weapons and race timer, every entity, trigger, item, mover and door, the random numbers of the game module, and the server clock. It works for a local game (`devmap`, no other player) with a QVM game module, and for a cgame that takes time changes (the oDFs one, `CG_ODF_TIME_CHANGE`). A snapshot is stored as the difference to the first one of the game, about a KB, and the cvar `sv_stateMemory` (MB, default 32) limits the total. Handles are valid until the game module is shut down or restarted (map change, `map_restart`) or the plugin stops. `sv_state.c` in the engine explains the rest, and `tests/game_state` tests the difference code.

**Applying one.** `SnapshotApply( handle, 0 )` returns 1 when it will happen. It is made at the start of the next client frame, never inside a call of the plugin. The server runs no usercmds of the client between the apply and that moment. The first snapshot of the new timeline resets the client clock, and the plugins are told with `OnDemoSeek( oldTime, newTime )`. Applying a snapshot sends the line `[SNAPSHOT LOAD]` as a server command (`print`) to the player, so it is in a demo that is being recorded.

**Demos with jumps in time.** A normal demo cannot hold the jump of the server time that `SnapshotApply` makes. So a demo recorded in a local game with cheats is written in **segments**, one for each snapshot made:

* the messages go to `demos/temp/segments.store`;
* loading a snapshot drops the segment written since, and what follows is a new segment after the checkpoint;
* when the recording stops (`stoprecord`, or `savedemo <name>`, which goes on recording) the demo file is the route: the chain of segments from the start to the end, with message and server command numbers made continuous where a segment does not follow the one before. Time in that demo never goes back, so playback, seeking and the timeline need nothing special;
* the gamestate at the start of that demo has the configstring 1023 (`\cheats\1\route\1`), which the game never writes: the demo says it was recorded with cheats even if `sv_cheats` is turned off later in it;
* the store file is deleted when the game ends, and the read-only cvar `cl_demoRoute` is 1 while a recording works this way.

`tests/demo_route` tests it and `cl_demoroute.h` explains it.

**Demo calls** (capability `demo`): `DemoRecord`, `DemoStop( discard )` and `DemoSave( name )` need cheats, `DemoState` does not. A plugin records a demo of its own (`demos/temp/plugin.dm_*`, silent) and saves what was recorded under a name, which goes on recording. It can only stop and save the recording it started, not one the player started with `record`, and `DemoSave` only works for a recording made of segments.

## The VM

The code that runs a plugin is `code/qcommon/plugin_vm.c`, with small additions in `vm_x86.c` and `vm_interpreted.c` that only apply to plugins: the game's own QVMs run as before. It is shared by the client plugins (`cl_plugin.c`) and the server plugins (`sv_plugin.c`).

* Every load and store of the compiled code is masked into one block of memory of the plugin.
* Every engine function a plugin calls goes through one dispatcher generated from the `.api` files, which checks the pointers, the capabilities and the cheat rule before the engine code runs. See [How plugins fit in](architecture.mdx).
* The budget of a call is counted in steps (a function call or a trip around a loop in the compiled code; 16 instructions in the interpreter).
* The work the engine does for a call is counted too, in units of about 10 ns: 5 million for a call, 100 million for the start. The heavy functions (`MemSet` and `MemCpy` by size, the store, `HttpRequest`, shaders and models, `SnapshotCreate`, the demo calls) charge their units before they do the work with `PluginVM_Charge`, and a call that spends its allowance is stopped like one that ran out of steps. It is a count, not a clock, so a slow disk does not stop a plugin that a fast one would let run.
* A division by zero stops the plugin. A divisor of -1 does not: the result is the wrapped one (`-x` for a division, 0 for a remainder, so `INT_MIN / -1` is `INT_MIN`), and the compiled code skips the `idiv` that would trap.
* When an engine function called by a plugin ends in `Com_Error`, `Com_Error` first calls `PluginVM_Abort`, which marks that plugin as failed and clears its call state, so nothing points at the stack that the error unwinds.
* On x86 and x86-64 plugins run compiled to native code (`tests/client_plugin/smoke.sh` times a real plugin both ways); on any other system they are interpreted.

## Tests

The engine has native tests that need no game (MSYS2 MinGW64 or any gcc; the ones with QVM programs need `q3lcc` and `q3asm`):

| Test | What it checks |
|---|---|
| `tests/plugin_vm` | the plugin VM against hostile programs: bad pointers, loops, divisions, forged jumps and calls, a fuzzer |
| `tests/plugin_api` | the generated dispatcher: capabilities, the cheat rule, pointer checks, floats, 64 bit numbers; and that the generated files are current |
| `tests/plugin_sdk` | the C library of the SDK against the one of the host |
| `tests/plugin_layout` | the structs of the API have the same layout for gcc and for q3lcc |
| `tests/server_auth` | the real `sv_auth.c` and `sv_plugin.c` against a mock plugin |
| `tests/client_plugin` | the real `cl_plugin.c` against a mock plugin: draw phases, cheat rules, snapshots, a stopped plugin |
| `tests/demo_route` | demos of a game with checkpoints: segments, the route, renumbered messages |
| `tests/game_state` | the difference code of the game snapshots |
| `tests/auth_proto` | hex, the signed message and Ed25519 of the [login](../engine/login.md) |

Each is run with `sh tests/<name>/run.sh`.
