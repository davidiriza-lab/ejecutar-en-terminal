'use strict';
// Prueba de integración: corre dentro de un VS Code real (ver test/integracion/correr.sh).
// Verifica de punta a punta los dos caminos: selección en un editor y selección en un webview,
// este último con un clic derecho real (enviado por el protocolo de depuración), porque el
// navegador solo deja copiar después de un gesto de la persona.
const vscode = require('vscode');
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const PUERTO = process.env.EJECUTAR_TEST_PUERTO || '9333';

function clicDerecho() {
	return cp.execFileSync(process.env.NODE_BIN || 'node', [path.join(__dirname, 'clic.js'), PUERTO, 'right'], {
		encoding: 'utf8',
	});
}

async function esperarPortapapeles(aguja, ms) {
	const fin = Date.now() + ms;
	let ultimo = '';
	while (Date.now() < fin) {
		ultimo = await vscode.env.clipboard.readText();
		if (ultimo.includes('Ejecuté esto en la terminal') && ultimo.includes(aguja)) return ultimo;
		await esperar(250);
	}
	throw new Error(`No llegó "${aguja}" al portapapeles. Último contenido: ${JSON.stringify(ultimo.slice(0, 300))}`);
}

// Página de prueba: un bloque seleccionable a pantalla completa. Anula el menú contextual
// (en macOS es nativo y dejaría la prueba esperando) pero conserva el gesto del clic.
function pagina(texto) {
	return `<!doctype html><body style="margin:0"><pre id="c" style="margin:0;width:100vw;height:100vh">${texto}</pre><script>
		function seleccionar() {
			const nodo = document.getElementById('c');
			const sel = window.getSelection();
			sel.removeAllRanges();
			if (!nodo.textContent) return;
			const rango = document.createRange();
			rango.selectNodeContents(nodo);
			sel.addRange(rango);
		}
		seleccionar();
		document.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopImmediatePropagation(); seleccionar(); }, true);
	</script></body>`;
}

exports.run = async function run() {
	const salida = process.env.EJECUTAR_TEST_OUT;
	const informe = {};
	try {
		// 1. Selección en un editor (con el "$ " de los ejemplos, que debe quitarse)
		const doc = await vscode.workspace.openTextDocument({ content: '$ echo prueba-editor-$((40+2))\n' });
		const editor = await vscode.window.showTextDocument(doc);
		editor.selection = new vscode.Selection(0, 0, 0, doc.lineAt(0).text.length);
		vscode.commands.executeCommand('ejecutarEnTerminal.ejecutar');
		informe.editor = await esperarPortapapeles('prueba-editor-42', 30000);

		// 2. Selección en un webview, con clic derecho real justo antes
		const panel = vscode.window.createWebviewPanel('pruebaWebview', 'Prueba', vscode.ViewColumn.One, {
			enableScripts: true,
		});
		panel.webview.html = pagina('echo prueba-webview-$((50+5))');
		await esperar(1500);
		panel.reveal(vscode.ViewColumn.One, false);
		await esperar(800);
		clicDerecho();
		await esperar(300);
		vscode.commands.executeCommand('ejecutarEnTerminal.ejecutar', { webview: 'pruebaWebview' });
		informe.webview = await esperarPortapapeles('prueba-webview-55', 30000);

		// 3. Un comando que falla: debe reportar su código de salida
		panel.webview.html = pagina('ls /carpeta-que-no-existe-xyz');
		await esperar(1500);
		panel.reveal(vscode.ViewColumn.One, false);
		await esperar(800);
		clicDerecho();
		await esperar(300);
		vscode.commands.executeCommand('ejecutarEnTerminal.ejecutar', { webview: 'pruebaWebview' });
		informe.fallo = await esperarPortapapeles('carpeta-que-no-existe-xyz', 30000);
		if (/Código de salida: 0\n/.test(informe.fallo)) throw new Error('Un comando que falla reportó código 0');

		// 4. Pasados 8 s del clic ya no se puede copiar: no debe ejecutar nada ni perder el portapapeles
		panel.webview.html = pagina('echo no-debe-correr');
		await esperar(1500);
		panel.reveal(vscode.ViewColumn.One, false);
		await esperar(800);
		clicDerecho();
		await esperar(8000);
		await vscode.env.clipboard.writeText('contenido-previo');
		vscode.commands.executeCommand('ejecutarEnTerminal.ejecutar', { webview: 'pruebaWebview' });
		await esperar(4000);
		informe.tarde = await vscode.env.clipboard.readText();
		if (informe.tarde !== 'contenido-previo') throw new Error(`Tras 8 s debía conservar el portapapeles y quedó: ${informe.tarde}`);

		informe.ok = true;
	} catch (e) {
		informe.ok = false;
		informe.error = String(e && e.stack ? e.stack : e);
	}
	if (salida) fs.writeFileSync(salida, JSON.stringify(informe, null, 2));
	if (!informe.ok) throw new Error(informe.error);
};
