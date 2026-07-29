#!/bin/sh
# Install netmeter: engine + menu bar app + LaunchAgents (start at login, restart on crash).
# Run from the repo root: ./install.sh
set -e
cd "$(dirname "$0")"
UID_NUM=$(id -u)

mkdir -p "$HOME/bin" "$HOME/.netmeter/src" "$HOME/Library/LaunchAgents"

cp netmeter "$HOME/bin/netmeter"
chmod +x "$HOME/bin/netmeter"
cp netmeter-bar.swift "$HOME/.netmeter/src/netmeter-bar.swift"
echo "Compiling menu bar app..."
swiftc -swift-version 5 -O -o "$HOME/bin/netmeter-bar" netmeter-bar.swift

for name in netmeter netmeterbar; do
  launchctl bootout "gui/$UID_NUM/com.seankolk.$name" 2>/dev/null || true
done

cat > "$HOME/Library/LaunchAgents/com.seankolk.netmeter.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.seankolk.netmeter</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$HOME/bin/netmeter</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>$HOME/.netmeter/daemon.log</string>
    <key>StandardErrorPath</key><string>$HOME/.netmeter/daemon.log</string>
</dict>
</plist>
EOF

cat > "$HOME/Library/LaunchAgents/com.seankolk.netmeterbar.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.seankolk.netmeterbar</string>
    <key>ProgramArguments</key>
    <array>
        <string>$HOME/bin/netmeter-bar</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardErrorPath</key><string>$HOME/.netmeter/bar.log</string>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$UID_NUM" "$HOME/Library/LaunchAgents/com.seankolk.netmeter.plist"
launchctl bootstrap "gui/$UID_NUM" "$HOME/Library/LaunchAgents/com.seankolk.netmeterbar.plist"
echo "netmeter installed. Daemon and menu bar app are running and will start at every login."
