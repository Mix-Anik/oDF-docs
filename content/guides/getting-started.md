---
title: Getting started
description: Write, build and run your first plugin for oDFe.
---

This page takes you from nothing to a plugin that runs in the game. It is about ten minutes of work, and you need no tools but a text editor and the build program of the SDK.

## 1. Get `odf-build`

`odf-build` is the compiler of the SDK: one program that has the preprocessor, the compiler, the assembler, the API headers and the small C library of the SDK inside it. Nothing else is needed, no Python and no tools of Quake 3.

* **Download it.** Every release of the engine on GitHub has `odf-build-<system>.zip` for Windows, Linux (x86_64 and arm64) and macOS (arm64), with `odf-build`, the license of the compiler and the examples.
* **Or build it** for another system, from the engine repository, with any C compiler: `make -C code/plugin_api/sdk`. On Windows do it in an MSYS2 MINGW64 shell that has `make` and `gcc`.

## 2. Write a plugin

A client plugin that adds a console command. This is `hello.c` of the SDK:

{{source hello.c}}

Three things make it a plugin:

* **The manifest**: `ODF_PLUGIN_VERSION` (required) and `ODF_PLUGIN_DESCRIPTION`. A plugin that needs capabilities also names them in `ODF_PLUGIN_CAPS`, for example `"world,draw"`. See [capabilities](../api/client.mdx#capabilities).
* **The entry header** (`odfc_entry.h` for a client plugin, `odfs_entry.h` for a server plugin) defines the one function the engine calls. It comes before the first function of the program, and `EXPORTS( X )` before it lists the functions of yours the engine may call, such as `OnInit`, `OnFrame` or `OnDraw3D`. Leave out the ones you do not need.
* **`OnInit`** returns 0 when the plugin is ready. Anything else and it is not loaded.

For everything the engine should do for you later, a console command, a chat command, an event, an HTTP answer, you give the engine one of your functions, a **handler**. `CommandRegister( "hello", CmdHello )` is one. See [Examples](../examples/index.md) for more.

## 3. Build it

```sh
odf-build --client -o hello.qvm hello.c
```

`--client` builds for the client API (`odfc.h`), `--server` for the server API (`odfs.h`). The output is a `.qvm` file, the bytecode of the Quake 3 virtual machine, which the engine runs in a [sandbox](../architecture.mdx).

## 4. Install and run it

**Client plugin.** Put `hello.qvm` into the `plugins` folder of the home path (type `fs_homepath` in the console to see where that is; create the folder if it is not there) and start the game. Every client plugin in that folder is loaded at startup. In the console:

```
clplugins          lists what was found, what runs and why something does not
hello World       runs the command of the plugin
```

**Server plugin.** Put the `.qvm` into the `plugins` folder of the server's home path as well, and name it in the startup-only cvar `sv_plugins`, with the capabilities the operator gives it:

```
+set sv_plugins "best_time:chat,storage"
```

`plugins` in the server console lists what was loaded. More in the [operator guide](../operators.md) and the [player guide](../players.md).

## When it does not work

| What you see | Why |
|---|---|
| `Multiple definitions` when building | a function of yours has the name of an engine function or of an export (`Print`, `OnInit`, ...): rename it |
| the plugin is not in `clplugins` / `plugins` | the file is not in the `plugins` folder of the home path, or it is a server plugin in the client's folder (skipped without a message) |
| it is listed but not running | `clplugins` / `plugins` says why: `OnInit` returned something other than 0, or the plugin asked for a capability it was not given (the console prints the line an operator would add) |
| it ran and then stopped | a fault stopped it: a bad pointer, a division by zero, a call of a function it was not given, or it used up its budget of steps or of engine work. The console says which plugin and why; the game goes on. It runs again after a restart |
| the C code does not compile | see the list below: it is C89 on a 32 bit machine |

## What to know about the language

The compiler is lcc of ioquake3 and the machine is the QVM, so:

* **C89.** No `inline`, no declarations after statements, no `for ( int i ...`, no compound literals. `//` comments work.
* **Integers are 32 bit.** `long long` is accepted but is only 32 bits wide, without a warning. There are no 64 bit integers; the API passes them as two halves.
* **A `double` is a float** (4 bytes).
* **No heap.** There is no `malloc`; use static arrays. A plugin has a fixed amount of memory (16 MB for a client plugin, 32 MB for a server plugin at most).
* **No C library of the system.** The SDK has what is likely to be needed: `string.h`, `ctype.h`, `stdlib.h` (`strtol`, `strtof`, `qsort`, `rand`), `math.h` and `snprintf` (`%d %i %u %x %X %o %c %s %p %f %%`, no `%e` and `%g`). `pow`, `exp` and `log` are missing.
* **Function pointers** work, also in tables.

## Bigger plugins

`odf-build` compiles the `.c` files you list on the command line and no others. The file with the entry header goes first:

```sh
odf-build --client -Isrc -o plugins/myplugin.qvm src/main.c src/util.c src/hud.c
```

`static` functions and variables of the same name in different files do not collide; a name that is not `static` and is defined in two files does. `-I folder` adds a folder for headers, `-D` defines a macro, `-v` shows the commands.

The SDK also has libraries you use by including their header, with nothing to add to the command line: `odf_draw.h` (rectangles, outlines and text on the screen, for client plugins), `odf_json.h` (a JSON writer and reader) and `odf_http.h` (a request with a callback, for server plugins). They run inside the sandbox like the rest of the plugin.

## Where to go next

* [Examples](../examples/index.md): a speedometer, a best-time recorder, an HTTP client, with their source explained.
* [How plugins fit in](../architecture.mdx): the sandbox and the checked calls between plugin and engine.
* [Client API](../api/client.mdx) and [Server API](../api/server.mdx): every function, handler and event.
