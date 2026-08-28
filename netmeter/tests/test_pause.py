#!/usr/bin/env python3
"""Sandboxed checks for netmeter's freeze bookkeeping.

Safety rules, in force for every check in this file:
  * HOME is a fresh temp dir, set BEFORE the engine is imported, because
    STATE_DIR binds at import time. Nothing here touches the real ~/.netmeter.
  * `notify` is stubbed. No notification ever leaves this file.
  * No real process is ever signalled: `signal_pids` is stubbed to record what
    it was asked to do, and every app name used is one nothing can match. The
    harness must be safe to run on the live machine while the daemon is up.

Run: python3 tests/test_pause.py
"""

import json
import importlib.machinery
import importlib.util
import os
import signal
import sys
import tempfile
import threading
import time

os.environ["HOME"] = tempfile.mkdtemp(prefix="netmeter-test-")
ENGINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "netmeter")

loader = importlib.machinery.SourceFileLoader("nm", ENGINE)
spec = importlib.util.spec_from_loader("nm", loader)
nm = importlib.util.module_from_spec(spec)
loader.exec_module(nm)

NOTES = []
nm.notify = lambda text: NOTES.append(text)
# Stubbed per test rather than read from the machine: whether a daemon happens
# to be running on the laptop this runs on must not decide what the tests see.
nm.daemon_running = lambda: False

SENT = []                      # (sorted pids, signal)
nm.signal_pids = lambda pids, sig: (SENT.append((sorted(pids), sig)) or sorted(pids))

PROCS = {}                     # pid -> (state, started_epoch)
nm.proc_info = lambda pids: {p: PROCS[p] for p in pids if p in PROCS}

PIDS = {}                      # app -> [pid]
nm.app_pids = lambda name: list(PIDS.get(nm.canonical(name), []))

PASS = 0


def check(label, cond):
    global PASS
    if cond:
        PASS += 1
        print(f"ok: {label}")
    else:
        print(f"FAIL: {label}")
        sys.exit(1)


def reset():
    SENT.clear()
    NOTES.clear()
    PROCS.clear()
    PIDS.clear()
    nm.save_json(nm.PAUSED_PATH, {})
    nm.save_json(nm.THROTTLED_PATH, {})
    nm.save_json(nm.RAMP_PATH, {})
    nm.daemon_running = lambda: False
    nm.update_config(pause_all=False, pause_all_hard=False, pause_all_allow=[],
                     lowdata=False, lowdata_apps=[], lowdata_background=True,
                     drain_cap_mb=0, throttle_period=4.0, config_version=2)


# --- the matching bug: a label must sit on a path boundary ------------------

def matches(label, command):
    import re
    return re.search(nm.app_pattern(label), command) is not None


reset()
check("Signal matches Signal.app",
      matches("Signal", "/Applications/Signal.app/Contents/MacOS/Signal"))
check("Signal matches its helpers",
      matches("Signal", "/Applications/Signal.app/Contents/Frameworks/"
                        "Signal Helper.app/Contents/MacOS/Signal Helper --type=x"))
check("Signal does NOT match WiFi Signal (the 2026-08-28 bug)",
      not matches("Signal", "/Applications/WiFi Signal.app/Contents/MacOS/WiFi Signal"))
check("Cursor matches Cursor.app",
      matches("Cursor", "/Applications/Cursor.app/Contents/MacOS/Cursor"))
check("Cursor matches a bare helper argv",
      matches("Cursor", "Cursor Helper (Plugin): extension-host"))
check("Cursor does NOT match Apple's CursorUIViewService",
      not matches("Cursor", "/System/Library/PrivateFrameworks/TextInputUIMacHelper"
                            ".framework/XPCServices/CursorUIViewService.xpc/Contents/"
                            "MacOS/CursorUIViewService"))
