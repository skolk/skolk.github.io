#!/bin/sh
# Install micmeter: compile the menu bar app into a minimal .app bundle + LaunchAgent
# (start at login, restart on crash). Run from this directory: ./install.sh
set -e
cd "$(dirname "$0")"
UID_NUM=$(id -u)

APP="$HOME/Applications/micmeter.app"
mkdir -p "$HOME/.micmeter" "$HOME/Library/LaunchAgents" "$APP/Contents/MacOS"

# A real (if minimal) .app bundle, not a bare binary. TCC will not reliably
# present the microphone consent dialog for an unbundled executable spawned
# by launchd; it records a silent denial instead. Bundled, it prompts like
# any app and shows up in Privacy & Security > Microphone.
cat > "$APP/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleIdentifier</key><string>com.seankolk.micmeter</string>
    <key>CFBundleName</key><string>micmeter</string>
    <key>CFBundleExecutable</key><string>micmeter-bar</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>1.0</string>
    <key>LSUIElement</key><true/>
    <key>NSMicrophoneUsageDescription</key>
    <string>micmeter listens to the microphone to show its level in the menu bar. Nothing is recorded or stored.</string>
</dict>
</plist>
EOF

echo "Compiling menu bar app..."
swiftc -swift-version 5 -O -o "$APP/Contents/MacOS/micmeter-bar" micmeter-bar.swift
codesign --force --sign - "$APP" 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" 2>/dev/null || true

# The old unbundled install, if present.
launchctl bootout "gui/$UID_NUM/com.seankolk.micmeterbar" 2>/dev/null || true
rm -f "$HOME/bin/micmeter-bar"

cat > "$HOME/Library/LaunchAgents/com.seankolk.micmeterbar.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>com.seankolk.micmeterbar</string>
    <key>ProgramArguments</key>
    <array>
        <string>$APP/Contents/MacOS/micmeter-bar</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardErrorPath</key><string>$HOME/.micmeter/bar.log</string>
</dict>
</plist>
EOF

launchctl bootstrap "gui/$UID_NUM" "$HOME/Library/LaunchAgents/com.seankolk.micmeterbar.plist"
echo "micmeter installed. It runs now and at every login."
echo "First launch asks for microphone access; the meter sits at the floor until you allow it."
