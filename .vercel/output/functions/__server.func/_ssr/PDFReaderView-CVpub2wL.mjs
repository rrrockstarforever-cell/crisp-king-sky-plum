import { o as __toESM } from "../_runtime.mjs";
import { a as listPageTexts, c as savePageText, i as listLibraryDocuments, l as updateLibraryMeta, n as getLibraryDocument, o as pdf_worker_min_default, r as getPageText, s as removeLibraryDocument, t as addLibraryDocument } from "./pdf.worker.min-BsAGzMJi.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { B as LoaderCircle, C as Search, K as GraduationCap, O as Printer, P as NotebookPen, Q as FileText, R as Maximize, V as ListTree, _ as Square, _t as ChevronRight, bt as Check, c as Type, ct as Copy, d as Trash, et as FileDown, f as Trash2, g as StickyNote, ht as CircleAlert, i as X, kt as BookOpen, n as ZoomOut, q as Globe, t as ZoomIn, ut as CloudUpload, v as Sparkles, vt as ChevronLeft, w as ScanText } from "../_libs/lucide-react.mjs";
import { _ as highlightFromPdfSelection, a as stopJob, d as aiComplete, f as extractJson, h as getEffectiveModel, i as startJob, l as NOT_CONNECTED_MESSAGE, m as getActiveProvider, n as RevisionNote, o as ocrImage, r as downloadNotesPdf, u as addUserHighlight, v as listUserHighlightsForDoc, y as removeUserHighlight } from "./routes-BVhAYNf3.mjs";
import { n as TextLayer, r as getDocument, t as GlobalWorkerOptions } from "../_libs/pdfjs-dist.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PDFReaderView-CVpub2wL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
GlobalWorkerOptions.workerSrc = pdf_worker_min_default;
var MAX_RENDERED = 24;
var HL_COLORS = [
	{
		id: "yellow",
		css: "#fde047",
		label: "Yellow"
	},
	{
		id: "green",
		css: "#86efac",
		label: "Green"
	},
	{
		id: "pink",
		css: "#f9a8d4",
		label: "Pink"
	},
	{
		id: "blue",
		css: "#93c5fd",
		label: "Blue"
	}
];
/** Cheap subject heuristic used on import (no AI call); editable afterwards. */
var SUBJECT_RULES = [
	{
		subject: "Anatomy",
		patterns: /anatomy|gray'?s|netter|moore/i
	},
	{
		subject: "Physiology",
		patterns: /physiolog|guyton|ganong/i
	},
	{
		subject: "Pathology",
		patterns: /patholog|robbins|goljan/i
	},
	{
		subject: "Pharmacology",
		patterns: /pharmacolog|goodman|lippincott|katzung/i
	},
	{
		subject: "Microbiology",
		patterns: /microbiolog|bacteriolog|virolog|parasitolog|levinson|jawetz/i
	},
	{
		subject: "General Medicine",
		patterns: /harrison|davidson|medicine|kumar|clinical medicine/i
	},
	{
		subject: "Surgery",
		patterns: /surgery|bailey|sabiston|schwartz/i
	},
	{
		subject: "Pediatrics",
		patterns: /pediatric|paediatric|nelson|ghai/i
	},
	{
		subject: "Obstetrics & Gynaecology",
		patterns: /obstetric|gynaecolog|gynecolog|williams|dc dutta/i
	},
	{
		subject: "Psychiatry",
		patterns: /psychiatr|kaplan|stahl/i
	},
	{
		subject: "Dermatology",
		patterns: /dermatolog/i
	},
	{
		subject: "Radiology",
		patterns: /radiol|grainger/i
	},
	{
		subject: "Ophthalmology",
		patterns: /ophthalmolog|khurana/i
	},
	{
		subject: "ENT",
		patterns: /\bent\b|otolaryng|dhingra/i
	},
	{
		subject: "Forensic Medicine",
		patterns: /forensic|toxicolog/i
	},
	{
		subject: "Community Medicine",
		patterns: /community medicine|preventive|social medicine|park\b/i
	},
	{
		subject: "Anaesthesia",
		patterns: /anaesthes|anesthes|morgan/i
	},
	{
		subject: "Orthopaedics",
		patterns: /orthopaed|orthoped|apley/i
	}
];
function categorizeTitle(title) {
	return SUBJECT_RULES.find((r) => r.patterns.test(title))?.subject ?? "Uncategorised";
}
/** Split extracted DOCX text into readable "pages" at paragraph boundaries (~2,400 chars). */
function splitDocxIntoPages(raw) {
	const formFeeds = raw.split(/\f/).map((p) => p.trim()).filter(Boolean);
	if (formFeeds.length > 1) return formFeeds;
	const paragraphs = raw.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
	const pages = [];
	let current = "";
	for (const para of paragraphs) {
		if (current.length + para.length > 2400 && current) {
			pages.push(current.trim());
			current = "";
		}
		current += `${para}\n\n`;
	}
	if (current.trim()) pages.push(current.trim());
	return pages.length ? pages : [raw.trim()];
}
var PDFReaderView = ({ onNavigate, onGenerateQuizFromPage }) => {
	const [docs, setDocs] = (0, import_react.useState)([]);
	const [activeDocId, setActiveDocId] = (0, import_react.useState)(null);
	const [libraryError, setLibraryError] = (0, import_react.useState)(null);
	const [numPages, setNumPages] = (0, import_react.useState)(0);
	const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
	const [scale, setScale] = (0, import_react.useState)(1.2);
	const [fitWidth, setFitWidth] = (0, import_react.useState)(true);
	const [pageErrors, setPageErrors] = (0, import_react.useState)({});
	const [docOpenError, setDocOpenError] = (0, import_react.useState)(null);
	const [loadingDoc, setLoadingDoc] = (0, import_react.useState)(false);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [matches, setMatches] = (0, import_react.useState)([]);
	const [matchIndex, setMatchIndex] = (0, import_react.useState)(-1);
	const [indexing, setIndexing] = (0, import_react.useState)({
		busy: false,
		done: 0
	});
	const [showNotes, setShowNotes] = (0, import_react.useState)(true);
	const [showLibrary, setShowLibrary] = (0, import_react.useState)(true);
	const [highlights, setHighlights] = (0, import_react.useState)([]);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [popup, setPopup] = (0, import_react.useState)(null);
	const [askPanel, setAskPanel] = (0, import_react.useState)(false);
	const [askContext, setAskContext] = (0, import_react.useState)("");
	const [askContextLabel, setAskContextLabel] = (0, import_react.useState)("current page");
	const [askIncludeWeb, setAskIncludeWeb] = (0, import_react.useState)(false);
	const [askBusy, setAskBusy] = (0, import_react.useState)(false);
	const [askReply, setAskReply] = (0, import_react.useState)("");
	const [askCitations, setAskCitations] = (0, import_react.useState)([]);
	const [askError, setAskError] = (0, import_react.useState)(null);
	const [mcqs, setMcqs] = (0, import_react.useState)([]);
	const [mcqBusy, setMcqBusy] = (0, import_react.useState)(false);
	const [showMcqAnswers, setShowMcqAnswers] = (0, import_react.useState)({});
	const [viewMode, setViewMode] = (0, import_react.useState)("page");
	const [textView, setTextView] = (0, import_react.useState)({
		loading: false,
		text: "",
		page: 1
	});
	const [ocrForce, setOcrForce] = (0, import_react.useState)(false);
	const [ocrOpen, setOcrOpen] = (0, import_react.useState)(false);
	const [ocrBusy, setOcrBusy] = (0, import_react.useState)(false);
	const [ocrNote, setOcrNote] = (0, import_react.useState)(null);
	const [notesOpen, setNotesOpen] = (0, import_react.useState)(false);
	const [notesFrom, setNotesFrom] = (0, import_react.useState)(1);
	const [notesTo, setNotesTo] = (0, import_react.useState)(5);
	const [notesPartSize, setNotesPartSize] = (0, import_react.useState)(5);
	const [notesBusy, setNotesBusy] = (0, import_react.useState)(false);
	const notesCancelRef = (0, import_react.useRef)(false);
	const [madeNotes, setMadeNotes] = (0, import_react.useState)([]);
	const [notesError, setNotesError] = (0, import_react.useState)(null);
	const pdfRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => () => {
		if (pdfRef.current) {
			try {
				pdfRef.current.destroy();
			} catch {}
			pdfRef.current = null;
		}
	}, []);
	const fileInputRef = (0, import_react.useRef)(null);
	const scrollRef = (0, import_react.useRef)(null);
	const pageWrapRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const canvasRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const textLayerRefs = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const renderedRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const renderingRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
	const renderTasksRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const baseDimsRef = (0, import_react.useRef)(null);
	const visibleRatiosRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const currentPageRef = (0, import_react.useRef)(1);
	const scaleRef = (0, import_react.useRef)(1.2);
	const pageTextsRef = (0, import_react.useRef)(/* @__PURE__ */ new Map());
	const searchCancelRef = (0, import_react.useRef)(false);
	currentPageRef.current = currentPage;
	scaleRef.current = scale;
	const refreshLibrary = (0, import_react.useCallback)(async () => {
		try {
			const all = await listLibraryDocuments();
			setDocs(all);
			return all;
		} catch (err) {
			setLibraryError(err?.message || "Could not read the local PDF library.");
			return [];
		}
	}, []);
	(0, import_react.useEffect)(() => {
		refreshLibrary();
	}, [refreshLibrary]);
	const clearRenderedPages = (0, import_react.useCallback)(() => {
		renderedRef.current.clear();
		renderingRef.current.clear();
		for (const task of renderTasksRef.current.values()) try {
			task.cancel();
		} catch {}
		renderTasksRef.current.clear();
		for (const canvas of canvasRefs.current.values()) if (canvas.parentElement) canvas.parentElement.replaceChildren();
		canvasRefs.current.clear();
		textLayerRefs.current.clear();
		visibleRatiosRef.current.clear();
	}, []);
	const openDoc = (0, import_react.useCallback)(async (id) => {
		if (pdfRef.current) {
			try {
				await pdfRef.current.destroy();
			} catch {}
			pdfRef.current = null;
		}
		clearRenderedPages();
		setActiveDocId(id);
		setDocOpenError(null);
		setPageErrors({});
		setMatches([]);
		setMatchIndex(-1);
		setSearchQuery("");
		pageTextsRef.current = /* @__PURE__ */ new Map();
		setNumPages(0);
		setCurrentPage(1);
		setMcqs([]);
		setAskReply("");
		setAskCitations([]);
		setAskError(null);
		setLoadingDoc(true);
		try {
			const rec = await getLibraryDocument(id);
			if (!rec) throw new Error("Document record missing from the local library.");
			if (rec.fileType === "docx") {
				pdfRef.current = null;
				setNumPages(rec.numPages);
				baseDimsRef.current = {
					w: 720,
					h: 1e3
				};
				setHighlights(listUserHighlightsForDoc(id));
				setViewMode("text");
				return;
			}
			const buf = await rec.blob.arrayBuffer();
			const pdf = await getDocument({ data: new Uint8Array(buf) }).promise;
			pdfRef.current = pdf;
			setNumPages(pdf.numPages);
			setViewMode("page");
			const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
			baseDimsRef.current = {
				w: vp.width,
				h: vp.height
			};
			setHighlights(listUserHighlightsForDoc(id));
		} catch (err) {
			setDocOpenError(err?.message || "Could not open the PDF.");
			pdfRef.current = null;
			setNumPages(0);
		} finally {
			setLoadingDoc(false);
		}
	}, [clearRenderedPages]);
	const handleImportFiles = async (files) => {
		if (!files || !files.length) return;
		setLibraryError(null);
		const imported = [];
		try {
			for (const file of Array.from(files)) {
				const isPdf = /\.pdf$|application\/pdf/i.test(`${file.type} ${file.name}`);
				const isDocx = /\.docx$/i.test(file.name);
				if (!isPdf && !isDocx) {
					setLibraryError(`"${file.name}" is not a PDF or DOCX file.`);
					continue;
				}
				if (isDocx) {
					const mammoth = await import("../_libs/mammoth+[...].mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
					const lib = mammoth.default ?? mammoth;
					const buf = await file.arrayBuffer();
					const result = await lib.extractRawText({ arrayBuffer: buf });
					const rawText = typeof result?.value === "string" ? result.value : "";
					if (!rawText.trim()) throw new Error(`"${file.name}" contains no extractable text.`);
					const chunks = splitDocxIntoPages(rawText);
					const meta = {
						id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
						title: file.name.replace(/\.docx$/i, ""),
						sizeBytes: file.size,
						numPages: chunks.length,
						addedAt: (/* @__PURE__ */ new Date()).toISOString(),
						fileType: "docx",
						subject: categorizeTitle(file.name)
					};
					await addLibraryDocument(meta, file);
					for (let i = 0; i < chunks.length; i++) await savePageText(meta.id, i + 1, chunks[i]);
					imported.push(meta);
					continue;
				}
				const buf = await file.arrayBuffer();
				const pdf = await getDocument({ data: buf }).promise;
				const meta = {
					id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
					title: file.name.replace(/\.pdf$/i, ""),
					sizeBytes: file.size,
					numPages: pdf.numPages,
					addedAt: (/* @__PURE__ */ new Date()).toISOString(),
					fileType: "pdf",
					subject: categorizeTitle(file.name)
				};
				try {
					await pdf.destroy();
				} catch {}
				await addLibraryDocument(meta, file);
				imported.push(meta);
			}
			const all = await refreshLibrary();
			if (imported.length && all.length) await openDoc(imported[0].id);
		} catch (err) {
			setLibraryError(err?.message || "Import failed.");
		}
	};
	const handleDeleteDoc = async (id) => {
		try {
			await removeLibraryDocument(id);
			const all = await refreshLibrary();
			if (id === activeDocId) {
				clearRenderedPages();
				if (pdfRef.current) {
					try {
						await pdfRef.current.destroy();
					} catch {}
					pdfRef.current = null;
				}
				setActiveDocId(null);
				setNumPages(0);
				if (all.length) await openDoc(all[0].id);
			}
		} catch (err) {
			setLibraryError(err?.message || "Could not delete the document.");
		}
	};
	const setDocSubject = async (id, subject) => {
		try {
			await updateLibraryMeta(id, { subject: subject.trim() || "Uncategorised" });
			await refreshLibrary();
		} catch (err) {
			setLibraryError(err?.message || "Could not save the subject.");
		}
	};
	const editSubject = async () => {
		const doc = docs.find((d) => d.id === activeDocId);
		if (!doc) return;
		const next = window.prompt("Subject / discipline for this book:", doc.subject || "Uncategorised");
		if (next === null) return;
		await setDocSubject(doc.id, next);
	};
	const classifyWithAi = async () => {
		const provider = getActiveProvider();
		const doc = docs.find((d) => d.id === activeDocId);
		if (!provider) {
			setLibraryError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		if (!doc) return;
		try {
			const firstText = (await ensurePageText(1).catch(() => "")).slice(0, 2500);
			const subject = (await aiComplete({
				system: "Classify a medical textbook into ONE subject. Reply with only the subject name, nothing else.",
				messages: [{
					role: "user",
					content: `Title: ${doc.title}\n\nFirst page text:\n${firstText || "(no text — use the title only)"}\n\nChoose one of: Anatomy, Physiology, Pathology, Pharmacology, Microbiology, General Medicine, Surgery, Pediatrics, Obstetrics & Gynaecology, Psychiatry, Dermatology, Radiology, Ophthalmology, ENT, Forensic Medicine, Community Medicine, Anaesthesia, Orthopaedics. Reply with only the subject name.`
				}],
				provider,
				model: getEffectiveModel(provider)
			})).trim().split("\n")[0].replace(/[."']/g, "").slice(0, 60) || "Uncategorised";
			await setDocSubject(doc.id, subject);
		} catch (err) {
			setLibraryError(err?.message || "Could not classify the book.");
		}
	};
	const fitScale = (0, import_react.useCallback)(() => {
		const container = scrollRef.current;
		const base = baseDimsRef.current;
		if (!container || !base) return scaleRef.current;
		return Math.max(.25, Math.min(4, (container.clientWidth - 48) / base.w));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!fitWidth) return;
		const container = scrollRef.current;
		if (!container) return;
		const apply = () => setScale(fitScale());
		apply();
		const ro = new ResizeObserver(apply);
		ro.observe(container);
		return () => ro.disconnect();
	}, [
		fitWidth,
		fitScale,
		activeDocId,
		numPages
	]);
	const renderPage = (0, import_react.useCallback)(async (num) => {
		const pdf = pdfRef.current;
		const container = scrollRef.current;
		if (!pdf || !container) return;
		if (renderedRef.current.has(num) || renderingRef.current.has(num) || num < 1 || num > pdf.numPages) return;
		renderingRef.current.add(num);
		try {
			const page = await pdf.getPage(num);
			const s = scaleRef.current;
			const viewport = page.getViewport({ scale: s });
			const wrap = pageWrapRefs.current.get(num);
			if (!wrap) {
				renderingRef.current.delete(num);
				return;
			}
			wrap.style.width = `${Math.floor(viewport.width)}px`;
			wrap.style.height = `${Math.floor(viewport.height)}px`;
			let canvas = canvasRefs.current.get(num);
			if (!canvas) {
				canvas = document.createElement("canvas");
				canvas.className = "block";
				canvas.style.position = "absolute";
				canvas.style.left = "0";
				canvas.style.top = "0";
				canvasRefs.current.set(num, canvas);
			}
			const canvasParent = wrap.querySelector("[data-canvas-slot]");
			if (canvasParent) {
				if (canvas.parentElement !== canvasParent) canvasParent.replaceChildren(canvas);
				const dpr = window.devicePixelRatio || 1;
				canvas.width = Math.floor(viewport.width * dpr);
				canvas.height = Math.floor(viewport.height * dpr);
				canvas.style.width = `${Math.floor(viewport.width)}px`;
				canvas.style.height = `${Math.floor(viewport.height)}px`;
				const prevTask = renderTasksRef.current.get(num);
				if (prevTask) try {
					prevTask.cancel();
				} catch {}
				const task = page.render({
					canvasContext: canvas.getContext("2d"),
					viewport,
					...dpr !== 1 ? { transform: [
						dpr,
						0,
						0,
						dpr,
						0,
						0
					] } : {}
				});
				renderTasksRef.current.set(num, task);
				await task.promise;
				renderTasksRef.current.delete(num);
			}
			const slot = wrap.querySelector("[data-text-slot]");
			if (slot) {
				slot.replaceChildren();
				const tl = TextLayer;
				if (tl) {
					slot.style.setProperty("--scale-factor", String(s));
					try {
						await new tl({
							textContentSource: page.streamTextContent({ includeMarkedContent: false }),
							container: slot,
							viewport
						}).render();
					} catch (err) {
						console.warn(`Text layer failed on page ${num}`, err);
					}
				}
				textLayerRefs.current.set(num, slot);
			}
			renderedRef.current.add(num);
			if (renderedRef.current.size > MAX_RENDERED) {
				const sorted = [...renderedRef.current].map((n) => ({
					n,
					dist: Math.abs(n - currentPageRef.current)
				})).sort((a, b) => b.dist - a.dist);
				for (const { n } of sorted.slice(0, Math.max(2, renderedRef.current.size - MAX_RENDERED + 4))) {
					if (n === currentPageRef.current) continue;
					const task = renderTasksRef.current.get(n);
					if (task) {
						try {
							task.cancel();
						} catch {}
						renderTasksRef.current.delete(n);
					}
					const wrapN = pageWrapRefs.current.get(n);
					const slotN = wrapN?.querySelector("[data-canvas-slot]");
					if (slotN) slotN.replaceChildren();
					const textSlotN = wrapN?.querySelector("[data-text-slot]");
					if (textSlotN) textSlotN.replaceChildren();
					canvasRefs.current.delete(n);
					textLayerRefs.current.delete(n);
					renderedRef.current.delete(n);
				}
			}
		} catch (err) {
			if (err?.name !== "RenderingCancelledException") setPageErrors((prev) => ({
				...prev,
				[num]: err?.message || "Render failed."
			}));
		} finally {
			renderingRef.current.delete(num);
		}
	}, []);
	const lastScaleRef = (0, import_react.useRef)(scale);
	(0, import_react.useEffect)(() => {
		if (lastScaleRef.current === scale || !pdfRef.current) {
			lastScaleRef.current = scale;
			return;
		}
		lastScaleRef.current = scale;
		clearRenderedPages();
		const base = baseDimsRef.current;
		if (base) for (const wrap of pageWrapRefs.current.values()) {
			wrap.style.width = `${Math.floor(base.w * scale)}px`;
			wrap.style.height = `${Math.floor(base.h * scale)}px`;
		}
		requestAnimationFrame(() => {
			observerRef.current?.disconnect();
			for (const wrap of pageWrapRefs.current.values()) observerRef.current?.observe(wrap);
		});
	}, [scale, clearRenderedPages]);
	(0, import_react.useEffect)(() => {}, [numPages]);
	const observerRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (!pdfRef.current) return;
		const io = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				const num = Number(entry.target.dataset.pageNumber);
				if (!num || Number.isNaN(num)) continue;
				const ratio = entry.intersectionRatio;
				if (ratio > .02) {
					visibleRatiosRef.current.set(num, ratio);
					if (!renderedRef.current.has(num)) renderPage(num);
				} else visibleRatiosRef.current.delete(num);
			}
			let best = -1;
			let bestRatio = 0;
			for (const [n, r] of visibleRatiosRef.current) if (r > bestRatio) {
				best = n;
				bestRatio = r;
			}
			if (best > 0 && best !== currentPageRef.current) setCurrentPage(best);
		}, {
			root: scrollRef.current,
			threshold: [
				0,
				.1,
				.3,
				.6,
				.9
			]
		});
		observerRef.current = io;
		for (const wrap of pageWrapRefs.current.values()) io.observe(wrap);
		requestAnimationFrame(() => {
			if (observerRef.current !== io) return;
			for (const wrap of pageWrapRefs.current.values()) io.observe(wrap);
		});
		return () => {
			io.disconnect();
			if (observerRef.current === io) observerRef.current = null;
		};
	}, [
		activeDocId,
		numPages,
		renderPage
	]);
	const setPageWrapRef = (0, import_react.useCallback)((num, el) => {
		if (el) {
			pageWrapRefs.current.set(num, el);
			observerRef.current?.observe(el);
			if (!renderedRef.current.has(num)) renderPage(num);
		} else {
			const existing = pageWrapRefs.current.get(num);
			if (existing) observerRef.current?.unobserve(existing);
			pageWrapRefs.current.delete(num);
		}
	}, [renderPage]);
	const jumpToPage = (0, import_react.useCallback)((num) => {
		const wrap = pageWrapRefs.current.get(num);
		const container = scrollRef.current;
		if (!wrap || !container) return;
		container.scrollTo({
			top: wrap.offsetTop - 12,
			behavior: "smooth"
		});
	}, []);
	const gotoPage = (num) => {
		const n = Math.max(1, Math.min(numPages, Math.round(num) || 0));
		setCurrentPage(n);
		jumpToPage(n);
	};
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		let timer = null;
		(async () => {
			let target = null;
			try {
				const raw = sessionStorage.getItem("pulse.openPdf");
				if (raw) {
					sessionStorage.removeItem("pulse.openPdf");
					target = JSON.parse(raw);
				}
			} catch {
				target = null;
			}
			if (!target?.docId) return;
			const all = await listLibraryDocuments();
			if (cancelled) return;
			if (!all.some((d) => d.id === target.docId)) {
				setLibraryError("That book is no longer in the local library.");
				return;
			}
			await openDoc(target.docId);
			if (cancelled) return;
			const page = Math.max(1, Math.round(Number(target.page) || 1));
			setCurrentPage(page);
			timer = setTimeout(() => {
				if (!cancelled) jumpToPage(page);
			}, 250);
		})();
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, []);
	const ensurePageText = (0, import_react.useCallback)(async (num) => {
		const cachedMem = pageTextsRef.current.get(num);
		if (cachedMem !== void 0) return cachedMem;
		const cachedIdb = await getPageText(activeDocId ?? "", num).catch(() => null);
		if (cachedIdb !== null && cachedIdb !== void 0 && cachedIdb !== "") {
			pageTextsRef.current.set(num, cachedIdb);
			return cachedIdb;
		}
		if (!pdfRef.current) return "";
		const text = ((await (await pdfRef.current.getPage(num)).getTextContent()).items || []).map((it) => typeof it?.str === "string" ? it.str : "").filter(Boolean).join(" ");
		if (activeDocId) await savePageText(activeDocId, num, text).catch(() => void 0);
		pageTextsRef.current.set(num, text);
		return text;
	}, [activeDocId]);
	const runSearch = async () => {
		const q = searchQuery.trim();
		if (!numPages || !q) return;
		searchCancelRef.current = false;
		setIndexing({
			busy: true,
			done: 0
		});
		const found = [];
		const lower = q.toLowerCase();
		try {
			for (let n = 1; n <= numPages; n++) {
				if (searchCancelRef.current) break;
				if ((await ensurePageText(n)).toLowerCase().includes(lower)) found.push(n);
				setIndexing({
					busy: true,
					done: n
				});
			}
			setMatches(found);
			setMatchIndex(found.length ? 0 : -1);
			if (found.length) {
				setCurrentPage(found[0]);
				jumpToPage(found[0]);
			}
		} catch (err) {
			setLibraryError(err?.message || "Search failed.");
		} finally {
			setIndexing({
				busy: false,
				done: 0
			});
		}
	};
	const moveMatch = (dir) => {
		if (!matches.length) return;
		const next = (matchIndex + dir + matches.length) % matches.length;
		setMatchIndex(next);
		jumpToPage(matches[next]);
	};
	const stopSearch = () => {
		searchCancelRef.current = true;
	};
	(0, import_react.useEffect)(() => {
		if (viewMode !== "text" || !activeDocId || !numPages) return;
		let cancelled = false;
		const page = Math.max(1, Math.min(numPages, currentPage));
		setTextView((prev) => ({
			...prev,
			loading: true,
			page
		}));
		ensurePageText(page).then((text) => {
			if (!cancelled) setTextView({
				loading: false,
				text,
				page
			});
		}).catch((err) => {
			if (!cancelled) setTextView({
				loading: false,
				text: `Could not read page ${page}: ${err?.message || "unknown error"}`,
				page
			});
		});
		return () => {
			cancelled = true;
		};
	}, [
		viewMode,
		currentPage,
		activeDocId,
		numPages,
		ensurePageText
	]);
	const handleMouseUp = (e) => {
		const sel = window.getSelection();
		const text = sel?.toString().trim() ?? "";
		if (!sel || text.length < 3 || !pdfRef.current) {
			setPopup(null);
			return;
		}
		const range = sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
		const container = scrollRef.current;
		if (!range || !container) {
			setPopup(null);
			return;
		}
		const row = container.parentElement;
		if (!row) {
			setPopup(null);
			return;
		}
		const rowRect = row.getBoundingClientRect();
		setPopup({
			x: Math.min(Math.max(range.left - rowRect.left, 260), Math.max(260, row.clientWidth - 180)),
			y: Math.max(range.top - rowRect.top - 44, 8),
			text: text.slice(0, 4e3)
		});
	};
	const saveSelectionHighlight = (color) => {
		if (!popup || !activeDocId) return;
		const doc = docs.find((d) => d.id === activeDocId);
		let rects;
		const sel = window.getSelection();
		const wrap = pageWrapRefs.current.get(currentPageRef.current);
		if (sel && wrap && sel.rangeCount > 0) {
			const pageRect = wrap.getBoundingClientRect();
			if (pageRect.width > 0 && pageRect.height > 0) rects = Array.from(sel.getRangeAt(0).getClientRects()).filter((r) => r.width > 1 && r.height > 1).map((r) => ({
				x: Math.max(0, (r.left - pageRect.left) / pageRect.width),
				y: Math.max(0, (r.top - pageRect.top) / pageRect.height),
				w: Math.min(1, r.width / pageRect.width),
				h: Math.min(1, r.height / pageRect.height)
			})).filter((r) => r.w > 0 && r.h > 0);
		}
		addUserHighlight(highlightFromPdfSelection({
			docId: activeDocId,
			docTitle: doc?.title ?? "PDF",
			page: currentPageRef.current,
			quote: popup.text,
			color,
			rects
		}));
		setHighlights(listUserHighlightsForDoc(activeDocId));
		setPopup(null);
		window.getSelection()?.removeAllRanges();
	};
	const copySelection = () => {
		if (!popup) return;
		navigator.clipboard.writeText(popup.text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
		setPopup(null);
	};
	const deleteHighlight = (id) => {
		removeUserHighlight(id);
		if (activeDocId) setHighlights(listUserHighlightsForDoc(activeDocId));
	};
	const openAskPanel = async (mode) => {
		setAskPanel(true);
		setAskError(null);
		setMcqs([]);
		if (mode === "selection" && popup) {
			setAskContext(popup.text);
			setAskContextLabel(`selection (p. ${currentPageRef.current})`);
			setPopup(null);
		} else {
			const text = await ensurePageText(currentPageRef.current).catch(() => "");
			setAskContext(text.slice(0, 6e3));
			setAskContextLabel(`page ${currentPageRef.current}`);
		}
	};
	const askAi = async (customQuestion) => {
		const provider = getActiveProvider();
		if (!provider) {
			setAskError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		if (!askContext.trim()) {
			const text = await ensurePageText(currentPageRef.current).catch(() => "");
			setAskContext(text.slice(0, 6e3));
			if (!text.trim()) {
				setAskError("No text available on this page (possibly a scanned image without OCR).");
				return;
			}
		}
		setAskBusy(true);
		setAskError(null);
		setAskCitations([]);
		const question = customQuestion?.trim() || `Explain the key clinical content clearly and completely, with mechanisms and any exam-relevant points.`;
		const contextText = askContext.trim();
		try {
			let webBlock = "";
			if (askIncludeWeb) try {
				const res = await fetch("/api/web/research", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ query: contextText.split("\n")[0].slice(0, 120) || question })
				});
				const data = await res.json().catch(() => ({}));
				if (res.ok && Array.isArray(data.sources)) {
					webBlock = data.sources.map((s) => `[W${s.n}] ${s.title} (${s.url})\n${String(s.text).slice(0, 800)}`).join("\n\n");
					setAskCitations(data.sources.map((s) => `- W${s.n}: ${s.url}`));
				}
			} catch {}
			const raw = await aiComplete({
				system: "You are the Pulse Med clinical assistant answering STRICTLY from the provided book passage" + (askIncludeWeb ? " and the labelled web sources." : " only.") + " Explain accurately with mechanisms; if the passage does not cover something, say so. Cite the passage as [book p. N] and web sources as [Wn].",
				messages: [{
					role: "user",
					content: `Book: ${docs.find((d) => d.id === activeDocId)?.title ?? "PDF"} — context from ${askContextLabel}:\n\n${contextText}\n\n` + (webBlock ? `Web sources:\n\n${webBlock}\n\n` : "") + `Question: ${question}`
				}],
				provider,
				model: getEffectiveModel(provider)
			});
			setAskReply(raw);
		} catch (err) {
			setAskError(err?.message || "AI request failed.");
		} finally {
			setAskBusy(false);
		}
	};
	const generateMcqs = async () => {
		const provider = getActiveProvider();
		if (!provider) {
			setAskError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		const contextText = (askContext || await ensurePageText(currentPageRef.current).catch(() => "")).trim();
		if (!contextText) {
			setAskError("No selectable text on this page.");
			return;
		}
		setMcqBusy(true);
		setAskError(null);
		try {
			const raw = await aiComplete({
				system: "Write exam-style single-best-answer MCQs strictly from the provided passage. Respond with ONLY a JSON object: {\"questions\":[{\"question\",\"options\":[\"A text\",...],\"answerIndex\":0,\"explanation\"}]}.",
				messages: [{
					role: "user",
					content: `Passage (${askContextLabel}):\n\n${contextText.slice(0, 6e3)}\n\nGenerate 3 MCQs with 4 options each, answerIndex pointing at the correct option, and a one-line explanation.`
				}],
				json: true,
				provider,
				model: getEffectiveModel(provider)
			});
			const parsed = extractJson(raw);
			const clean = ((Array.isArray(parsed) ? parsed : parsed?.questions) ?? []).filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2).map((q) => ({
				question: String(q.question),
				options: q.options.map((o) => String(o)),
				answerIndex: typeof q.answerIndex === "number" && q.answerIndex < q.options.length ? q.answerIndex : 0,
				explanation: typeof q.explanation === "string" ? q.explanation : ""
			})).slice(0, 5);
			if (!clean.length) throw new Error("The AI returned no valid MCQs. Try again.");
			setMcqs(clean);
			setShowMcqAnswers({});
		} catch (err) {
			setAskError(err?.message || "MCQ generation failed.");
		} finally {
			setMcqBusy(false);
		}
	};
	const ocrJobRef = (0, import_react.useRef)(null);
	const runOcr = async (scope) => {
		if (!pdfRef.current || !activeDocId || ocrBusy) return;
		const doc = docs.find((d) => d.id === activeDocId);
		const pages = scope === "current" ? [currentPageRef.current] : Array.from({ length: numPages }, (_, i) => i + 1);
		setOcrBusy(true);
		setOcrNote(null);
		const job = startJob(`OCR · ${doc?.title ?? "document"}`, scope === "current" ? `page ${pages[0]}` : "scanning pages…");
		ocrJobRef.current = job;
		let processed = 0;
		let skipped = 0;
		try {
			for (let index = 0; index < pages.length; index++) {
				if (job.isCancelled()) break;
				const n = pages[index];
				if (scope === "missing" && !ocrForce) {
					if ((await ensurePageText(n).catch(() => "")).trim()) {
						skipped += 1;
						job.update({ progress: Math.round((index + 1) / pages.length * 100) });
						continue;
					}
				}
				job.update({
					progress: Math.round(index / pages.length * 100),
					detail: `rendering page ${n}`
				});
				const page = await pdfRef.current.getPage(n);
				const viewport = page.getViewport({ scale: 2 });
				const canvas = document.createElement("canvas");
				canvas.width = Math.floor(viewport.width);
				canvas.height = Math.floor(viewport.height);
				await page.render({
					canvasContext: canvas.getContext("2d"),
					viewport
				}).promise;
				const result = await ocrImage(canvas, (p) => {
					job.update({
						progress: Math.round((index + p.progress) / pages.length * 100),
						detail: `page ${n} · ${p.status}`
					});
				});
				if (result.text.trim()) {
					await savePageText(activeDocId, n, result.text);
					pageTextsRef.current.set(n, result.text);
				}
				processed += 1;
			}
			if (job.isCancelled()) setOcrNote(`OCR stopped. ${processed} page${processed === 1 ? "" : "s"} saved${skipped ? `, ${skipped} skipped` : ""}.`);
			else {
				job.done(`${processed} page${processed === 1 ? "" : "s"} recognised${skipped ? `, ${skipped} skipped` : ""}`);
				setOcrNote(`OCR finished: ${processed} page${processed === 1 ? "" : "s"} processed${skipped ? `, ${skipped} skipped (already had text)` : ""}.`);
			}
		} catch (err) {
			const message = err?.message || "OCR failed.";
			job.fail(message);
			setOcrNote(`OCR error: ${message}`);
		} finally {
			setOcrBusy(false);
			ocrJobRef.current = null;
		}
	};
	const makeNotesFromPages = async () => {
		const provider = getActiveProvider();
		if (!provider) {
			setNotesError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		if (!activeDocId || numPages === 0) {
			setNotesError("Open a document first.");
			return;
		}
		const from = Math.max(1, Math.min(numPages, Math.floor(notesFrom) || 1));
		const to = Math.max(from, Math.min(numPages, Math.floor(notesTo) || from));
		const partSize = Math.max(1, Math.min(20, Math.floor(notesPartSize) || 5));
		const doc = docs.find((d) => d.id === activeDocId);
		const totalParts = Math.ceil((to - from + 1) / partSize);
		notesCancelRef.current = false;
		setNotesBusy(true);
		setNotesError(null);
		const job = startJob(`Notes from pages · ${doc?.title ?? "document"}`, `pages ${from}–${to}`);
		let saved = 0;
		try {
			for (let part = 0; part < totalParts; part++) {
				if (notesCancelRef.current || job.isCancelled()) break;
				const start = from + part * partSize;
				const end = Math.min(to, start + partSize - 1);
				job.update({
					progress: Math.round(part / totalParts * 100),
					detail: `reading pages ${start}–${end}`
				});
				const parts = [];
				for (let n = start; n <= end; n++) {
					const text = await ensurePageText(n).catch(() => "");
					if (text.trim()) parts.push(`[page ${n}]\n${text}`);
				}
				if (!parts.length) continue;
				const text = (await aiComplete({
					system: "You are a high-yield medical revision writer. Turn the supplied book pages into a compact revision note. Use short headings, bullets, and mark the key takeaway with a line starting \"High-yield:\" and any memory device with \"Mnemonic:\". Cite the page numbers inline as \"p. N\". Plain text only.",
					messages: [{
						role: "user",
						content: `Book: ${doc?.title ?? "document"}\nPages ${start}–${end}:\n\n${parts.join("\n\n").slice(0, 12e3)}\n\nWrite the revision notes for these pages.`
					}],
					provider,
					model: getEffectiveModel(provider)
				})).trim();
				if (!text) continue;
				addUserHighlight({
					kind: "pdf",
					subject: "General",
					subtopic: `Notes · pp. ${start}–${end}`,
					yieldTier: "HIGH",
					sourceContext: `${doc?.title ?? "document"} · pp. ${start}–${end}`,
					citation: `${doc?.title ?? "document"} — pages ${start}–${end}`,
					quote: text,
					docId: activeDocId,
					docTitle: doc?.title,
					page: start,
					tags: ["pdf-notes"],
					srsIntervalDays: 1,
					lastReviewed: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
				});
				setMadeNotes((prev) => [...prev, {
					range: `pp. ${start}–${end}`,
					text
				}]);
				setHighlights(listUserHighlightsForDoc(activeDocId));
				saved += 1;
				job.update({
					progress: Math.round((part + 1) / totalParts * 100),
					detail: `${saved} part${saved === 1 ? "" : "s"} saved`
				});
			}
			if (notesCancelRef.current || job.isCancelled()) job.done(`Stopped — ${saved} part${saved === 1 ? "" : "s"} saved`);
			else job.done(`${saved} note part${saved === 1 ? "" : "s"} saved`);
		} catch (err) {
			const message = err?.message || "Could not make notes from these pages.";
			job.fail(message);
			setNotesError(message);
		} finally {
			setNotesBusy(false);
		}
	};
	const printDocument = async () => {
		if (!activeDocId) return;
		try {
			const rec = await getLibraryDocument(activeDocId);
			if (!rec) return;
			if (activeDoc?.fileType === "docx") {
				const pages = (await listPageTexts(activeDocId)).sort((a, b) => a.pageNumber - b.pageNumber);
				if (!pages.length) throw new Error("This document has no extracted text to print.");
				const win = window.open("", "_blank", "width=860,height=1000");
				if (!win) throw new Error("The browser blocked the print window. Allow pop-ups for Pulse Med and try again.");
				const doc = win.document;
				const head = doc.createElement("head");
				const meta = doc.createElement("meta");
				meta.setAttribute("charset", "utf-8");
				const title = doc.createElement("title");
				title.textContent = activeDoc.title;
				const style = doc.createElement("style");
				style.textContent = "body{font-family:Georgia,serif;margin:40px;line-height:1.6;color:#111} h1{font-size:22px} .page{margin-bottom:28px} .num{font-size:11px;color:#777;border-top:1px solid #ddd;padding-top:4px;margin-top:16px} @media print{body{margin:16mm}}";
				head.append(meta, title, style);
				doc.head.replaceWith(head);
				const body = doc.body;
				const h1 = doc.createElement("h1");
				h1.textContent = activeDoc.title;
				body.appendChild(h1);
				for (const page of pages) {
					const wrap = doc.createElement("div");
					wrap.className = "page";
					const text = doc.createElement("div");
					text.textContent = page.text;
					text.style.whiteSpace = "pre-wrap";
					const num = doc.createElement("div");
					num.className = "num";
					num.textContent = `Page ${page.pageNumber} of ${pages.length}`;
					wrap.append(text, num);
					body.appendChild(wrap);
				}
				win.focus();
				setTimeout(() => win.print(), 300);
				return;
			}
			const url = URL.createObjectURL(rec.blob);
			const iframe = document.createElement("iframe");
			iframe.style.display = "none";
			iframe.src = url;
			document.body.appendChild(iframe);
			iframe.onload = () => {
				try {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();
				} finally {
					setTimeout(() => {
						document.body.removeChild(iframe);
						URL.revokeObjectURL(url);
					}, 3e4);
				}
			};
		} catch (err) {
			setLibraryError(err?.message || "Print failed.");
		}
	};
	const toggleFullscreen = async () => {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch (err) {
			setLibraryError(err?.message || "Full screen is not available in this window.");
		}
	};
	const downloadDocument = async () => {
		if (!activeDocId || !activeDoc) return;
		try {
			const rec = await getLibraryDocument(activeDocId);
			if (!rec) return;
			const url = URL.createObjectURL(rec.blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = activeDoc.fileType === "docx" ? `${activeDoc.title}.docx` : `${activeDoc.title}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			setTimeout(() => URL.revokeObjectURL(url), 1e4);
		} catch (err) {
			setLibraryError(err?.message || "Download failed.");
		}
	};
	const fitPageScale = (0, import_react.useCallback)(() => {
		const container = scrollRef.current;
		const base = baseDimsRef.current;
		if (!container || !base) return scaleRef.current;
		const scaleW = (container.clientWidth - 48) / base.w;
		const scaleH = (container.clientHeight - 40) / base.h;
		return Math.max(.25, Math.min(4, Math.min(scaleW, scaleH)));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!numPages) return;
		const onKey = (e) => {
			const target = e.target;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
			const current = currentPageRef.current;
			if (e.key === "ArrowRight" || e.key === "PageDown") {
				e.preventDefault();
				gotoPage(current + 1);
			} else if (e.key === "ArrowLeft" || e.key === "PageUp") {
				e.preventDefault();
				gotoPage(current - 1);
			} else if (e.key === "+" || e.key === "=") {
				setFitWidth(false);
				setScale((s) => Math.min(4, +(s + .2).toFixed(2)));
			} else if (e.key === "-") {
				setFitWidth(false);
				setScale((s) => Math.max(.25, +(s - .2).toFixed(2)));
			} else if (e.key === "Escape") setPopup(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [numPages]);
	const providerLabel = getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : "no active provider";
	const activeDoc = docs.find((d) => d.id === activeDocId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "h-[calc(100vh-64px)] flex flex-col max-w-7xl mx-auto w-full px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl mt-2 px-3 py-2 text-white border border-[#13294b] shadow-md flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => fileInputRef.current?.click(),
						className: "px-3 py-1.5 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-xs font-bold flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudUpload, { className: "w-3.5 h-3.5" }), " Open PDF"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileInputRef,
						type: "file",
						accept: "application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						multiple: true,
						className: "hidden",
						onChange: (e) => {
							handleImportFiles(e.target.files);
							e.target.value = "";
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						value: activeDocId ?? "",
						onChange: (e) => {
							if (e.target.value) openDoc(e.target.value);
						},
						className: "bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-white rounded-lg px-2 py-1.5 max-w-[220px] focus:outline-none",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "",
							children: docs.length ? "Choose a document…" : "No documents yet"
						}), docs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
							value: d.id,
							children: [
								d.title,
								" (",
								d.numPages,
								"p)"
							]
						}, d.id))]
					}),
					numPages > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => gotoPage(currentPage - 1),
									disabled: currentPage <= 1,
									className: "p-0.5 disabled:opacity-30 hover:text-[#8ff3f4]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-4 h-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: currentPage,
									onChange: (e) => {
										const n = parseInt(e.target.value, 10);
										if (!Number.isNaN(n)) setCurrentPage(n);
									},
									onKeyDown: (e) => {
										if (e.key === "Enter") gotoPage(currentPage);
									},
									className: "w-9 bg-transparent text-center text-xs font-mono focus:outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] text-slate-400",
									children: ["/ ", numPages]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => gotoPage(currentPage + 1),
									disabled: currentPage >= numPages,
									className: "p-0.5 disabled:opacity-30 hover:text-[#8ff3f4]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-1.5 py-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setFitWidth(!fitWidth),
									title: "Fit width",
									className: `p-1 rounded hover:bg-slate-700 ${fitWidth ? "text-[#8ff3f4]" : "text-slate-400"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, { className: "w-3.5 h-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setFitWidth(false);
										setScale((s) => Math.max(.25, +(s - .2).toFixed(2)));
									},
									className: "p-1 rounded hover:bg-slate-700",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomOut, { className: "w-3.5 h-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] font-mono w-11 text-center",
									children: [Math.round(scale * 100), "%"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										setFitWidth(false);
										setScale((s) => Math.min(4, +(s + .2).toFixed(2)));
									},
									className: "p-1 rounded hover:bg-slate-700",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ZoomIn, { className: "w-3.5 h-3.5" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-[220px]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-3.5 h-3.5 text-slate-400 shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: searchQuery,
									onChange: (e) => setSearchQuery(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter") runSearch();
									},
									placeholder: "Search whole book…",
									className: "flex-1 min-w-0 bg-transparent text-xs placeholder-slate-500 focus:outline-none"
								}),
								indexing.busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: stopSearch,
									className: "text-[11px] text-amber-300 flex items-center gap-1 shrink-0",
									title: "Stop indexing",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }),
										" ",
										indexing.done,
										"/",
										numPages
									]
								}) : matches.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => moveMatch(1),
									className: "text-[11px] font-mono text-[#8ff3f4] shrink-0",
									children: [
										matchIndex + 1,
										"/",
										matches.length
									]
								}) : matches.length === 0 && matchIndex === -1 && !indexing.busy ? null : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => moveMatch(-1),
									disabled: !matches.length,
									className: "p-0.5 disabled:opacity-30 hover:text-[#8ff3f4]",
									title: "Previous match",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-3.5 h-3.5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => moveMatch(1),
									disabled: !matches.length,
									className: "p-0.5 disabled:opacity-30 hover:text-[#8ff3f4]",
									title: "Next match",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-3.5 h-3.5" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: printDocument,
							title: "Print",
							className: "p-1.5 rounded-lg hover:bg-slate-700 text-slate-300",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: downloadDocument,
							title: "Download original file",
							className: "p-1.5 rounded-lg hover:bg-slate-700 text-slate-300",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudUpload, { className: "w-3.5 h-3.5 rotate-180" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								if (activeDoc?.fileType === "docx") return;
								setViewMode(viewMode === "page" ? "text" : "page");
								setPopup(null);
							},
							disabled: activeDoc?.fileType === "docx",
							title: activeDoc?.fileType === "docx" ? "DOCX documents are shown as extracted text" : viewMode === "page" ? "Extracted-text view" : "Page view",
							className: `p-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-[10px] font-bold disabled:opacity-40 ${viewMode === "text" ? "text-[#8ff3f4] bg-slate-700/50" : "text-slate-300"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Type, { className: "w-3.5 h-3.5" }),
								" ",
								viewMode === "page" ? "Text" : "Page"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setOcrOpen((v) => !v),
							title: "Read pages with OCR",
							className: `p-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-[10px] font-bold ${ocrOpen ? "text-[#8ff3f4] bg-slate-700/50" : "text-slate-300"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "w-3.5 h-3.5" }), " OCR"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setNotesOpen((v) => !v),
							title: "Make revision notes from a page range",
							className: `p-1.5 rounded-lg hover:bg-slate-700 flex items-center gap-1 text-[10px] font-bold ${notesOpen ? "text-[#8ff3f4] bg-slate-700/50" : "text-slate-300"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookPen, { className: "w-3.5 h-3.5" }), " Page notes"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setFitWidth(false);
								setScale(fitPageScale());
							},
							title: "Fit whole page",
							className: `p-1.5 rounded-lg text-xs font-bold ${fitWidth ? "text-slate-400 hover:bg-slate-700" : "text-[#8ff3f4] bg-slate-700/50"}`,
							children: "Fit page"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setShowLibrary(!showLibrary),
							title: "Toggle sidebar",
							className: `p-1.5 rounded-lg hover:bg-slate-700 ${showLibrary ? "text-[#8ff3f4]" : "text-slate-400"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTree, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: toggleFullscreen,
							title: "Full screen",
							className: "p-1.5 rounded-lg hover:bg-slate-700 text-slate-300",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Maximize, { className: "w-3.5 h-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => openAskPanel("page"),
							title: "Ask AI about this page",
							className: "px-2 py-1.5 rounded-lg bg-[#0f8b8d]/40 border border-[#0f8b8d]/40 text-xs font-bold flex items-center gap-1.5 hover:bg-[#0f8b8d]/60",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), " Ask AI"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setShowNotes(!showNotes),
							title: "Notes & highlights",
							className: `p-1.5 rounded-lg hover:bg-slate-700 ${showNotes ? "text-[#8ff3f4]" : "text-slate-400"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ListTree, { className: "w-3.5 h-3.5" })
						})
					] })
				]
			}),
			ocrOpen && numPages > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-bold text-slate-800 flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "w-4 h-4 text-[#0f8b8d]" }),
								" OCR this book",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[10px] text-slate-400",
									children: "tesseract.js · English"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-600",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: ocrForce,
								onChange: (e) => setOcrForce(e.target.checked),
								className: "accent-[#0f8b8d]"
							}), "Force OCR even when a page already has text"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => runOcr("current"),
								disabled: ocrBusy || !pdfRef.current,
								className: "px-2.5 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
								children: [
									ocrBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "w-3 h-3 text-[#8ff3f4]" }),
									"OCR current page (",
									currentPage,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => runOcr("missing"),
								disabled: ocrBusy || !pdfRef.current,
								className: "px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "w-3 h-3" }), " OCR pages without text"]
							}),
							ocrBusy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									if (ocrJobRef.current) stopJob(ocrJobRef.current.id);
								},
								className: "px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "w-3 h-3" }), " Stop OCR"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setOcrOpen(false),
								className: "ml-auto text-slate-400 hover:text-slate-600",
								title: "Close",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-slate-500 leading-relaxed",
						children: "OCR is lossy — review recognised text before relying on it. The first run downloads tesseract language data. Recognised text is saved to this book's page cache and used by search and Ask AI."
					}),
					ocrNote && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-2 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-700",
						children: ocrNote
					}),
					!pdfRef.current && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2",
						children: "OCR needs a PDF document. DOCX imports already contain real extracted text."
					})
				]
			}),
			notesOpen && numPages > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm text-xs space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-bold text-slate-800 flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookPen, { className: "w-4 h-4 text-[#0f8b8d]" }), " Make revision notes from pages"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setNotesOpen(false),
							className: "text-slate-400 hover:text-slate-600",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[10px] font-semibold text-slate-600",
								children: ["From page", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									max: numPages,
									value: notesFrom,
									onChange: (e) => setNotesFrom(Number(e.target.value)),
									className: "block w-20 mt-0.5 px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[10px] font-semibold text-slate-600",
								children: ["To page", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									max: numPages,
									value: notesTo,
									onChange: (e) => setNotesTo(Number(e.target.value)),
									className: "block w-20 mt-0.5 px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-[10px] font-semibold text-slate-600",
								children: ["Pages per part", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									min: 1,
									max: 20,
									value: notesPartSize,
									onChange: (e) => setNotesPartSize(Number(e.target.value)),
									className: "block w-20 mt-0.5 px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: makeNotesFromPages,
								disabled: notesBusy,
								className: "px-3 py-1.5 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
								children: [notesBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3" }), notesBusy ? "Generating…" : "Generate in parts"]
							}),
							notesBusy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									notesCancelRef.current = true;
								},
								className: "px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "w-3 h-3" }), " Stop (keeps saved parts)"]
							}),
							madeNotes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => downloadNotesPdf(`${docs.find((d) => d.id === activeDocId)?.title ?? "Book"} — page notes`, madeNotes.map((n) => `## ${n.range}\n\n${n.text}`).join("\n\n"), getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : void 0),
								className: "ml-auto px-2.5 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "w-3 h-3 text-[#8ff3f4]" }), " Download all notes (PDF)"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-slate-500 leading-relaxed",
						children: "Each part is written by your active AI provider from the book text, saved to your highlights immediately, and kept even if you press Stop. Page citations open the reader."
					}),
					notesError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 mt-0.5 shrink-0" }),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: notesError })
						]
					}),
					madeNotes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2 max-h-56 overflow-y-auto",
						children: madeNotes.map((n, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-2 rounded-lg border border-slate-200 bg-slate-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[9px] font-mono font-bold text-slate-500 mb-1",
								children: n.range
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RevisionNote, {
								text: n.text,
								topic: docs.find((d) => d.id === activeDocId)?.title
							})]
						}, `${n.range}-${i}`))
					})
				]
			}),
			(libraryError || docOpenError) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1",
						children: libraryError || docOpenError
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setLibraryError(null);
							setDocOpenError(null);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 min-h-0 flex gap-2 mt-2 pb-2 relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `${showLibrary ? "hidden md:flex" : "hidden"} flex-col w-44 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-2 border-b border-slate-100",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 pb-1 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-3 h-3" }), " Library"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "max-h-28 overflow-y-auto space-y-1",
									children: [docs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => openDoc(d.id),
										className: `group flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] cursor-pointer ${d.id === activeDocId ? "bg-teal-50 text-[#00696b] font-semibold border border-[#0f8b8d]/30" : "hover:bg-slate-50 text-slate-700"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate",
											children: d.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: (e) => {
												e.stopPropagation();
												handleDeleteDoc(d.id);
											},
											className: "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 shrink-0",
											title: "Delete from library",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3 h-3" })
										})]
									}, d.id)), !docs.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-slate-400 px-2 py-1",
										children: "Import with “Open file”"
									})]
								}),
								activeDoc && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: editSubject,
										className: "truncate font-semibold text-[#00696b] hover:underline",
										title: "Edit the subject for this book",
										children: activeDoc.subject || "Uncategorised"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: classifyWithAi,
										className: "shrink-0 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold",
										title: "Classify this book's subject with your active AI",
										children: "AI"
									})]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-h-0 overflow-y-auto p-2 space-y-2",
							"data-thumb-scroll": true,
							children: [
								numPages > 0 && activeDoc?.fileType === "docx" && Array.from({ length: numPages }, (_, i) => i + 1).map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => gotoPage(n),
									className: `w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-mono ${n === currentPage ? "bg-teal-50 text-[#00696b] border border-[#0f8b8d]/30 font-bold" : "text-slate-600 hover:bg-slate-50"}`,
									children: ["Page ", n]
								}, n)),
								numPages > 0 && activeDoc?.fileType !== "docx" && Array.from({ length: numPages }, (_, i) => i + 1).map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thumb, {
									num: n,
									active: n === currentPage,
									scaleHint: fitScale(),
									pdfRef,
									onClick: () => gotoPage(n)
								}, n)),
								!numPages && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full flex flex-col items-center justify-center text-center p-3",
									children: loadingDoc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-5 h-5 animate-spin text-[#0f8b8d]" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-6 h-6 text-slate-300 mb-1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[10px] text-slate-400 leading-relaxed",
										children: "Open a PDF to start reading. Files stay on this machine (IndexedDB)."
									})] })
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: scrollRef,
						onMouseUp: handleMouseUp,
						className: "flex-1 min-w-0 bg-slate-300/70 rounded-2xl border border-slate-300 overflow-y-auto overflow-x-auto relative",
						style: { scrollbarGutter: "stable" },
						children: [loadingDoc && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 z-10 bg-white/70 flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-6 h-6 animate-spin text-[#0f8b8d]" })
						}), viewMode === "text" && numPages > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full overflow-y-auto bg-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "max-w-3xl mx-auto p-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sticky top-0 bg-white/95 backdrop-blur pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 mb-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-bold text-slate-700",
											children: [
												"Extracted text · page ",
												textView.page,
												" / ",
												numPages
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => gotoPage(currentPage - 1),
												disabled: currentPage <= 1,
												className: "p-1 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-3.5 h-3.5" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => gotoPage(currentPage + 1),
												disabled: currentPage >= numPages,
												className: "p-1 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-3.5 h-3.5" })
											})]
										})]
									}),
									textView.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-xs text-slate-500 py-8",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin text-[#0f8b8d]" }), " Extracting page text…"]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[12px] leading-relaxed text-slate-800 whitespace-pre-wrap",
										children: textView.text || "No extractable text on this page. Run OCR from the toolbar to read a scanned page."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400",
										children: "Extracted text comes from the document itself or from a real OCR run — it is never invented."
									})
								]
							})
						}) : pdfRef.current && numPages > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "py-4 px-2 flex flex-col items-center gap-4",
							style: { ["--scale-factor"]: String(scale) },
							children: Array.from({ length: numPages }, (_, i) => i + 1).map((n) => {
								const base = baseDimsRef.current;
								const w = base ? Math.floor(base.w * scale) : 620;
								const h = base ? Math.floor(base.h * scale) : 800;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									"data-page-number": n,
									ref: (el) => setPageWrapRef(n, el),
									className: "relative bg-white shadow-md border border-slate-300 rounded-sm overflow-hidden",
									style: {
										width: w,
										height: h
									},
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											"data-canvas-slot": true,
											className: "absolute inset-0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											"data-text-slot": true,
											className: "textLayer absolute inset-0 overflow-hidden"
										}),
										highlights.filter((h) => h.page === n && h.rects && h.rects.length > 0).map((h) => (h.rects ?? []).map((r, ri) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											title: h.quote.slice(0, 160),
											className: "absolute rounded-[1px] mix-blend-multiply",
											style: {
												left: `${r.x * 100}%`,
												top: `${r.y * 100}%`,
												width: `${r.w * 100}%`,
												height: `${r.h * 100}%`,
												background: HL_COLORS.find((c) => c.id === h.color)?.css ?? "#fde047",
												opacity: .42,
												pointerEvents: "none",
												zIndex: 3
											}
										}, `${h.id}-${ri}`))),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "absolute bottom-1 right-2 text-[9px] text-slate-400 font-mono select-none z-10 bg-white/70 px-1 rounded",
											children: n
										}),
										pageErrors[n] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "absolute inset-0 flex items-center justify-center p-4 bg-rose-50/90 text-xs text-rose-700 text-center z-10",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pageErrors[n] })
										})
									]
								}, n);
							})
						}) : !loadingDoc && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "h-full flex flex-col items-center justify-center text-center p-8 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-7 h-7 text-slate-300" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-bold text-slate-800",
									children: "Real PDF reader"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-slate-500 max-w-sm leading-relaxed",
									children: [
										"Import your books with ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Open PDF" }),
										". Pages render on demand while you scroll (fast even for 1,500-page texts), text is selectable, highlights & notes are saved, and search covers the entire book."
									]
								})
							]
						})]
					}),
					popup && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute z-30 bg-white border border-slate-200 shadow-xl rounded-xl px-2 py-1.5 flex items-center gap-1",
						style: {
							left: popup.x,
							top: popup.y
						},
						children: [
							HL_COLORS.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => saveSelectionHighlight(c.id),
								title: `Highlight ${c.label}`,
								className: "w-5 h-5 rounded-full border border-slate-300 hover:scale-110 transition-transform",
								style: { background: c.css }
							}, c.id)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-px h-4 bg-slate-200 mx-0.5" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: copySelection,
								className: "p-1 rounded hover:bg-slate-100 text-slate-500",
								title: "Copy",
								children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => openAskPanel("selection"),
								className: "px-2 py-1 rounded-lg bg-[#001432] text-white text-[10px] font-bold flex items-center gap-1",
								title: "Ask AI about this selection",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3 text-[#8ff3f4]" }), " Ask AI"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setPopup(null),
								className: "p-1 rounded hover:bg-slate-100 text-slate-400",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
							})
						]
					}),
					showNotes && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden lg:flex flex-col w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 border-b border-slate-100 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs font-bold text-slate-800 flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, { className: "w-3.5 h-3.5 text-amber-500" }), " Highlights & notes"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setShowNotes(false),
									className: "text-slate-400 hover:text-slate-600",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 border-b border-slate-100 space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] font-bold uppercase tracking-wider text-[#0f8b8d] flex items-center gap-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3" }),
												" Ask AI · ",
												askContextLabel
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] font-mono text-slate-400",
											children: providerLabel
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setAskIncludeWeb(!askIncludeWeb),
											className: `text-[10px] font-semibold px-2 py-1 rounded-full border flex items-center gap-1 ${askIncludeWeb ? "bg-teal-50 border-[#0f8b8d]/40 text-[#00696b]" : "bg-slate-50 border-slate-200 text-slate-500"}`,
											title: "Include live web + PubMed sources in the answer context",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "w-3 h-3" }),
												" web sources ",
												askIncludeWeb ? "on" : "off"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setAskPanel(false),
											className: "text-slate-400 hover:text-slate-600 ml-auto",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
										})]
									}),
									(askPanel || askReply) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => askAi(),
													disabled: askBusy,
													className: "flex-1 px-2 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1",
													children: [
														askBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3 text-[#8ff3f4]" }),
														"Explain ",
														askContextLabel
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => generateMcqs(),
													disabled: mcqBusy || !getActiveProvider(),
													className: "px-2 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
													children: [mcqBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GraduationCap, { className: "w-3 h-3" }), "MCQs"]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												placeholder: "Type a custom question and press Enter…",
												onKeyDown: (e) => {
													if (e.key === "Enter" && !e.shiftKey) {
														e.preventDefault();
														askAi(e.target.value);
														e.target.value = "";
													}
												},
												className: "w-full text-[10px] px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#0f8b8d] resize-none",
												rows: 2
											}),
											askError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5",
												children: askError
											}),
											askReply && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] leading-relaxed text-slate-800 max-h-40 overflow-y-auto whitespace-pre-wrap p-2 bg-teal-50/50 border border-[#0f8b8d]/20 rounded-lg",
												children: askReply
											}),
											askCitations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[9px] font-mono text-slate-500 max-h-14 overflow-y-auto",
												children: askCitations.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "truncate",
													children: c
												}, i))
											}),
											mcqs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "space-y-2 max-h-64 overflow-y-auto",
												children: mcqs.map((q, qi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-[10px] font-semibold text-slate-800",
															children: [
																qi + 1,
																". ",
																q.question
															]
														}),
														q.options.map((o, oi) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-[10px] text-slate-600 pl-2",
															children: [
																String.fromCharCode(65 + oi),
																". ",
																o
															]
														}, oi)),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
															onClick: () => setShowMcqAnswers((prev) => ({
																...prev,
																[qi]: !prev[qi]
															})),
															className: "text-[9px] font-bold text-[#0f8b8d] underline",
															children: showMcqAnswers[qi] ? "Hide answer" : "Reveal answer"
														}),
														showMcqAnswers[qi] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-1",
															children: [
																String.fromCharCode(65 + q.answerIndex),
																". ",
																q.explanation
															]
														})
													]
												}, qi))
											})
										]
									}),
									!askPanel && !askReply && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[10px] text-slate-400 leading-relaxed",
										children: [
											"Select text in the page and press ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Ask AI" }),
											", or use the toolbar button to use the whole page."
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-h-0 overflow-y-auto p-3 space-y-2",
								children: [highlights.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] text-slate-400",
									children: "No highlights in this book yet. Select any text and pick a colour — it is saved to your Highlights collection."
								}), highlights.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "group p-2 rounded-lg border border-slate-200 bg-slate-50 space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "w-3 h-3 rounded-full border border-slate-300",
													style: { background: h.color ?? "#fde047" }
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => h.page && gotoPage(h.page),
													className: "text-[10px] font-bold text-[#0f8b8d] hover:underline",
													children: `p. ${h.page ?? "—"}`
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => deleteHighlight(h.id),
												className: "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash, { className: "w-3 h-3" })
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[10px] text-slate-700 leading-relaxed line-clamp-4",
											children: h.quote
										}),
										h.note && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[10px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-1.5 py-1",
											children: h.note
										})
									]
								}, h.id))]
							})
						]
					})
				]
			})
		]
	});
};
var Thumb = ({ num, active, scaleHint, pdfRef, onClick }) => {
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	const holderRef = (0, import_react.useRef)(null);
	const canvasHostRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const holder = holderRef.current;
		if (!holder || !pdfRef.current) return;
		let cancelled = false;
		const io = new IntersectionObserver(async (entries) => {
			if (!entries.some((e) => e.isIntersecting) || loaded || cancelled || !pdfRef.current) return;
			io.disconnect();
			try {
				const page = await pdfRef.current.getPage(num);
				const s = Math.min(.35, Math.max(.12, scaleHint * .25));
				const vp = page.getViewport({ scale: s });
				const canvas = document.createElement("canvas");
				canvas.width = Math.floor(vp.width);
				canvas.height = Math.floor(vp.height);
				canvas.className = "w-full block rounded";
				if (canvasHostRef.current && !cancelled) {
					canvasHostRef.current.replaceChildren(canvas);
					await page.render({
						canvasContext: canvas.getContext("2d"),
						viewport: vp
					}).promise;
					if (!cancelled) setLoaded(true);
				}
			} catch {}
		}, {
			root: holder.parentElement,
			threshold: .05
		});
		io.observe(holder);
		return () => {
			cancelled = true;
			io.disconnect();
		};
	}, [num, active]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: holderRef,
		onClick,
		className: `cursor-pointer p-1 rounded-lg border transition-colors ${active ? "border-[#0f8b8d] bg-teal-50" : "border-transparent hover:border-slate-300"}`,
		"data-thumb-page": num,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative bg-slate-100 rounded min-h-[60px] flex items-center justify-center overflow-hidden",
			children: [!loaded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "absolute inset-0 flex items-center justify-center text-[9px] font-mono text-slate-400",
				children: num
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: canvasHostRef,
				className: "relative w-full"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `text-center text-[9px] font-mono mt-0.5 ${active ? "text-[#00696b] font-bold" : "text-slate-400"}`,
			children: num
		})]
	});
};
//#endregion
export { PDFReaderView };
