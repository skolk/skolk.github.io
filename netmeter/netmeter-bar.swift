// netmeter-bar — menu bar readout + stats window for netmeter (compiled with swiftc).
// Menu bar: live ↓/↑ speed plus the running session total.
// Window (via "Open netmeter…"): Session / Today / Yesterday tables, auto-refreshing.
import AppKit

let home = NSHomeDirectory()

func readJSON(_ path: String) -> [String: Any]? {
    guard let data = FileManager.default.contents(atPath: path) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any]
}

func loadApps(_ path: String) -> [String: (Double, Double)] {
    guard let data = readJSON(path), let apps = data["apps"] as? [String: Any] else { return [:] }
    var out: [String: (Double, Double)] = [:]
    for (k, v) in apps {
        if let a = v as? [Any], a.count >= 2,
           let i = (a[0] as? NSNumber)?.doubleValue,
           let o = (a[1] as? NSNumber)?.doubleValue {
            out[k] = (i, o)
        }
    }
    return out
}

func sessionApps() -> [String: (Double, Double)] {
    var apps = loadApps(home + "/.netmeter/\(dayString(0)).json")
    if let sess = readJSON(home + "/.netmeter/session.json"),
       (sess["date"] as? String) == dayString(0),
       let snap = sess["snapshot"] as? [String: Any] {
        for (k, v) in snap {
            if let a = v as? [Any], a.count >= 2,
               let i = (a[0] as? NSNumber)?.doubleValue,
               let o = (a[1] as? NSNumber)?.doubleValue,
               let cur = apps[k] {
                apps[k] = (max(0, cur.0 - i), max(0, cur.1 - o))
            }
        }
    }
    return apps
}

// Decimal units, matching the engine: a carrier's 50 GB plan is 50 x 10^9
// bytes, and a bar that disagrees with the bill is worse than no bar.
let KB = 1000.0, MB = 1000_000.0, GB = 1000_000_000.0

// KB and MB are whole numbers: those digits churn every second, and a readout
// that changes width every second is what walks off the end of a crowded menu
// bar. GB keeps two decimals, because a gigabyte counter that moves once an
// hour is not the churn, and "1 GB" for anything from 1.0 to 1.9 is useless.
func fmtBytes(_ b: Double, space: Bool = true) -> String {
    let sp = space ? " " : ""
    if b >= 100 * GB { return String(format: "%.0f\(sp)GB", b / GB) }
    if b >= GB { return String(format: "%.2f\(sp)GB", b / GB) }
    if b >= MB { return String(format: "%.0f\(sp)MB", b / MB) }
    return String(format: "%.0f\(sp)KB", b / KB)
}

func fmtRate(_ bps: Double) -> String {
    if bps >= MB { return String(format: "%.0fM", bps / MB) }
    return String(format: "%.0fK", max(0, bps) / KB)
}

// Both the engine's timestamps are `isoformat(timespec="seconds")`, local time.
let stampFormat: DateFormatter = {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
    return df
}()

func stamp(_ s: String?) -> Date? {
    guard let s = s, !s.isEmpty else { return nil }
    return stampFormat.date(from: s)
}

func fmtDuration(_ seconds: Double) -> String {
    let t = max(0, Int(seconds))
    let h = t / 3600, m = (t % 3600) / 60
    if h >= 24 { return "\(h / 24)d \(h % 24)h" }
    if h > 0 { return "\(h)h \(m)m" }
    return "\(m)m"
}

// Elapsed from `since` to `until`, or to now when `until` is nil. A finished day
// gets its last sample as the end, so Yesterday reads as a span, not a countdown
// from the epoch.
func elapsed(since: String?, until: String? = nil) -> String {
    guard let start = stamp(since) else { return "" }
    return fmtDuration((stamp(until) ?? Date()).timeIntervalSince(start))
}

func dayString(_ daysAgo: Int) -> String {
    let df = DateFormatter()
    df.dateFormat = "yyyy-MM-dd"
    return df.string(from: Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date())!)
}

class StatsWindow: NSObject, NSTableViewDataSource, NSTableViewDelegate {
    var window: NSWindow?
    var table = NSTableView()
    var seg = NSSegmentedControl()
    var header = NSTextField(labelWithString: "")
    var rows: [(String, Double, Double)] = []

    func show() {
        if window == nil { build() }
        refresh()
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func build() {
        let h: CGFloat = 540, w: CGFloat = 500
        let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: w, height: h),
                           styleMask: [.titled, .closable, .miniaturizable, .resizable],
                           backing: .buffered, defer: false)
        win.title = "netmeter"
        win.isReleasedWhenClosed = false
        win.center()
        let content = win.contentView!

        header = NSTextField(labelWithString: "")
        header.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .medium)
        header.frame = NSRect(x: 16, y: h - 32, width: w - 32, height: 18)
        header.autoresizingMask = [.width, .minYMargin]
        content.addSubview(header)

        seg = NSSegmentedControl(labels: ["Session", "Today", "Yesterday"],
                                 trackingMode: .selectOne, target: self, action: #selector(segChanged))
        seg.selectedSegment = 0
        seg.frame = NSRect(x: 14, y: h - 64, width: 280, height: 24)
        seg.autoresizingMask = [.minYMargin]
        content.addSubview(seg)

        let scroll = NSScrollView(frame: NSRect(x: 0, y: 0, width: w, height: h - 78))
        scroll.autoresizingMask = [.width, .height]
        scroll.hasVerticalScroller = true

        table = NSTableView(frame: .zero)
        let cols: [(String, String, CGFloat)] = [
            ("app", "App", 220), ("down", "Down", 78), ("up", "Up", 78), ("total", "Total", 88)]
        for (id, title, width) in cols {
            let col = NSTableColumn(identifier: NSUserInterfaceItemIdentifier(id))
            col.title = title
            col.width = width
            if id == "app" { col.resizingMask = .autoresizingMask }
            table.addTableColumn(col)
        }
        table.dataSource = self
        table.delegate = self
        table.usesAlternatingRowBackgroundColors = true
        table.rowHeight = 20
        scroll.documentView = table
        content.addSubview(scroll)
        window = win
    }

    @objc func segChanged() { refresh() }

    func refreshIfVisible() {
        if window?.isVisible == true { refresh() }
    }

    func refresh() {
        let today = dayString(0)
        var apps: [String: (Double, Double)]
        var label: String
        var age = ""
        switch seg.selectedSegment {
        case 1:
            let path = home + "/.netmeter/\(today).json"
            apps = loadApps(path)
            label = "Today"
            age = elapsed(since: readJSON(path)?["started"] as? String)
        case 2:
            let path = home + "/.netmeter/\(dayString(1)).json"
            let file = readJSON(path)
            apps = loadApps(path)
            label = "Yesterday"
            // A closed day is a span between its first and last sample, not a
            // duration still running up to now.
            age = elapsed(since: file?["started"] as? String,
                          until: file?["updated"] as? String)
        default:
            apps = sessionApps()
            label = "Session"
            age = elapsed(since: readJSON(home + "/.netmeter/now.json")?["session_started"] as? String)
        }
        let span = age.isEmpty ? "" : (seg.selectedSegment == 2 ? "  (over \(age))"
                                                                : "  (running \(age))")
        rows = apps.map { ($0.key, $0.value.0, $0.value.1) }
            .filter { $0.1 + $0.2 >= KB }
            .sorted { $0.1 + $0.2 > $1.1 + $1.2 }
        let ti = rows.reduce(0.0) { $0 + $1.1 }
        let to = rows.reduce(0.0) { $0 + $1.2 }
        var speed = ""
        if let now = readJSON(home + "/.netmeter/now.json"),
           let ts = now["ts"] as? Double, Date().timeIntervalSince1970 - ts < 30 {
            let d = (now["down_bps"] as? Double) ?? 0
            let u = (now["up_bps"] as? Double) ?? 0
            speed = combineUpDown()
                ? "   ·   now ⇅\(fmtRate(d + u))/s"
                : "   ·   now ↓\(fmtRate(d))/s ↑\(fmtRate(u))/s"
        }
        if combineUpDown() {
            header.stringValue = "\(label): ⇅\(fmtBytes(ti + to))\(span)\(speed)"
        } else {
            header.stringValue = "\(label): ↓\(fmtBytes(ti))  ↑\(fmtBytes(to))  =  \(fmtBytes(ti + to))\(span)\(speed)"
        }
        table.reloadData()
    }

    func numberOfRows(in tableView: NSTableView) -> Int { rows.count }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard row < rows.count else { return nil }
        let r = rows[row]
        let text: String
        var align: NSTextAlignment = .right
        switch tableColumn?.identifier.rawValue ?? "" {
        case "app": text = r.0; align = .left
        case "down": text = fmtBytes(r.1)
        case "up": text = fmtBytes(r.2)
        default: text = fmtBytes(r.1 + r.2)
        }
        let cell = NSTextField(labelWithString: text)
        cell.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        cell.alignment = align
        cell.lineBreakMode = .byTruncatingTail
        return cell
    }
}

