#!/bin/bash
# Abre un VS Code aparte (perfil temporal, sin tus extensiones) y corre la prueba de integración.
# Usa el portapapeles: lo guarda antes y lo restaura al final (solo texto).
# Uso: test/integracion/correr.sh   (macOS; en otro sistema cambia la ruta de VSCODE)
# Necesita Node 22 o más nuevo (para el clic real vía protocolo de depuración). Tarda ~40 s.
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
VSCODE="${VSCODE:-/Applications/Visual Studio Code.app/Contents/MacOS/Electron}"
[ -x "$VSCODE" ] || VSCODE="/Applications/Visual Studio Code.app/Contents/MacOS/Code"
TMP="$RAIZ/.vscode-test"
rm -rf "$TMP" && mkdir -p "$TMP/ud" "$TMP/ext" "$TMP/ws"
export EJECUTAR_TEST_OUT="$TMP/resultado.json"
export EJECUTAR_TEST_PUERTO="${EJECUTAR_TEST_PUERTO:-9333}"
export NODE_BIN="${NODE_BIN:-$(command -v node)}"

PREVIO="$TMP/portapapeles.txt"
command -v pbpaste >/dev/null && pbpaste > "$PREVIO"

# Si esto se lanza desde una terminal de VS Code, estas variables harían que el binario corra como Node.
env -u ELECTRON_RUN_AS_NODE -u VSCODE_IPC_HOOK -u VSCODE_IPC_HOOK_CLI -u VSCODE_PID -u VSCODE_CWD -u VSCODE_NLS_CONFIG -u VSCODE_HANDLES_UNCAUGHT_ERRORS -u VSCODE_ESM_ENTRYPOINT -u VSCODE_CODE_CACHE_PATH "$VSCODE" \
	--user-data-dir="$TMP/ud" --extensions-dir="$TMP/ext" \
	--extensionDevelopmentPath="$RAIZ" \
	--extensionTestsPath="${PRUEBA:-$RAIZ/test/integracion/index.js}" \
	--disable-workspace-trust --skip-welcome --skip-release-notes --disable-updates \
	--remote-debugging-port="$EJECUTAR_TEST_PUERTO" \
	"$TMP/ws" >"$TMP/vscode.log" 2>&1
CODIGO=$?

command -v pbcopy >/dev/null && pbcopy < "$PREVIO"
cat "$EJECUTAR_TEST_OUT" 2>/dev/null || { echo "Sin resultado; revisa $TMP/vscode.log"; tail -20 "$TMP/vscode.log"; }
echo
echo "Código de salida de VS Code: $CODIGO"
exit $CODIGO
