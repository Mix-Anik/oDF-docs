---
title: Speedometer
sidebar_position: 2
---

A client plugin that draws the horizontal speed of the watched player under the crosshair. It has two cvars: `speedo_draw` (0 or 1) and `speedo_y` (the height of the number).

{{source speedometer.c}}

## What to notice

* **Capabilities.** It reads the game (`world`) and draws (`draw`), and says so in `ODF_PLUGIN_CAPS`. A client plugin is given all of them; a server operator would have to name them.
* **Cvars of a plugin.** [`CvarRegister`](../api/client.mdx#cvarregister) creates a cvar if it does not exist and keeps the value from the config file or command line when it does. [`CvarInteger`](../api/client.mdx#cvarinteger) and [`CvarValue`](../api/client.mdx#cvarvalue) read it. A plugin can read the cvars it made and the game's `cg_*`, `r_*`, `df_*` and `m_*`, nothing else.
* **Shaders are registered in `OnMapLoad`.** `Draw_MapLoad` of the drawing helpers (`odf_draw.h`, added to the program by `odf-build`) registers the font there; [`RegisterShader`](../api/client.mdx#registershader) only works from that call on.
* **Two drawing phases.** [`OnDraw2D`](../api/client.mdx#ondraw2d) is called right after the 3D scene (`ODFC_DRAW2D_SCENE`, below the game's HUD) and after the game drew its HUD (`ODFC_DRAW2D_FRAME`, on top). The number is drawn in the second.
* **The screen size comes from the 3D view.** [`OnDraw2D`](../api/client.mdx#ondraw2d) is not told it; [`OnDraw3D`](../api/client.mdx#ondraw3d) gets an [`odfcView_t`](../api/client-types.mdx#odfcview_t) with `screenWidth` and `screenHeight`, so the plugin keeps them.
* **The state of the game is a copy.** [`GetPlayerState`](../api/client.mdx#getplayerstate) fills an [`odfcPlayerState_t`](../api/client-types.mdx#odfcplayerstate_t) and [`GetMoveState`](../api/client.mdx#getmovestate) an [`odfcMoveState_t`](../api/client-types.mdx#odfcmovestate_t). They return 0 when there is no game, or when the game module does not publish its prediction (the oDFs one does). Check it, and do not draw.
* **Do not draw a view that is not the player's.** `viewFlags` says when the scoreboard is up (`ODFC_VIEW_SCOREBOARD`) or the camera is a replay or chase camera (`ODFC_VIEW_NOT_FIRST_PERSON`).
* **Math from the engine.** There is no `sqrt` in the C library of a plugin; [`Sqrt`](../api/client.mdx#sqrt) is an engine function (and much faster than a loop in the plugin).
