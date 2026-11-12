// node clic.js <puerto> <left|right> → clic real (protocolo de depuración) en el centro del área del editor
const [puerto, boton] = process.argv.slice(2);
(async () => {
	const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
	const pag = lista.find((t) => t.type === 'page' && /workbench/.test(t.url));
	if (!pag) throw new Error('sin pagina: ' + JSON.stringify(lista.map((t) => [t.type, t.url.slice(0, 60)])));
	const ws = new WebSocket(pag.webSocketDebuggerUrl);
	await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
	let id = 0; const pend = new Map();
	ws.onmessage = (m) => { const d = JSON.parse(m.data); if (pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
	const enviar = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
	const tam = await enviar('Runtime.evaluate', { expression: `(() => { const e = document.querySelector('.editor-group-container .editor-container') || document.querySelector('.part.editor'); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width/2, r.top + r.height/2]); })()`, returnByValue: true });
	const [x, y] = JSON.parse(tam.result.result.value);
	await enviar('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
	await enviar('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: boton, buttons: boton === 'right' ? 2 : 1, clickCount: 1 });
	await enviar('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: boton, clickCount: 1 });
	console.log(JSON.stringify({ x, y, boton }));
	ws.close();
})().catch((e) => { console.error(String(e)); process.exit(1); });