check("Chrome matches its crashpad handler",
      matches("Google Chrome", "/Applications/Google Chrome.app/Contents/Frameworks/"
                               "Google Chrome Framework.framework/Helpers/"
                               "chrome_crashpad_handler"))
check("a label with parentheses is escaped, not read as a group",
      matches("networkserviceproxy (Apple relay)",
              "/usr/libexec/networkserviceproxy (Apple relay)"))

# --- paused.json shapes -----------------------------------------------------

reset()
nm.set_paused("Wisp", True, "cap", [101, 102])
e = nm.read_paused()["Wisp"]
check("set_paused records reason, pids and a timestamp",
      e["reason"] == "cap" and e["pids"] == [101, 102] and e["at"] > 0)

nm.save_json(nm.PAUSED_PATH, {"Wisp": "manual", "Older": True})
p = nm.read_paused()
check("a bare reason string still reads", p["Wisp"] == {"reason": "manual",
                                                        "pids": [], "at": 0.0})
check("a bare true still reads as paused", p["Older"]["reason"] == "manual")

# --- reconcile: the four cases ---------------------------------------------

reset()
nm.set_paused("Gone", True, "manual", [201])
nm.reconcile_paused()
check("an app with no processes left is forgotten", "Gone" not in nm.read_paused())

reset()
PROCS[301] = ("T", 1000.0)
PIDS["Held"] = [301]
nm.update_config(lowdata=True, lowdata_apps=["Held"])
nm.set_paused("Held", True, "lowdata", [301])
nm.reconcile_paused()
check("a mode that still holds keeps its entry", "Held" in nm.read_paused())

reset()
PROCS[302] = ("S", 1000.0)
PROCS[303] = ("S", 1000.0)
PIDS["Freed"] = [302, 303]
nm.set_paused("Freed", True, "manual", [302, 303])
nm.reconcile_paused()
check("an entry nothing is stopping is forgotten", "Freed" not in nm.read_paused())

reset()
PROCS[401] = ("T", 1000.0)          # the leftover, older than the freeze
PROCS[402] = ("S", 9000.0)          # the relaunched app, younger
PIDS["Back"] = [401, 402]
nm.set_paused("Back", True, "cap", [401])
nm.save_json(nm.PAUSED_PATH, {"Back": {"reason": "cap", "pids": [401], "at": 5000.0}})
nm.reconcile_paused()
check("a relaunched app frees its orphaned leftovers",
      ([401], signal.SIGCONT) in SENT)
check("and stops claiming to be paused", "Back" not in nm.read_paused())

reset()
PROCS[501] = ("T", 1000.0)
PROCS[502] = ("S", 1000.0)          # was there all along, we missed it
PIDS["Half"] = [501, 502]
nm.save_json(nm.PAUSED_PATH, {"Half": {"reason": "manual", "pids": [501], "at": 5000.0}})
nm.reconcile_paused()
check("a process the freeze missed gets frozen", ([502], signal.SIGSTOP) in SENT)
check("and the entry survives", "Half" in nm.read_paused())

reset()
PROCS[601] = ("T", 1000.0)
PROCS[602] = ("S", 9000.0)
PIDS["Legacy"] = [601, 602]
nm.save_json(nm.PAUSED_PATH, {"Legacy": "cap"})    # no pids, no timestamp
nm.reconcile_paused()
check("a legacy entry with both states resolves as a relaunch",
      ([601], signal.SIGCONT) in SENT and "Legacy" not in nm.read_paused())

# --- pause-all mode ---------------------------------------------------------

reset()
PIDS.update({"Alpha": [701], "Beta": [702], "mDNSResponder": [703]})
cfg = nm.update_config(pause_all=True, pause_all_hard=True, pause_all_allow=[])
frozen = nm.pause_all_apply(cfg, ["Alpha", "Beta", "mDNSResponder"])
check("hard pause-all freezes what it can", sorted(frozen) == ["Alpha", "Beta"])
check("pause-all spares the never-freeze list", "mDNSResponder" not in frozen)
check("pause-all records its reason",
      nm.read_paused()["Alpha"]["reason"] == "all")

