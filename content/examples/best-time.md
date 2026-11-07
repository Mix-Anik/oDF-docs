---
title: Best time
sidebar_position: 4
---

A server plugin that announces a new best time to everybody and answers `!best` in the chat. The best time is kept in the plugin's own storage, so it survives a restart of the server.

{{source best_time.c}}

## What to notice

* **The operator decides what it may use.** The plugin names `chat` and `storage` in `ODF_PLUGIN_CAPS`; the operator has to give them: `+set sv_plugins "best_time:chat,storage"`. Without them the plugin is not loaded, and the console says which line to use.
* **Events.** [`EventSubscribe`](../api/server.mdx#eventsubscribe) asks for every event with a name. The game module raises [`player_finish`](../api/server.mdx#player_finish) when a player finishes a timed run, and the handler gets the data as an info string (`\key\value\key\value`). There is no parser in the engine for it: the plugin reads the keys it needs (`InfoValue` above).
* **Chat commands.** [`ChatCommandRegister`](../api/server.mdx#chatcommandregister) calls the handler when a player says `!best` or `!best something`. The game still shows the message in the chat like any other.
* **Messages to players.** [`SendServerCommand`](../api/server.mdx#sendservercommand) with `-1` goes to everybody and with a client number to one player. Without the `rawcmd` capability only `print`, `cp` and `chat` are allowed.
* **Players.** The event carries the slot number of the player; [`GetClientInfo`](../api/server.mdx#getclientinfo) fills an [`odfClientInfo_t`](../api/server-types.mdx#odfclientinfo_t) with the name, and returns 0 for a slot that is free now, which has to be handled: the player may have left.
* **Storage.** [`StoreWrite`](../api/server.mdx#storewrite) and [`StoreRead`](../api/server.mdx#storeread) work on files of a private folder of the plugin. There are no paths, and the size is limited (8 MB in all unless the operator says more with `storage=<size>`). `StoreRead` returns -1 when the file does not exist yet.
* **Everything runs on the main thread of the server.** A handler has a budget of instructions and must not wait for anything; for slow work, such as a request to a web service, see [HTTP and JSON](http-json.md).
* **Check what the engine refuses.** Both registrations return 0 when they fail. Returning non-zero from `OnInit` unloads the plugin instead of leaving it running without its handlers.
