---
title: Hello, client
sidebar_position: 1
---

A client plugin that adds the console command `hello`. Type `hello World` in the console and it answers.

{{source hello.c}}

## What to notice

* **The manifest** is three macros before the entry header: `ODF_PLUGIN_VERSION` (required), `ODF_PLUGIN_DESCRIPTION` and, for a plugin that needs capabilities, `ODF_PLUGIN_CAPS` (not used here: a console command needs the `command` capability, which a client plugin always has).
* **`EXPORTS( X )`** lists the functions of the plugin that the engine may call. Here only [`OnInit`](../api/client.mdx#oninit); leave out the ones you do not need.
* **The entry header comes first.** It defines `vmMain`, the one function the engine calls, and has to be before the first function of the program.
* **A handler** is how a plugin asks to be called later. [`CommandRegister`](../api/client.mdx#commandregister) takes the name of the command and a function of the plugin with the shape of [`CommandHandler`](../api/client.mdx#commandhandler): the words of the command line like `main( argc, argv )`.
* **`OnInit` returns 0 for success.** Anything else and the plugin is not loaded, which is the way to give up when something it needs is not there.
* **The engine functions** [`Print`](../api/client.mdx#print) and [`Milliseconds`](../api/client.mdx#milliseconds) are called by their plain names. There is no C library of the system in a plugin; `snprintf` and the rest come from the small library of the SDK.