nm.resume("Alpha")
cfg = nm.load_config()
check("resuming under pause-all adds to the allow list",
      cfg["pause_all_allow"] == ["Alpha"])
frozen = nm.pause_all_apply(cfg, ["Alpha", "Beta"])
check("and the next tick leaves it alone", frozen == [])

nm.pause("Alpha")
check("pausing it again takes it back off the allow list",
      nm.load_config()["pause_all_allow"] == [])

reset()
nm.update_config(pause_all=True, pause_all_allow=["Alpha"])
PIDS["Beta"] = [702]
PROCS[702] = ("T", 1000.0)
nm.set_paused("Beta", True, "all", [702])
nm.resume_all()
check("resume-all lifts the mode", nm.load_config()["pause_all"] is False)
check("and empties paused.json", nm.read_paused() == {})

reset()
nm.update_config(pause_all=True, pause_all_hard=True, pause_all_allow=["Alpha"])
check("mode_holds keeps a frozen app frozen",
      nm.mode_holds(nm.load_config(), "Beta", "all"))
check("mode_holds lets an allowed app go",
      not nm.mode_holds(nm.load_config(), "Alpha", "all"))
check("cap and manual never hold",
      not nm.mode_holds(nm.load_config(), "Beta", "cap")
      and not nm.mode_holds(nm.load_config(), "Beta", "manual"))

# --- the allow list persists across off and on ------------------------------

reset()
nm.update_config(pause_all=True, pause_all_allow=["Alpha", "Beta"])
nm.pause_all("off")
check("turning Pause All off keeps the allow list",
      nm.load_config()["pause_all_allow"] == ["Alpha", "Beta"])
check("and the mode is off", nm.load_config()["pause_all"] is False)
nm.pause_all("on")
cfg = nm.load_config()
check("turning it back on restores the same exceptions",
      cfg["pause_all"] and cfg["pause_all_allow"] == ["Alpha", "Beta"])
nm.pause_all("clear")
check("clear is the deliberate way to throw it away",
      nm.load_config()["pause_all_allow"] == [])

reset()
nm.update_config(pause_all=True, pause_all_allow=["Alpha"])
PROCS[801] = ("T", 1000.0)
nm.set_paused("Beta", True, "all", [801])
nm.resume_all()
check("resume-all keeps the allow list too",
      nm.load_config()["pause_all_allow"] == ["Alpha"])

# --- nothing is exempt but the system floor --------------------------------

reset()
PIDS.update({"Claude Code": [901], "Cursor": [902], "WindowServer": [903]})
cfg = nm.update_config(pause_all=True, pause_all_hard=True, pause_all_allow=[])
frozen = nm.pause_all_apply(cfg, ["Claude Code", "Cursor", "WindowServer"])
check("Pause All freezes Claude Code like anything else",
      "Claude Code" in frozen)
check("and Cursor", "Cursor" in frozen)
check("and still refuses the system floor", "WindowServer" not in frozen)

# --- the solo migration -----------------------------------------------------

reset()
nm.save_json(nm.CONFIG_PATH, {"solo": True, "solo_app": "Google Chrome",
                              "lowdata": False})
nm.save_json(nm.NETWORKS_PATH, {"aa:bb": {"settings": {"solo": True,
                                                       "solo_app": "Ollama",
                                                       "lowdata": True}}})
nm.save_json(nm.PROFILE_PATH, {"mac": "aa:bb", "name": "",
                               "applied": {"solo": True, "lowdata": True},
                               "saved": {"solo": False, "lowdata": False}})
PROCS[1001] = ("T", 1000.0)
nm.save_json(nm.PAUSED_PATH, {"Cursor": {"reason": "solo", "pids": [1001],
                                         "at": 5000.0}})
