#!/bin/sh
# Install the banjo server as a LaunchAgent: starts at login, restarts on a crash.
# It serves ../practice.html from this repo and keeps the record in ~/banjo.
# Run: ./_backend/banjo/install.sh      Remove: ./_backend/banjo/install.sh --uninstall
set -e
cd "$(dirname "$0")"
HERE=$(pwd)
UID_NUM=$(id -u)
LABEL=com.seankolk.banjo
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DATA="${BANJO_DIR:-$HOME/banjo}"
PORT="${BANJO_PORT:-4100}"

# bootout returns before launchd has let go of the job; wait, as netmeter's installer does
boot_out() {
  launchctl bootout "gui/$UID_NUM/$LABEL" 2>/dev/null || true
  n=0
  while launchctl print "gui/$UID_NUM/$LABEL" >/dev/null 2>&1; do
    n=$((n + 1)); [ "$n" -gt 50 ] && break; sleep 0.1
  done
}

if [ "${1:-}" = "--uninstall" ]; then
  boot_out
  rm -f "$PLIST"
  echo "banjo: stopped and removed. Your record is still in $DATA."
  exit 0
fi

# nothing gets installed that does not pass its tests
if [ -z "${SKIP_CHECK:-}" ]; then
  /usr/bin/python3 test_server.py >/dev/null 2>&1 || { echo "banjo: tests fail, not installing. Run: python3 $HERE/test_server.py" >&2; exit 1; }
fi

mkdir -p "$DATA" "$HOME/Library/LaunchAgents"
boot_out
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>$HERE/server.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>BANJO_DIR</key><string>$DATA</string>
        <key>BANJO_PORT</key><string>$PORT</string>
    </dict>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardErrorPath</key><string>$DATA/server.log</string>
</dict>
</plist>
EOF

n=0
until launchctl bootstrap "gui/$UID_NUM" "$PLIST" 2>/dev/null; do
  n=$((n + 1))
  if [ "$n" -ge 5 ]; then
    echo "banjo: launchctl would not start it. Retry: launchctl bootstrap gui/$UID_NUM $PLIST" >&2
    exit 1
  fi
  sleep 1
done

n=0
until curl -s -o /dev/null "http://localhost:$PORT/api/state"; do
  n=$((n + 1)); [ "$n" -gt 30 ] && { echo "banjo: started but not answering; see $DATA/server.log" >&2; exit 1; }
  sleep 0.2
done
echo "banjo: running at http://localhost:$PORT  record in $DATA"