let VERSION = "1.2"

func config() -> [String: Any] { readJSON(home + "/.netmeter/config.json") ?? [:] }

func combineUpDown() -> Bool { (config()["combine_updown"] as? Bool) ?? false }

// Both default to true: a fresh install should look like a meter, not a glyph.
func showRate() -> Bool { (config()["show_rate"] as? Bool) ?? true }
func showTotal() -> Bool { (config()["show_total"] as? Bool) ?? true }

let RECENT_WINDOWS: [(Int, String)] = [(5, "5m"), (15, "15m"), (60, "1h"), (360, "6h"), (720, "12h")]

func windowLabel(_ minutes: Int) -> String {
    if minutes < 60 { return "\(minutes)m" }
    let h = minutes / 60, m = minutes % 60
    return m == 0 ? "\(h)h" : "\(h)h \(m)m"
}

// One pass over the history producing everything the section needs: the ranked
// apps, and each time bucket broken down by those apps. Chart and table read
// the same result, so the legend cannot disagree with what is plotted.
let SERIES_COLORS: [NSColor] = [.systemBlue, .systemGreen, .systemOrange,
                                .systemPurple, .systemPink, .systemTeal]
let OTHER_COLOR = NSColor.systemGray

struct RecentBreakdown {
    var keys: [String] = []          // top apps, most data first
    var totals: [Double] = []        // window total per key, same order
    var columns: [[Double]] = []     // per time bucket: one slot per key, plus "other" last
    var peak: Double = 0             // largest bucket total, the chart's y scale
    var grand: Double = 0
    var perColumn: Int = 1           // minutes per bucket
    var other: Double = 0
}

func recentBreakdown(minutes: Int, columns: Int, topN: Int) -> RecentBreakdown {
    var out = RecentBreakdown()
    guard let text = try? String(contentsOfFile: home + "/.netmeter/recent.jsonl",
                                 encoding: .utf8) else { return out }
    let nowMin = Int(Date().timeIntervalSince1970 / 60)
    let cutoff = nowMin - minutes
    var perMinute: [Int: [String: Double]] = [:]
    var totals: [String: Double] = [:]
    for line in text.split(separator: "\n") {
        guard let d = line.data(using: .utf8),
              let obj = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any],
              let m = obj["m"] as? Int, m > cutoff,
              let apps = obj["a"] as? [String: Any] else { continue }
        for (k, v) in apps {
            guard let a = v as? [Any], a.count >= 2,
                  let i = (a[0] as? NSNumber)?.doubleValue,
                  let o = (a[1] as? NSNumber)?.doubleValue else { continue }
            let both = i + o
            guard both > 0 else { continue }
            perMinute[m, default: [:]][k, default: 0] += both
            totals[k, default: 0] += both
            out.grand += both
        }
    }
    let ranked = totals.sorted { $0.value > $1.value }
    out.keys = ranked.prefix(topN).map { $0.key }
    out.totals = ranked.prefix(topN).map { $0.value }
    out.other = ranked.dropFirst(topN).reduce(0) { $0 + $1.value }

    let cols = max(1, min(columns, minutes))
    out.perColumn = max(1, minutes / cols)
    var slot: [String: Int] = [:]
    for (i, k) in out.keys.enumerated() { slot[k] = i }
    let width = out.keys.count + 1                       // + "other"
    out.columns = Array(repeating: [Double](repeating: 0, count: width), count: cols)
    let per = Double(minutes) / Double(cols)
    for (m, apps) in perMinute {
        let idx = cols - 1 - Int(Double(nowMin - m) / per)
        guard idx >= 0 && idx < cols else { continue }
        for (k, v) in apps {
            out.columns[idx][slot[k] ?? (width - 1)] += v
        }
    }
    out.peak = out.columns.map { $0.reduce(0, +) }.max() ?? 0
    return out
}

// Usage against time. `timeOnX` transposes the whole thing: with it false, time
// runs top to bottom and the bars grow rightward.
class ChartView: NSView {
    var stacks: [[Double]] = [] { didSet { needsDisplay = true } }
    var colors: [NSColor] = [] { didSet { needsDisplay = true } }
    var peak: Double = 0 { didSet { needsDisplay = true } }
    var timeOnX = true { didSet { needsDisplay = true } }

    override func draw(_ dirtyRect: NSRect) {
        let plot = bounds
        NSColor.secondaryLabelColor.withAlphaComponent(0.22).setStroke()
        let axis = NSBezierPath()
        axis.lineWidth = 1
        if timeOnX {
            axis.move(to: NSPoint(x: plot.minX, y: plot.minY + 0.5))
            axis.line(to: NSPoint(x: plot.maxX, y: plot.minY + 0.5))
        } else {
            axis.move(to: NSPoint(x: plot.minX + 0.5, y: plot.minY))
            axis.line(to: NSPoint(x: plot.minX + 0.5, y: plot.maxY))
        }
        axis.stroke()
        guard peak > 0, !stacks.isEmpty else { return }

        let n = CGFloat(stacks.count)
        let span = timeOnX ? plot.width : plot.height
        let slot = span / n
        let thick = max(1.5, slot - 1)
        let full = timeOnX ? plot.height : plot.width
        for (i, column) in stacks.enumerated() {
            let at = CGFloat(i) * slot
            var run: CGFloat = 0          // how far up (or right) the stack has grown
            for (j, v) in column.enumerated() where v > 0 {
                // Segments below a pixel would vanish, and a stack of vanished
                // segments loses height the column actually has, so each one
                // claims at least a pixel and the run carries the true offset.
                let len = max(1, full * CGFloat(v / peak))
                (j < colors.count ? colors[j] : OTHER_COLOR).setFill()
                let r = timeOnX
                    ? NSRect(x: plot.minX + at, y: plot.minY + run, width: thick, height: len)
                    : NSRect(x: plot.minX + run, y: plot.maxY - at - thick, width: len, height: thick)
                r.fill()
                run += len
            }
        }
    }
}