nm.migrate_state()
cfg = nm.load_config()
check("a soloed config becomes Pause All", cfg["pause_all"] is True)
check("and the soloed app becomes the one exception",
      cfg["pause_all_allow"] == ["Google Chrome"])
check("solo keys are gone from config", "solo" not in nm.read_json(nm.CONFIG_PATH))
check("the migration stamps a version", cfg["config_version"] == 2)
net = nm.read_json(nm.NETWORKS_PATH)["aa:bb"]["settings"]
check("a remembered network migrates too",
      net["pause_all"] is True and net["pause_all_allow"] == ["Ollama"])
check("and drops its solo keys", "solo" not in net and "solo_app" not in net)
stint = nm.read_json(nm.PROFILE_PATH)
check("the live stint drops solo from its overlay",
      "solo" not in stint["applied"] and "solo" not in stint["saved"])
check("and keeps the rest of it", stint["applied"]["lowdata"] is True)
check("a freeze solo owned becomes one Pause All owns",
      nm.read_paused()["Cursor"]["reason"] == "all")
nm.migrate_state()
check("migrating twice changes nothing",
      nm.load_config()["pause_all_allow"] == ["Google Chrome"])

reset()
nm.save_json(nm.CONFIG_PATH, {"solo": False, "solo_app": "Ollama"})
PROCS[1002] = ("T", 1000.0)
nm.save_json(nm.PAUSED_PATH, {"Beta": {"reason": "solo", "pids": [1002],
                                       "at": 5000.0}})
SENT.clear()
nm.migrate_state()
check("solo off migrates to Pause All off",
      nm.load_config()["pause_all"] is False)
check("and a freeze whose owner retired is lifted, not orphaned",
      ([1002], signal.SIGCONT) in SENT and nm.read_paused() == {})

# --- the ramp ---------------------------------------------------------------
# A pause is a landing, not a wall: 25% of the duty cycle, then 5%, then a
# freeze once the app has gone quiet, with a deadline for one that never does.

reset()
nm.daemon_running = lambda: True
PIDS["Wisp"] = [1101]
cfg = nm.load_config()
nm.pause("Wisp", quiet=True)
check("pausing starts a ramp instead of freezing",
      "Wisp" in nm.read_ramping() and nm.read_paused() == {})
check("and nothing has been stopped yet",
      not any(sig == signal.SIGSTOP for _, sig in SENT))
check("the first step is 25%", nm.read_throttled()["Wisp"]["pct"] == 25)

# halfway: the second step
nm.save_json(nm.RAMP_PATH, {"Wisp": {"reason": "manual",
                                     "started": time.time() - 5}})
nm.ramp_step(cfg, {"Wisp": 10 ** 7})
check("halfway down it drops to 5%", nm.read_throttled()["Wisp"]["pct"] == 5)
check("and it is still not frozen", nm.read_paused() == {})

# past the span, still busy: the ramp waits
nm.save_json(nm.RAMP_PATH, {"Wisp": {"reason": "manual",
                                     "started": time.time() - 9}})
nm.ramp_step(cfg, {"Wisp": 10 ** 7})
check("a busy app is not cut off mid-transfer", nm.read_paused() == {})
check("and stays on the ramp", "Wisp" in nm.read_ramping())

# past the span and quiet: freeze
frozen = nm.ramp_step(cfg, {"Wisp": 1000})
check("once quiet, it freezes", frozen == [("Wisp", "froze")])
check("the freeze keeps the reason it started with",
      nm.read_paused()["Wisp"]["reason"] == "manual")
check("and the ramp's throttle is lifted", "Wisp" not in nm.read_throttled())
check("and the ramp entry is gone", nm.read_ramping() == {})

# a busy app still gets frozen at the deadline
reset()
nm.daemon_running = lambda: True
PIDS["Hog"] = [1102]
nm.save_json(nm.RAMP_PATH, {"Hog": {"reason": "all",
                                    "started": time.time() - 31}})
