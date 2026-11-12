# Ejecutar en la terminal

Extensión de VS Code para no tener que abrir la terminal, pegar, ejecutar, cerrarla y luego contarle al chat cómo salió.

## Cómo se usa

1. Selecciona el comando en el chat de Claude Code (o de Codex, o en cualquier archivo).
2. Clic derecho → **Ejecutar en la terminal**.
3. El comando corre en una terminal llamada `Claude ▶`, a la vista pero sin quitarte el cursor.
4. Al terminar, el panel se esconde solo y aparece un aviso con el resultado (bien o falló).
5. El resultado ya quedó copiado: pega con ⌘V en el chat y envía.

Si el comando pide algo (una contraseña, una confirmación), haz clic en la terminal y escríbelo; el resto sigue igual.

## Detalles

- Los comandos que no terminan (por ejemplo un servidor de desarrollo) dejan la terminal abierta y ocupada; el siguiente comando abre otra.
- Un texto de varias líneas cuenta como un solo trabajo: el aviso llega cuando termina la última.
- Se quita el `$ ` del inicio de cada línea, que suele venir en los ejemplos.
- De la salida se copian como máximo los últimos 12,000 caracteres, sin colores.

## Ajustes

| Ajuste | Por defecto | Qué hace |
|---|---|---|
| `ejecutarEnTerminal.ocultarPanelAlTerminar` | `true` | Esconde el panel de la terminal al terminar |
| `ejecutarEnTerminal.copiarResultado` | `true` | Copia comando, código de salida y salida al portapapeles |

## Instalar o actualizar

```bash
npx --yes @vscode/vsce package
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension ejecutar-en-terminal-*.vsix --force
```

## Probar la lógica

```bash
node test/probar.js
```
