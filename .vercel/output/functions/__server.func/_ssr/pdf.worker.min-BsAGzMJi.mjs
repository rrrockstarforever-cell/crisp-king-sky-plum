//#region node_modules/.nitro/vite/services/ssr/assets/pdf.worker.min-BsAGzMJi.js
var DB_NAME = "PulseMedFilesDB";
var DB_VERSION = 1;
var FILES_STORE = "files";
var PAGES_STORE = "pages";
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = (event) => {
			const db = event.target.result;
			if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: "id" }).createIndex("addedAt", "addedAt");
			if (!db.objectStoreNames.contains(PAGES_STORE)) db.createObjectStore(PAGES_STORE, { keyPath: ["docId", "pageNumber"] }).createIndex("docId", "docId");
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("IndexedDB open failed"));
	});
}
function txDone(tx) {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction failed"));
		tx.onabort = () => reject(tx.error ?? /* @__PURE__ */ new Error("IndexedDB transaction aborted"));
	});
}
async function addLibraryDocument(meta, blob) {
	const db = await openDB();
	const tx = db.transaction(FILES_STORE, "readwrite");
	tx.objectStore(FILES_STORE).put({
		...meta,
		blob
	});
	await txDone(tx);
	db.close();
}
async function updateLibraryMeta(docId, patch) {
	const db = await openDB();
	const tx = db.transaction(FILES_STORE, "readwrite");
	const store = tx.objectStore(FILES_STORE);
	const getReq = store.get(docId);
	getReq.onsuccess = () => {
		const existing = getReq.result;
		if (existing) store.put({
			...existing,
			...patch
		});
	};
	await txDone(tx);
	db.close();
}
async function listLibraryDocuments() {
	const db = await openDB();
	const tx = db.transaction(FILES_STORE, "readonly");
	const req = tx.objectStore(FILES_STORE).getAll();
	const all = await new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result ?? []);
		req.onerror = () => reject(req.error);
	});
	await txDone(tx);
	db.close();
	return all;
}
async function getLibraryDocument(docId) {
	const db = await openDB();
	const tx = db.transaction(FILES_STORE, "readonly");
	const req = tx.objectStore(FILES_STORE).get(docId);
	const result = await new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
	});
	await txDone(tx);
	db.close();
	return result;
}
async function removeLibraryDocument(docId) {
	const db = await openDB();
	const tx = db.transaction([FILES_STORE, PAGES_STORE], "readwrite");
	tx.objectStore(FILES_STORE).delete(docId);
	const cursorReq = tx.objectStore(PAGES_STORE).index("docId").openCursor(IDBKeyRange.only(docId));
	cursorReq.onsuccess = () => {
		const cursor = cursorReq.result;
		if (cursor) {
			cursor.delete();
			cursor.continue();
		}
	};
	await txDone(tx);
	db.close();
}
async function savePageText(docId, pageNumber, text) {
	const db = await openDB();
	const tx = db.transaction(PAGES_STORE, "readwrite");
	tx.objectStore(PAGES_STORE).put({
		docId,
		pageNumber,
		text
	});
	await txDone(tx);
	db.close();
}
async function getPageText(docId, pageNumber) {
	const db = await openDB();
	const tx = db.transaction(PAGES_STORE, "readonly");
	const req = tx.objectStore(PAGES_STORE).get([docId, pageNumber]);
	const result = await new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result ?? null);
		req.onerror = () => reject(req.error);
	});
	await txDone(tx);
	db.close();
	return result ? result.text : null;
}
async function listPageTexts(docId) {
	const db = await openDB();
	const tx = db.transaction(PAGES_STORE, "readonly");
	const req = tx.objectStore(PAGES_STORE).index("docId").getAll(IDBKeyRange.only(docId));
	const results = await new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result ?? []);
		req.onerror = () => reject(req.error);
	});
	await txDone(tx);
	db.close();
	return results.map((r) => ({
		pageNumber: r.pageNumber,
		text: r.text
	})).sort((a, b) => a.pageNumber - b.pageNumber);
}
var pdf_worker_min_default = "/assets/pdf.worker.min-r-TJsTTt.mjs";
//#endregion
export { listPageTexts as a, savePageText as c, listLibraryDocuments as i, updateLibraryMeta as l, getLibraryDocument as n, pdf_worker_min_default as o, getPageText as r, removeLibraryDocument as s, addLibraryDocument as t };