// A row you can click without the menu closing. A normal NSMenuItem action
// dismisses the menu, and NSMenu.popUp does not open from inside a menu that is
// already tracking, so the solo picker is built from these instead.
class PickRow: NSControl {
    var onClick: (() -> Void)?
    var hot = false { didSet { needsDisplay = true } }

    override func draw(_ dirtyRect: NSRect) {
        guard hot else { return }
        NSColor.secondaryLabelColor.withAlphaComponent(0.12).setFill()
        NSBezierPath(roundedRect: bounds.insetBy(dx: 6, dy: 1),
                     xRadius: 4, yRadius: 4).fill()
    }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        trackingAreas.forEach(removeTrackingArea)
        addTrackingArea(NSTrackingArea(rect: bounds,
                                       options: [.mouseEnteredAndExited, .activeAlways],
                                       owner: self))
    }
    override func mouseEntered(with event: NSEvent) { hot = true }
    override func mouseExited(with event: NSEvent) { hot = false }
    override func mouseDown(with event: NSEvent) { onClick?() }
}

// Proportional bar. The share of the window is the thing worth seeing at a
// glance; the byte count is the thing worth reading second.
class BarView: NSView {
    var fraction: CGFloat = 0 { didSet { needsDisplay = true } }
    var color: NSColor = .controlAccentColor { didSet { needsDisplay = true } }

    override func draw(_ dirtyRect: NSRect) {
        let h: CGFloat = 6
        let track = NSRect(x: 0, y: (bounds.height - h) / 2, width: bounds.width, height: h)
        NSColor.secondaryLabelColor.withAlphaComponent(0.15).setFill()
        NSBezierPath(roundedRect: track, xRadius: h / 2, yRadius: h / 2).fill()
        let w = max(h, bounds.width * max(0, min(1, fraction)))
        color.setFill()
        NSBezierPath(roundedRect: NSRect(x: 0, y: track.minY, width: w, height: h),
                     xRadius: h / 2, yRadius: h / 2).fill()
    }
}

// Apps that get no on/off switch. System daemons because freezing mDNSResponder
// breaks DNS; Claude Code because those processes are the running work sessions.
// Solo mode keeps its own, shorter exemption list on the daemon side, so soloing
// Chrome does freeze the Claude app when it reaches for an update.
let PAUSE_DENY: Set<String> = [
    "Claude Code", "mDNSResponder", "syspolicyd", "apsd", "cloudd",
    "nsurlsessiond", "trustd", "remindd", "gamed", "storekitagent",
    "appstoreagent", "amsengagementd", "managedappdistr", "mstreamd",
    "AddressBookSour", "com.apple.geod", "WeatherWidget", "CategoriesServi",
    "netbiosd", "networkserviceproxy (Apple relay)", "AssetCacheLocat",
    "curl", "git-remote-http", "gh", "com.apple.Safar", "Safari (WebKit)",
    "locationd", "bird", "identityservice", "softwareupdated", "timed",
    "parsec-fbf", "familycircled", "rapportd", "sharingd", "searchpartyd"
]

// Preferences: the Bandwidth+-style pane. Everything it writes goes to
// ~/.netmeter/config.json via the netmeter CLI, never into the repo.
class PrefsWindow: NSObject {
    var window: NSWindow?
    var run: (([String]) -> Void)?
    var nameF = NSTextField()
    var quotaF = NSTextField()
    var dayF = NSTextField()
    var seedF = NSTextField()
    var notifyF = NSTextField()
    var combineB = NSButton(checkboxWithTitle: "", target: nil, action: nil)
    var rateB = NSButton(checkboxWithTitle: "", target: nil, action: nil)
    var totalB = NSButton(checkboxWithTitle: "", target: nil, action: nil)
    var status = NSTextField(labelWithString: "")

    func show() {
        if window == nil { build() }
        load()
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func sectionLabel(_ text: String, _ y: CGFloat, in content: NSView) {
        let l = NSTextField(labelWithString: text)
        l.font = NSFont.boldSystemFont(ofSize: 12)
        l.frame = NSRect(x: 16, y: y, width: 380, height: 16)
        content.addSubview(l)
    }

    func fieldRow(_ label: String, _ field: NSTextField, _ y: CGFloat,
                  width: CGFloat, in content: NSView) {
        let l = NSTextField(labelWithString: label)
        l.alignment = .right
        l.frame = NSRect(x: 16, y: y + 3, width: 120, height: 17)
        content.addSubview(l)
        field.frame = NSRect(x: 144, y: y, width: width, height: 24)
        content.addSubview(field)
    }

    func button(_ title: String, _ sel: Selector, _ x: CGFloat, _ y: CGFloat,
                _ w: CGFloat, in content: NSView) {
        let b = NSButton(title: title, target: self, action: sel)
        b.bezelStyle = .rounded
        b.frame = NSRect(x: x, y: y, width: w, height: 28)
        content.addSubview(b)
    }

    func build() {
        let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 430, height: 440),
                           styleMask: [.titled, .closable], backing: .buffered, defer: false)
        win.title = "netmeter Preferences"
        win.isReleasedWhenClosed = false
        win.center()
        let c = win.contentView!

