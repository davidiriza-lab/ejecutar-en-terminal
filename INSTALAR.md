# Instalar «Ejecutar en la terminal»

Instrucciones para Claude Code (o cualquier agente con terminal). Síguelas en orden y no instales nada más.

## 1. Encuentra el comando `code`

Prueba `code --version`. Si no existe, usa la ruta completa según el sistema:

- **macOS:** `/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`
- **Windows:** `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`
- **Linux:** `/usr/bin/code` o `/snap/bin/code`

Si la persona usa otro editor basado en VS Code (Cursor, Windsurf, VSCodium), pregúntale cuál y usa su comando equivalente (`cursor`, `windsurf`, `codium`). Si no encuentras ninguno, detente y dile que instale la extensión a mano con «Extensions: Install from VSIX…».

## 2. Descarga la extensión

```bash
curl -L --fail -o /tmp/ejecutar-en-terminal.vsix https://github.com/davidiriza-lab/ejecutar-en-terminal/releases/latest/download/ejecutar-en-terminal.vsix
```

En Windows guarda el archivo en `%TEMP%` en lugar de `/tmp`.

## 3. Instálala

```bash
code --install-extension /tmp/ejecutar-en-terminal.vsix --force
```

Usa la ruta completa del paso 1 si `code` no está en el PATH.

## 4. Confirma

```bash
code --list-extensions | grep -i ejecutar-en-terminal
```

Debe aparecer `davidiriza-lab.ejecutar-en-terminal`.

## 5. Dile a la persona cómo probarla

Escríbele esto, tal cual, con el comando en su propio bloque para que lo pueda seleccionar:

> Listo. Selecciona la línea de abajo, clic derecho → **Ejecutar en la terminal**. Debe abrirse la terminal, correr, esconderse sola y salir un aviso. Después pega aquí en el chat y verás el resultado.
>
> ```
> echo "hola desde la terminal" && date
> ```
>
> Si la opción no aparece en el menú, recarga la ventana: paleta de comandos → «Developer: Reload Window».

No cambies ajustes de VS Code ni toques otros archivos.
