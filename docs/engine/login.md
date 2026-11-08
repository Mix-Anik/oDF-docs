---
title: Player login
description: How players prove who they are with a key instead of a password, and how a server checks it.
---

Players prove who they are with an **Ed25519 key** instead of a password. Nothing secret is sent to a server: the client signs a challenge the server made up, and anyone can check the signature against the public key.

## For players

* The client creates its key the first time it is needed and keeps the seed in `odf_key.dat` in the home path (hex, one line). **Keep that file private.** If the file is damaged, the client never overwrites it.
* `auth_key` prints your **public key**. That is what you register on the records website, and it is safe to share.
* `login` and `logout` switch the login on and off. They set `cl_login` to 1 and 0, a userinfo cvar (default 1): a server only challenges clients that have it set to 1, and a client without the cvar (an old client) is never challenged.
* `cl_loginStatus` (read only) shows the result, for menus: empty, `ok <name>`, `off`, `unknown_key`, `failed <reason>`, `unavailable`.

## How it works

```
server -> client   auth_challenge <64 hex>             a random nonce, sent when the client enters the world
client -> server   auth_response <pubkey hex> <signature hex> <server address>
server -> client   auth_state ok <account> | off | unknown_key | failed <reason> | unavailable
```

1. The server sends a random 32 byte challenge (the nonce) when the client enters the world.
2. The client signs `"authv1" || nonce || server address`, where the address is the resolved `ip:port` it connected to, and sends back its public key and the signature.
3. The server does not check the signature itself. It raises the `auth_response` event, and the **plugin that was given the `auth` capability** verifies it with the records service and tells the engine the answer with `AuthResult`.
4. The engine tells the client the result (`auth_state`), and keeps the account of the player until they disconnect. Plugins read it with `GetClientInfo`.

Because the server address is part of what is signed, a rogue server cannot reuse a signature it got from a player on another server. The account is kept on the client until it disconnects or sets `cl_login 0`.

The three messages are handled by the engine and never reach the cgame.

## For plugin authors and operators

* The `auth` capability is **restricted**: a server plugin only gets the signatures, and may only answer logins, when the operator names it explicitly in `sv_plugins`. See the [operator guide](../plugins/operators.md).
* The event `auth_response` has the values `client`, `serial` (the slot and its connection counter, which you hand back to `AuthResult`), `nonce`, `pubkey`, `sig`, `addr` and, with the capability `ips`, `ip`. See [events](../plugins/api/server.mdx#events).
* [`AuthResult`](../plugins/api/server.mdx#authresult) answers with one of `ODF_AUTHRES_OK`, `ODF_AUTHRES_UNKNOWN_KEY`, `ODF_AUTHRES_REJECTED` or `ODF_AUTHRES_UNAVAILABLE`.