        sectionLabel("Metered network (hotspot cap)", 404, in: c)
        fieldRow("Network name:", nameF, 370, width: 260, in: c)
        fieldRow("Quota (GB):", quotaF, 338, width: 80, in: c)
        fieldRow("Resets on day:", dayF, 306, width: 80, in: c)
        status.font = NSFont.systemFont(ofSize: 11)
        status.textColor = .secondaryLabelColor
        status.frame = NSRect(x: 144, y: 282, width: 270, height: 16)
        c.addSubview(status)
        button("Link Current Network", #selector(linkHere), 144, 246, 170, in: c)
        button("Unlink All", #selector(unlink), 320, 246, 94, in: c)
        fieldRow("Used so far (GB):", seedF, 208, width: 80, in: c)
        button("Set", #selector(seed), 232, 206, 60, in: c)

        sectionLabel("Low Data Mode", 168, in: c)
        fieldRow("Notify every (MB):", notifyF, 134, width: 80, in: c)

        // Speed and total hide independently. Combine only changes how the speed
        // is written, so it sits under the switch that decides whether it shows.
        sectionLabel("Menu bar display", 100, in: c)
        rateB = NSButton(checkboxWithTitle: "Show transfer speed", target: nil, action: nil)
        rateB.frame = NSRect(x: 16, y: 76, width: 290, height: 20)
        c.addSubview(rateB)
        combineB = NSButton(checkboxWithTitle: "Combine \u{2193} and \u{2191} into one rate",
                            target: nil, action: nil)
        combineB.frame = NSRect(x: 34, y: 54, width: 272, height: 20)
        c.addSubview(combineB)
        totalB = NSButton(checkboxWithTitle: "Show total transferred", target: nil, action: nil)
        totalB.frame = NSRect(x: 16, y: 30, width: 290, height: 20)
        c.addSubview(totalB)
        let hint = NSTextField(labelWithString: "With both Show boxes off, the bar is just \u{21C5}.")
        hint.font = NSFont.systemFont(ofSize: 10)
        hint.textColor = .tertiaryLabelColor
        hint.frame = NSRect(x: 16, y: 8, width: 290, height: 14)
        c.addSubview(hint)

        button("Save", #selector(save), 314, 16, 100, in: c)
        window = win
    }

    func load() {
        let cfg = readJSON(home + "/.netmeter/config.json")
        nameF.stringValue = (cfg?["tether_name"] as? String) ?? ""
        if let cap = (cfg?["tether_cap_gb"] as? NSNumber)?.doubleValue, cap > 0 {
            quotaF.stringValue = cap == cap.rounded() ? String(Int(cap)) : String(cap)
        } else { quotaF.stringValue = "" }
        dayF.stringValue = String((cfg?["tether_reset_day"] as? NSNumber)?.intValue ?? 1)
        notifyF.stringValue = String((cfg?["notify_every_mb"] as? NSNumber)?.intValue ?? 25)
        combineB.state = ((cfg?["combine_updown"] as? Bool) ?? false) ? .on : .off
        rateB.state = ((cfg?["show_rate"] as? Bool) ?? true) ? .on : .off
        totalB.state = ((cfg?["show_total"] as? Bool) ?? true) ? .on : .off
        let macs = (cfg?["tether_gateway_macs"] as? [Any]) ?? []
        let now = readJSON(home + "/.netmeter/now.json")
        let on = (now?["tether_on"] as? Bool) ?? false
        status.stringValue = macs.isEmpty
            ? "No network linked yet. Connect to it, then Link."
            : "\(macs.count) network(s) linked" + (on ? " · connected now" : "")
    }

    func reloadSoon() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { self.load() }
    }

    @objc func save() {
        var args = ["tether-config"]
        args += ["--name", nameF.stringValue]
        if !quotaF.stringValue.isEmpty { args += ["--cap", quotaF.stringValue] }
        if !dayF.stringValue.isEmpty { args += ["--reset-day", dayF.stringValue] }
        if !notifyF.stringValue.isEmpty { args += ["--notify-every-mb", notifyF.stringValue] }
        args += ["--combine", combineB.state == .on ? "on" : "off"]
        args += ["--rate", rateB.state == .on ? "on" : "off"]
        args += ["--total", totalB.state == .on ? "on" : "off"]
        run?(args)
        reloadSoon()
    }

    @objc func linkHere() { run?(["tether-here"]); reloadSoon() }
    @objc func unlink() { run?(["tether-forget"]); reloadSoon() }
    @objc func seed() {
        if !seedF.stringValue.isEmpty { run?(["tether", seedF.stringValue]) }
        seedF.stringValue = ""
        reloadSoon()
    }
}

// Custom-drawn toggle: NSSwitch renders washed out inside menus regardless of
// appearance overrides, so we draw our own pill with unmistakable states.
class ToggleSwitch: NSControl {
    var isOn = true { didSet { needsDisplay = true } }
    var onToggle: ((Bool) -> Void)?

    override func draw(_ dirtyRect: NSRect) {
        let track = NSRect(x: 0, y: 2, width: 38, height: 20)
        let path = NSBezierPath(roundedRect: track, xRadius: 10, yRadius: 10)
        if isOn {
            NSColor.systemGreen.setFill()
        } else {
            NSColor.systemGray.withAlphaComponent(0.4).setFill()
        }
        path.fill()
        NSColor.black.withAlphaComponent(0.12).setStroke()
        path.stroke()
        let knobX = isOn ? track.maxX - 18 : track.minX + 2
        let knob = NSBezierPath(ovalIn: NSRect(x: knobX, y: track.minY + 2, width: 16, height: 16))
        NSColor.white.setFill()
        knob.fill()
        NSColor.black.withAlphaComponent(0.15).setStroke()
        knob.stroke()
    }

    override func mouseDown(with event: NSEvent) {
        isOn.toggle()
        onToggle?(isOn)
    }
}

// A mode button for the row at the top of the menu. NSButton in pushOnPushOff
// renders with no readable on-state inside a status menu, same problem
// ToggleSwitch was written to dodge, so this draws its own filled pill.
class ModeButton: NSControl {
    var label = "" { didSet { needsDisplay = true } }
    var isOn = false { didSet { needsDisplay = true } }
    var momentary = false          // an action button, so it never latches "on"
    var arrowWidth: CGFloat = 0    // > 0 splits a chevron zone off the right edge
    var onClick: (() -> Void)?
    var onArrow: (() -> Void)?

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
        // The label centres in what is left after the chevron zone, so adding an
        // arrow does not shove the text off-centre.
        let textArea = NSRect(x: r.minX, y: r.minY, width: r.width - arrowWidth, height: r.height)
        let text = NSAttributedString(string: label, attributes: attrs)
        var size = text.size()
        size.width = min(size.width, textArea.width - 12)
        text.draw(in: NSRect(x: textArea.midX - size.width / 2, y: r.midY - size.height / 2,
                             width: size.width, height: size.height))

        guard arrowWidth > 0 else { return }
        let split = r.maxX - arrowWidth
        ink.withAlphaComponent(0.28).setStroke()
        let divider = NSBezierPath()
        divider.move(to: NSPoint(x: split, y: r.minY + 4))
        divider.line(to: NSPoint(x: split, y: r.maxY - 4))
        divider.lineWidth = 1
        divider.stroke()
        let cx = split + arrowWidth / 2, cy = r.midY
        let chev = NSBezierPath()
        chev.move(to: NSPoint(x: cx - 3.5, y: cy + 2))
        chev.line(to: NSPoint(x: cx, y: cy - 2.5))
        chev.line(to: NSPoint(x: cx + 3.5, y: cy + 2))
        chev.lineWidth = 1.5
        chev.lineCapStyle = .round
        chev.lineJoinStyle = .round
        ink.setStroke()
        chev.stroke()
    }

    // Flip immediately rather than waiting on the CLI round trip, and do not
    // call super: passing the click up is what dismisses the menu, and a mode
    // toggle you have to reopen the menu to confirm is not a toggle.
    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        if arrowWidth > 0 && p.x >= bounds.maxX - arrowWidth - 1 {
            onArrow?()
            return
        }
        if !momentary { isOn.toggle() }
        onClick?()
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    var statusItem: NSStatusItem!
    let stats = StatsWindow()
    let prefs = PrefsWindow()
    var showSession = false
    // Live references into the open menu. Retitling an item and redrawing a view
    // is safe while a menu is tracking; adding or removing items is not, so the
    // two status lines are always present and toggle their isHidden instead.
    var lowButton: ModeButton?
    var soloButton: ModeButton?
    var lowStatus: NSMenuItem?
    var soloStatus: NSMenuItem?
    // The "always Low Data on this network" row. netProfile is the name the
    // current gateway MAC is pinned under, or "" when it is not pinned.
    var netLine: NSMenuItem?
    var netProfile = ""
    // Recent-usage table. Six fixed row slots that show and hide, rather than
    // items added and removed, so changing the window or collapsing the section
    // never mutates the item list of a menu that is currently tracking.
    var recentWindow = 60
    var recentOpen = true
    var recentTitle: NSTextField?
    var recentChevron: ModeButton?
    var recentRowItems: [NSMenuItem] = []
    var recentNames: [NSTextField] = []
    var recentValues: [NSTextField] = []
    var recentBars: [BarView] = []
    var soloCandidates: [String] = []
    var soloPickOpen = false
    var soloPickItems: [NSMenuItem] = []
    var soloPickLabels: [NSTextField] = []
    var recentEmpty: NSMenuItem?
    var recentChartItem: NSMenuItem?
    var recentChart: ChartView?
    var recentPeak: NSTextField?
    var recentAxisLeft: NSTextField?
    var recentAxisRight: NSTextField?

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        // A named autosave key instead of the auto-generated "Item-0". The key
        // is what macOS stores the bar position under, and an ordinal is only
        // stable as long as this stays the app's one and only status item.
        statusItem.autosaveName = "netmeter"
        statusItem.button?.font = NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        let menu = NSMenu()
        menu.delegate = self
        menu.autoenablesItems = false
        statusItem.menu = menu
        update()
        let timer = Timer(timeInterval: 2.0, repeats: true) { _ in
            self.update()
            self.stats.refreshIfVisible()
        }
        RunLoop.main.add(timer, forMode: .common)
    }