frozen = nm.ramp_step(nm.load_config(), {"Hog": 10 ** 8})
check("an app that never goes quiet is frozen at the deadline",
      frozen == [("Hog", "froze")] and nm.read_paused()["Hog"]["reason"] == "all")

# resume catches an app on the way down
reset()
nm.daemon_running = lambda: True
PIDS["Wisp"] = [1103]
nm.pause("Wisp", quiet=True)
nm.resume("Wisp")
check("resuming cancels a ramp in progress", nm.read_ramping() == {})
check("and lifts the ramp's throttle", nm.read_throttled() == {})
check("and the next tick does not freeze it",
      nm.ramp_step(nm.load_config(), {}) == [])

# resume-all clears ramps too
reset()
nm.daemon_running = lambda: True
PIDS["Wisp"] = [1104]
nm.pause("Wisp", quiet=True)
nm.resume_all()
check("resume-all clears the ramps", nm.read_ramping() == {})

# pause-all ramps rather than freezing
reset()
nm.daemon_running = lambda: True
PIDS.update({"Alpha": [1105], "Beta": [1106]})
cfg = nm.update_config(pause_all=True, pause_all_hard=True, pause_all_allow=[])
started = nm.pause_all_apply(cfg, ["Alpha", "Beta"])
check("pause-all starts ramps", sorted(started) == ["Alpha", "Beta"])
check("and freezes nothing yet", nm.read_paused() == {})
check("and does not restart a ramp already running",
      nm.pause_all_apply(cfg, ["Alpha", "Beta"]) == [])

# with no daemon there is nothing to step a ramp, so the freeze stays immediate
reset()
nm.daemon_running = lambda: False
PIDS["Wisp"] = [1107]
PROCS[1107] = ("S", 1000.0)
nm.pause("Wisp", quiet=True)
check("with no daemon a pause freezes immediately",
      nm.read_ramping() == {} and "Wisp" in nm.read_paused())

# the burst cap never ramps: it is the hard stop
reset()
nm.daemon_running = lambda: True
PIDS["Hog"] = [1108]
frozen = nm.burst_cap_check({"Hog": [60 * 10 ** 6, 0]}, 50, set())
check("the burst cap freezes on the spot, no ramp",
      frozen and frozen[0][0] == "Hog" and nm.read_ramping() == {})
check("and records itself as the cap",
      nm.read_paused()["Hog"]["reason"] == "cap")

# --- low data stops the background downloaders -----------------------------

reset()
PIDS.update({"softwareupdated": [1201], "nsurlsessiond": [1202],
             "cloudd": [1203], "Cursor": [1204]})
cfg = nm.load_config()
frozen = nm.background_freeze(cfg)
check("low data stops the update daemons",
      "softwareupdated" in frozen and "nsurlsessiond" in frozen)
check("and iCloud sync", "cloudd" in frozen)
check("and leaves ordinary apps alone", "Cursor" not in frozen)
check("the freeze is low data's, so `lowdata off` lifts it",
      nm.read_paused()["cloudd"]["reason"] == "lowdata")
check("a second pass does not re-freeze what is already down",
      nm.background_freeze(cfg) == [])
nm.background_lift()
check("lifting clears them all", nm.read_paused() == {})

reset()
nm.update_config(lowdata_background=False)
check("and the whole thing is switchable off",
      nm.background_freeze(nm.load_config()) == [])

check("the downloaders are out of the never-freeze floor",
      not (nm.BACKGROUND_DOWNLOADS & nm.NEVER_FREEZE))
check("but TLS and DNS are still in it",
      {"trustd", "mDNSResponder", "WindowServer"} <= nm.NEVER_FREEZE)

# --- the sustained drain ----------------------------------------------------

