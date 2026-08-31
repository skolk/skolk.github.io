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

import datetime
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
# Kept so one check can exercise the real thing. It is only ever called there,
# and only against pids above the macOS maximum, where os.kill can do nothing
# but raise ESRCH. Every other caller in this file gets the stub.
REAL_SIGNAL_PIDS = nm.signal_pids
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
check("the migration stamps a version", cfg["config_version"] == 3)
net = nm.read_json(nm.NETWORKS_PATH)["aa:bb"]["settings"]
check("a remembered network migrates too", net["pause_all"] is True)
check("and drops its solo keys", "solo" not in net and "solo_app" not in net)
# v3 runs straight after v2 on a v1 config, so the solo->Pause All translation
# lands in memory and is then trimmed to the switch. The allow list it built is
# not lost: it went into config, where the mode reads it from now on.
check("and v3 trims memory to the mode switches",
      set(net) == {"pause_all", "lowdata"})
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

# --- waking up --------------------------------------------------------------
# Design item 3. The first seconds after the lid opens are the ones worth
# protecting, and they used to be the ones running on the previous network's
# rules with counters that spanned the sleep.

reset()
st = {"last_tick": None, "bucket_min": 1, "bucket": {"Alpha": [9, 9]},
      "capped": {"Alpha"}, "drained": {"Alpha": 1}, "wifi_prev": (5, 5)}
now = time.time()
check("the first tick of a run is not a wake", nm.wake_check(st, now, 5) == 0.0)
check("an ordinary tick is not a wake", nm.wake_check(st, now + 5, 5) == 0.0)
check("a jump past the gap is", nm.wake_check(st, now + 3600, 5) >= 3590)
check("and the threshold scales with a slow sample interval",
      nm.wake_check(st, now + 3640, 10) == 0.0)

