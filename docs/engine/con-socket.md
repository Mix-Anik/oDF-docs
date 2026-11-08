---
title: Console socket
description: Read the console of oDFe and send it commands from another program, over a local TCP socket.
---

The console socket lets another program on the same machine read everything the engine prints to its console, and type commands into it. It works for the client and for a dedicated server. Typical uses are a log viewer, a script that drives a test server, or an editor that sends `devmap` and `exec` to a running game.

## Security: read this first

* It is **off by default**. You turn it on yourself, when you need it (see [Settings](#settings)).
* The socket listens on **127.0.0.1 only**, so players and other machines cannot connect to it.
* There is **no password**. Any program on that machine, of any user, that connects can run **any console command** the engine can run, as if typed at the console.
* A **web page** open in a browser on that machine can reach it too: the browser can send a request to `http://127.0.0.1:<port>` with commands in its body, and each line of it is run. So do not leave it on while the engine is open and you browse, and never on a machine that other people use.

Turn it on for the time you use it, and off again afterwards.

## Using it

The protocol is plain text over TCP. Connect, and everything printed to the console from then on arrives as text. Send a command followed by a newline (`\n` or `\r\n`) and it is run.

```sh
# Linux, macOS, MSYS2: type commands, see the output
nc 127.0.0.1 9999
```

```python
# Python: send one command and print what comes back for a second
import socket, time

s = socket.create_connection(("127.0.0.1", 9999))
s.sendall(b"status\n")
s.settimeout(1.0)
end = time.time() + 1.0
while time.time() < end:
    try:
        data = s.recv(4096)
    except socket.timeout:
        break
    if not data:
        break
    print(data.decode("utf-8", "replace"), end="")
```

When a program connects, the console of the engine prints `Console client connected from 127.0.0.1`.

## What goes through the socket

* **Output**: everything the engine prints to its console while a client is connected, and nothing from before: there is no history. It is sent as it is printed, with the colour codes (`^1`, ...) left in.
* **Input**: a line is executed as a command, in the order lines arrive. A line longer than 1023 characters is cut. An empty line is ignored.
* **Several clients**: up to 8 connections at once. All of them get all of the output, and the commands of all of them go to the same console. A ninth connection is closed at once.
* **A dropped connection** is noticed and the slot is freed. The socket uses TCP keep-alive, so a firewall that closes idle connections does not cut it.
* **`rcon` output** is not forwarded: what an `rcon` command prints goes back to the player that sent it.

## Settings

| Cvar or command | Default | |
|---|---|---|
| `con_socket_enabled` | `0` | switches the socket on and off. Saved in the config, so once you set it to 1 it stays on until you set it back. |
| `con_socket_port` | `9999` | the TCP port, 1024 to 65535. A value outside that range gives a warning and the default is used. Saved in the config. |
| `con_socket_restart` | | closes the socket and opens it again. Use it after changing the two cvars above while the engine runs; they are only read when the socket starts. |

**To turn it on** while the engine runs, type `con_socket_enabled 1` and then `con_socket_restart`. To turn it off, `con_socket_enabled 0` and `con_socket_restart`.

When enabled, the socket opens at the end of the engine's start, and prints `Console socket listening on 127.0.0.1:<port>` when it does. If the port is already used (a second copy of the engine, say), nothing is printed and no socket opens: change `con_socket_port` for one of them.