reset()
PIDS["Seep"] = [1301]
nm.update_config(drain_cap_mb=100, drain_window_min=5)
minute = int(time.time() // 60)
with open(nm.RECENT_PATH, "w") as f:
    for m in range(minute - 4, minute + 1):
        f.write(json.dumps({"m": m, "a": {"Seep": [25 * 10 ** 6, 0]}}) + "\n")
drained = {}
hits = nm.drain_check(nm.load_config(), drained, minute)
check("a slow bleed over the window is caught",
      hits and hits[0][0] == "Seep")
check("and recorded as a cap freeze",
      nm.read_paused()["Seep"]["reason"] == "cap")
check("one bleed is one freeze, not one a minute",
      nm.drain_check(nm.load_config(), drained, minute + 1) == [])

reset()
nm.update_config(drain_cap_mb=0)
check("the drain cap is off unless you arm it",
      nm.drain_check(nm.load_config(), {}, minute) == [])

# --- the tether link warning ------------------------------------------------

reset()
nm.save_json(nm.NETWORKS_PATH, {"aa:bb": {"last_seen": "2026-08-28"}})
t = {"period_start": "2026-08-04", "in": 0, "out": 0, "notified_pct": 0}
cfg = nm.load_config()
check("a linked MAC nothing has seen is called out",
      "never seen" in nm.tether_link_warning(cfg, ["cc:dd"], t, False))
check("a period that counted nothing is called out",
      "nothing counted" in nm.tether_link_warning(cfg, ["aa:bb"], t, False))
check("the warning stays short enough not to widen the menu",
      max(len(nm.tether_link_warning(cfg, m, t, False)) for m in (["cc:dd"], ["aa:bb"])) <= 60)
check("no warning while actually on the tether",
      nm.tether_link_warning(cfg, ["cc:dd"], t, True) == "")
t2 = {"period_start": "2026-08-04", "in": 5, "out": 5, "notified_pct": 0}
check("no warning once bytes are counted",
      nm.tether_link_warning(cfg, ["aa:bb"], t2, False) == "")

# --- the error log ----------------------------------------------------------

# --- Pause All has two stages (2026-08-28) ---------------------------------
# The single-stage mode froze the editor it was pressed from. Soft holds every
# app at PAUSE_ALL_FLOOR% and stays there; Hard Stop is the second press.

reset()
PIDS.update({"Alpha": [1301], "Beta": [1302]})
cfg = nm.update_config(pause_all=True, pause_all_allow=[])
started = nm.pause_all_apply(cfg, ["Alpha", "Beta"])
check("soft pause-all takes hold of both apps", sorted(started) == ["Alpha", "Beta"])
check("and freezes neither of them", nm.read_paused() == {})
check("it parks them at the floor",
      nm.read_throttled()["Alpha"]["pct"] == nm.PAUSE_ALL_FLOOR
      and nm.read_throttled()["Beta"]["reason"] == "all")
check("and a second pass leaves an app already parked alone",
      nm.pause_all_apply(nm.load_config(), ["Alpha", "Beta"]) == [])
check("soft pause-all never holds a freeze",
      not nm.mode_holds(nm.load_config(), "Alpha", "all"))

# the soft ramp lands on the hold rather than the wall
reset()
nm.daemon_running = lambda: True
PIDS.update({"Alpha": [1303]})
cfg = nm.update_config(pause_all=True, pause_all_allow=[])
nm.pause_all_apply(cfg, ["Alpha"])
check("a soft ramp records where it is going",
      nm.read_ramping()["Alpha"]["land"] is False)
nm.save_json(nm.RAMP_PATH, {"Alpha": {"reason": "all", "started": 0.0,
                                      "land": False}})
landed = nm.ramp_step(nm.load_config(), {})
check("and lands on the hold, not a freeze", landed == [("Alpha", "holding")])
check("nothing was stopped", nm.read_paused() == {})
check("the hold is the mode's now, not the ramp's",
      nm.read_throttled()["Alpha"] == {"pct": nm.PAUSE_ALL_FLOOR, "reason": "all"})

# a hard ramp still lands on the freeze
reset()
nm.daemon_running = lambda: True
PIDS["Alpha"] = [1304]
nm.save_json(nm.RAMP_PATH, {"Alpha": {"reason": "all", "started": 0.0,
                                      "land": True}})
check("a hard ramp still freezes",
      nm.ramp_step(nm.load_config(), {}) == [("Alpha", "froze")]
      and "Alpha" in nm.read_paused())

# the second press, and the way back
reset()
PIDS.update({"Alpha": [1305], "Beta": [1306]})
nm.update_config(pause_all=True, pause_all_allow=["Beta"])
nm.set_throttled("Alpha", nm.PAUSE_ALL_FLOOR, "all")
nm.pause_all("hard")
check("Hard Stop freezes what the hold was holding",
      nm.read_paused()["Alpha"]["reason"] == "all")
check("and still lets the allow list through", "Beta" not in nm.read_paused())
check("and drops the throttle it replaced", "Alpha" not in nm.read_throttled())
check("now the mode does hold a freeze",
      nm.mode_holds(nm.load_config(), "Alpha", "all"))
nm.pause_all("soft")
check("soft puts it back on the hold",
      nm.read_paused() == {}
      and nm.read_throttled()["Alpha"]["pct"] == nm.PAUSE_ALL_FLOOR)
check("and Pause All is still on", nm.load_config()["pause_all"] is True)

# lifting the mode lifts its throttles, not only its freezes
reset()
PIDS["Alpha"] = [1307]
nm.update_config(pause_all=True, pause_all_allow=[])
nm.set_throttled("Alpha", nm.PAUSE_ALL_FLOOR, "all")
nm.set_throttled("Gamma", 25, "manual")
nm.pause_all("off")
check("pause-all off lifts the mode's hold", "Alpha" not in nm.read_throttled())
check("and leaves a throttle set by hand alone", "Gamma" in nm.read_throttled())
check("and the mode is off",
      nm.load_config()["pause_all"] is False
      and nm.load_config()["pause_all_hard"] is False)

reset()
nm.update_config(pause_all=True, pause_all_hard=True)
nm.set_throttled("Alpha", nm.PAUSE_ALL_FLOOR, "all")
nm.resume_all()
check("resume-all empties the throttles too", nm.read_throttled() == {})
check("and clears the hard stage",
      nm.load_config()["pause_all_hard"] is False)

# --- reading `ps` -----------------------------------------------------------
# The parse the sweep stands on. A command line holds spaces, so the split has
# to stop counting fields at the tty; a tty of `??` is what "no shell owns
# this" looks like.

class _PS:
    def __init__(self, out): self.stdout = out

real_run = nm.subprocess.run
nm.subprocess.run = lambda *a, **k: _PS(
    "  501 T    ??       /Applications/Cursor.app/Contents/MacOS/Cursor --type=x\n"
    "  502 T    s002     node /path/to/thing --flag\n"
    "  503 S    ??       /usr/libexec/awake\n"
    "  504 T+   ttys010  npm exec @playwright/mcp@latest\n"
    "garbage line\n")
try:
    procs = nm.stopped_procs()
    check("only the stopped processes come back", sorted(procs) == [501, 502, 504])
    check("a command line with spaces survives the split",
          procs[501][1] == "/Applications/Cursor.app/Contents/MacOS/Cursor --type=x")
    check("no terminal reads as ??", procs[501][0] == "??")
    check("a terminal is carried through", procs[502][0] == "s002")
    check("a T+ (foreground, stopped) job still counts as stopped",
          procs[504][0] == "ttys010")
finally:
    nm.subprocess.run = real_run

# --- the orphan sweep -------------------------------------------------------
# What would have caught 2026-08-28: 35 processes stopped, paused.json empty,
# and nothing anywhere that could look from `ps` back to the bookkeeping.

reset()
real_stopped, real_load = nm.stopped_procs, nm.load
nm.stopped_procs = lambda: {
    2001: ("??", "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin)"),
    2002: ("??", "/usr/libexec/nsurlsessiond"),
    2003: ("??", "/System/Library/.../mDNSResponder"),
    2004: ("??", "/Applications/Beta.app/Contents/MacOS/Beta"),
    2005: ("??", "/opt/unrelated/Zephyr"),
    # The 2026-08-28 loop: a node inside a Ctrl-Z'd shell job. On the day's app
    # list, stopped, and none of netmeter's business.
    2006: ("s002", "node /Users/x/.npm/_npx/abc/node_modules/.bin/playwright-mcp"),
    2007: ("ttys010", "npm exec @playwright/mcp@latest"),
}
nm.load = lambda d: {"apps": {"Cursor": 1, "nsurlsessiond": 1,
                              "mDNSResponder": 1, "Beta": 1, "node": 1}}
try:
    nm.set_paused("Beta", True, "all", [2004])
    woken = nm.sweep_orphans(nm.load_config())
    check("the sweep wakes a stranded process no record claims",
          woken.get("Cursor") == [2001])
    check("and one nobody would think to look for",
          woken.get("nsurlsessiond") == [2002])
    check("it leaves the system floor alone", "mDNSResponder" not in woken)
    check("it leaves a live, recorded freeze alone", "Beta" not in woken)
    check("and never touches a process netmeter has not met",
          all(2005 not in v for v in woken.values()))
    check("it leaves a suspended shell job alone, however stopped it looks",
          all(2006 not in v for v in woken.values()))
    check("and does not count one as a candidate at all",
          2006 not in nm.sweep_candidates()[0])
    check("it can still name the jobs it passed over",
          sorted(nm.sweep_candidates()[1]) == [2006, 2007])
    check("a claimed pid is not offered as a job either",
          2006 not in nm.sweep_candidates([2006])[1])

    nm.save_json(nm.PAUSED_PATH, {})
    nm.set_throttled("Cursor", nm.PAUSE_ALL_FLOOR, "all")
    woken = nm.sweep_orphans(nm.load_config())
    check("a throttled app is stopped on purpose, so the sweep passes over it",
          "Cursor" not in woken)
finally:
    nm.stopped_procs, nm.load = real_stopped, real_load

# --- the throttle worker owns what it stopped -------------------------------
# The 2026-08-28 bug in one check: clear throttled.json while the duty cycle is
# in its stopped half, and every app it stopped used to stay stopped forever.

reset()
nm.update_config(throttle_period=0.5)
PIDS["Alpha"] = [1401]
nm.set_throttled("Alpha", 5, "all")
stop = threading.Event()
worker = threading.Thread(target=nm.throttle_worker, args=(stop,), daemon=True)
worker.start()
time.sleep(1.4)
nm.save_json(nm.THROTTLED_PATH, {})     # what resume-all does, mid-cycle
time.sleep(1.4)
stop.set()
worker.join(timeout=3)
check("the duty cycle ran", any(sig == signal.SIGSTOP and pids == [1401]
                               for pids, sig in SENT))
stops = [i for i, (p, sig) in enumerate(SENT) if p == [1401] and sig == signal.SIGSTOP]
conts = [i for i, (p, sig) in enumerate(SENT) if p == [1401] and sig == signal.SIGCONT]
check("and every stop it landed was followed by a wake",
      bool(conts) and max(conts) > max(stops))
nm.update_config(throttle_period=4.0)

reset()
nm.log("a thing went wrong")
try:
    raise ValueError("boom")
except ValueError:
    nm.log("with a traceback", exc=True)
body = open(nm.LOG_PATH).read()
check("the log records the message", "a thing went wrong" in body)
check("the log records the traceback", "ValueError: boom" in body)
check("nothing was notified by the harness", NOTES == [])

print(f"\n{PASS} checks passed.")
