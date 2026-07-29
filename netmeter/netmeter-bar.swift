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

func fmtBytes(_ b: Double) -> String {
    if b >= 1073741824 { return String(format: "%.2f GB", b / 1073741824) }
    if b >= 1048576 { return String(format: "%.1f MB", b / 1048576) }
    return String(format: "%.0f KB", b / 1024)
}

func fmtRate(_ bps: Double) -> String {
    if bps >= 1048576 { return String(format: "%.1fM", bps / 1048576) }
    return String(format: "%.0fK", max(0, bps) / 1024)
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
        switch seg.selectedSegment {
        case 1:
            apps = loadApps(home + "/.netmeter/\(today).json")
            label = "Today"
        case 2:
            apps = loadApps(home + "/.netmeter/\(dayString(1)).json")
            label = "Yesterday"
        default:
            apps = sessionApps()
            label = "Session"
        }
        rows = apps.map { ($0.key, $0.value.0, $0.value.1) }
            .filter { $0.1 + $0.2 >= 1024 }
            .sorted { $0.1 + $0.2 > $1.1 + $1.2 }
        let ti = rows.reduce(0.0) { $0 + $1.1 }
        let to = rows.reduce(0.0) { $0 + $1.2 }
        var speed = ""
        if let now = readJSON(home + "/.netmeter/now.json"),
           let ts = now["ts"] as? Double, Date().timeIntervalSince1970 - ts < 30 {
            let d = (now["down_bps"] as? Double) ?? 0
            let u = (now["up_bps"] as? Double) ?? 0
            speed = "   ·   now ↓\(fmtRate(d))/s ↑\(fmtRate(u))/s"
        }
        header.stringValue = "\(label): ↓\(fmtBytes(ti))  ↑\(fmtBytes(to))  =  \(fmtBytes(ti + to))\(speed)"
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

class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    var statusItem: NSStatusItem!
    let stats = StatsWindow()
    var showSession = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
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
        var title = "netmeter …"
        if let now = readJSON(home + "/.netmeter/now.json"),
           let ts = now["ts"] as? Double,
           Date().timeIntervalSince1970 - ts < 30 {
            let d = (now["down_bps"] as? Double) ?? 0
            let u = (now["up_bps"] as? Double) ?? 0
            let si = (now["session_in"] as? Double) ?? 0
            let so = (now["session_out"] as? Double) ?? 0
            title = "↓\(fmtRate(d)) ↑\(fmtRate(u)) · \(fmtBytes(si + so))"
        }
        statusItem.button?.title = title
    }

    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.removeAllItems()
        menu.addItem(makeItem("Open netmeter…", #selector(openStats)))
        menu.addItem(.separator())
        let now = readJSON(home + "/.netmeter/now.json")
        let si = (now?["session_in"] as? Double) ?? 0
        let so = (now?["session_out"] as? Double) ?? 0
        var started = (now?["session_started"] as? String) ?? ""
        if let t = started.range(of: "T") { started = String(started[t.upperBound...]) }
        let since = started.isEmpty ? "" : "  (since \(started))"
        addDisabled(menu, "Session: ↓\(fmtBytes(si)) ↑\(fmtBytes(so))\(since)")
        menu.addItem(makeItem("Reset Session", #selector(resetSession)))
        menu.addItem(.separator())

        var rows: [(String, Double, Double)] = []
        let source = showSession ? sessionApps() : loadApps(home + "/.netmeter/\(dayString(0)).json")
        for (name, v) in source {
            rows.append((name, v.0, v.1))
        }
        rows.sort { $0.1 + $0.2 > $1.1 + $1.2 }
        let ti = rows.reduce(0.0) { $0 + $1.1 }
        let to = rows.reduce(0.0) { $0 + $1.2 }
        menu.addItem(headerRow(ti, to))

        // Per-app rows with an inline on/off switch (on = running, off = frozen).
        // System daemons get no switch (freezing mDNSResponder would break DNS),
        // nor does Claude Code (those processes are the running work sessions).
        let deny: Set<String> = [
            "Claude Code", "mDNSResponder", "syspolicyd", "apsd", "cloudd",
            "nsurlsessiond", "trustd", "remindd", "gamed", "storekitagent",
            "appstoreagent", "amsengagementd", "managedappdistr", "mstreamd",
            "AddressBookSour", "com.apple.geod", "WeatherWidget", "CategoriesServi",
            "netbiosd", "networkserviceproxy (Apple relay)", "AssetCacheLocat",
            "curl", "git-remote-http", "gh", "com.apple.Safar", "Safari (WebKit)",
            "locationd", "bird", "identityservice", "softwareupdated", "timed",
            "parsec-fbf", "familycircled", "rapportd", "sharingd", "searchpartyd"
        ]
        let paused = readJSON(home + "/.netmeter/paused.json") ?? [:]
        var listed = Set<String>()
        let minBytes: Double = showSession ? 102400 : 1048576
        for r in rows.prefix(10) where r.1 + r.2 >= minBytes {
            listed.insert(r.0)
            menu.addItem(appRow(r.0, r.1 + r.2,
                                pausable: !deny.contains(r.0),
                                frozen: paused[r.0] != nil))
        }
        // Anything still frozen but no longer in today's top list stays reachable.
        for (name, _) in paused where !listed.contains(name) {
            menu.addItem(appRow(name, -1, pausable: true, frozen: true))
        }
        if !paused.isEmpty {
            menu.addItem(makeItem("Resume All", #selector(resumeAll)))
        }
        menu.addItem(.separator())

        let cfg = readJSON(home + "/.netmeter/config.json")
        let lowOn = (cfg?["lowdata"] as? Bool) ?? false
        let apps = (cfg?["lowdata_apps"] as? [String]) ?? []
        let every = (cfg?["notify_every_mb"] as? NSNumber)?.intValue ?? 25
        var lowTitle = "Low Data Mode (notify every \(every) MB)"
        if !apps.isEmpty { lowTitle += " · freezes \(apps.joined(separator: ", "))" }
        let low = makeItem(lowTitle, #selector(toggleLowData))
        low.state = lowOn ? .on : .off
        menu.addItem(low)
        menu.addItem(.separator())
        menu.addItem(makeItem("Quit netmeter bar", #selector(quit)))
    }

    @objc func openStats() { stats.show() }
    @objc func resetSession() { runNetmeter(["session", "reset"]) }
    @objc func toggleLowData() {
        let on = (readJSON(home + "/.netmeter/config.json")?["lowdata"] as? Bool) ?? false
        runNetmeter(["lowdata", on ? "off" : "on"])
    }
    func headerRow(_ totalIn: Double, _ totalOut: Double) -> NSMenuItem {
        let item = NSMenuItem()
        let v = NSView(frame: NSRect(x: 0, y: 0, width: 348, height: 30))
        let seg = NSSegmentedControl(labels: ["Session", "Today"],
                                     trackingMode: .selectOne,
                                     target: self, action: #selector(modeChanged(_:)))
        seg.selectedSegment = showSession ? 0 : 1
        seg.controlSize = .small
        seg.appearance = NSAppearance(
            named: NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) ?? .aqua)
        seg.frame = NSRect(x: 10, y: 4, width: 150, height: 21)
        v.addSubview(seg)
        let totals = NSTextField(labelWithString: "↓\(fmtBytes(totalIn)) ↑\(fmtBytes(totalOut))")
        totals.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .medium)
        totals.textColor = .secondaryLabelColor
        totals.alignment = .right
        totals.frame = NSRect(x: 166, y: 7, width: 172, height: 16)
        v.addSubview(totals)
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
            let sw = NSSwitch(frame: NSRect(x: 296, y: 2, width: 44, height: 22))
            sw.controlSize = .small
            // Menus render controls with a vibrant appearance that washes out the
            // switch tint; pinning the standard appearance restores the full color.
            sw.appearance = NSAppearance(
                named: NSApp.effectiveAppearance.bestMatch(from: [.aqua, .darkAqua]) ?? .aqua)
            sw.state = frozen ? .off : .on
            sw.target = self
            sw.action = #selector(switchToggled(_:))
            sw.identifier = NSUserInterfaceItemIdentifier(name)
            v.addSubview(sw)
        }
        item.view = v
        return item
    }

    @objc func switchToggled(_ sender: NSSwitch) {
        guard let name = sender.identifier?.rawValue else { return }
        runNetmeter([sender.state == .off ? "pause" : "resume", name])
    }
    @objc func resumeAll() { runNetmeter(["resume-all"]) }
    @objc func quit() { NSApp.terminate(nil) }

    func runNetmeter(_ args: [String]) {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/python3")
        p.arguments = [home + "/bin/netmeter"] + args
        try? p.run()
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
