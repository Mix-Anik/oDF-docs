---
title: Running plugins on a server (operators)
sidebar_label: For server operators
description: Installing server plugins, giving them capabilities, and watching what they do.
---

A server plugin reacts to what happens on your server: a finished run, a chat command, a login. This page is for the person who runs the server and decides which plugins it loads and what each may do.

## The short version

1. Put `name.qvm` into the `plugins` folder of the server's home path. Plugins are loaded from there only, never from downloaded paks.
2. Name it, and the capabilities you give it, in the cvar `sv_plugins`:

   ```
   +set sv_plugins "records:auth,chat,storage,http=api.example.com"
   ```

3. Start the server, and type `plugins` in its console to see what loaded.

## `sv_plugins`

A space separated list of `name` or `name:grants`, where `name` is the file name without `.qvm` and `grants` are the capabilities given to that plugin, separated by commas.

```
+set sv_plugins "records:auth,chat,storage,http=api.example.com  best_time:chat,storage  hello"
```

The cvar is **startup only**: set it on the command line or in a config that is executed before the server starts (`autoexec.cfg`). Changing it later from the console does nothing.

A plugin whose name is not in the list is not loaded, however many files are in the folder.

## Capabilities

A capability is a group of functions. A plugin names the ones it needs in its manifest, and the engine loads it only if you gave it all of them: when you did not, the plugin stays out and the console says which line to use if you do trust it. A plugin that calls a function of a capability it was not given is stopped.

| Capability | Gives the plugin | Restricted |
|---|---|---|
| `chat` | the `!command` chat messages of players | no |
| `storage` | files of its own in a private folder | no |
| `auth` | the login answers of players, and the right to tell the engine who is logged in | **yes** |
| `ips` | the IP addresses of players | **yes** |
| `http` | HTTP requests, only to the hosts you list | **yes** |
| `rawcmd` | any server command to clients, not only `print`, `cp` and `chat` | **yes** |

The same list, with what each function needs, is in the [Server API](api/server.mdx#capabilities). **Restricted** capabilities give power over other people's data, so they are never given unless you name them. Without a capability a plugin simply cannot do that thing: there is no other way to a file, the network or an address.

### Arguments

* `http=host` lists the hosts the plugin may make requests to, separated by `|`: `http=api.example.com|other.example.org`. A request to any other host is refused.
* `storage` gives the plugin a private folder, `plugin-data/<name>/` in the home path, of 8 MB in all and 4 MB a file. `storage=<size>` changes that: a number with `k`, `m` or `g`, from 1k to 1g (`storage=64m`), and one file may then use all of it.

## What a plugin can and cannot do to your server

A plugin runs in a [sandbox](architecture.mdx):

* it has no files, no network and no system calls of its own, only the functions of the capabilities you gave it;
* it cannot read or write memory that is not its own, or the data of the game module;
* a call has a budget of instructions (5 million for a call, 100 million for the start): a loop that never ends stops the plugin, not the server;
* a bad pointer, a division by zero or a call of a function it was not given stops that plugin and only that plugin. It is not called again until the server restarts, and the console says which plugin and why.

Everything runs on the main thread of the server, so a handler and `OnFrame` must not block. Requests to the web are made by the engine, and the answer is given to the plugin in a later frame.

Operators are responsible for the plugins they install. Read a restricted capability as trust: a plugin with `auth` decides who is logged in, one with `ips` sees where players are, one with `http` can send what it knows to the hosts you listed.

## Watching them

In the server console:

```
plugins           what was loaded, and why something is not running
plugins stats     how much time each plugin has used, per function
```

## Events and chat commands

A plugin gets the events of the server by subscribing to them. Version 1 has `player_finish` (raised by the game module when a player finishes a timed run), `auth_response`, `client_disconnect` and `map_begin`; the values of each are in the [Server API](api/server.mdx#events). Which plugin gets an event is not decided by the game: every running plugin that subscribed to it, and has the capability the event needs (`auth_response` needs `auth`).

A chat message that starts with `!` is still shown as chat, and also goes to the plugins that registered that command (`!top vq3`). Messages with control characters, a backslash, a double quote or a semicolon are not passed on, and neither are messages of bots.

## Cvars

A plugin can create cvars of its own, and can read the cvars it created and some server settings (`mapname`, `sv_hostname`, `sv_maxclients`, `sv_mapChecksum`, `g_*`, `df_*` and a few more), nothing else. A cvar can be private: then only the plugin that created it can read it, not other plugins, the game module or clients.
