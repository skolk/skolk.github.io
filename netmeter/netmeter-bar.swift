// netmeter-bar — menu bar readout + stats window for netmeter (compiled with swiftc).
// Menu bar: live ↓/↑ speed plus the running session total.
// Window (via "Open netmeter…"): Session / Today / Yesterday tables, auto-refreshing.
import AppKit

let home = NSHomeDirectory()

func readJSON(_ path: String) -> [String: Any]? {
    guard let data = FileManager.default.contents(atPath: path) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any]
}

// Both halves report into one file. launchd already captures the bar's stderr
// into bar.log, but what goes wrong here is usually a CLI call the bar made,
// and reading that story across two files in two formats is how three
// tracebacks sat unnoticed in bar.log for a week.
// The engine writes local time (datetime.now().isoformat) and this used to
// write ISO8601DateFormatter's default, which is UTC with a Z. Both halves
// append to the same file, so two lines about the same second sat next to
// each other seven hours apart and the log read as two interleaved days.
// One clock, and it is the one Sean's day is in.
let barStamp: DateFormatter = {
    let f = DateFormatter()
    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss"
    f.timeZone = TimeZone.current
    f.locale = Locale(identifier: "en_US_POSIX")
    return f
}()

func barLog(_ msg: String) {
    let stamp = barStamp.string(from: Date())
    let line = "\(stamp) [bar] \(msg)\n"
    let path = home + "/.netmeter/netmeter.log"
    guard let data = line.data(using: .utf8) else { return }
    if let fh = FileHandle(forWritingAtPath: path) {
        fh.seekToEndOfFile()
        fh.write(data)
        fh.closeFile()
    } else {
        try? data.write(to: URL(fileURLWithPath: path))
    }
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

// The current network's per-app split for the billing period. usage.json is
// keyed by gateway MAC, which is the identity everything else in netmeter
// already trusts, so the bar looks itself up with the MAC now.json publishes.
func networkApps(_ mac: String) -> [String: (Double, Double)] {
    guard !mac.isEmpty,
          let u = readJSON(home + "/.netmeter/usage.json"),
          let nets = u["nets"] as? [String: Any],
          let e = nets[mac] as? [String: Any],
          let apps = e["apps"] as? [String: Any] else { return [:] }
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

// "2026-08-04" -> "Aug 4". The period start is a fact about a month, and the
// year in the middle of a menu row is four characters that never change.
func shortDate(_ iso: String) -> String {
    let p = iso.split(separator: "-")
    guard p.count == 3, let m = Int(p[1]), let d = Int(p[2]),
          (1...12).contains(m) else { return "" }
    let names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "\(names[m - 1]) \(d)"
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
// already tracking, so a row that has to stay put is built from these.
// A row's switch is built before the closure that restates the row, and the
// switch needs to call it. One small box, rather than reordering a view that
// reads top to bottom the way the row is drawn.
final class StateBox {
    var set: ((String) -> Void)?
}

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
    // A row with two jobs (step the fold, or jump to an extreme) needs to know
    // which half was hit. Two nested controls would each want their own
    // tracking area inside a tracking menu, which is the mutation NSMenu does
    // not tolerate; one row and an x coordinate does not.
    override func mouseDown(with event: NSEvent) {
        if let at = onClickAt { at(convert(event.locationInWindow, from: nil).x) }
        else { onClick?() }
    }
    var onClickAt: ((CGFloat) -> Void)?
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

// Apps that get no on/off switch: system daemons, because freezing mDNSResponder
// breaks DNS rather than saving data. Claude Code used to be on this list, on
// the grounds that those processes are running work sessions. It came off on
// 2026-08-28 with solo mode: Pause All means everything, and an exception you
// cannot switch off is not one you chose.
//
// The background downloaders came off the same day for the opposite reason:
// softwareupdated, nsurlsessiond, cloudd, bird and the App Store agents are
// what pulls a six-gigabyte update over a hotspot, so Low Data stops them and
// they need a switch to let one back through.
// Mirrors PAUSE_ALL_FLOOR in the engine. Display only: the engine owns the
// number, this is the menu saying it out loud.
let PAUSE_ALL_FLOOR = 5

let PAUSE_DENY: Set<String> = [
    "mDNSResponder", "syspolicyd", "apsd", "trustd", "remindd", "gamed",
    "AddressBookSour", "com.apple.geod", "WeatherWidget", "CategoriesServi",
    "netbiosd", "networkserviceproxy (Apple relay)",
    "curl", "git-remote-http", "gh", "com.apple.Safar", "Safari (WebKit)",
    "locationd", "identityservice", "timed",
    "familycircled", "rapportd", "sharingd", "searchpartyd"
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
    // Three scopes now, so a bool no longer says it. 0 session, 1 today,
    // 2 this network for the billing period. Session stays the default and
    // stays first: the reset button belongs to it and it is the one you reach
    // for mid-task, which is why it did not simply become another row.
    var scope = 1
    // Live references into the open menu. Retitling an item and redrawing a view
    // is safe while a menu is tracking; adding or removing items is not, so the
    // two status lines are always present and toggle their isHidden instead.
    var lowButton: ModeButton?
    var lowStatus: NSMenuItem?
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
    // Per-app rows past the fold. Built into the menu but hidden, so the
    // "more" row can show them in place: fixed items toggling isHidden is the
    // one mutation a tracking menu tolerates. Three depths rather than two,
    // because "everything" is a lot of rows and "the top handful" is usually
    // the question: min shows 3, some 6, all 20.
    var appsView = "some"
    var appRowItems: [NSMenuItem] = []      // every built row, in order
    var appRowFrozen: [Bool] = []           // a frozen row is never hidden
    var appRowSetters: [(String) -> Void] = []  // restate a row without rebuilding
    var appRowPausable: [Bool] = []
    var appRowNames: [String] = []
    var menuOpen = false
    var daemonStale = false       // now.json has stopped moving
    var staleNotified = false     // one notification per stale episode, not per tick
    var daemonWasSeen = false     // so a first launch does not warn about a daemon
    var lastHealthCheck: Double = 0   // wall clock, to tell a sleep from a stall
    var wokeAt: Double = 0            // when the machine came back, for the grace
                                  // that has simply never written now.json yet
    var pauseAllButton: ModeButton?
    // Three states across one button: off, holding, hard stopped. isOn alone
    // cannot carry three, and the label changes meaning between them, so the
    // delegate keeps the pair and the button is told what to draw.
    var pauseAllOn = false
    var pauseAllHard = false
    var appsMoreLabel: NSTextField?
    var appsZoomLabel: NSTextField?
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
        // A ramp lands while the menu is sitting open, so the rows have to
        // follow it there: two small file reads on the same 2s beat the readout
        // already runs on, and only while there is a menu to see them in.
        if menuOpen { syncRowsFromPaused() }
        checkDaemonHealth()
        let wantRate = showRate(), wantTotal = showTotal()
        // With both readouts off the item is one glyph wide, so a stale daemon
        // has to say so inside that glyph: "⇅ …" rather than a bare arrow, which
        // would be indistinguishable from a quiet network.
        var title = (wantRate || wantTotal) ? "netmeter …" : "⇅ …"
        if daemonStale { title = (wantRate || wantTotal) ? "netmeter ⚠︎" : "⚠︎" }
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

    func menuWillOpen(_ menu: NSMenu) { menuOpen = true }
    func menuDidClose(_ menu: NSMenu) { menuOpen = false }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        let cfg = config()
        let now = readJSON(home + "/.netmeter/now.json")
        let paused = readJSON(home + "/.netmeter/paused.json") ?? [:]
        let ramping = readJSON(home + "/.netmeter/ramping.json") ?? [:]
        // Pause All's soft stage parks apps in throttled.json rather than
        // paused.json, so a row that reads only the freezes would show an app
        // held at 5% as running normally.
        let throttled = readJSON(home + "/.netmeter/throttled.json") ?? [:]

        // Both sides get totalled either way, because the header shows both.
        let dayFile = readJSON(home + "/.netmeter/\(dayString(0)).json")
        let todayApps = loadApps(home + "/.netmeter/\(dayString(0)).json")
        let sessApps = sessionApps()
        let netMac = (now?["net_mac"] as? String) ?? ""
        let netApps = networkApps(netMac)
        var rows: [(String, Double, Double)] = []
        for (name, v) in (scope == 0 ? sessApps : scope == 1 ? todayApps : netApps) {
            rows.append((name, v.0, v.1))
        }
        rows.sort { $0.1 + $0.2 > $1.1 + $1.2 }

        // Above the mode buttons on purpose: a switch that reads ON while
        // nothing is enforcing it is the thing being warned about, so the
        // warning cannot sit underneath it.
        if daemonStale {
            let age = daemonAge()
            let howLong = age == nil ? "" : " (\(fmtDuration(age!)) ago)"
            addDisabledWrapped(menu, glyph: "\u{26A0}",
                               "netmeter has stopped reporting\(howLong). "
                               + staleConsequence(), color: .systemOrange)
            menu.addItem(.separator())
        }

        // Modes, at the top, as buttons.
        let lowOn = (cfg["lowdata"] as? Bool) ?? false
        menu.addItem(modesRow(lowOn: lowOn))
        let lowLine = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        lowLine.isEnabled = false
        menu.addItem(lowLine)
        lowStatus = lowLine
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
                addDisabledWrapped(menu, glyph: "\u{2441}",
                                   String(format: "%@: %.1f of %.0f GB \u{00B7} resets %@%@",
                                          tname, used / GB, cap, resets,
                                          on ? " \u{00B7} connected" : ""))
                // A counter reading zero looks the same whether you have been
                // careful or the link is dead. The daemon works out which.
                if let warn = now?["tether_warn"] as? String, !warn.isEmpty {
                    addDisabledWrapped(menu, glyph: "\u{26A0}", warn,
                                       color: .systemOrange)
                }
            } else {
                addDisabledWrapped(menu, glyph: "\u{2441}",
                                   "\(tname): not linked \u{00B7} run "
                                   + "`netmeter tether-here` while tethered")
            }
        }
        menu.addItem(.separator())

        let sessTotal = sessApps.values.reduce(0.0) { $0 + $1.0 + $1.1 }
        let todayTotal = todayApps.values.reduce(0.0) { $0 + $1.0 + $1.1 }
        let todayAge = elapsed(since: dayFile?["started"] as? String)
        // Off the interface, not the app table: this is the number that has to
        // agree with the cap line above, and the per-app rows underneath run
        // 10-15% under it for the reason `netmeter tether` spells out.
        let netTotal = (now?["net_used"] as? NSNumber)?.doubleValue ?? 0
        let netName = (now?["net_name"] as? String) ?? ""
        let netSince = shortDate((now?["net_period_start"] as? String) ?? "")
        menu.addItem(headerRow(session: (sessTotal, sessAge),
                               today: (todayTotal, todayAge),
                               network: (netTotal, netSince.isEmpty ? ""
                                                 : "since \(netSince)"),
                               netName: netName, since: clock))

        // Per-app rows with an inline on/off switch (on = running, off = frozen).
        // All twenty are built; how many show is the fold's business.
        appsView = appsViewFrom(cfg)
        appRowItems = []
        appRowFrozen = []
        var listed = Set<String>()
        // A billing period's worth of bytes needs a coarser floor than a day's
        // or the list is thirty rows of system chatter.
        let minBytes: Double = scope == 0 ? 100 * KB : scope == 1 ? MB : 10 * MB
        appRowSetters = []
        appRowPausable = []
        appRowNames = []
        for r in rows.filter({ $0.1 + $0.2 >= minBytes }).prefix(20) {
            listed.insert(r.0)
            let frozen = paused[r.0] != nil
            let pausable = !PAUSE_DENY.contains(r.0)
            let st = frozen ? "paused"
                   : ramping[r.0] != nil ? "stopping"
                   : throttled[r.0] != nil ? "slow" : "run"
            let (item, setState) = appRow(r.0, r.1 + r.2,
                                          pausable: pausable, state: st)
            menu.addItem(item)
            appRowItems.append(item)
            appRowFrozen.append(frozen)
            appRowSetters.append(setState)
            appRowPausable.append(pausable)
            appRowNames.append(r.0)
        }
        if appRowItems.count > appsShown("min") {
            menu.addItem(appsMoreRow())
        } else {
            appsMoreLabel = nil
            appsZoomLabel = nil
        }
        applyAppsView()
        // Anything still frozen but no longer in today's top list stays reachable.
        for (name, _) in paused where !listed.contains(name) {
            menu.addItem(appRow(name, -1, pausable: true, state: "paused").0)
        }
        // Pause All in two stages: the soft one slows everything to a trickle
        // and holds it there, and Hard Stop is the second press that freezes
        // the lot. It replaced solo mode on 2026-08-28, which was this with the
        // allow list capped at one, and grew the second stage the same day
        // after the single-stage version froze the editor it was pressed from.
        let pauseOn = (cfg["pause_all"] as? Bool) ?? false
        let hardOn = pauseOn && ((cfg["pause_all_hard"] as? Bool) ?? false)
        if pauseOn {
            let allowed = (cfg["pause_all_allow"] as? [String]) ?? []
            let frozen = paused.filter { ($0.value as? [String: Any])?["reason"] as? String == "all" }
            let stage = hardOn ? "\(frozen.count) app\(frozen.count == 1 ? "" : "s") frozen"
                               : "everything at \(PAUSE_ALL_FLOOR)%"
            // Wrapped, because the allow list grows a name at a time and a
            // plain title would drag the menu wider with every app let back in.
            addDisabledWrapped(menu, glyph: "\u{25D1}", allowed.isEmpty
                ? "Pause All is on \u{00B7} \(stage)"
                : "Pause All is on \u{00B7} \(stage) \u{00B7} allowed: \(allowed.joined(separator: ", "))")
        }
        menu.addItem(pauseAllRow(on: pauseOn, hard: hardOn))

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
        lowButton?.isOn = lowOn
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
        if (cfg["lowdata_background"] as? Bool) ?? true {
            parts.append("no background downloads")
        }
        if (cfg["update_prefs"] as? Bool) ?? true { parts.append("no update checks") }
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

    // Low Data is the only mode button now. Solo retired on 2026-08-28 into
    // Pause All, which lives under the app list because that is where its
    // exceptions are made: one switch at a time, on the rows themselves.
    func modesRow(lowOn: Bool) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 38))
        let low = ModeButton(frame: NSRect(x: 10, y: 6, width: 328, height: 26))
        low.label = "Low Data"
        low.isOn = lowOn
        low.onClick = { [weak self] in self?.toggleLowData() }
        lowButton = low
        v.addSubview(low)
        item.view = v
        return item
    }

    // How many app rows each depth shows.
    func appsShown(_ view: String) -> Int {
        switch view {
        case "min": return 3
        case "all": return 20
        default: return 6
        }
    }

    // apps_view is the current key; apps_open was the older two-state one, and
    // a config written before this change still has to land somewhere sensible.
    func appsViewFrom(_ cfg: [String: Any]) -> String {
        if let v = cfg["apps_view"] as? String, ["min", "some", "all"].contains(v) {
            return v
        }
        return ((cfg["apps_open"] as? Bool) ?? false) ? "all" : "some"
    }

    // The fold under the app rows. One PickRow with two hit zones: the label
    // steps down a depth (min -> some -> all -> min), the glyph on the right
    // jumps straight to the far end, so maximize and minimize are each one
    // click from anywhere. Clicking never closes the menu; the depth persists
    // through config so the menu reopens the way it was left.
    func appsMoreRow() -> NSMenuItem {
        let item = NSMenuItem()
        let row = PickRow(frame: NSRect(x: 0, y: 0, width: 348, height: 22))
        let label = NSTextField(labelWithString: "")
        label.font = NSFont.menuFont(ofSize: 13)
        label.textColor = .secondaryLabelColor
        label.frame = NSRect(x: 24, y: 3, width: 262, height: 17)
        row.addSubview(label)
        let zoom = NSTextField(labelWithString: "")
        zoom.font = NSFont.menuFont(ofSize: 13)
        zoom.textColor = .tertiaryLabelColor
        zoom.alignment = .right
        zoom.frame = NSRect(x: 286, y: 3, width: 52, height: 17)
        row.addSubview(zoom)
        row.onClickAt = { [weak self] x in
            guard let self = self else { return }
            self.setAppsView(x > 280 ? (self.appsView == "all" ? "min" : "all")
                                     : self.nextAppsView())
        }
        item.view = row
        appsMoreLabel = label
        appsZoomLabel = zoom
        return item
    }

    func nextAppsView() -> String {
        switch appsView {
        case "min": return "some"
        case "some": return "all"
        default: return "min"
        }
    }

    // Hide and show in place. A frozen row is never hidden whatever the depth:
    // the switch that unfreezes it must not be behind the fold that lists it.
    func applyAppsView() {
        let shown = appsShown(appsView)
        for (i, item) in appRowItems.enumerated() {
            item.isHidden = i >= shown && !appRowFrozen[i]
        }
        let hidden = appRowItems.enumerated()
            .filter { $0.offset >= shown && !appRowFrozen[$0.offset] }.count
        appsMoreLabel?.stringValue = hidden > 0
            ? "\u{25B8} \(hidden) more app\(hidden == 1 ? "" : "s")"
            : "\u{25BE} Show fewer"
        appsZoomLabel?.stringValue = appsView == "all" ? "\u{2921}" : "\u{2922}"
        appsZoomLabel?.toolTip = appsView == "all" ? "Show the top three"
                                                   : "Show every app"
    }

    func setAppsView(_ view: String) {
        appsView = view
        applyAppsView()
        runNetmeter(["display", "--apps-view", view])
    }

    // Pause All and Resume All, side by side under the list. The left button is
    // one control that escalates: press it once and everything drops to a
    // trickle, press it again and the trickle becomes a freeze. Two presses for
    // the destructive half is the whole point, because the single-press version
    // froze the editor it was pressed from. Resume All is the other end of both.
    func pauseAllRow(on: Bool, hard: Bool) -> NSMenuItem {
        pauseAllOn = on
        pauseAllHard = hard
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 30))
        let pauseBtn = ModeButton(frame: NSRect(x: 10, y: 3, width: 152, height: 24))
        pauseBtn.momentary = true      // three states, so isOn is set by hand
        pauseAllButton = pauseBtn
        applyPauseAllButton()
        pauseBtn.onClick = { [weak self] in
            guard let self = self else { return }
            // off -> holding -> frozen -> holding. Never off from here: that is
            // what Resume All is for, and an escalating button that also
            // reverses all the way is a button you cannot read.
            let arg: String
            if !self.pauseAllOn {
                self.pauseAllOn = true; self.pauseAllHard = false
                arg = "on"
                self.setAllRows("stopping")
            } else if !self.pauseAllHard {
                self.pauseAllHard = true
                arg = "hard"
                self.setAllRows("paused")
            } else {
                self.pauseAllHard = false
                arg = "soft"
                self.setAllRows("slow")
            }
            self.applyPauseAllButton()
            self.runNetmeter(["pause-all", arg]) {
                self.syncRowsFromPaused()
                self.refreshModeUI()
            }
        }
        v.addSubview(pauseBtn)
        let resumeBtn = ModeButton(frame: NSRect(x: 176, y: 3, width: 152, height: 24))
        resumeBtn.label = "Resume All"
        resumeBtn.momentary = true
        resumeBtn.onClick = { [weak self] in
            guard let self = self else { return }
            self.setAllRows("run")
            self.pauseAllOn = false
            self.pauseAllHard = false
            self.applyPauseAllButton()
            self.runNetmeter(["resume-all"]) {
                self.syncRowsFromPaused()
                self.refreshModeUI()
            }
        }
        v.addSubview(resumeBtn)
        item.view = v
        return item
    }

    // The left button, drawn from the pair. Filled only when it is a hard stop,
    // so the loudest state is the one that looks loudest.
    func applyPauseAllButton() {
        guard let b = pauseAllButton else { return }
        b.label = !pauseAllOn ? "Pause All"
                : pauseAllHard ? "Hard Stop is on" : "Hard Stop"
        b.isOn = pauseAllHard
        b.toolTip = !pauseAllOn
            ? "Slow every app that is not allowed to \(PAUSE_ALL_FLOOR)% and hold it there"
            : pauseAllHard ? "Back to \(PAUSE_ALL_FLOOR)%, windows responsive again"
                           : "Freeze everything Pause All is holding"
    }

    // Restate every switch at once. The CLI is the truth and it runs a beat
    // later; this is the menu keeping up with a click the user just made,
    // because the alternative is a dozen switches reading "on" over a dozen
    // frozen apps until the menu is closed and reopened.
    func setAllRows(_ state: String) {
        for (i, set) in appRowSetters.enumerated() where appRowPausable[i] {
            set(state)
        }
    }

    // ...and then the correction, once the engine has actually run. The bar's
    // PAUSE_DENY and the engine's NEVER_FREEZE are not the same list, so an
    // optimistic sweep greys out a row or two the engine declined to touch.
    // Reading back what it really froze costs one small file.
    func syncRowsFromPaused() {
        let paused = readJSON(home + "/.netmeter/paused.json") ?? [:]
        let ramping = readJSON(home + "/.netmeter/ramping.json") ?? [:]
        let throttled = readJSON(home + "/.netmeter/throttled.json") ?? [:]
        for (i, set) in appRowSetters.enumerated() where appRowPausable[i] {
            let name = appRowNames[i]
            set(paused[name] != nil ? "paused"
                : ramping[name] != nil ? "stopping"
                : throttled[name] != nil ? "slow" : "run")
        }
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
        per-app totals, app freezing, Low Data and Pause All, and a \
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
                   network: (Double, String), netName: String,
                   since: String) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 80))
        // The control moved onto its own row when the third scope arrived.
        // Three labels do not fit beside the numbers in 348 points, and the
        // numbers are the part you came to read.
        let seg = NSSegmentedControl(labels: ["Session", "Today", "Network"],
                                     trackingMode: .selectOne,
                                     target: self, action: #selector(modeChanged(_:)))
        seg.selectedSegment = scope
        seg.controlSize = .small
        seg.appearance = NSAppearance(
            named: NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) ?? .aqua)
        seg.frame = NSRect(x: 10, y: 56, width: 200, height: 21)
        v.addSubview(seg)

        // Reset belongs beside the counter it resets, not adrift in a row above.
        let reset = ModeButton(frame: NSRect(x: 10, y: 14, width: 104, height: 22))
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
            started.frame = NSRect(x: 118, y: 18, width: 28, height: 13)
            v.addSubview(started)
        }

        // All three at once, each with the span it covers, and the selected one
        // in full contrast. The other numbers used to cost a click to see.
        let netTag = netName.isEmpty ? "Network" : netName
        let lines = [("Session", session, 0), ("Today", today, 1),
                     (netTag, network, 2)]
        for (i, entry) in lines.enumerated() {
            let (name, value, which) = entry
            let (bytes, age) = value
            let active = which == scope
            let right = NSTextField(labelWithString:
                age.isEmpty ? "\u{21C5}\(fmtBytes(bytes, space: false))"
                            : "\u{21C5}\(fmtBytes(bytes, space: false)) \u{00B7} \(age)")
            right.font = NSFont.monospacedDigitSystemFont(ofSize: 11,
                                                          weight: active ? .semibold : .regular)
            right.textColor = active ? .labelColor : .tertiaryLabelColor
            right.alignment = .right
            right.frame = NSRect(x: 210, y: 38 - CGFloat(i) * 16, width: 128, height: 14)
            v.addSubview(right)

            let tag = NSTextField(labelWithString: name)
            tag.font = NSFont.systemFont(ofSize: 10,
                                         weight: active ? .semibold : .regular)
            tag.textColor = active ? .secondaryLabelColor : .tertiaryLabelColor
            tag.alignment = .right
            tag.lineBreakMode = .byTruncatingTail
            if which == 2 {
                tag.toolTip = "Everything this network has moved this billing "
                            + "period, off the interface. The rows below count "
                            + "payload and run 10-15% under it."
            }
            tag.frame = NSRect(x: 148, y: 38 - CGFloat(i) * 16, width: 58, height: 14)
            v.addSubview(tag)
        }
        item.view = v
        return item
    }

    @objc func modeChanged(_ sender: NSSegmentedControl) {
        scope = sender.selectedSegment
        if let menu = statusItem.menu { menuNeedsUpdate(menu) }
    }

    // Returns the row and a closure that restates it. Three states, not two:
    // an app on the way down is neither running nor stopped, and showing it as
    // either is a lie for the ten seconds it takes to land. Pause All flips a
    // dozen of these at once, and rebuilding the menu to show that is the one
    // thing a tracking NSMenu will not survive.
    func appRow(_ name: String, _ total: Double, pausable: Bool,
                state: String) -> (NSMenuItem, (String) -> Void) {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 26))

        let dot = NSTextField(labelWithString: "●")
        dot.font = NSFont.systemFont(ofSize: 9)
        dot.frame = NSRect(x: 10, y: 6, width: 12, height: 14)
        v.addSubview(dot)

        let label = NSTextField(labelWithString: name)
        label.font = NSFont.menuFont(ofSize: 13)
        label.lineBreakMode = .byTruncatingTail
        label.frame = NSRect(x: 24, y: 5, width: 172, height: 17)
        v.addSubview(label)

        let size = NSTextField(labelWithString: total < 0 ? "❄" : fmtBytes(total))
        size.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        size.alignment = .right
        size.frame = NSRect(x: 198, y: 5, width: 88, height: 16)
        v.addSubview(size)

        var toggle: ToggleSwitch?
        let setStateBox = StateBox()
        if pausable {
            let sw = ToggleSwitch(frame: NSRect(x: 298, y: 1, width: 40, height: 24))
            sw.onToggle = { [weak self] on in
                guard let self = self else { return }
                // The engine ramps rather than freezing, so the row says
                // "stopping" until the daemon reports it actually landed.
                setStateBox.set?(on ? "run" : "stopping")
                self.runNetmeter([on ? "resume" : "pause", name]) {
                    self.syncRowsFromPaused()
                }
            }
            v.addSubview(sw)
            toggle = sw
        }
        // Four states, and "slow" is the one Pause All normally leaves an app
        // in: alive, throttled to a trickle, still doing its job badly rather
        // than not at all. It reads as on, because it is, and the switch still
        // means "let this one through at full speed".
        let setState: (String) -> Void = { st in
            let running = st == "run"
            dot.textColor = st == "run" ? .systemGreen
                          : st == "slow" ? .systemYellow
                          : st == "stopping" ? .systemOrange : .tertiaryLabelColor
            label.stringValue = st == "run" ? name
                              : st == "slow" ? "\(name) (slow)"
                              : st == "stopping" ? "\(name) (stopping\u{2026})"
                              : "\(name) (paused)"
            label.textColor = st == "paused" ? .tertiaryLabelColor : .labelColor
            size.textColor = st == "paused" ? .tertiaryLabelColor : .secondaryLabelColor
            toggle?.isOn = running || st == "slow"
        }
        setStateBox.set = setState
        setState(state)
        item.view = v
        return (item, setState)
    }
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
            do {
                try p.run()
                p.waitUntilExit()
                if p.terminationStatus != 0 {
                    barLog("netmeter \(args.joined(separator: " ")) exited "
                           + "\(p.terminationStatus)")
                }
            } catch {
                barLog("could not run netmeter \(args.joined(separator: " ")): \(error)")
            }
            if let then = then { DispatchQueue.main.async(execute: then) }
        }
    }

    // --- the stale-daemon watchdog (design item 2) --------------------------
    // Every control in netmeter is enforced by the daemon. launchd restarts one
    // that crashes, but a wedged one (a hung nettop under `script`, a stuck
    // lock) enforces nothing for as long as it stays up, and the only thing the
    // bar used to do about it was quietly degrade the readout to "⇅ …", which
    // looks exactly like a quiet network. Low Data reads as on, and nothing is
    // holding anything down. Hit for real on 2026-08-28, when a failed install
    // left no daemon at all and the bar said nothing.
    //
    // The bar is the right place to watch from precisely because it is the half
    // that is not the daemon. No second watchdog process: this is the 2s
    // readout timer noticing that now.json has stopped moving.
    static let staleAfter: Double = 60

    func daemonAge() -> Double? {
        guard let now = readJSON(home + "/.netmeter/now.json"),
              let ts = now["ts"] as? Double else { return nil }
        return Date().timeIntervalSince1970 - ts
    }

    // What is set but not being enforced, named rather than left to be inferred.
    func staleConsequence() -> String {
        let cfg = config()
        var on: [String] = []
        if (cfg["lowdata"] as? Bool) ?? false { on.append("Low Data") }
        if (cfg["pause_all"] as? Bool) ?? false { on.append("Pause All") }
        if on.isEmpty { return "Nothing is being enforced." }
        return "\(on.joined(separator: " and ")) \(on.count > 1 ? "are" : "is") "
               + "set but not enforced."
    }

    func checkDaemonHealth() {
        // A machine that slept looks exactly like a daemon that stopped: both
        // leave now.json minutes old. The difference is whether *this* process
        // was running through it, and the 2s readout timer answers that for
        // free. If the bar's own clock skipped as far as the daemon's did, the
        // whole laptop was away and nothing needed enforcing while it was.
        //
        // This was not a small false positive. 372 of the log's 831 lines were
        // this warning and its all-clear, roughly 80 a day against ~576
        // sleep/wake cycles since the last boot, and every one of them a
        // notification. A watchdog that cries that often is one you stop
        // reading, which is the failure mode it exists to prevent.
        let now = Date().timeIntervalSince1970
        let barGap = lastHealthCheck == 0 ? 0 : now - lastHealthCheck
        lastHealthCheck = now
        if barGap > AppDelegate.staleAfter { wokeAt = now }
        if wokeAt != 0 && now - wokeAt < AppDelegate.staleAfter {
            // The grace after a wake. now.json is minutes old because the whole
            // machine was away, and the daemon samples every few seconds, so it
            // needs a moment to be current again. Two seconds is not that
            // moment: give it the same 60s any daemon gets before it counts as
            // silent, or this trades one false alarm for another at every wake.
            staleNotified = false
            daemonStale = false
            return
        }
        let age = daemonAge()
        // No now.json at all is a daemon that has never run, not one that
        // stopped: a first launch should not fire a warning at nobody.
        let stale = age == nil ? daemonWasSeen : age! > AppDelegate.staleAfter
        if age != nil && age! <= AppDelegate.staleAfter { daemonWasSeen = true }
        if stale && !staleNotified {
            staleNotified = true
            let msg = "netmeter has stopped reporting. \(staleConsequence())"
            barLog("watchdog: \(msg)")
            notifyUser(msg)
        } else if !stale && staleNotified {
            // Recovery re-arms in silence. The daemon coming back is the good
            // outcome and does not need a notification of its own.
            staleNotified = false
            barLog("watchdog: daemon reporting again")
        }
        daemonStale = stale
    }

    // osascript, the same door the engine's notify() uses. netmeter-bar is a
    // bare executable rather than an .app bundle, so UNUserNotificationCenter
    // has no bundle identifier to register against and does nothing.
    func notifyUser(_ text: String) {
        let safe = text.replacingOccurrences(of: "\"", with: "'")
        cliQueue.async {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
            p.arguments = ["-e", "display notification \"\(safe)\" with title \"netmeter\""]
            try? p.run()
            p.waitUntilExit()
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

    // A disabled row whose text wraps instead of setting the menu's width.
    // One long sentence in a plain title drags the whole window out to its
    // length, which is what a single tether warning did to the menu. A title
    // swallows newlines, so wrapped text has to go through attributedTitle,
    // which also forfeits the automatic disabled dimming: colour and font are
    // set by hand. U+2028 breaks the line without ending the paragraph, so
    // headIndent can hang the continuations under the text rather than under
    // the glyph.
    func addDisabledWrapped(_ menu: NSMenu, glyph: String, _ text: String,
                            color: NSColor = .disabledControlTextColor,
                            width: Int = 48) {
        let font = NSFont.menuFont(ofSize: 13)
        var lines: [String] = []
        var acc = ""
        for word in text.split(separator: " ").map(String.init) {
            let joined = acc.isEmpty ? word : acc + " " + word
            if joined.count > width && !acc.isEmpty {
                lines.append(acc)
                acc = word
            } else {
                acc = joined
            }
        }
        if !acc.isEmpty { lines.append(acc) }
        let para = NSMutableParagraphStyle()
        para.headIndent = ((glyph + " ") as NSString)
            .size(withAttributes: [.font: font]).width
        let item = NSMenuItem(title: "", action: nil, keyEquivalent: "")
        item.isEnabled = false
        item.attributedTitle = NSAttributedString(
            string: glyph + " " + lines.joined(separator: "\u{2028}"),
            attributes: [.font: font, .foregroundColor: color,
                         .paragraphStyle: para])
        menu.addItem(item)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
