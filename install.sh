#!/usr/bin/env bash
set -euo pipefail

REPO="supSugam/glyphous"
UUID="glyphous@supsugam.github.com"
INSTALL_DIR="${HOME}/.local/share/gnome-shell/extensions/${UUID}"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "${TMP_DIR}"; }
trap cleanup EXIT

print_step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
print_ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$1"; }
print_err()  { printf '\033[1;31m  ✗ %s\033[0m\n' "$1" >&2; }

# ── Dependency checks ────────────────────────────────────────────────────────
print_step "Checking dependencies"

for cmd in curl unzip gnome-extensions; do
  if command -v "${cmd}" &>/dev/null; then
    print_ok "${cmd} found"
  else
    print_err "${cmd} is required but not installed. Aborting."
    exit 1
  fi
done

# ── Fetch latest release ─────────────────────────────────────────────────────
print_step "Fetching latest release from GitHub"

API_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_DATA="$(curl -fsSL "${API_URL}")"
VERSION="$(printf '%s' "${RELEASE_DATA}" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

if [[ -z "${VERSION}" ]]; then
  print_err "Could not determine latest release version. Is the repository public with a release?"
  exit 1
fi

print_ok "Latest version: ${VERSION}"

# ── Download ─────────────────────────────────────────────────────────────────
print_step "Downloading ${UUID}.zip"

ZIP_URL="https://github.com/${REPO}/releases/download/${VERSION}/${UUID}.zip"
ZIP_PATH="${TMP_DIR}/${UUID}.zip"

if ! curl -fsSL -o "${ZIP_PATH}" "${ZIP_URL}"; then
  print_err "Failed to download release asset from: ${ZIP_URL}"
  exit 1
fi

print_ok "Downloaded to ${ZIP_PATH}"

# ── Install ──────────────────────────────────────────────────────────────────
print_step "Installing extension"

gnome-extensions install --force "${ZIP_PATH}"
print_ok "Installed to ${INSTALL_DIR}"

# ── Done ─────────────────────────────────────────────────────────────────────
printf '\n\033[1;32mGlyphous %s installed successfully!\033[0m\n\n' "${VERSION}"
printf 'Next steps:\n'
printf '  1. Log out and log back in (required for new installs on Wayland)\n'
printf '  2. Enable the extension:\n'
printf '       gnome-extensions enable %s\n\n' "${UUID}"
printf '  Or open the Extensions app and toggle Glyphous on.\n\n'
