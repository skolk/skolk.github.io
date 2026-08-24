// micmeter-bar: mic level meter for the menu bar (compiled with swiftc).
// Menu bar: a two-row segment meter plus the live dB number. The top row is
// what the microphone actually hears; the bottom row is the same microphone
// heard through Apple's voice filter (the path Voice Isolation acts on). In a
// noisy cafe with filtering working, the top row flickers with the room and
// the bottom row stays dark until you speak. That contrast is the whole tool.
// Menu: noise floor, voice level, voice-over-noise margin, the Control Center
// mic mode, and how many dB the filter is cutting off the background. Plus
// the Mic Drop duties, so one tool covers both: a system-wide input mute on
// F5 (re-asserted every second, because apps love to unmute the mic behind
// your back) and a default-input picker.
//
// Levels are dBFS: decibels below the loudest signal the mic can represent.
// 0 is clipping, silence is far negative. There is no calibration to room
// dB SPL and none is needed; the useful numbers here are all differences.
import AppKit
import AVFoundation
import Accelerate
import Carbon.HIToolbox
import CoreAudio

let home = NSHomeDirectory()
let cfgPath = home + "/.micmeter/config.json"

// ---------- config ----------

func loadConfig() -> [String: Any] {
    guard let data = FileManager.default.contents(atPath: cfgPath),
          let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    else { return [:] }
    return obj
}

func saveConfig(_ patch: [String: Any]) {
    var c = loadConfig()
    for (k, v) in patch { c[k] = v }
    try? FileManager.default.createDirectory(atPath: home + "/.micmeter",
                                             withIntermediateDirectories: true)
    if let d = try? JSONSerialization.data(withJSONObject: c, options: [.sortedKeys]) {
        try? d.write(to: URL(fileURLWithPath: cfgPath))
    }
}

// ---------- level math ----------

func rmsDB(_ buf: AVAudioPCMBuffer) -> Float {
    guard let ch = buf.floatChannelData?[0], buf.frameLength > 0 else { return -120 }
    var rms: Float = 0
    vDSP_rmsqv(ch, 1, &rms, vDSP_Length(buf.frameLength))
    return rms > 1e-6 ? max(-120, 20 * log10(rms)) : -120
}

func percentile(_ xs: [Float], _ p: Float) -> Float {
    guard !xs.isEmpty else { return -120 }
    let s = xs.sorted()
    let i = min(s.count - 1, max(0, Int(Float(s.count) * p)))
    return s[i]
}

// ---------- one microphone tap ----------

// Two of these run at once: one plain, one with voice processing enabled.
// Each gets its own AVAudioEngine because voice processing is a property of
// the engine's input node, set before start, and the raw path must stay raw.
final class MicTap {
    let vp: Bool
    var onDB: ((Float) -> Void)?
    private var engine: AVAudioEngine?
    private(set) var failed = false
    var running: Bool { engine?.isRunning ?? false }

    init(voiceProcessing: Bool) { vp = voiceProcessing }

    func start() {
        stop()
        failed = false
        let eng = AVAudioEngine()
        let input = eng.inputNode
        if vp {
            do { try input.setVoiceProcessingEnabled(true) }
            catch { failed = true; return }
            // The voice-processing unit ducks every other app's audio when it
            // hears activity, a courtesy meant for calls. Under a meter that
            // listens all day it turns background music into a pumping mess,
            // so ask for no ducking at all.
            if #available(macOS 14.0, *) {
                input.voiceProcessingOtherAudioDuckingConfiguration =
                    AVAudioVoiceProcessingOtherAudioDuckingConfiguration(
                        enableAdvancedDucking: false, duckingLevel: .min)
            }
        }
        // A machine can briefly have no input channels (device mid-switch);
        // touching the tap then is a crash, not an error.
        guard input.inputFormat(forBus: 0).channelCount > 0 else { failed = true; return }
        input.installTap(onBus: 0, bufferSize: 2048, format: nil) { [weak self] buf, _ in
            let db = rmsDB(buf)
            DispatchQueue.main.async { self?.onDB?(db) }
        }
        do { try eng.start(); engine = eng }
        catch { input.removeTap(onBus: 0); failed = true }
    }

    func stop() {
        guard let eng = engine else { return }
        eng.inputNode.removeTap(onBus: 0)
        eng.stop()
        engine = nil
    }
}

// ---------- CoreAudio plumbing ----------

