'use strict';
// Prueba la lógica pura (limpieza de comando y de salida) sin abrir VS Code.
const Module = require('module');
const assert = require('assert');

const cargar = Module._load;
Module._load = function (nombre, ...resto) {
	if (nombre === 'vscode') return {};
	return cargar.call(this, nombre, ...resto);
};

const { limpiarComando, limpiarSalida, armarResultado, resumen } = require('../extension.js');

assert.strictEqual(limpiarComando('  $ npm install\r\n'), 'npm install');
assert.strictEqual(limpiarComando('$ cd app\n$ npm run build\n'), 'cd app\nnpm run build');
assert.strictEqual(limpiarComando('echo "$HOME"'), 'echo "$HOME"');
assert.strictEqual(limpiarComando('   \n '), '');

// colores, título de ventana (OSC) y marcas de integración de shell
const cruda = '\x1b]633;C\x07\x1b[32m✓\x1b[0m listo\r\n\x1b]0;titulo\x07segunda\r\n';
assert.strictEqual(limpiarSalida(cruda), '✓ listo\nsegunda');

// barra de progreso: solo queda lo último que se pintó en la línea
assert.strictEqual(limpiarSalida('10%\r50%\r100%\r\nfin\r\n'), '100%\nfin');

const r = armarResultado('vercel whoami', { salida: 'zentraly\r\n', codigo: 0 });
assert.ok(r.includes('vercel whoami') && r.includes('Código de salida: 0') && r.includes('zentraly'));
assert.ok(armarResultado('true', { salida: '', codigo: undefined }).includes('(sin salida)'));

const larga = armarResultado('x', { salida: 'a'.repeat(30000), codigo: 1 });
assert.ok(larga.includes('recortada') && larga.length < 13000);

assert.strictEqual(resumen('a'.repeat(100)).length, 58);

console.log('OK: toda la lógica pasó');