nm.wake_reset(st, now)
check("the minute bucket starts fresh at the wake minute",
      st["bucket"] == {} and st["bucket_min"] == int(now // 60))
check("a cap that fired before the sleep can fire again after it",
      st["capped"] == set())
check("the drain window does not span the sleep", st["drained"] == {})
check("and the interface reading that would charge a night to this network is dropped",
      st["wifi_prev"] is None)

reset()
real_gw, real_pc = nm.gateway_mac, nm.profile_check
SEEN = []
nm.gateway_mac = lambda iface: ("10.0.0.1", "ff:ee:dd")
nm.profile_check = lambda cfg, mac, ip=None: (SEEN.append((mac, ip)) or False)
try:
    PIDS["Downpour"] = [1401]
    nm.update_config(lowdata=True, lowdata_apps=["Downpour"], lowdata_background=False)
    del SENT[:]
    nm.wake_engage()
    check("waking re-checks the network off a fresh MAC read",
          SEEN == [("ff:ee:dd", "10.0.0.1")])
    check("and low data is enforced before the tick counts a byte",
          ([1401], signal.SIGSTOP) in SENT)

    nm.update_config(lowdata=False)
    del SENT[:]
    nm.wake_engage()
    check("with the mode off, waking freezes nothing", SENT == [])

    nm.profile_check = lambda cfg, mac, ip=None: (_ for _ in ()).throw(RuntimeError("boom"))
    nm.wake_engage()
    check("a profile that raises on wake does not take the daemon down with it",
          "wake: profile check failed" in open(nm.LOG_PATH).read())
finally:
    nm.gateway_mac, nm.profile_check = real_gw, real_pc

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

# --- relinking a tether from memory, from anywhere (2026-08-31) -------------
# The old advice was "relink while tethered", which is only actionable in the
# one place you are least likely to be when you notice the cap has counted
# nothing for three weeks. Memory usually already knows the network.

check("a MAC is compared in one form, however arp printed it",
      nm.mac_norm("30:23:3:fd:a6:f1") == nm.mac_norm("30:23:03:FD:A6:F1"))
nm.save_json(nm.NETWORKS_PATH, {"30:23:03:fd:a6:f1": {"last_seen": "2026-08-28"}})
check("and a link stored short still matches memory stored long",
      "never seen" not in nm.tether_link_warning(nm.load_config(),
                                                 ["30:23:3:fd:a6:f1"], t, False))

reset()
nm.save_json(nm.NETWORKS_PATH, {
    "2e:b8:0:78:fa:3a": {"name": "Pixi", "router": "10.59.187.218",
                         "last_seen": "2026-08-31", "settings": {}},
    "e4:d1:24:4e:b1:d0": {"name": "", "router": "172.16.102.254",
                          "last_seen": "2026-08-31", "settings": {}}})
cfg = nm.update_config(tether_name="A_Pixi")
found = nm.tether_candidate(cfg, ["30:23:3:fd:a6:f1"])
check("a stale link finds the remembered network its name points at",
      found is not None and found[0] == "2e:b8:0:78:fa:3a")
check("and the warning hands over the command instead of a place to stand",
      "tether-link Pixi" in nm.tether_link_warning(cfg, ["30:23:3:fd:a6:f1"],
                                                   t, False))
check("the warning is still short enough not to widen the menu",
      len(nm.tether_link_warning(cfg, ["30:23:3:fd:a6:f1"], t, False)) <= 60)
check("a link that is fine suggests nothing",
      nm.tether_candidate(cfg, ["2e:b8:00:78:fa:3a"]) is None)
cfg = nm.update_config(tether_name="Somewhere Else")
check("and a name nothing answers to suggests nothing either",
      nm.tether_candidate(cfg, ["30:23:3:fd:a6:f1"]) is None)

# A fresh link must not inherit the blame for the period it arrived in the
# middle of: relinking cleared "never seen" and instantly raised "nothing
# counted in 27 days", pointing at the thing that had just been fixed.
reset()
nm.save_json(nm.NETWORKS_PATH, {"aa:bb": {"last_seen": "2026-08-28"}})
old_period = {"period_start": "2026-08-04", "in": 0, "out": 0, "notified_pct": 0}
cfg = nm.update_config(tether_linked="")
check("a long-dead link in a long-running period is still called out",
      "nothing counted" in nm.tether_link_warning(cfg, ["aa:bb"], old_period, False))
cfg = nm.update_config(tether_linked=datetime.date.today().isoformat())
check("but a link made today is given the same two days as any other",
      nm.tether_link_warning(cfg, ["aa:bb"], old_period, False) == "")
cfg = nm.update_config(
    tether_linked=(datetime.date.today() - datetime.timedelta(days=9)).isoformat())
check("and one that has had nine days to count something is called out again",
      "nothing counted in 9 days" in
      nm.tether_link_warning(cfg, ["aa:bb"], old_period, False))

# --- who spent the tether data ----------------------------------------------
# Design item 6. The counter could answer "how much" and never "who".

reset()
cfg = nm.load_config()
t = nm.load_tether(cfg)
check("a fresh period starts with an empty tally", t["apps"] == {})
nm.tether_attribute(t, {"Alpha": [100, 20], "Beta": [5, 0]})
nm.tether_attribute(t, {"Alpha": [50, 5]})
check("per-app bytes accumulate across ticks", t["apps"]["Alpha"] == [150, 25])
check("and each app keeps its own", t["apps"]["Beta"] == [5, 0])

nm.save_json(nm.TETHER_PATH, t)
check("the tally survives a reload",
      nm.load_tether(nm.load_config())["apps"]["Alpha"] == [150, 25])

old = dict(t, period_start="2000-01-01")
nm.save_json(nm.TETHER_PATH, old)
check("and the period rollover zeroes it with everything else",
      nm.load_tether(nm.load_config())["apps"] == {})

stale = {"period_start": nm.tether_period_start(
    nm.load_config()["tether_reset_day"]).isoformat(), "in": 1, "out": 1}
nm.save_json(nm.TETHER_PATH, stale)
check("a tether file written before attribution shipped still loads",
      nm.load_tether(nm.load_config())["apps"] == {})

import io as _io, contextlib as _ctx
big = {f"App{i}": [1000 * (20 - i) * 1024, 0] for i in range(12)}
big["Noise"] = [500, 0]                      # under the 10KB floor
buf = _io.StringIO()
with _ctx.redirect_stdout(buf):
    nm.print_table(big, "head", top=3)
out = buf.getvalue()
check("a capped table prints the top N", out.count("App") == 3)
check("and says how many it did not print", "+ 9 more" in out)
check("sub-10KB noise is not counted as one of them", "Noise" not in out)
check("the total still covers everything, not just the rows shown",
      nm.fmt(sum(v[0] for v in big.values())) in out.splitlines()[-1])

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

# --- helpers fold into the app they belong to (2026-08-31) ------------------
# An app whose helpers keep their own name gets two identities, and enforcement
# has to agree about both. It did not: see the sweep check below.

reset()
check("the Claude desktop app's helpers fold into one row",
      nm.friendly("Claude Helper (Renderer)") == "Claude")
check("and the CLI, which reports as its version, stays its own app",
      nm.friendly("2.1.220") == "Claude Code")
check("Cursor's helpers still fold the way they always did",
      nm.friendly("Cursor Helper (Plugin)") == "Cursor")

# --- the sweep claims pids, not names (2026-08-31) --------------------------
# The live bug: "sweep: woke 6 stranded process(es) of Claude Helper", once a
# minute for days. The throttle held those six under the name "Claude"; the
# day's table filed them under "Claude Helper"; that name was on the app list,
# nothing claimed it, and the sweep undid the duty cycle it could not see.

reset()
real_stopped, real_load = nm.stopped_procs, nm.load
nm.stopped_procs = lambda: {
    2101: ("??", "/Applications/Claude.app/Contents/Frameworks/Claude Helper.app"
                 "/Contents/MacOS/Claude Helper --type=renderer"),
    2102: ("??", "/opt/unrelated/Zephyr"),
}
nm.load = lambda d: {"apps": {"Claude Helper": 1, "Zephyr": 1}}
try:
    PIDS["Claude"] = [2101]
    nm.set_throttled("Claude", 25, "lowdata")
    woken = nm.sweep_orphans(nm.load_config())
    check("a throttled app's processes are spared under any label they carry",
          "Claude Helper" not in woken)
    check("and the sweep still wakes a strand nothing is holding",
          woken.get("Zephyr") == [2102])
finally:
    nm.stopped_procs, nm.load = real_stopped, real_load

# --- one `ps` per stop, not one per process (2026-08-31) --------------------
# protected() sat inside a list comprehension's condition, so it ran once per
# pid. Stopping Cursor's 36 helpers meant 36 `ps` runs and half a second, and
# the overrun was charged to the app's running half: a 25% throttle measured
# 47% stopped instead of 75%, which is why Low Data felt like it did nothing.

reset()
real_prot = nm.protected
ASKED = []
nm.protected = lambda pids: (ASKED.append(len(list(pids))) or set())
try:
    ghosts = [999001, 999002, 999003, 999004, 999005]
    REAL_SIGNAL_PIDS(ghosts, signal.SIGSTOP)
    check("a stop asks what is protected once, not once per process",
          ASKED == [5])
    ASKED.clear()
    REAL_SIGNAL_PIDS(ghosts, signal.SIGCONT)
    check("and a wake does not ask at all", ASKED == [])
finally:
    nm.protected = real_prot

# --- network memory remembers the switches, not the settings (2026-08-31) ---
# It used to remember the whole lowdata family per network, so every entry kept
# its own copy of the throttle list, the percentage and the cap as they stood on
# the last visit. Editing them at home and then walking into a network last seen
# in July restored July's copy over the edit, with no event to connect it to.

reset()
nm.save_json(nm.NETWORKS_PATH, {})
cfg = nm.update_config(lowdata=True, pause_all=False, lowdata_throttle=["Mine"],
                       throttle_pct=40, burst_cap_mb=12, network_profiles={})
nm.network_remember(cfg, "cc:dd", "10.0.0.1")
entry = nm.read_json(nm.NETWORKS_PATH)["cc:dd"]
check("memory records the mode switches",
      entry["settings"] == {"lowdata": True, "pause_all": False})
check("and nothing about what those modes do",
      not ({"lowdata_throttle", "throttle_pct", "burst_cap_mb"}
           & set(entry["settings"])))
check("and dates the day the switches last moved", entry["changed"] == entry["last_seen"])
check("an old full-shape entry still reads as switches only",
      nm.memory_settings({"settings": {"lowdata": True, "throttle_pct": 90,
                                       "lowdata_throttle": ["July"]}})
      == {"lowdata": True})

reset()
real_bf, real_bl = nm.background_freeze, nm.background_lift
real_ua, real_ur = nm.update_prefs_apply, nm.update_prefs_restore
nm.background_freeze = lambda cfg=None: []
nm.background_lift = lambda: None
nm.update_prefs_apply = lambda cfg: None
nm.update_prefs_restore = lambda: None
try:
    nm.save_json(nm.NETWORKS_PATH, {"cc:dd": {
        "name": "Cafe", "last_seen": "2026-07-01",
        "settings": {"lowdata": True, "lowdata_apps": [],
                     "lowdata_throttle": ["July"], "throttle_pct": 90,
                     "burst_cap_mb": 5, "pause_all": False,
                     "pause_all_allow": []}}})
    nm.save_json(nm.PROFILE_PATH, {"mac": "old:mac", "name": "",
                                   "applied": {}, "saved": {}})
    nm.update_config(lowdata=False, lowdata_throttle=["Today"], throttle_pct=25,
                     burst_cap_mb=50, network_profiles={})
    nm.profile_check(nm.load_config(), "cc:dd", "10.0.0.2")
    cfg = nm.load_config()
    check("rejoining a remembered network brings its mode switch back",
          cfg["lowdata"] is True)
    check("but July's throttle list stays in July",
          cfg["lowdata_throttle"] == ["Today"])
    check("and so does July's percentage", cfg["throttle_pct"] == 25)
    check("and its burst cap", cfg["burst_cap_mb"] == 50)
    check("the stint only claims to have moved the switch",
          set(nm.read_json(nm.PROFILE_PATH)["applied"]) == {"lowdata"})
    check("and the entry on disk is trimmed on the way past",
          set(nm.read_json(nm.NETWORKS_PATH)["cc:dd"]["settings"])
          == {"lowdata", "pause_all"})

    # A profile is the deliberate exception: pinning one is an act, so it still
    # speaks for the whole family.
    nm.update_config(network_profiles={"ee:ff": {"name": "Pixi", "settings": {
        "lowdata": True, "lowdata_throttle": ["Pinned"], "throttle_pct": 10}}})
    nm.profile_check(nm.load_config(), "ee:ff", "10.0.0.3")
    cfg = nm.load_config()
    check("an explicit profile still pins what memory no longer touches",
          cfg["lowdata_throttle"] == ["Pinned"] and cfg["throttle_pct"] == 10)
    check("and leaving it puts the global list back",
          nm.profile_check(nm.load_config(), "cc:dd", "10.0.0.2") is not None
          and nm.load_config()["lowdata_throttle"] == ["Today"])
finally:
    nm.background_freeze, nm.background_lift = real_bf, real_bl
    nm.update_prefs_apply, nm.update_prefs_restore = real_ua, real_ur

# --- naming a network without pinning a policy to it ------------------------

reset()
nm.save_json(nm.NETWORKS_PATH, {"cc:dd": {"settings": {"lowdata": False},
                                          "last_seen": "2026-08-30", "name": ""}})
nm.networks_cmd("name", "cc:dd", "Kate's office")
check("a remembered network can be named on its own",
      nm.read_json(nm.NETWORKS_PATH)["cc:dd"]["name"] == "Kate's office")
nm.network_remember(nm.load_config(), "cc:dd")
check("and the name survives the next refresh",
      nm.read_json(nm.NETWORKS_PATH)["cc:dd"]["name"] == "Kate's office")

# --- a standing fight says itself once, not once a minute -------------------

reset()
open(nm.LOG_PATH, "w").close()
nm._REPEATS.clear()
for _ in range(5):
    nm._log_repeating("reconcile", "reconcile: re-froze cloudd, nsurlsessiond;")
body = open(nm.LOG_PATH).read()
check("an unchanged line is logged once, not once per pass",
      body.count("re-froze cloudd") == 1)
nm._log_repeating("reconcile", "reconcile: re-froze bird;")
body = open(nm.LOG_PATH).read()
check("and a changed one is logged straight away", "re-froze bird" in body)
nm._REPEATS["reconcile"] = ("reconcile: re-froze bird;",
                            time.time() - nm.REPEAT_EVERY - 1)
nm._log_repeating("reconcile", "reconcile: re-froze bird;")
check("a fight that never ends is restated, with how long it has run",
      "unchanged for" in open(nm.LOG_PATH).read())

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