let systemObj = AudioObjectID(kAudioObjectSystemObject)

func caAddr(_ sel: AudioObjectPropertySelector,
            _ scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal,
            _ elem: AudioObjectPropertyElement = kAudioObjectPropertyElementMain
) -> AudioObjectPropertyAddress {
    AudioObjectPropertyAddress(mSelector: sel, mScope: scope, mElement: elem)
}

func defaultInputID() -> AudioDeviceID {
    var dev = AudioDeviceID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = caAddr(kAudioHardwarePropertyDefaultInputDevice)
    AudioObjectGetPropertyData(systemObj, &addr, 0, nil, &size, &dev)
    return dev
}

func defaultOutputID() -> AudioDeviceID {
    var dev = AudioDeviceID(kAudioObjectUnknown)
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    var addr = caAddr(kAudioHardwarePropertyDefaultOutputDevice)
    AudioObjectGetPropertyData(systemObj, &addr, 0, nil, &size, &dev)
    return dev
}

func deviceName(_ dev: AudioDeviceID) -> String {
    var addr = caAddr(kAudioObjectPropertyName)
    var name: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(dev, &addr, 0, nil, &size, &name) == noErr,
          let cf = name?.takeRetainedValue() else { return "unknown input" }
    return cf as String
}

func defaultInputName() -> String {
    let dev = defaultInputID()
    return dev == kAudioObjectUnknown ? "no input device" : deviceName(dev)
}

// Every device that has at least one input stream. Output-only boxes are
// filtered by the stream check, not the name, because names lie.
func inputDeviceList() -> [(AudioDeviceID, String)] {
    var addr = caAddr(kAudioHardwarePropertyDevices)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(systemObj, &addr, 0, nil, &size) == noErr,
          size > 0 else { return [] }
    var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
    guard AudioObjectGetPropertyData(systemObj, &addr, 0, nil, &size, &ids) == noErr
    else { return [] }
    var out: [(AudioDeviceID, String)] = []
    for id in ids {
        var saddr = caAddr(kAudioDevicePropertyStreams, kAudioObjectPropertyScopeInput)
        var ssize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(id, &saddr, 0, nil, &ssize) == noErr,
              ssize > 0 else { continue }
        out.append((id, deviceName(id)))
    }
    return out
}

func setDefaultInput(_ dev: AudioDeviceID) {
    var d = dev
    var addr = caAddr(kAudioHardwarePropertyDefaultInputDevice)
    AudioObjectSetPropertyData(systemObj, &addr, 0, nil,
                               UInt32(MemoryLayout<AudioDeviceID>.size), &d)
}

// The device's own input mute switch. Returns false when the device has no
// such switch (plenty do not), in which case the caller falls back to
// zeroing the input volume.
func setHALMute(_ dev: AudioDeviceID, _ mute: Bool) -> Bool {
    var addr = caAddr(kAudioDevicePropertyMute, kAudioObjectPropertyScopeInput)
    guard AudioObjectHasProperty(dev, &addr) else { return false }
    var settable = DarwinBoolean(false)
    AudioObjectIsPropertySettable(dev, &addr, &settable)
    guard settable.boolValue else { return false }
    var v: UInt32 = mute ? 1 : 0
    return AudioObjectSetPropertyData(dev, &addr, 0, nil,
                                      UInt32(MemoryLayout<UInt32>.size), &v) == noErr
}

func getInputVolume(_ dev: AudioDeviceID, _ elem: AudioObjectPropertyElement) -> Float32? {
    var addr = caAddr(kAudioDevicePropertyVolumeScalar, kAudioObjectPropertyScopeInput, elem)
    guard AudioObjectHasProperty(dev, &addr) else { return nil }
    var v = Float32(0)
    var size = UInt32(MemoryLayout<Float32>.size)
    guard AudioObjectGetPropertyData(dev, &addr, 0, nil, &size, &v) == noErr else { return nil }
    return v
}

func setInputVolume(_ dev: AudioDeviceID, _ elem: AudioObjectPropertyElement, _ v: Float32) {
    var addr = caAddr(kAudioDevicePropertyVolumeScalar, kAudioObjectPropertyScopeInput, elem)
    var vv = v
    AudioObjectSetPropertyData(dev, &addr, 0, nil, UInt32(MemoryLayout<Float32>.size), &vv)
}

