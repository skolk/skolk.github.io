# banjo

The practice page (`_backend/practice.html`) as a local app. A small Python server
serves the page and keeps the record as plain files, so a cleared browser, a new
browser or a new Mac loses nothing.

## Use it

Open `http://localhost:4100` and bookmark it. The copy opened from disk still works,
and in Chrome it saves to the same files while the server runs.

## What it keeps

- `~/banjo/log.json`: every session you have logged
- `~/banjo/tunes.json`: tunes you have written or edited
- `~/banjo/goal.json`: the five, and the dates
- `~/banjo/backups/`: the previous copy of each file, one per day
- `~/banjo/server.log`: the server's errors, if any

The page still keeps a copy in the browser. With the server down it says
"browser only" on the board and carries on; the next time the server is up, anything
logged in the meantime joins the files.

The first time a browser reaches the server, everything that browser holds joins the
files. So the log you already have comes across by opening the page once the way you
always have. If that browser cannot reach the server (Safari may refuse a file page
talking to localhost), use Export JSON on the Log tab there and Import here.

## Install, remove, test

```
./_backend/banjo/install.sh               # LaunchAgent com.seankolk.banjo, starts at login
./_backend/banjo/install.sh --uninstall   # stops it; the files in ~/banjo stay
python3 _backend/banjo/test_server.py     # the installer runs these first
```

`BANJO_DIR` and `BANJO_PORT` change where the files live and the port (default
`~/banjo` and 4100).

The server reads `practice.html` from this repo on every request, so edits show on a
reload. It needs the repo on a branch that has the page: on `master`, before this is
merged, it answers with a note saying so.
