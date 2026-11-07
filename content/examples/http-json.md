---
title: HTTP and JSON
sidebar_position: 5
---

A server plugin that fetches a JSON document when it starts and prints one field of it.

{{source hello_http.c}}

## What to notice

* **`http` is a restricted capability.** The operator names it and the hosts the plugin may talk to: `+set sv_plugins "hello_http:http=api.example.com"`. A request to any other host is refused. Several hosts are separated by `|`.
* **The engine makes the request, never the plugin.** The sandbox has no network. The plugin asks with [`HttpRequest`](../api/server.mdx#httprequest) (here through the library's `Http_Get`), nothing blocks, and a later frame calls the handler with the status and the answer, which the plugin reads with [`HttpBody`](../api/server.mdx#httpbody).
* **The libraries are added for you.** The plugin includes `odf_http.h` and `odf_json.h`; `odf-build` sees that and adds `odf_http.c` and `odf_json.c` to the program. There is nothing to list on the command line, and a plugin that includes none of them gets none.
* **JSON is parsed inside the sandbox.** `Json_Find( body, "server.name" )` reads a value by its path. The engine never parses what a server answers, so a malicious answer can at worst stop this plugin.
* **Clean up in `OnShutdown`.** `Http_Shutdown` frees what `Http_Init` set up.