// Is any process other than us currently producing output audio? Asked once a
// second to keep the voice-processing tap out of the way of music: its echo
// canceller audibly degrades playback on a combined in/out device, and asking
// it not to duck was not enough. On any failure the answer is "no", which
// just leaves the filter path on, the pre-existing behavior.
func othersRunningOutput() -> Bool {
    var addr = caAddr(kAudioHardwarePropertyProcessObjectList)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(systemObj, &addr, 0, nil, &size) == noErr,
          size > 0 else { return false }
    var objs = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
    guard AudioObjectGetPropertyData(systemObj, &addr, 0, nil, &size, &objs) == noErr
    else { return false }
    let myPID = pid_t(ProcessInfo.processInfo.processIdentifier)
    for obj in objs {
        var raddr = caAddr(kAudioProcessPropertyIsRunningOutput)
        var running: UInt32 = 0
        var rsize = UInt32(MemoryLayout<UInt32>.size)
        guard AudioObjectGetPropertyData(obj, &raddr, 0, nil, &rsize, &running) == noErr,
              running == 1 else { continue }
        var paddr = caAddr(kAudioProcessPropertyPID)
        var pid = pid_t(0)
        var psize = UInt32(MemoryLayout<pid_t>.size)
        guard AudioObjectGetPropertyData(obj, &paddr, 0, nil, &psize, &pid) == noErr
        else { continue }
        if pid != myPID { return true }
    }
    return false
}

func micModeName(_ m: AVCaptureDevice.MicrophoneMode) -> String {
    switch m {
    case .standard: return "Standard"
    case .voiceIsolation: return "Voice Isolation"
    case .wideSpectrum: return "Wide Spectrum"
    @unknown default: return "Unknown"
    }
}

// ---------- meter drawing ----------

// Five segments over -60..0 dBFS, 12 dB apiece: enough to tell silence from
// room from voice from clipping, in half the width ten segments cost. The
// image is a fixed size and the dB text is
// a fixed three digits in a monospaced font, so the item never changes width:
// a readout that breathes every eighth of a second is what walks a crowded
// menu bar around (same rule as netmeter's rate digits).
let METER_SEGS = 5
let METER_MIN: Float = -60

func litCount(_ db: Float) -> Int {
    if db <= METER_MIN { return 0 }
    return min(METER_SEGS, Int(ceil((db - METER_MIN) / (0 - METER_MIN) * Float(METER_SEGS))))
}

func segColor(_ i: Int) -> NSColor {
    let top = METER_MIN + Float(i + 1) * (0 - METER_MIN) / Float(METER_SEGS)
    if top > -7 { return .systemRed }
    if top > -19 { return .systemYellow }
    return .systemGreen
}

func meterImage(rawLit: Int, vpLit: Int?, peakSeg: Int) -> NSImage {
    let segW: CGFloat = 3, gap: CGFloat = 1.5, h: CGFloat = 15
    let width = CGFloat(METER_SEGS) * (segW + gap) - gap
    let img = NSImage(size: NSSize(width: width, height: h), flipped: false) { _ in
        func row(y: CGFloat, rh: CGFloat, lit: Int, peak: Int) {
            for i in 0..<METER_SEGS {
                var c = NSColor.labelColor.withAlphaComponent(0.18)
                if i < lit { c = segColor(i) }
                else if i == peak - 1 { c = segColor(i).withAlphaComponent(0.45) }
                c.setFill()
                NSBezierPath(roundedRect: NSRect(x: CGFloat(i) * (segW + gap), y: y,
                                                 width: segW, height: rh),
                             xRadius: 1, yRadius: 1).fill()
            }
        }
        if let v = vpLit {
            row(y: 8, rh: 6, lit: rawLit, peak: peakSeg)
            row(y: 1, rh: 5, lit: v, peak: 0)
        } else {
            row(y: 2, rh: 11, lit: rawLit, peak: peakSeg)
        }
        return true
    }
    img.isTemplate = false
    return img
}

// ---------- mode buttons ----------

// netmeter's ModeButton, trimmed. NSButton in pushOnPushOff renders with no
// readable on-state inside a status menu, so this draws its own filled pill.
// It never calls super on mouseDown: passing the click up is what dismisses
// the menu, and a toggle you must reopen the menu to confirm is not a toggle.
class ModeButton: NSControl {
    var label = "" { didSet { needsDisplay = true } }
    var isOn = false { didSet { needsDisplay = true } }
    var onClick: (() -> Void)?

