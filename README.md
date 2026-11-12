# Ejecutar en la terminal

Extensión de VS Code para correr, con un clic derecho, los comandos que Claude Code te pide ejecutar a mano.

Sin ella son seis pasos: abrir la terminal, copiar el comando, pegarlo, ejecutarlo, cerrar la terminal y contarle al chat cómo salió. Con ella son dos: clic derecho y pegar el resultado.

Guía completa: https://www.davidiriza.com/lab/ejecutar-con-clic-derecho

## Instalar

**Opción 1, pídeselo a Claude Code:**

```
Lee https://raw.githubusercontent.com/davidiriza-lab/ejecutar-en-terminal/main/INSTALAR.md y sigue sus pasos.
```

**Opción 2, a mano:**

1. Descarga [ejecutar-en-terminal.vsix](https://github.com/davidiriza-lab/ejecutar-en-terminal/releases/latest/download/ejecutar-en-terminal.vsix).
2. En VS Code abre la paleta de comandos (⌘⇧P o Ctrl+Shift+P) y elige **Extensions: Install from VSIX…**
3. Selecciona el archivo que descargaste.

**Opción 3, con la terminal:**

```bash
curl -L -o /tmp/ejecutar-en-terminal.vsix https://github.com/davidiriza-lab/ejecutar-en-terminal/releases/latest/download/ejecutar-en-terminal.vsix
code --install-extension /tmp/ejecutar-en-terminal.vsix
```

## Cómo se usa

1. Selecciona el comando en el chat de Claude Code (también funciona en un archivo abierto).
2. Clic derecho → **Ejecutar en la terminal**.
3. El comando corre en una terminal llamada `ejecutar`, a la vista pero sin quitarte el cursor.
4. Al terminar, el panel se esconde solo y sale un aviso: terminó bien o falló.
5. El resultado ya está copiado. Pega en el chat y envía.

Para probarla, selecciona esta línea y dale clic derecho:

```
echo "hola desde la terminal" && date
```

Lo que queda en tu portapapeles:

````
Ejecuté esto en la terminal:
```
echo "hola desde la terminal" && date
```
Código de salida: 0
Salida:
```
hola desde la terminal
Thu Nov 12 10:31:07 CST 2026
```
````

## Detalles

- **Si el comando pide algo** (una contraseña, una confirmación): haz clic en la terminal, escríbelo y lo demás sigue igual.
- **Comandos que no terminan** (un servidor de desarrollo): dejan esa terminal ocupada y a la vista. El siguiente comando abre otra.
- **Varias líneas**: cuentan como un solo trabajo. El aviso llega cuando termina la última.
- **El `$ ` del inicio** de cada línea se quita, porque suele venir en los ejemplos.
- **Salidas largas**: se copian los últimos 12,000 caracteres, sin colores.

## Ajustes

| Ajuste | Por defecto | Qué hace |
|---|---|---|
| `ejecutarEnTerminal.ocultarPanelAlTerminar` | `true` | Esconde el panel de la terminal cuando el comando termina |
| `ejecutarEnTerminal.copiarResultado` | `true` | Copia comando, código de salida y salida al portapapeles |

## Antes de usarla, ten en cuenta

- **Ejecuta lo que seleccionas, sin preguntar.** Lee el comando antes de darle clic, igual que lo harías antes de pegarlo.
- **Elige la opción sin tardarte.** Desde el chat, el navegador que VS Code lleva dentro solo deja copiar la selección durante unos 5 segundos después del clic derecho. Si te quedas más tiempo con el menú abierto no se ejecuta nada y sale un aviso; vuelve a dar clic derecho y listo. Desde un archivo no hay ese límite.
- **Usa tu portapapeles.** Una extensión no puede leer lo que seleccionas en el panel de otra, así que copia tu selección por debajo y al final deja ahí el resultado. Lo que tenías copiado antes se pierde.
- **Necesita la integración de shell de VS Code** para saber cuándo termina el comando y leer su salida. Viene activa por defecto con bash, zsh, fish y PowerShell. Si no está, el comando corre igual pero sin aviso ni resultado copiado.
- Está probada en Mac con VS Code 1.145, con una prueba automática que corre dentro de un VS Code real (viene en `test/integracion`). El menú también se registra en los paneles de Codex, donde todavía no está probada. En Windows y Linux debería funcionar, pero tampoco está probada.

## Cómo funciona

Todo está en `extension.js` (un archivo, sin dependencias):

1. Agrega la opción al menú de clic derecho del panel del chat (`webview/context`) y del editor (`editor/context`).
2. Para leer la selección del chat escribe una marca en el portapapeles, dispara el comando normal de copiar y espera a que la marca cambie. Si no cambia, no ejecuta nada y te devuelve lo que tenías copiado: así nunca corre algo viejo.
3. Manda el texto a una terminal propia y, con la API de integración de shell, espera a que termine y lee la salida y el código de salida.
4. Limpia colores y barras de progreso, copia el resultado, esconde el panel y te regresa el cursor a la caja de Claude.

## Desarrollo

```bash
node test/probar.js                                        # prueba la lógica sin abrir VS Code
test/integracion/correr.sh                                 # abre un VS Code aparte y prueba todo de punta a punta (~40 s, macOS)
npx --yes @vscode/vsce package -o ejecutar-en-terminal.vsix  # empaqueta
code --install-extension ejecutar-en-terminal.vsix --force   # instala
```

## Licencia

MIT. Hecha por [David Iriza](https://www.davidiriza.com/lab).
