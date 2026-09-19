#!/usr/bin/env bash
# Symlinks <WEB>/.rogati to a Rogati checkout so edits show up without a release.
# Copy into a consumer's scripts/, set WEB, pass the checkout path as $1 if needed.
set -euo pipefail

WEB="web"

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
target="${1:-$repo/../Rogati}"

if [ ! -d "$target/web/packages/core" ]; then
    echo "link-rogati: no Rogati checkout at $target" >&2
    echo "link-rogati: pass the path as the first argument" >&2
    exit 1
fi

link="$repo/$WEB/.rogati"
rm -rf "$link"
ln -s "$(cd "$target" && pwd)" "$link"
echo "link-rogati: $WEB/.rogati -> $(cd "$target" && pwd)"
