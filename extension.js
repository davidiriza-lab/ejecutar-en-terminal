'use strict';
const vscode = require('vscode');

const NOMBRE_TERMINAL = 'Claude ▶';
const MAX_SALIDA = 12000; // caracteres de salida que se copian (los últimos)
const MAX_COMANDO = 20000;

/** Terminales nuestras que tienen un comando corriendo. */
const ocupadas = new Set();

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('ejecutarEnTerminal.ejecutar', ejecutar),
		vscode.window.onDidCloseTerminal((t) => ocupadas.delete(t)),
	);
}

function deactivate() {}

async function ejecutar(arg) {
	// Desde el clic derecho de un webview (el chat de Claude), VS Code manda { webview: '<id>' }.
	const desdeWebview = Boolean(arg && typeof arg === 'object' && typeof arg.webview === 'string');
	const crudo = desdeWebview ? await seleccionDeWebview() : seleccionDeEditor();
	const comando = limpiarComando(crudo || '');

	if (!comando) {
		vscode.window.showWarningMessage('Ejecutar en la terminal: no hay texto seleccionado.');
		return;
	}
	if (comando.length > MAX_COMANDO) {
		vscode.window.showWarningMessage('Ejecutar en la terminal: la selección es demasiado larga para ser un comando.');
		return;
	}

	const terminal = obtenerTerminal();
	terminal.show(true); // se ve correr, pero el cursor se queda donde estaba

	const integracion = await esperarIntegracion(terminal);
	if (!integracion) {
		// Sin integración de shell no se puede saber cuándo termina ni leer la salida.
		terminal.sendText(comando, true);
		vscode.window.setStatusBarMessage('Ejecutado en la terminal (sin captura de salida).', 6000);
		return;
	}

	ocupadas.add(terminal);
	const estado = vscode.window.setStatusBarMessage(`$(sync~spin) Ejecutando: ${resumen(comando)}`);
	let resultado;
	try {
		resultado = await correr(terminal, comando);
	} finally {
		ocupadas.delete(terminal);
		estado.dispose();
	}
	await alTerminar(terminal, comando, resultado, desdeWebview && arg.webview.startsWith('claudeVSCode'));
}

function seleccionDeEditor() {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.selection.isEmpty) return '';
	return editor.document.getText(editor.selection);
}

/**
 * Una extensión no puede leer la selección del webview de otra extensión.
 * Se copia la selección con el comando estándar de copiar y se lee del portapapeles.
 * El centinela garantiza que nunca se ejecute algo viejo que ya estaba en el portapapeles.
 */