    override func draw(_ dirtyRect: NSRect) {
        let r = bounds.insetBy(dx: 1, dy: 1)
        let path = NSBezierPath(roundedRect: r, xRadius: 7, yRadius: 7)
        if isOn {
            NSColor.controlAccentColor.setFill()
            path.fill()
        } else {
            NSColor.secondaryLabelColor.withAlphaComponent(0.10).setFill()
            path.fill()
            NSColor.separatorColor.setStroke()
            path.stroke()
        }
        let ink = isOn ? NSColor.white : NSColor.labelColor
        let attrs: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: 12, weight: isOn ? .semibold : .regular),
            .foregroundColor: ink,
        ]
        let text = NSAttributedString(string: label, attributes: attrs)
        var size = text.size()
        size.width = min(size.width, r.width - 12)
        text.draw(in: NSRect(x: r.midX - size.width / 2, y: r.midY - size.height / 2,
                             width: size.width, height: size.height))
    }

    override func mouseDown(with event: NSEvent) {
        isOn.toggle()
        onClick?()
    }
}

// ---------- app ----------

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    var statusItem: NSStatusItem!

    let rawTap = MicTap(voiceProcessing: false)
    let vpTap = MicTap(voiceProcessing: true)

    // Latest sample from each path, and the display values derived from them.
    // Display attack is instant and release is slow, the classic meter
    // ballistics: a spike you can read beats a number that flickers.
    var rawNow: Float = -120
    var vpNow: Float = -120
    var rawDisp: Float = -120
    var vpDisp: Float = -120
    var peak: Float = -120

    // 30 seconds of raw samples at 8 Hz. The 10th percentile is the noise
    // floor, the 95th is the voice: percentiles over a rolling window need no
    // voice-activity detector and recover on their own when the room changes.
    var samples: [Float] = []
    var floorDB: Float?
    var voiceDB: Float?

    // How much quieter the background is through the filter, as an EMA taken
    // only while nobody is speaking (raw within 6 dB of the floor). During
    // speech the two paths both carry the voice and the difference means
    // nothing about noise.
    var filterCut: Float?

    // Voice Isolation legitimately gates silence to nothing, so a dead vp
    // path can only be told apart from a working one while a voice is
    // present: raw well above the floor with the vp path still at nothing is
    // the filter eating the speech, which is a broken path, not a good one.
    var vpSuspect = 0
    var vpBroken = false
    // The voice-processing tap steps aside while any other app is playing
    // audio (see othersRunningOutput). Suspension is immediate; resumption
    // waits for a few quiet polls so a gap between songs does not flap the
    // engine on and off.
    var vpSuspended = false
    var quietPolls = 0
    // On a combined in/out device (input and output both the U18), merely
    // opening the mic path flips the hardware into speakerphone voice mode
    // and the bass walks out of the music. No capture API can prevent that,
    // so when the default input IS the default output and something else is
    // playing, the whole meter yields, not just the voice-processing tap.
    var yielded = false

    var paused = false
    var denied = false
    // System-wide input mute, the Mic Drop duty. desiredMute is our source of
    // truth and is re-asserted every second while on; mutedDev remembers which
    // device we muted so a default-device switch mid-mute does not strand the
    // old one silent. savedVol holds pre-mute volumes for devices that lack a
    // hardware mute switch and get the volume-to-zero fallback instead.
    var desiredMute = false
    var mutedDev = AudioDeviceID(kAudioObjectUnknown)
    var savedVol: [AudioDeviceID: [AudioObjectPropertyElement: Float32]] = [:]
    var hotKeyRef: EventHotKeyRef?
    var measure = (loadConfig()["measure_filtering"] as? Bool) ?? true
    var showDB = (loadConfig()["show_db"] as? Bool) ?? true
    var showMeter = (loadConfig()["show_meter"] as? Bool) ?? true
    var inputName = ""
    var tickCount = 0
    var restartPending = false

    var levelItem: NSMenuItem!
    var floorItem: NSMenuItem!
    var voiceItem: NSMenuItem!
    var modeItem: NSMenuItem!
    var filterItem: NSMenuItem!
    var changeModeItem: NSMenuItem!
    var measureItem: NSMenuItem!
    var inputItem: NSMenuItem!
    var inputMenu: NSMenu!
    var privacyItem: NSMenuItem!
    var muteButton: ModeButton?
    var pauseButton: ModeButton?
    var dbButton: ModeButton?
    var barsButton: ModeButton?

    var lastRawLit = -1, lastVpLit = -1, lastPeakSeg = -1, lastTitle = "", lastSymbol = ""

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.autosaveName = "micmeter"
        statusItem.button?.font = NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        statusItem.button?.imagePosition = .imageLeft
        buildMenu()

        rawTap.onDB = { [weak self] db in self?.rawNow = db }
        vpTap.onDB = { [weak self] db in self?.vpNow = db }

        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized: startTaps()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { ok in
                DispatchQueue.main.async { ok ? self.startTaps() : self.markDenied() }
            }
        default: markDenied()
        }

        // The input node follows the default device; a device swap arrives as
        // a configuration change and the engines need a clean restart.
        NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange, object: nil, queue: .main
        ) { [weak self] _ in self?.scheduleRestart() }

        // The F5 mute hotkey, Mic Drop's binding. Carbon hotkeys need no
        // accessibility permission. Registration fails while another app owns
        // the key (Mic Drop itself, until it is quit), so slowTick retries
        // until it lands.
        var spec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                 eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, _, userData -> OSStatus in
            let me = Unmanaged<AppDelegate>.fromOpaque(userData!).takeUnretainedValue()
            DispatchQueue.main.async { me.toggleMute() }
            return noErr
        }, 1, &spec, Unmanaged.passUnretained(self).toOpaque(), nil)
        registerHotkey()

        let timer = Timer(timeInterval: 0.12, repeats: true) { _ in self.tick() }
        RunLoop.main.add(timer, forMode: .common)
        tick()
    }

    func registerHotkey() {
        guard hotKeyRef == nil else { return }
        let hkID = EventHotKeyID(signature: OSType(0x6D6D_7472), id: 1)
        RegisterEventHotKey(UInt32(kVK_F5), 0, hkID, GetApplicationEventTarget(), 0, &hotKeyRef)
    }

    func applicationWillTerminate(_ notification: Notification) {
        // Never leave a mic silently dead behind us: an invisible mute with
        // no menu bar item to explain it is a debugging session for future
        // Sean. HAL mute and the volume fallback both restore here.
        if desiredMute {
            desiredMute = false
            applyMute()
        }
    }

    func startTaps() {
        denied = false
        vpSuspended = false
        yielded = false
        quietPolls = 0
        let playing = othersRunningOutput()
        if playing, defaultInputID() == defaultOutputID() {
            yielded = true
            return
        }
        rawTap.start()
        if measure && !vpBroken && !playing { vpTap.start() }
        else if measure && !vpBroken { vpSuspended = true }
    }

    func stopTaps() {
        rawTap.stop()
        vpTap.stop()
        rawNow = -120; vpNow = -120
    }

    func markDenied() {
        denied = true
        privacyItem.isHidden = false
    }

    func scheduleRestart() {
        guard !restartPending else { return }
        restartPending = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            self.restartPending = false
            guard !self.paused, !self.denied else { return }
            self.vpSuspect = 0
            self.startTaps()
        }
    }

    // ---------- the 8 Hz tick ----------

    func tick() {
        if !paused && !denied {
            rawDisp = max(rawNow, rawDisp - 2.5)
            vpDisp = max(vpNow, vpDisp - 2.5)
            peak = max(rawNow, peak - 0.4)
            if rawNow > -120, !desiredMute {
                samples.append(rawNow)
                if samples.count > 240 { samples.removeFirst(samples.count - 240) }
            }
            if let f = floorDB, measure, vpTap.running, rawNow < f + 6, rawNow > -80 {
                let cut = max(0, rawNow - vpNow)
                filterCut = (filterCut ?? cut) * 0.95 + cut * 0.05
            }
        }
        tickCount += 1
        if tickCount % 8 == 0 { slowTick() }
        redrawBar()
        levelItem.title = levelLine()
    }

    // The once-a-second work: percentiles, device polling, health checks, and
    // the menu rows that move slowly.
    func slowTick() {
        if samples.count >= 40 {
            let f = percentile(samples, 0.10)
            let v = percentile(samples, 0.95)
            floorDB = f
            voiceDB = v > f + 10 ? v : nil
        }
        let name = defaultInputName()
        if inputName != "", name != inputName, !paused, !denied {
            scheduleRestart()
        }
        inputName = name

        // Re-assert the mute: conferencing apps and input-device settings
        // panels un-mute the mic behind your back, and a mute that silently
        // stops muting is worse than none.
        if desiredMute { applyMute() }
        if hotKeyRef == nil { registerHotkey() }

        // Step aside while anything else is playing: the whole meter when
        // input and output are the same device (see `yielded`), only the
        // voice-processing tap otherwise. Resumption waits for a few quiet
        // polls so a gap between songs does not flap the engines.
        if !paused, !denied {
            let playing = othersRunningOutput()
            if playing, defaultInputID() == defaultOutputID() {
                quietPolls = 0
                if rawTap.running || vpTap.running {
                    rawTap.stop(); vpTap.stop()
                    yielded = true; vpSuspended = false
                    rawNow = -120; vpNow = -120
                    rawDisp = -120; vpDisp = -120; peak = -120
                }
            } else if playing {
                quietPolls = 0
                if yielded { startTaps() }
                else if measure, !vpBroken, vpTap.running {
                    vpTap.stop(); vpSuspended = true
                    vpNow = -120; vpDisp = -120
                }
            } else if yielded || vpSuspended {
                quietPolls += 1
                if quietPolls >= 3 {
                    if yielded { startTaps() }
                    else if measure, !vpBroken {
                        vpTap.start(); vpSuspended = false
                    }
                }
            }
        }

        if measure, vpTap.running, let f = floorDB,
           rawNow > f + 15, rawNow > -40, vpNow < -90 {
            vpSuspect += 1
            if vpSuspect >= 8 {
                vpBroken = true
                vpTap.stop()
            }
        }
        retitleMenu()
    }

    // The off state draws its own slash over the identity glyph. mic.slash
    // would be simpler, but next to Mic Drop it reads as "muted", and a bare
    // mic is what every other audio tool in the bar already shows.
    func slashed(_ base: NSImage) -> NSImage {
        let img = NSImage(size: base.size, flipped: false) { rect in
            base.draw(in: rect)
            let p = NSBezierPath()
            p.move(to: NSPoint(x: rect.minX + 1, y: rect.maxY - 1))
            p.line(to: NSPoint(x: rect.maxX - 1, y: rect.minY + 1))
            p.lineWidth = 1.5
            p.lineCapStyle = .round
            NSColor.black.setStroke()
            p.stroke()
            return true
        }
        img.isTemplate = true
        return img
    }

    func redrawBar() {
        guard let button = statusItem.button else { return }
        let off = paused || denied || desiredMute || yielded
        // Collapsed mode: one template glyph, no bars, no number. The glyph is
        // a mic with a signal meter, not a bare mic: in a bar full of mic
        // icons (Mic Drop, dictation tools, the system indicator) the plain
        // mic disappeared into the crowd. It still has to carry the one state
        // that matters, "not actually listening", via the slash.
        if !showMeter {
            let name = off ? "meter.slash" : "meter"
            if lastSymbol != name {
                var img = NSImage(systemSymbolName: "mic.and.signal.meter",
                                  accessibilityDescription: "micmeter")
                    ?? NSImage(systemSymbolName: "mic", accessibilityDescription: "micmeter")
                if let cfg = img?.withSymbolConfiguration(
                    NSImage.SymbolConfiguration(pointSize: 13, weight: .regular)) { img = cfg }
                if off, let base = img { img = slashed(base) }
                img?.isTemplate = true
                button.image = img
                button.title = ""
                lastSymbol = name
                lastTitle = ""
                lastRawLit = -1; lastVpLit = -1; lastPeakSeg = -1
            }
            return
        }
        lastSymbol = ""
        let rawLit = off ? 0 : litCount(rawDisp)
        let vpLit: Int? = (measure && vpTap.running && !off) ? litCount(vpDisp) : nil
        let peakSeg = off ? 0 : litCount(peak)
        var title = ""
        if showDB {
            if denied { title = " mic ✗" }
            else if desiredMute { title = " ✕" }
            else if yielded { title = " ♪" }
            else if paused { title = " ⏸" }
            else if rawDisp <= -119 { title = " –" }
            else { title = String(format: " %3.0f", max(METER_MIN, min(0, rawDisp))) }
        }
        if rawLit != lastRawLit || (vpLit ?? -1) != lastVpLit || peakSeg != lastPeakSeg {
            button.image = meterImage(rawLit: rawLit, vpLit: vpLit, peakSeg: peakSeg)
            lastRawLit = rawLit; lastVpLit = vpLit ?? -1; lastPeakSeg = peakSeg
        }
        if title != lastTitle {
            button.title = title
            lastTitle = title
        }
    }

    // ---------- menu ----------

    func buildMenu() {
        let menu = NSMenu()
        menu.autoenablesItems = false

        func info(_ title: String) -> NSMenuItem {
            let it = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            menu.addItem(it)
            return it
        }
        func action(_ title: String, _ sel: Selector) -> NSMenuItem {
            let it = NSMenuItem(title: title, action: sel, keyEquivalent: "")
            it.target = self
            menu.addItem(it)
            return it
        }

        menu.addItem(buttonsRow())
        menu.addItem(.separator())
        levelItem = info("Mic  …")
        floorItem = info("Background  listening…")
        voiceItem = info("Voice  say something…")
        privacyItem = action("Microphone access denied. Open Privacy Settings…", #selector(openPrivacy))
        privacyItem.isHidden = true
        menu.addItem(.separator())
        modeItem = info("Mic mode: …")
        filterItem = info("Filter: listening…")
        changeModeItem = action("Change Mic Mode…", #selector(changeMode))
        measureItem = action("Show Filtered Level", #selector(toggleMeasure))
        measureItem.state = measure ? .on : .off
        menu.addItem(.separator())
        inputItem = info("Input: …")
        inputMenu = NSMenu()
        inputMenu.delegate = self
        inputItem.submenu = inputMenu
        menu.addItem(.separator())
        _ = action("Quit micmeter", #selector(quit))
        statusItem.menu = menu
    }

    // The toggles, as buttons at the top of the menu, netmeter-style: click
    // one and the menu stays open, so flipping a mode never costs a reopen.
    func buttonsRow() -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 38))
        func btn(_ x: CGFloat, _ w: CGFloat, _ label: String, _ on: Bool,
                 _ click: @escaping () -> Void) -> ModeButton {
            let b = ModeButton(frame: NSRect(x: x, y: 6, width: w, height: 26))
            b.label = label
            b.isOn = on
            b.onClick = click
            v.addSubview(b)
            return b
        }
        muteButton = btn(10, 84, "Mute", desiredMute) { [weak self] in self?.toggleMute() }
        muteButton?.toolTip = "Mute the mic system-wide (F5)"
        pauseButton = btn(100, 84, "Pause", paused) { [weak self] in self?.togglePause() }
        pauseButton?.toolTip = "Stop metering and release the microphone"
        dbButton = btn(190, 70, "dB", showDB) { [weak self] in self?.toggleShowDB() }
        dbButton?.toolTip = "Show the dB number in the menu bar"
        barsButton = btn(266, 70, "Bars", showMeter) { [weak self] in self?.toggleShowMeter() }
        barsButton?.toolTip = "Show the level bars in the menu bar (off: just a mic glyph)"
        item.view = v
        return item
    }

    // The device list is built fresh each time the submenu opens; a submenu
    // that is not showing is the one place rebuilding is always safe.
    func menuNeedsUpdate(_ menu: NSMenu) {
        guard menu === inputMenu else { return }
        menu.removeAllItems()
        let current = defaultInputID()
        for (id, name) in inputDeviceList() {
            let it = NSMenuItem(title: name, action: #selector(pickInput(_:)), keyEquivalent: "")
            it.target = self
            it.tag = Int(id)
            it.state = id == current ? .on : .off
            menu.addItem(it)
        }
    }

    func levelLine() -> String {
        if denied { return "Mic  no access" }
        if desiredMute { return "Mic  muted" }
        if paused { return "Mic  paused" }
        if yielded { return "Mic  paused while \(inputName) plays audio" }
        var s = rawDisp <= -119 ? "Mic  –"
            : String(format: "Mic  %.0f dB", rawDisp)
        if measure, vpTap.running {
            s += vpDisp <= -119 ? "  ·  filtered –"
                : String(format: "  ·  filtered %.0f dB", vpDisp)
        }
        return s
    }

    func retitleMenu() {
        if let f = floorDB {
            let room = f <= -58 ? "quiet" : (f <= -46 ? "moderate" : "loud room")
            floorItem.title = String(format: "Background  %.0f dB · %@", f, room)
        } else {
            floorItem.title = "Background  listening…"
        }
        if let v = voiceDB, let f = floorDB {
            let snr = v - f
            let verdict = snr >= 30 ? "excellent" : (snr >= 20 ? "good"
                : (snr >= 12 ? "workable" : "poor, get closer to the mic"))
            voiceItem.title = String(format: "Voice  %.0f dB · %.0f dB over the background · %@",
                                     v, snr, verdict)
        } else {
            voiceItem.title = "Voice  say something…"
        }
        modeItem.title = "Mic mode: " + micModeName(AVCaptureDevice.preferredMicrophoneMode)
        muteButton?.isOn = desiredMute
        pauseButton?.isOn = paused
        dbButton?.isOn = showDB
        barsButton?.isOn = showMeter
        if !measure {
            filterItem.title = "Filter: not measured"
        } else if vpBroken || vpTap.failed {
            filterItem.title = "Filter: unavailable on this input"
        } else if vpSuspended || yielded {
            filterItem.title = "Filter: paused while other audio plays"
        } else if let cut = filterCut {
            if cut < 3 {
                filterItem.title = String(format: "Filter is barely cutting the background (~%.0f dB)", cut)
            } else {
                filterItem.title = String(format: "Filter cuts the background by ~%.0f dB", cut)
            }
        } else {
            filterItem.title = "Filter: listening…"
        }
        inputItem.title = "Input: " + inputName
    }

    // ---------- actions ----------

    func engageMute(_ dev: AudioDeviceID) {
        if setHALMute(dev, true) { return }
        var saved = savedVol[dev] ?? [:]
        for e: AudioObjectPropertyElement in [kAudioObjectPropertyElementMain, 1, 2] {
            if let v = getInputVolume(dev, e) {
                if saved[e] == nil, v > 0 { saved[e] = v }
                setInputVolume(dev, e, 0)
            }
        }
        savedVol[dev] = saved
    }

    func releaseMute(_ dev: AudioDeviceID) {
        _ = setHALMute(dev, false)
        for (e, v) in savedVol[dev] ?? [:] { setInputVolume(dev, e, v) }
        savedVol.removeValue(forKey: dev)
    }

    func applyMute() {
        if desiredMute {
            let dev = defaultInputID()
            guard dev != kAudioObjectUnknown else { return }
            if mutedDev != kAudioObjectUnknown, mutedDev != dev { releaseMute(mutedDev) }
            engageMute(dev)
            mutedDev = dev
        } else if mutedDev != kAudioObjectUnknown {
            releaseMute(mutedDev)
            mutedDev = AudioDeviceID(kAudioObjectUnknown)
        }
    }

    @objc func toggleMute() {
        desiredMute.toggle()
        applyMute()
        redrawBar()
        retitleMenu()
    }

    @objc func pickInput(_ sender: NSMenuItem) {
        // The engines follow via the configuration-change notification, and
        // an active mute follows via the next slowTick's applyMute.
        setDefaultInput(AudioDeviceID(sender.tag))
    }

    @objc func changeMode() {
        // Opens the Control Center mic-mode picker. There is no API to set
        // the mode, only to summon the UI that does.
        AVCaptureDevice.showSystemUserInterface(.microphoneModes)
    }

    @objc func toggleMeasure() {
        measure.toggle()
        measureItem.state = measure ? .on : .off
        saveConfig(["measure_filtering": measure])
        vpBroken = false
        vpSuspect = 0
        filterCut = nil
        vpSuspended = false
        quietPolls = 0
        if measure && !paused && !denied {
            if othersRunningOutput() { vpSuspended = true } else { vpTap.start() }
        } else {
            vpTap.stop(); vpNow = -120; vpDisp = -120
        }
        retitleMenu()
    }

    @objc func toggleShowMeter() {
        showMeter.toggle()
        saveConfig(["show_meter": showMeter])
        redrawBar()
    }

    @objc func toggleShowDB() {
        showDB.toggle()
        saveConfig(["show_db": showDB])
    }

    @objc func togglePause() {
        paused.toggle()
        if paused {
            stopTaps()
            rawDisp = -120; vpDisp = -120; peak = -120
            samples.removeAll()
            floorDB = nil; voiceDB = nil; filterCut = nil
        } else if !denied {
            startTaps()
        }
        retitleMenu()
    }

    @objc func openPrivacy() {
        NSWorkspace.shared.open(URL(string:
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")!)
    }

    @objc func quit() { NSApp.terminate(nil) }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