    func update() {
        let wantRate = showRate(), wantTotal = showTotal()
        // With both readouts off the item is one glyph wide, so a stale daemon
        // has to say so inside that glyph: "⇅ …" rather than a bare arrow, which
        // would be indistinguishable from a quiet network.
        var title = (wantRate || wantTotal) ? "netmeter …" : "⇅ …"
        if let now = readJSON(home + "/.netmeter/now.json"),
           let ts = now["ts"] as? Double,
           Date().timeIntervalSince1970 - ts < 30 {
            let d = (now["down_bps"] as? Double) ?? 0
            let u = (now["up_bps"] as? Double) ?? 0
            let si = (now["session_in"] as? Double) ?? 0
            let so = (now["session_out"] as? Double) ?? 0
            var parts: [String] = []
            if wantRate {
                parts.append(combineUpDown()
                    ? "⇅\(fmtRate(d + u))"
                    : "↓\(fmtRate(d)) ↑\(fmtRate(u))")
            }
            if wantTotal {
                var tail = fmtBytes(si + so, space: false)
                if (now["tether_on"] as? Bool) == true,
                   let used = now["tether_used"] as? Double,
                   let cap = (now["tether_cap_gb"] as? NSNumber)?.doubleValue, cap > 0 {
                    tail = String(format: "⌁%.1f/%.0fG", used / GB, cap)
                }
                parts.append(tail)
            }
            title = parts.isEmpty ? "⇅" : parts.joined(separator: " · ")
        }
        statusItem.button?.title = title
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        let cfg = config()
        let now = readJSON(home + "/.netmeter/now.json")
        let paused = readJSON(home + "/.netmeter/paused.json") ?? [:]

        // Per-app rows first: the solo picker needs the same list the rows use.
        // Both sides get totalled either way, because the header shows both.
        let dayFile = readJSON(home + "/.netmeter/\(dayString(0)).json")
        let todayApps = loadApps(home + "/.netmeter/\(dayString(0)).json")
        let sessApps = sessionApps()
        var rows: [(String, Double, Double)] = []
        for (name, v) in (showSession ? sessApps : todayApps) {
            rows.append((name, v.0, v.1))
        }
        rows.sort { $0.1 + $0.2 > $1.1 + $1.2 }

        // Modes, at the top, as buttons.
        let lowOn = (cfg["lowdata"] as? Bool) ?? false
        let soloOn = (cfg["solo"] as? Bool) ?? false
        let soloApp = (cfg["solo_app"] as? String) ?? ""
        soloCandidates = rows.prefix(14).map { $0.0 }.filter { !PAUSE_DENY.contains($0) }
        if !soloApp.isEmpty && !soloCandidates.contains(soloApp) {
            soloCandidates.insert(soloApp, at: 0)
        }
        menu.addItem(modesRow(lowOn: lowOn, soloOn: soloOn, soloApp: soloApp))
        let soloLine = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        soloLine.isEnabled = false
        menu.addItem(soloLine)
        soloStatus = soloLine
        let lowLine = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        lowLine.isEnabled = false
        menu.addItem(lowLine)
        lowStatus = lowLine
        addSoloPicker(menu)
        let netItem = NSMenuItem(title: "", action: #selector(pinToggle), keyEquivalent: "")
        netItem.target = self
        menu.addItem(netItem)
        netLine = netItem
        refreshModeUI()
        menu.addItem(.separator())

        let sessStarted = (now?["session_started"] as? String) ?? ""
        let sessAge = elapsed(since: sessStarted)
        var clock = sessStarted
        if let t = clock.range(of: "T") { clock = String(clock[t.upperBound...]) }
        if clock.count >= 5 { clock = String(clock.prefix(5)) }
        if let tname = now?["tether_name"] as? String, !tname.isEmpty {
            if (now?["tether_setup"] as? Bool) == true {
                let used = (now?["tether_used"] as? Double) ?? 0
                let cap = (now?["tether_cap_gb"] as? NSNumber)?.doubleValue ?? 0
                let resets = (now?["tether_resets"] as? String) ?? ""
                let on = (now?["tether_on"] as? Bool) ?? false
                addDisabled(menu, String(format: "\u{2441} %@: %.1f of %.0f GB \u{00B7} resets %@%@",
                                         tname, used / GB, cap, resets,
                                         on ? " \u{00B7} connected" : ""))
            } else {
                addDisabled(menu, "\u{2441} \(tname): not linked \u{00B7} run `netmeter tether-here` while tethered")
            }
        }
        menu.addItem(.separator())

        let sessTotal = sessApps.values.reduce(0.0) { $0 + $1.0 + $1.1 }
        let todayTotal = todayApps.values.reduce(0.0) { $0 + $1.0 + $1.1 }
        let todayAge = elapsed(since: dayFile?["started"] as? String)
        menu.addItem(headerRow(session: (sessTotal, sessAge),
                               today: (todayTotal, todayAge), since: clock))

        // Per-app rows with an inline on/off switch (on = running, off = frozen).
        var listed = Set<String>()
        let minBytes: Double = showSession ? 100 * KB : MB
        for r in rows.prefix(10) where r.1 + r.2 >= minBytes {
            listed.insert(r.0)
            menu.addItem(appRow(r.0, r.1 + r.2,
                                pausable: !PAUSE_DENY.contains(r.0),
                                frozen: paused[r.0] != nil))
        }
        // Anything still frozen but no longer in today's top list stays reachable.
        for (name, _) in paused where !listed.contains(name) {
            menu.addItem(appRow(name, -1, pausable: true, frozen: true))
        }
        if !paused.isEmpty {
            menu.addItem(makeItem("Resume All", #selector(resumeAll)))
        }

        recentWindow = (cfg["recent_window"] as? NSNumber)?.intValue ?? 60
        recentOpen = (cfg["recent_open"] as? Bool) ?? true
        menu.addItem(.separator())
        addRecentSection(menu)

        menu.addItem(.separator())
        menu.addItem(makeItem("Open netmeter\u{2026}", #selector(openStats)))
        menu.addItem(makeItem("Preferences\u{2026}", #selector(openPrefs)))
        menu.addItem(makeItem("About netmeter", #selector(showAbout)))
        menu.addItem(makeItem("Quit netmeter bar", #selector(quit)))
    }

    // Re-reads config and updates the open menu in place. Called on every menu
    // build and again once a mode command has actually finished writing.
    func refreshModeUI() {
        let cfg = config()
        let lowOn = (cfg["lowdata"] as? Bool) ?? false
        let soloOn = (cfg["solo"] as? Bool) ?? false
        let soloApp = (cfg["solo_app"] as? String) ?? ""
        lowButton?.isOn = lowOn
        soloButton?.isOn = soloOn
        soloButton?.label = soloApp.isEmpty ? "Solo" : "Solo: \(soloApp)"
        soloStatus?.title = "\u{25C9} Solo: only \(soloApp) may use the network"
        soloStatus?.isHidden = !soloOn
        let every = (cfg["notify_every_mb"] as? NSNumber)?.intValue ?? 25
        let apps = (cfg["lowdata_apps"] as? [String]) ?? []
        let slowed = (cfg["lowdata_throttle"] as? [String]) ?? []
        let pct = (cfg["throttle_pct"] as? NSNumber)?.intValue ?? 25
        let cap = (cfg["burst_cap_mb"] as? NSNumber)?.intValue ?? 0
        // Listed hardest control first, which is the order they surprise you in.
        // The line used to name only the freezes, and a mode that now also
        // throttles and caps cannot keep saying that: reading "freezing nothing"
        // while an app crawls at a quarter speed is worse than no line at all.
        var parts: [String] = []
        if !apps.isEmpty { parts.append("freezing \(apps.joined(separator: ", "))") }
        if cap > 0 { parts.append("freezing anything over \(cap) MB/min") }
        if !slowed.isEmpty { parts.append("\(slowed.joined(separator: ", ")) at \(pct)%") }
        parts.append("notifying every \(every) MB")
        // Joined into one line this summary becomes the widest item in the
        // menu and drags the whole window out to its length, so it wraps
        // instead: parts pack onto lines capped near the per-app row width,
        // breaking only at the separators. A plain title swallows newlines,
        // so the wrapped text goes through attributedTitle, which also
        // forfeits the automatic disabled dimming; color and font are set
        // by hand to match what a disabled item renders on its own.
        let lowPrefix = "\u{25D0} Low Data: "
        var lowLines: [String] = []
        var acc = lowPrefix
        for part in parts {
            let joined = acc == lowPrefix ? acc + part : acc + " \u{00B7} " + part
            if joined.count > 52 && acc != lowPrefix {
                lowLines.append(acc)
                acc = part
            } else {
                acc = joined
            }
        }
        lowLines.append(acc)
        let lowFont = NSFont.menuFont(ofSize: 13)
        // U+2028 breaks the line without ending the paragraph, which is what
        // lets headIndent reach the continuations: they hang under the text
        // rather than under the \u{25D0} glyph.
        let lowPara = NSMutableParagraphStyle()
        lowPara.headIndent = ("\u{25D0} " as NSString)
            .size(withAttributes: [.font: lowFont]).width
        lowStatus?.attributedTitle = NSAttributedString(
            string: lowLines.joined(separator: "\u{2028}"),
            attributes: [.font: lowFont,
                         .foregroundColor: NSColor.disabledControlTextColor,
                         .paragraphStyle: lowPara])
        lowStatus?.isHidden = !lowOn

        // "Always Low Data on this network": the MAC comes from the daemon's
        // last tick (now.json), the pin lookup from config.json so the row
        // flips the instant a pin or unpin lands, not a tick later. A stale
        // now.json (daemon dead) or no readable gateway hides the row, there
        // is no network to pin.
        var mac = ""
        if let now = readJSON(home + "/.netmeter/now.json"),
           let ts = now["ts"] as? Double,
           Date().timeIntervalSince1970 - ts < 30 {
            mac = (now["net_mac"] as? String) ?? ""
        }
        let profiles = (cfg["network_profiles"] as? [String: [String: Any]]) ?? [:]
        netProfile = mac.isEmpty ? "" : ((profiles[mac]?["name"] as? String) ?? "")
        if mac.isEmpty {
            netLine?.isHidden = true
        } else if netProfile.isEmpty {
            netLine?.isHidden = false
            netLine?.state = .off
            netLine?.title = "\u{25D0} Always Low Data on this network\u{2026}"
        } else {
            // Pinned but manually switched off mid-stint reads as a lie
            // without the suffix: the checkmark says always, the mode is off.
            netLine?.isHidden = false
            netLine?.state = .on
            netLine?.title = "\u{25D0} Always Low Data here (\(netProfile))"
                + (lowOn ? "" : " \u{00B7} off until rejoin")
        }

        for (i, item) in soloPickItems.enumerated() {
            guard soloPickOpen, i < soloCandidates.count else { item.isHidden = true; continue }
            item.isHidden = false
            let name = soloCandidates[i]
            soloPickLabels[i].stringValue = (name == soloApp ? "\u{2713}  " : "     ") + name
            soloPickLabels[i].textColor = (name == soloApp) ? .labelColor : .secondaryLabelColor
        }
    }

    func addRecentSection(_ menu: NSMenu) {
        let header = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 34))
        let chev = ModeButton(frame: NSRect(x: 10, y: 6, width: 26, height: 22))
        chev.onClick = { [weak self] in self?.toggleRecentOpen() }
        v.addSubview(chev)
        recentChevron = chev
        let title = NSTextField(labelWithString: "")
        title.font = NSFont.systemFont(ofSize: 11, weight: .semibold)
        title.textColor = .secondaryLabelColor
        title.frame = NSRect(x: 42, y: 9, width: 118, height: 16)
        v.addSubview(title)
        recentTitle = title
        let seg = NSSegmentedControl(labels: RECENT_WINDOWS.map { $0.1 },
                                     trackingMode: .selectOne,
                                     target: self, action: #selector(recentWindowChanged(_:)))
        seg.controlSize = .small
        seg.appearance = NSAppearance(
            named: NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) ?? .aqua)
        seg.selectedSegment = RECENT_WINDOWS.firstIndex { $0.0 == recentWindow } ?? 2
        seg.frame = NSRect(x: 164, y: 6, width: 174, height: 21)
        v.addSubview(seg)
        header.view = v
        menu.addItem(header)

        // The chart: usage against time, above the ranked rows.
        let chartItem = NSMenuItem()
        let cv = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 104))
        let peakLabel = NSTextField(labelWithString: "")
        peakLabel.font = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .regular)
        peakLabel.textColor = .tertiaryLabelColor
        peakLabel.alignment = .right
        peakLabel.frame = NSRect(x: 24, y: 86, width: 314, height: 13)
        cv.addSubview(peakLabel)
        recentPeak = peakLabel
        let chart = ChartView(frame: NSRect(x: 24, y: 22, width: 314, height: 62))
        cv.addSubview(chart)
        recentChart = chart
        let axisL = NSTextField(labelWithString: "")
        axisL.font = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .regular)
        axisL.textColor = .tertiaryLabelColor
        axisL.frame = NSRect(x: 24, y: 5, width: 120, height: 13)
        cv.addSubview(axisL)
        recentAxisLeft = axisL
        let axisR = NSTextField(labelWithString: "now")
        axisR.font = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .regular)
        axisR.textColor = .tertiaryLabelColor
        axisR.alignment = .right
        axisR.frame = NSRect(x: 218, y: 5, width: 120, height: 13)
        cv.addSubview(axisR)
        recentAxisRight = axisR
        chartItem.view = cv
        menu.addItem(chartItem)
        recentChartItem = chartItem

        recentRowItems = []; recentNames = []; recentValues = []; recentBars = []
        for _ in 0..<6 {
            let item = NSMenuItem()
            let rv = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 22))
            let name = NSTextField(labelWithString: "")
            name.font = NSFont.menuFont(ofSize: 12)
            name.lineBreakMode = .byTruncatingTail
            name.frame = NSRect(x: 24, y: 3, width: 132, height: 16)
            rv.addSubview(name)
            let val = NSTextField(labelWithString: "")
            val.font = NSFont.monospacedDigitSystemFont(ofSize: 11, weight: .regular)
            val.textColor = .secondaryLabelColor
            val.alignment = .right
            val.frame = NSRect(x: 158, y: 3, width: 66, height: 16)
            rv.addSubview(val)
            let bar = BarView(frame: NSRect(x: 232, y: 3, width: 106, height: 16))
            rv.addSubview(bar)
            item.view = rv
            menu.addItem(item)
            recentRowItems.append(item); recentNames.append(name)
            recentValues.append(val); recentBars.append(bar)
        }
        let empty = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        empty.isEnabled = false
        menu.addItem(empty)
        recentEmpty = empty
        refreshRecent()
    }

    func refreshRecent() {
        // Six table rows, so six coloured series in the chart plus "other".
        let b = recentBreakdown(minutes: recentWindow, columns: 60,
                                topN: recentRowItems.count)
        recentTitle?.stringValue = b.grand > 0
            ? "Last \(windowLabel(recentWindow))  \(fmtBytes(b.grand, space: false))"
            : "Last \(windowLabel(recentWindow))"
        recentChevron?.label = recentOpen ? "\u{25BE}" : "\u{25B8}"
        recentChevron?.isOn = recentOpen

        recentChart?.stacks = b.columns
        recentChart?.colors = SERIES_COLORS
        recentChart?.peak = b.peak
        recentChartItem?.isHidden = !recentOpen
        recentPeak?.stringValue = b.peak > 0
            ? "peak \(fmtBytes(b.peak, space: false)) per \(b.perColumn)m"
            : ""
        recentAxisLeft?.stringValue = "-\(windowLabel(recentWindow))"
        recentAxisRight?.stringValue = "now"

        let peakRow = b.totals.first ?? 0
        for (i, item) in recentRowItems.enumerated() {
            guard recentOpen, i < b.keys.count else { item.isHidden = true; continue }
            item.isHidden = false
            recentNames[i].stringValue = b.keys[i]
            recentValues[i].stringValue = fmtBytes(b.totals[i])
            recentBars[i].fraction = peakRow > 0 ? CGFloat(b.totals[i] / peakRow) : 0
            recentBars[i].color = i < SERIES_COLORS.count ? SERIES_COLORS[i] : OTHER_COLOR
        }
        if b.other > 0 && recentOpen {
            recentEmpty?.title = "     everything else, \(fmtBytes(b.other))"
            recentEmpty?.isHidden = false
        } else {
            recentEmpty?.title = "     Nothing recorded yet. History starts when the daemon does."
            recentEmpty?.isHidden = !(recentOpen && b.grand == 0)
        }
    }

    @objc func toggleRecentOpen() {
        recentOpen.toggle()
        refreshRecent()
        runNetmeter(["display", "--recent-open", recentOpen ? "on" : "off"])
    }

    @objc func recentWindowChanged(_ sender: NSSegmentedControl) {
        let i = sender.selectedSegment
        guard i >= 0 && i < RECENT_WINDOWS.count else { return }
        recentWindow = RECENT_WINDOWS[i].0
        refreshRecent()
        runNetmeter(["display", "--recent-window", String(recentWindow)])
    }

    func modesRow(lowOn: Bool, soloOn: Bool, soloApp: String) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 38))
        let low = ModeButton(frame: NSRect(x: 10, y: 6, width: 108, height: 26))
        low.label = "Low Data"
        low.isOn = lowOn
        low.onClick = { [weak self] in self?.toggleLowData() }
        lowButton = low
        v.addSubview(low)
        let solo = ModeButton(frame: NSRect(x: 126, y: 6, width: 212, height: 26))
        solo.label = soloApp.isEmpty ? "Solo" : "Solo: \(soloApp)"
        solo.isOn = soloOn
        solo.arrowWidth = 26
        solo.onClick = { [weak self] in self?.toggleSolo() }
        solo.onArrow = { [weak self] in
            guard let self = self else { return }
            self.soloPickOpen.toggle()
            self.refreshModeUI()
        }
        soloButton = solo
        v.addSubview(solo)
        item.view = v
        return item
    }

    // Twelve pre-built rows that show and hide. NSMenu.popUp does not open from
    // inside a menu that is already tracking, which is why the first attempt at
    // a chevron pop-up did nothing at all.
    func addSoloPicker(_ menu: NSMenu) {
        soloPickItems = []; soloPickLabels = []
        for i in 0..<12 {
            let item = NSMenuItem()
            let row = PickRow(frame: NSRect(x: 0, y: 0, width: 348, height: 22))
            let label = NSTextField(labelWithString: "")
            label.font = NSFont.menuFont(ofSize: 13)
            label.lineBreakMode = .byTruncatingTail
            label.frame = NSRect(x: 34, y: 3, width: 300, height: 17)
            row.addSubview(label)
            row.onClick = { [weak self] in self?.pickSoloAt(i) }
            item.view = row
            item.isHidden = true
            menu.addItem(item)
            soloPickItems.append(item)
            soloPickLabels.append(label)
        }
    }

    func pickSoloAt(_ i: Int) {
        guard i < soloCandidates.count else { return }
        let name = soloCandidates[i]
        soloPickOpen = false
        runNetmeter(["solo", name]) { [weak self] in self?.refreshModeUI() }
        refreshModeUI()
    }

    func closeMenu() { statusItem.menu?.cancelTracking() }

    @objc func toggleSolo() {
        let cfg = config()
        if (cfg["solo"] as? Bool) ?? false {
            runNetmeter(["solo", "off"]) { [weak self] in self?.refreshModeUI() }
            return
        }
        var target = (cfg["solo_app"] as? String) ?? ""
        if target.isEmpty {
            // Nothing picked yet: solo whatever has moved the most data today,
            // which is nearly always the thing you are actually looking at.
            let source = loadApps(home + "/.netmeter/\(dayString(0)).json")
            target = source.filter { !PAUSE_DENY.contains($0.key) }
                .max { $0.value.0 + $0.value.1 < $1.value.0 + $1.value.1 }?.key ?? ""
        }
        guard !target.isEmpty else {
            soloButton?.isOn = false   // nothing to solo; undo the optimistic flip
            return
        }
        runNetmeter(["solo", target]) { [weak self] in self?.refreshModeUI() }
    }

    @objc func openStats() { stats.show() }
    @objc func openPrefs() {
        prefs.run = { [weak self] args in self?.runNetmeter(args) }
        prefs.show()
    }
    @objc func showAbout() {
        let a = NSAlert()
        a.messageText = "netmeter \(VERSION)"
        a.informativeText = """
        Per-app network meter for macOS: live speed, session and daily \
        per-app totals, app freezing, Low Data and Solo modes, and a \
        metered-network monthly cap.

        Daemon + menu bar app + Chrome extension, built July 2026 with Claude. \
        Data and settings live in ~/.netmeter (never in the repo).
        """
        a.addButton(withTitle: "OK")
        a.addButton(withTitle: "Project Page")
        NSApp.activate(ignoringOtherApps: true)
        if a.runModal() == .alertSecondButtonReturn {
            NSWorkspace.shared.open(URL(string: "https://skolk.github.io/projects/netmeter/")!)
        }
    }
    @objc func toggleLowData() {
        let on = (config()["lowdata"] as? Bool) ?? false
        runNetmeter(["lowdata", on ? "off" : "on"]) { [weak self] in self?.refreshModeUI() }
    }
    // One row, two meanings: unpinned it pins the network you are on, pinned
    // it forgets the pin. SSIDs are location-gated for CLI tools on this OS,
    // so the pin asks for a name instead of reading one, same as tether-here.
    @objc func pinToggle() {
        if netProfile.isEmpty { pinNetwork() } else { unpinNetwork() }
    }
    func pinNetwork() {
        let a = NSAlert()
        a.messageText = "Always Low Data on this network"
        a.informativeText = """
        Pins the current Low Data settings (freeze list, throttles, burst \
        cap) to this network and turns the mode on. Joining this network \
        applies them by itself; leaving restores what they replaced. \
        Flipping Low Data off while here sticks until you leave and rejoin.
        """
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 230, height: 24))
        field.placeholderString = "name this network (e.g. coworking)"
        a.accessoryView = field
        a.addButton(withTitle: "Pin")
        a.addButton(withTitle: "Cancel")
        a.window.initialFirstResponder = field
        NSApp.activate(ignoringOtherApps: true)
        guard a.runModal() == .alertFirstButtonReturn else { return }
        let name = field.stringValue.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        // Order matters: lowdata on first, so the snapshot profile-here takes
        // has the mode on and "always Low Data" is what the pin actually says.
        runNetmeter(["lowdata", "on"]) { [weak self] in
            self?.runNetmeter(["profile-here", name]) { self?.refreshModeUI() }
        }
    }
    func unpinNetwork() {
        // Forgetting the pin leaves the applied settings standing until the
        // network is left, which is the CLI's rule too; the row's state flips
        // now because refreshModeUI reads the pin from config, not the stint.
        runNetmeter(["profile", "rm", netProfile]) { [weak self] in self?.refreshModeUI() }
    }
    // The segmented control only ever showed the side you had selected, so the
    // other number cost a click to see. Both live here now, each with how long
    // it has been accumulating, and the selected one is the one in full contrast.
    func headerRow(session: (Double, String), today: (Double, String),
                   since: String) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 58))
        let seg = NSSegmentedControl(labels: ["Session", "Today"],
                                     trackingMode: .selectOne,
                                     target: self, action: #selector(modeChanged(_:)))
        seg.selectedSegment = showSession ? 0 : 1
        seg.controlSize = .small
        seg.appearance = NSAppearance(
            named: NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) ?? .aqua)
        seg.frame = NSRect(x: 10, y: 31, width: 150, height: 21)
        v.addSubview(seg)

        // Reset belongs beside the counter it resets, not adrift in a row above.
        let reset = ModeButton(frame: NSRect(x: 10, y: 4, width: 104, height: 22))
        reset.label = "Reset Session"
        reset.momentary = true
        reset.onClick = { [weak self] in
            self?.runNetmeter(["session", "reset"]) { self?.refreshModeUI() }
        }
        v.addSubview(reset)
        if !since.isEmpty {
            let started = NSTextField(labelWithString: since)
            started.font = NSFont.monospacedDigitSystemFont(ofSize: 10, weight: .regular)
            started.textColor = .tertiaryLabelColor
            started.toolTip = "This session started at \(since)"
            started.frame = NSRect(x: 120, y: 8, width: 40, height: 13)
            v.addSubview(started)
        }

        let lines = [("Session", session, showSession), ("Today", today, !showSession)]
        for (i, entry) in lines.enumerated() {
            let (name, value, active) = entry
            let (bytes, age) = value
            let right = NSTextField(labelWithString:
                age.isEmpty ? "\u{21C5}\(fmtBytes(bytes, space: false))"
                            : "\u{21C5}\(fmtBytes(bytes, space: false)) \u{00B7} \(age)")
            right.font = NSFont.monospacedDigitSystemFont(ofSize: 11,
                                                          weight: active ? .semibold : .regular)
            right.textColor = active ? .labelColor : .tertiaryLabelColor
            right.alignment = .right
            right.frame = NSRect(x: 206, y: 33 - CGFloat(i) * 16, width: 132, height: 14)
            v.addSubview(right)

            let tag = NSTextField(labelWithString: name)
            tag.font = NSFont.systemFont(ofSize: 10,
                                         weight: active ? .semibold : .regular)
            tag.textColor = active ? .secondaryLabelColor : .tertiaryLabelColor
            tag.alignment = .right
            tag.frame = NSRect(x: 162, y: 33 - CGFloat(i) * 16, width: 40, height: 14)
            v.addSubview(tag)
        }
        item.view = v
        return item
    }

    @objc func modeChanged(_ sender: NSSegmentedControl) {
        showSession = sender.selectedSegment == 0
        if let menu = statusItem.menu { menuNeedsUpdate(menu) }
    }

    func appRow(_ name: String, _ total: Double, pausable: Bool, frozen: Bool) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 26))

        let dot = NSTextField(labelWithString: "●")
        dot.font = NSFont.systemFont(ofSize: 9)
        dot.textColor = frozen ? .tertiaryLabelColor : .systemGreen
        dot.frame = NSRect(x: 10, y: 6, width: 12, height: 14)
        v.addSubview(dot)

        let label = NSTextField(labelWithString: frozen ? "\(name) (paused)" : name)
        label.font = NSFont.menuFont(ofSize: 13)
        label.textColor = frozen ? .tertiaryLabelColor : .labelColor
        label.lineBreakMode = .byTruncatingTail
        label.frame = NSRect(x: 24, y: 5, width: 172, height: 17)
        v.addSubview(label)

        let size = NSTextField(labelWithString: total < 0 ? "❄" : fmtBytes(total))
        size.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        size.textColor = frozen ? .tertiaryLabelColor : .secondaryLabelColor
        size.alignment = .right
        size.frame = NSRect(x: 198, y: 5, width: 88, height: 16)
        v.addSubview(size)

        if pausable {
            let sw = ToggleSwitch(frame: NSRect(x: 298, y: 1, width: 40, height: 24))
            sw.isOn = !frozen
            sw.onToggle = { [weak self] on in
                self?.runNetmeter([on ? "resume" : "pause", name])
            }
            v.addSubview(sw)
        }
        item.view = v
        return item
    }
    @objc func resumeAll() { runNetmeter(["resume-all"]) }
    @objc func quit() { NSApp.terminate(nil) }

    // One serial queue, and we wait for each command to exit. Two of these
    // launched back to back (Preferences saved tether settings and the display
    // option as separate calls) both read config.json, both wrote it, and the
    // loser's change vanished. The engine locks its own writes now; this keeps
    // the app from queueing a race in the first place.
    let cliQueue = DispatchQueue(label: "dev.seankolk.netmeter.cli")

    func runNetmeter(_ args: [String], then: (() -> Void)? = nil) {
        cliQueue.async {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
            p.arguments = [home + "/bin/netmeter"] + args
            try? p.run()
            p.waitUntilExit()
            if let then = then { DispatchQueue.main.async(execute: then) }
        }
    }

    func makeItem(_ title: String, _ sel: Selector) -> NSMenuItem {
        let i = NSMenuItem(title: title, action: sel, keyEquivalent: "")
        i.target = self
        return i
    }

    func addDisabled(_ menu: NSMenu, _ title: String) {
        let i = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        i.isEnabled = false
        menu.addItem(i)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
