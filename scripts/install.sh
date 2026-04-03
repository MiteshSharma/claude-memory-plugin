#!/usr/bin/env bash
# claude-plugin-kit — one-liner installer
# Usage: curl -fsSL https://raw.githubusercontent.com/your-org/claude-plugin-kit/main/scripts/install.sh | bash
set -euo pipefail

REPO="https://github.com/your-org/claude-plugin-kit"
DEST="$HOME/.claude-plugin-kit/source"
PORT="${PLUGIN_PORT:-37799}"

# ─── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  !${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; exit 1; }

echo ""
echo "  claude-plugin-kit installer"
echo "  ───────────────────────────"
echo ""

# ─── 1. Check Node.js ──────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  fail "Node.js not found — install Node.js v22+ from https://nodejs.org"
fi
NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 22 ]; then
  warn "Node.js v$(node --version) detected — v22+ recommended"
else
  ok "Node.js v$(node --version)"
fi

# ─── 2. Check pnpm ─────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found — installing via npm..."
  npm install -g pnpm@latest
fi
ok "pnpm $(pnpm --version)"

# ─── 3. Clone or update repo ───────────────────────────────────────────────────
if [ -d "$DEST/.git" ]; then
  warn "existing install found — pulling latest..."
  git -C "$DEST" pull --ff-only
  ok "updated to $(git -C "$DEST" rev-parse --short HEAD)"
else
  echo "  Cloning to $DEST..."
  git clone --depth=1 "$REPO" "$DEST"
  ok "cloned $(git -C "$DEST" rev-parse --short HEAD)"
fi

# ─── 4. Install dependencies + build ──────────────────────────────────────────
echo ""
echo "  Building plugin..."
cd "$DEST"
pnpm install --frozen-lockfile --silent
PLUGIN_PORT="$PORT" node scripts/build.js
ok "plugin built"

# ─── 5. Register hooks + MCP ──────────────────────────────────────────────────
node scripts/register-hooks.js
ok "hooks and MCP server registered"

# ─── 6. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  claude-plugin-kit installed successfully           │"
echo "  │                                                     │"
echo "  │  → Restart Claude Code to activate                  │"
echo "  │  → Server will auto-start on next session           │"
echo "  │  → Viewer: http://127.0.0.1:${PORT}                    │"
echo "  │  → Docs:   http://127.0.0.1:${PORT}/docs               │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
