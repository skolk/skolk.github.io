# micmeter

Mic level meter for the macOS menu bar. Built for dictating in cafes: it answers "how well is my voice coming in" and "is the Mac's Voice Isolation actually filtering the room out" at a glance, from a single swiftc-compiled menu bar app. Sibling of netmeter, same construction.

## What it does

- **Menu bar readout**: a two-row segment meter plus the live dB number. The top row is what the microphone actually hears (raw). The bottom row is the same microphone heard through Apple's voice filter, the path Voice Isolation acts on. In a noisy cafe with filtering working, the top row flickers with the room and the bottom row stays dark until you speak. That contrast is the whole tool: if both rows dance with the espresso machine, the filter is not saving you. The dB number is fixed at three monospaced digits and the meter image is a fixed size, so the item never changes width (same rule as netmeter's rate digits).
- **Levels are dBFS**: decibels below the loudest signal the mic can represent. 0 is clipping, silence is far negative. There is no calibration to room dB SPL and none is needed; every useful number here is a difference.
- **Menu**, headed by a row of buttons netmeter-style, so flipping one never costs a menu reopen:
  - **Mute** (hotkey **F5**): mutes the input device system-wide, the Mic Drop duty folded in so one tool covers meter and mute. The mute is re-asserted every second while on, because conferencing apps un-mute the mic behind your back. Devices without a hardware mute switch get their input volume zeroed instead, restored on unmute. Muted shows in the bar as `✕` (or the slashed glyph when collapsed), and micmeter always un-mutes on quit, so a mic can never be left silently dead with no menu bar item to explain it.
  - **Pause**: stops metering and releases the microphone (the orange dot goes away).
  - **dB** / **Bars**: what the menu bar item shows. Both off collapses it to just the mic glyph.
  - **Mic**: the live raw and filtered levels.
  - **Background**: the noise floor (10th percentile of the last 30 seconds) with a quiet / moderate / loud room verdict.
  - **Voice**: your speech level (95th percentile), how many dB it sits over the background, and a verdict. Over 20 dB of margin is good dictation territory; under 12 means get closer to the mic. The margin is gain-independent, so it is the number to trust across different mics and volumes.
  - **Input**: shows the current default input device and opens as a submenu of every input device on the system; click one to make it the system default (the meter follows).
  - **Mic mode**: what is selected in Control Center (Standard / Voice Isolation / Wide Spectrum). **Change Mic Mode…** opens the system picker; there is no API to set the mode, only to summon the UI that does.
  - **Filter cuts the background by ~N dB**: measured only while nobody is speaking, because during speech both paths carry the voice and the difference means nothing about noise. A big number with Voice Isolation on is the filter working; a small one in Standard mode is your cue to switch.
  - **Show Filtered Level** toggles the second (voice-processed) mic tap. The collapsed glyph is a mic-with-meter, not a bare mic (which would vanish among the bar's other mic icons), with a slash drawn over it when muted, paused, or without mic access.

## Install

```sh
./install.sh
```

Compiles the bar app into a minimal bundle at `~/Applications/micmeter.app` (needs Xcode or CLT for `swiftc`), writes the LaunchAgent, and starts it. Runs at every login from then on. First launch asks for microphone access.

To change the code: edit here, run `./install.sh` again.

## Uninstall

```sh
launchctl bootout gui/$(id -u)/com.seankolk.micmeterbar
rm -rf ~/Applications/micmeter.app
rm -f ~/Library/LaunchAgents/com.seankolk.micmeterbar.plist
rm -rf ~/.micmeter
```

## Notes

- **The F5 hotkey and the fn key.** F5 registers as a Carbon hotkey (no accessibility permission needed). On a laptop keyboard that means fn+F5 unless "Use F1, F2, etc. keys as standard function keys" is on. While another app owns F5 (Mic Drop, until it is quit), registration fails quietly and micmeter retries every second, so the key moves over on its own once the other app is gone.
- **The orange mic dot stays on.** A level meter is a microphone client, so macOS shows the mic-in-use indicator the whole time it runs. That is the OS being honest, not a bug. **Pause Metering** releases the mic and the dot goes away.
- **Nothing is recorded.** Each audio buffer is reduced to one RMS number and dropped.
- **The filtered level can read louder than raw.** The voice-processed path runs automatic gain control, so in a quiet room its absolute number often sits above the raw one. Not a defect: the filter's job shows in the background cut, not in matching levels, which is why the cut is only measured while nobody is speaking.
- **The mic-mode nuance.** Control Center's mic mode applies to apps that use Apple's voice-processing capture path. micmeter's filtered row is its own voice-processed tap, so it shows what such an app hears with the current mode. A dictation app that captures raw audio and does its own noise handling will not match the filtered row.
- **Music and metering.** Capturing audio degrades playback two separate ways, and micmeter dodges both by checking once a second whether any other process is producing output audio:
  - The voice-processing unit behind the filtered row ducks other apps' audio and its echo canceller worsens output quality, even with ducking configured off (`voiceProcessingOtherAudioDuckingConfiguration` was not enough on a U18). While anything is playing, the voice-processing engine steps aside: "Filter: paused while other audio plays".
  - On a combined in/out device (default input and default output the same box), merely opening the mic path flips the hardware into speakerphone voice mode and the bass walks out of the music. No capture API can prevent a device's own DSP from doing that, so in the same-device case the **whole meter** yields, releasing the mic entirely: the bar shows `♪`, the menu says "Mic paused while U18 plays audio", and metering resumes a few quiet seconds after playback stops. If you want live metering during music instead, point **Input** at a different mic than the output device (the MacBook's own, say); split devices never trigger the yield, and the raw meter then runs through playback untouched.
- **Filter check "unavailable".** If the voice-processed path passes no speech while the raw path clearly hears one, micmeter marks the path broken and stops it rather than reporting a cut that is really a dead stream. Toggle **Show Filtered Level** off and on to retry (some inputs, usually USB interfaces, refuse voice processing).
- **Why a .app bundle for one binary.** TCC will not reliably present the microphone consent dialog for a bare executable spawned by launchd; it records a silent denial instead (learned the hard way: the first install shipped an unbundled binary with the usage description embedded via the `__info_plist` linker section, and the prompt never appeared). Bundled, it prompts like any app and shows up in Privacy & Security > Microphone.
- **Config**: `~/.micmeter/config.json` (`measure_filtering`, `show_db`). Logs: `~/.micmeter/bar.log`.
