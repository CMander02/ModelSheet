#!/bin/bash
# ModelSheet cleanup — remove generated/rebuildable artifacts
# Safe: all targets are in .gitignore and can be regenerated

set -euo pipefail
cd "$(dirname "$0")/.."

items=(
    "data/temp"
    "src/modelsheet-web/dist"
    "src/modelsheet-web/.wrangler"
)

cleaned=0
for item in "${items[@]}"; do
    if [ -d "$item" ]; then
        size=$(du -sh "$item" 2>/dev/null | cut -f1)
        rm -rf "$item"
        echo "✓ $item ($size)"
        ((cleaned++)) || true
    fi
done

echo "清理完成，共 $cleaned 项"
