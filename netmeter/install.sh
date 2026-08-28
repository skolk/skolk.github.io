#!/bin/sh
# Install netmeter: engine + menu bar app + LaunchAgents (start at login, restart on crash).
# Run from the repo root: ./install.sh
set -e
cd "$(dirname "$0")"
UID_NUM=$(id -u)

# Nothing gets installed over a working copy that does not compile and pass.
if [ -x ./bin/check ] && [ -z "$SKIP_CHECK" ]; then
  ./bin/check
fi

mkdir -p "$HOME/bin" "$HOME/.netmeter/src" "$HOME/Library/LaunchAgents"

cp netmeter "$HOME/bin/netmeter"
chmod +x "$HOME/bin/netmeter"
cp netmeter-bar.swift "$HOME/.netmeter/src/netmeter-bar.swift"
echo "Compiling menu bar app..."
swiftc -swift-version 5 -O -o "$HOME/bin/netmeter-bar" netmeter-bar.swift

# bootout returns before launchd has finished tearing the job down. Bootstrap
# into a domain that still holds the old one and it fails with EIO(5), which on
# 2026-08-28 aborted the install between the two calls and left the machine
# with no daemon and no bar: nothing enforcing, no error anyone would read as
# that. So: wait for each one to actually go, and retry the way back in.
boot_out() {
  launchctl bootout "gui/$UID_NUM/$1" 2>/dev/null || true
  n=0
  while launchctl print "gui/$UID_NUM/$1" >/dev/null 2>&1; do
    n=$((n + 1))
    [ "$n" -gt 50 ] && break     # 5s, then try anyway rather than refuse to install
    sleep 0.1
  done
}

boot_in() {
  n=0
  while [ "$n" -lt 5 ]; do
    launchctl bootstrap "gui/$UID_NUM" "$2" 2>/dev/null && return 0
    n=$((n + 1))
    sleep 1
  done
  echo "netmeter: launchctl would not start $1. NOTHING IS RUNNING." >&2
  echo "  retry with: launchctl bootstrap gui/$UID_NUM $2" >&2
  return 1
}

for name in netmeter netmeterbar; do
  boot_out "com.seankolk.$name"
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

# Not && chained: a bar that will not start must not stop the daemon going up.
ok=0
boot_in com.seankolk.netmeter "$HOME/Library/LaunchAgents/com.seankolk.netmeter.plist" || ok=1
boot_in com.seankolk.netmeterbar "$HOME/Library/LaunchAgents/com.seankolk.netmeterbar.plist" || ok=1
if [ "$ok" -ne 0 ]; then exit 1; fi
echo "netmeter installed. Daemon and menu bar app are running and will start at every login."
