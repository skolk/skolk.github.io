#!/usr/bin/env bash
# Build (guarded against the iCloud-eviction hang), then commit + push.
# The build runs through _backend/bin/build, which caps it with a hard timeout
# so a stall fails fast instead of wedging the terminal. Never pushes unless
# the build actually succeeds.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

"$(dirname "$0")/bin/build"
git add .
git commit -am "Site update"
git push origin master