async function seleccionDeWebview() {
	const previo = await vscode.env.clipboard.readText();
	const centinela = `__ejecutar_en_terminal_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
	await vscode.env.clipboard.writeText(centinela);
	await vscode.commands.executeCommand('editor.action.clipboardCopyAction');

	let texto = centinela;
	for (let i = 0; i < 30 && texto === centinela; i++) {
		await esperar(50);
		texto = await vscode.env.clipboard.readText();
	}
	if (texto === centinela || !texto.trim()) {
		await vscode.env.clipboard.writeText(previo);
		return '';
	}
	return texto;
}

/** Quita el "$ " inicial típico de los ejemplos y normaliza saltos de línea. */
function limpiarComando(texto) {
	return texto
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((linea) => linea.replace(/^\s*\$\s+/, ''))
		.join('\n')
		.trim();
}

function resumen(comando) {
	const primera = comando.split('\n')[0];
	return primera.length > 60 ? `${primera.slice(0, 57)}…` : primera;
}

function obtenerTerminal() {
	const libre = vscode.window.terminals.find(
		(t) => t.name === NOMBRE_TERMINAL && t.exitStatus === undefined && !ocupadas.has(t),
	);
	return libre || vscode.window.createTerminal({ name: NOMBRE_TERMINAL });
}

function esperarIntegracion(terminal, ms = 4000) {
	if (terminal.shellIntegration) return Promise.resolve(terminal.shellIntegration);
	return new Promise((resolve) => {
		const sub = vscode.window.onDidChangeTerminalShellIntegration((e) => {
			if (e.terminal !== terminal) return;
			clearTimeout(timer);
			sub.dispose();
			resolve(e.shellIntegration);
		});
		const timer = setTimeout(() => {
			sub.dispose();
			resolve(undefined);
		}, ms);
	});
}

/**
 * Manda el comando y espera a que la terminal quede libre.
 * Se sigue por terminal (no por ejecución) para que un texto de varias líneas
 * cuente como un solo trabajo: termina cuando ya no hay nada corriendo.
 */
function correr(terminal, comando) {
	return new Promise((resolve) => {
		let salida = '';
		let activos = 0;
		let codigo;
		let timer;
		let cerrada = false;
		const lecturas = [];
		const subs = [];

		const terminar = () => {
			subs.forEach((s) => s.dispose());
			Promise.race([Promise.all(lecturas), esperar(1500)]).then(() => resolve({ salida, codigo, cerrada }));
		};

		subs.push(
			vscode.window.onDidStartTerminalShellExecution((e) => {
				if (e.terminal !== terminal) return;
				activos++;
				clearTimeout(timer);
				lecturas.push(
					(async () => {
						try {
							for await (const trozo of e.execution.read()) {
								salida += trozo;
								if (salida.length > 400000) salida = salida.slice(-200000);
							}
						} catch {
							// la terminal se cerró a media lectura
						}
					})(),
				);
			}),
			vscode.window.onDidEndTerminalShellExecution((e) => {
				if (e.terminal !== terminal) return;
				activos = Math.max(0, activos - 1);
				// Si alguna línea falló, ese es el código que importa.
				if (!codigo) codigo = e.exitCode;
				clearTimeout(timer);
				if (activos === 0) timer = setTimeout(terminar, 600);
			}),
			vscode.window.onDidCloseTerminal((t) => {
				if (t !== terminal) return;
				cerrada = true;
				clearTimeout(timer);
				terminar();
			}),
		);

		terminal.sendText(comando, true);
	});
}

/** Quita colores, secuencias de control y las líneas que una barra de progreso sobrescribe. */
function limpiarSalida(salida) {
	return salida
		.replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
		.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
		.replace(/\x1b[@-Z\\-_]/g, '')
		.replace(/\r\n/g, '\n')
		.replace(/[^\n]*\r/g, '')
		.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '')
		.replace(/[ \t]+$/gm, '')
		.trim();
}

function armarResultado(comando, resultado) {
	let salida = limpiarSalida(resultado.salida);
	let nota = '';
	if (salida.length > MAX_SALIDA) {
		salida = salida.slice(-MAX_SALIDA);
		nota = ` (recortada: últimos ${MAX_SALIDA} caracteres)`;
	}
	const codigo = resultado.codigo === undefined ? 'desconocido' : String(resultado.codigo);
	return [
		'Ejecuté esto en la terminal:',
		'```',
		comando,
		'```',
		`Código de salida: ${codigo}`,
		`Salida${nota}:`,
		'```',
		salida || '(sin salida)',
		'```',
	].join('\n');
}

async function alTerminar(terminal, comando, resultado, desdeClaude) {
	if (resultado.cerrada) return;
	const cfg = vscode.workspace.getConfiguration('ejecutarEnTerminal');
	const copiar = cfg.get('copiarResultado', true);

	if (copiar) await vscode.env.clipboard.writeText(armarResultado(comando, resultado));
	if (cfg.get('ocultarPanelAlTerminar', true) && vscode.window.activeTerminal === terminal) {
		await vscode.commands.executeCommand('workbench.action.closePanel');
	}
	if (desdeClaude) {
		try {
			await vscode.commands.executeCommand('claude-vscode.focus');
		} catch {
			// la extensión de Claude Code no está disponible; no pasa nada
		}
	}

	const fallo = resultado.codigo !== undefined && resultado.codigo !== 0;
	const cabeza = fallo ? `Falló (código ${resultado.codigo})` : 'Terminó bien';
	const cola = copiar ? ' Resultado copiado: pégalo en el chat con ⌘V.' : '';
	const mostrar = fallo ? vscode.window.showWarningMessage : vscode.window.showInformationMessage;
	const eleccion = await mostrar(`${cabeza}: ${resumen(comando)}.${cola}`, 'Ver terminal');
	if (eleccion === 'Ver terminal') terminal.show();
}

module.exports = { activate, deactivate, limpiarComando, limpiarSalida, armarResultado, resumen };
