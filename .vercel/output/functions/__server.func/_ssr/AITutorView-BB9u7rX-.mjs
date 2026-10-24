import { o as __toESM } from "../_runtime.mjs";
import { c as savePageText, i as listLibraryDocuments, n as getLibraryDocument, o as pdf_worker_min_default, r as getPageText } from "./pdf.worker.min-BsAGzMJi.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { B as LoaderCircle, E as RotateCcw, Et as Bot, I as MessageSquare, M as Paperclip, Ot as BookmarkPlus, Q as FileText, S as Send, Tt as Brain, U as Layers, b as ShieldCheck, bt as Check, ct as Copy, f as Trash2, i as X, it as ExternalLink, j as Pencil, k as Plus, kt as BookOpen, mt as CircleCheck, u as TriangleAlert, v as Sparkles, yt as ChevronDown } from "../_libs/lucide-react.mjs";
import { b as setActiveProvider, c as listCapturedQuestions, g as highlightFromAiReply, h as getEffectiveModel, l as NOT_CONNECTED_MESSAGE, m as getActiveProvider, p as fetchProviderStatus, s as capturedToClinicalQuestion, u as addUserHighlight, x as setModel } from "./routes-BVhAYNf3.mjs";
import { r as getDocument, t as GlobalWorkerOptions } from "../_libs/pdfjs-dist.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AITutorView-BB9u7rX-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
GlobalWorkerOptions.workerSrc = pdf_worker_min_default;
async function extractBookPageText(docId, pageNumber) {
	const rec = await getLibraryDocument(docId);
	if (!rec) throw new Error("That document is no longer in the library.");
	const total = rec.numPages || 0;
	if (!Number.isFinite(pageNumber) || pageNumber < 1 || total > 0 && pageNumber > total) throw new Error(total > 0 ? `That document has ${total} page${total === 1 ? "" : "s"}.` : "Enter a page number of 1 or more.");
	const cached = await getPageText(docId, pageNumber).catch(() => null);
	if (cached && cached.trim()) return {
		docId,
		docTitle: rec.title,
		pageNumber,
		text: cached.trim()
	};
	if (rec.fileType === "docx") throw new Error("That page has no stored text. Re-import the document, then try again.");
	const buffer = await rec.blob.arrayBuffer();
	const pdf = await getDocument({ data: new Uint8Array(buffer) }).promise;
	try {
		const text = ((await (await pdf.getPage(pageNumber)).getTextContent()).items || []).map((item) => typeof item?.str === "string" ? item.str : "").filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
		if (!text) throw new Error(`Page ${pageNumber} has no selectable text — it is probably a scan. Open it in the PDF Reader and run OCR, then attach it again.`);
		await savePageText(docId, pageNumber, text).catch(() => void 0);
		return {
			docId,
			docTitle: rec.title,
			pageNumber,
			text
		};
	} finally {
		try {
			await pdf.destroy();
		} catch {}
	}
}
var CONVERSATIONS_KEY = "pulse.aiTutor.conversations.v1";
var EFFORT_KEY = "ai.effort";
var EFFORT_LEVELS = [
	"Min",
	"Low",
	"Medium",
	"High",
	"Ultra"
];
var PERSONAS = [
	{
		id: "BOARD_MASTER",
		label: "Board Master",
		hint: "Distractors & pearls"
	},
	{
		id: "ATTENDING",
		label: "Attending",
		hint: "Socratic rounds"
	},
	{
		id: "PHARMACOLOGIST",
		label: "Pharmacologist",
		hint: "Mechanisms & kinetics"
	}
];
function loadConversations() {
	try {
		const raw = localStorage.getItem(CONVERSATIONS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function saveConversations(list) {
	try {
		localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(list.slice(0, 50)));
	} catch {}
}
function newConversation() {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	return {
		id: `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		title: "New clinical chat",
		createdAt: now,
		updatedAt: now,
		messages: []
	};
}
function renderInline(text, keyPrefix) {
	return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
		const key = `${keyPrefix}-${i}`;
		if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
			className: "font-bold text-slate-900",
			children: part.slice(2, -2)
		}, key);
		if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
			className: "px-1 py-0.5 rounded bg-slate-100 text-[#0f8b8d] font-mono text-[11px]",
			children: part.slice(1, -1)
		}, key);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: part }, key);
	});
}
function renderMarkdown(text) {
	const lines = text.split("\n");
	const blocks = [];
	let list = [];
	let listKey = "";
	const flushList = () => {
		if (list.length) {
			blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "list-disc pl-5 space-y-1 my-1.5",
				children: list
			}, `ul-${blocks.length}`));
			list = [];
			listKey = "";
		}
	};
	lines.forEach((rawLine, i) => {
		const line = rawLine.trimEnd();
		const trimmed = line.trim();
		const key = `md-${i}`;
		if (!trimmed) {
			flushList();
			return;
		}
		const bullet = trimmed.match(/^(?:[-*])\s+(.*)$/);
		const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
		const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
		if (bullet) {
			if (listKey !== "ul") flushList();
			listKey = "ul";
			list.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: renderInline(bullet[1], key) }, key));
			return;
		}
		if (ordered) {
			if (listKey !== "ol") flushList();
			listKey = "ol";
			list.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: renderInline(ordered[2], key) }, key));
			return;
		}
		if (heading) {
			flushList();
			blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `font-bold text-slate-900 mt-3 mb-1 ${heading[1].length <= 2 ? "text-sm" : "text-xs"}`,
				children: renderInline(heading[2], key)
			}, key));
			return;
		}
		flushList();
		blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "my-1.5",
			children: renderInline(line, key)
		}, key));
	});
	flushList();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: blocks });
}
var AITutorView = ({ initialQuestionId, attachedQuestion, onNavigate, currentExam = "NEET_PG" }) => {
	const [conversations, setConversations] = (0, import_react.useState)(() => {
		const loaded = loadConversations();
		return loaded.length ? loaded : [newConversation()];
	});
	const [activeId, setActiveId] = (0, import_react.useState)("");
	const [renamingId, setRenamingId] = (0, import_react.useState)(null);
	const [renameText, setRenameText] = (0, import_react.useState)("");
	const [providerMap, setProviderMap] = (0, import_react.useState)({});
	const [statusError, setStatusError] = (0, import_react.useState)(null);
	const [provider, setProvider] = (0, import_react.useState)(() => getActiveProvider());
	const [model, setModel$1] = (0, import_react.useState)("");
	const [input, setInput] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [persona, setPersona] = (0, import_react.useState)("BOARD_MASTER");
	const [effort, setEffort] = (0, import_react.useState)(() => {
		try {
			const saved = localStorage.getItem(EFFORT_KEY);
			return saved && EFFORT_LEVELS.includes(saved) ? saved : "Medium";
		} catch {
			return "Medium";
		}
	});
	const [contextRemoved, setContextRemoved] = (0, import_react.useState)(false);
	const [copiedMsgId, setCopiedMsgId] = (0, import_react.useState)(null);
	const [savedHighlightId, setSavedHighlightId] = (0, import_react.useState)(null);
	const [attachments, setAttachments] = (0, import_react.useState)([]);
	const [attachOpen, setAttachOpen] = (0, import_react.useState)(false);
	const [attachDocs, setAttachDocs] = (0, import_react.useState)([]);
	const [attachDocsBusy, setAttachDocsBusy] = (0, import_react.useState)(false);
	const [attachDocId, setAttachDocId] = (0, import_react.useState)("");
	const [attachPage, setAttachPage] = (0, import_react.useState)("1");
	const [attachBusy, setAttachBusy] = (0, import_react.useState)(false);
	const [attachError, setAttachError] = (0, import_react.useState)(null);
	const messagesEndRef = (0, import_react.useRef)(null);
	const textareaRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setActiveId((prev) => prev || conversations[0]?.id || "");
	}, []);
	const activeConversation = (0, import_react.useMemo)(() => conversations.find((c) => c.id === activeId) ?? conversations[0], [conversations, activeId]);
	const messages = activeConversation?.messages ?? [];
	(0, import_react.useEffect)(() => {
		saveConversations(conversations);
	}, [conversations]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			try {
				const providers = await fetchProviderStatus();
				if (cancelled) return;
				setProviderMap(providers);
				setStatusError(null);
				const stored = getActiveProvider();
				if (stored && providers[stored]?.connected) setProvider(stored);
				else {
					const first = [
						"chatgpt",
						"claude",
						"grok",
						"gemini"
					].find((id) => providers[id]?.connected) ?? null;
					if (first) {
						setProvider(first);
						setActiveProvider(first);
					} else if (stored) setProvider(stored);
				}
				setModel$1((m) => m || (provider ? getEffectiveModel(provider) : ""));
			} catch (err) {
				if (!cancelled) setStatusError(err?.message || "Could not check AI provider status.");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (provider) setModel$1(getEffectiveModel(provider));
	}, [provider]);
	(0, import_react.useEffect)(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length, loading]);
	const contextQuestion = (0, import_react.useMemo)(() => {
		if (contextRemoved) return null;
		if (attachedQuestion) return attachedQuestion;
		if (!initialQuestionId) return null;
		const captured = listCapturedQuestions().find((c) => c.id === initialQuestionId);
		return captured ? capturedToClinicalQuestion(captured) : null;
	}, [
		initialQuestionId,
		attachedQuestion,
		contextRemoved
	]);
	const updateConversation = (0, import_react.useCallback)((id, updater) => {
		setConversations((prev) => prev.map((c) => c.id === id ? updater(c) : c));
	}, []);
	const appendMessage = (0, import_react.useCallback)((convId, msg) => {
		updateConversation(convId, (c) => ({
			...c,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
			messages: [...c.messages, msg]
		}));
	}, [updateConversation]);
	const connectedProviders = [
		"chatgpt",
		"claude",
		"grok",
		"gemini"
	].filter((id) => providerMap[id]?.connected);
	const handleProviderChange = (id) => {
		setProvider(id);
		setActiveProvider(id);
	};
	const handleModelChange = (value) => {
		setModel$1(value);
		if (provider) setModel(provider, value);
	};
	const handleEffortChange = (value) => {
		setEffort(value);
		try {
			localStorage.setItem(EFFORT_KEY, value);
		} catch {}
	};
	const loadAttachDocs = async () => {
		setAttachDocsBusy(true);
		setAttachError(null);
		try {
			const options = (await listLibraryDocuments()).map((d) => ({
				id: d.id,
				title: d.title,
				numPages: d.numPages,
				fileType: d.fileType,
				subject: d.subject
			}));
			setAttachDocs(options);
			setAttachDocId((prev) => prev && options.some((o) => o.id === prev) ? prev : options[0]?.id || "");
		} catch (err) {
			setAttachError(err?.message || "Could not read the PDF library on this device.");
		} finally {
			setAttachDocsBusy(false);
		}
	};
	const openAttachPanel = () => {
		if (attachOpen) {
			setAttachOpen(false);
			return;
		}
		setAttachOpen(true);
		setAttachError(null);
		if (!attachDocs.length) loadAttachDocs();
	};
	const attachSelectedPage = async () => {
		const doc = attachDocs.find((d) => d.id === attachDocId);
		if (!doc) {
			setAttachError("Import a PDF or DOCX in the PDF Reader first, then attach its pages here.");
			return;
		}
		const page = Math.round(Number(attachPage));
		if (!Number.isFinite(page) || page < 1) {
			setAttachError("Enter a page number of 1 or more.");
			return;
		}
		if (attachments.some((a) => a.docId === doc.id && a.pageNumber === page)) {
			setAttachError(`Page ${page} of "${doc.title}" is already attached.`);
			return;
		}
		setAttachBusy(true);
		setAttachError(null);
		try {
			const result = await extractBookPageText(doc.id, page);
			setAttachments((prev) => [...prev, {
				id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
				docId: result.docId,
				docTitle: result.docTitle,
				pageNumber: result.pageNumber,
				text: result.text.slice(0, 6e3)
			}]);
			setAttachOpen(false);
			setAttachPage(String(page + 1));
			setTimeout(() => textareaRef.current?.focus(), 0);
		} catch (err) {
			setAttachError(err?.message || "Could not read that page.");
		} finally {
			setAttachBusy(false);
		}
	};
	const removeAttachment = (id) => {
		setAttachments((prev) => prev.filter((a) => a.id !== id));
	};
	/** Context block prepended to the prompt (never shown as the chat bubble text). */
	const buildAttachmentContext = () => {
		if (!attachments.length) return "";
		return `[Attached book pages from the learner's own library — treat these as the primary source and cite the page]\n\n${attachments.map((a) => `Source: ${a.docTitle}, page ${a.pageNumber}\n"""\n${a.text}\n"""`).join("\n\n")}`;
	};
	const selectedAttachDoc = attachDocs.find((d) => d.id === attachDocId);
	const send = async (text, opts) => {
		const trimmed = text.trim();
		const conv = conversations.find((c) => c.id === activeId) ?? conversations[0];
		if (!trimmed || loading || !conv) return;
		if (!provider) {
			setStatusError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		const contextNote = opts && "contextNote" in opts ? opts.contextNote : buildAttachmentContext() || void 0;
		const attachmentLabels = opts && "attachments" in opts ? opts.attachments : attachments.length ? attachments.map((a) => ({
			docTitle: a.docTitle,
			pageNumber: a.pageNumber
		})) : void 0;
		const userMsg = {
			id: `u-${Date.now()}`,
			role: "user",
			content: trimmed,
			ts: (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit"
			}),
			contextNote,
			attachments: attachmentLabels
		};
		const replaceIndex = opts?.replaceFromIndex;
		const historyMessages = replaceIndex !== void 0 ? conv.messages.slice(0, replaceIndex) : conv.messages;
		if (replaceIndex !== void 0) {
			const other = {
				...userMsg,
				id: `u-${Date.now()}-r`
			};
			updateConversation(conv.id, (c) => ({
				...c,
				messages: [...historyMessages, other]
			}));
		} else {
			appendMessage(conv.id, userMsg);
			if (conv.messages.length === 0) updateConversation(conv.id, (c) => ({
				...c,
				title: trimmed.slice(0, 40) || "New clinical chat"
			}));
		}
		setInput("");
		if (!opts) setAttachments([]);
		setLoading(true);
		const history = historyMessages.filter((m) => !m.isError).slice(-10).map((m) => ({
			role: m.role,
			content: m.contextNote ? `${m.contextNote}\n\n${m.content}` : m.content
		}));
		try {
			const res = await fetch("/api/ai/tutor-chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: contextNote ? `${contextNote}\n\n${trimmed}` : trimmed,
					history,
					persona,
					provider,
					model,
					effort,
					exam: currentExam,
					contextQuestion: contextQuestion ? {
						id: contextQuestion.id,
						subject: contextQuestion.subject,
						subtopic: contextQuestion.subtopic,
						stem: contextQuestion.stem,
						correctOption: contextQuestion.correctOption,
						trapExplanation: contextQuestion.trapExplanation
					} : void 0
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				const srvError = typeof data?.error === "string" && data.error.trim() ? data.error : `AI request failed (HTTP ${res.status}).`;
				const prefix = res.status === 401 ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} is not connected. ` : "";
				throw new Error(prefix + srvError);
			}
			const replyText = typeof data.reply === "string" && data.reply.trim() ? data.reply : "The AI provider returned an empty response. Try rephrasing your prompt.";
			const tutorMsg = {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: replyText,
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit"
				}),
				reasoningSteps: Array.isArray(data.reasoningSteps) && data.reasoningSteps.length > 0 ? data.reasoningSteps : void 0,
				pearl: typeof data.pearl === "string" && data.pearl.trim() ? data.pearl : void 0,
				citations: Array.isArray(data.citations) && data.citations.length > 0 ? data.citations : void 0,
				suggestedFollowups: Array.isArray(data.suggestedFollowups) && data.suggestedFollowups.length > 0 ? data.suggestedFollowups : void 0
			};
			if (replaceIndex !== void 0) updateConversation(conv.id, (c) => ({
				...c,
				messages: [
					...historyMessages,
					{
						...userMsg,
						id: `u-${Date.now()}-r`
					},
					tutorMsg
				]
			}));
			else appendMessage(conv.id, tutorMsg);
		} catch (err) {
			const message = err?.message || "AI request failed.";
			appendMessage(conv.id, {
				id: `a-${Date.now()}`,
				role: "assistant",
				content: message,
				ts: (/* @__PURE__ */ new Date()).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit"
				}),
				isError: true
			});
		} finally {
			setLoading(false);
		}
	};
	const regenerate = (index) => {
		let userIdx = -1;
		for (let i = index - 1; i >= 0; i--) if (messages[i].role === "user") {
			userIdx = i;
			break;
		}
		if (userIdx === -1) return;
		send(messages[userIdx].content, {
			replaceFromIndex: userIdx,
			contextNote: messages[userIdx].contextNote,
			attachments: messages[userIdx].attachments
		});
	};
	const saveAsHighlight = (msg) => {
		if (msg.isError) return;
		const citation = msg.citations?.length ? msg.citations[0] : void 0;
		addUserHighlight(highlightFromAiReply({
			quote: msg.content.slice(0, 1200),
			subject: contextQuestion?.subject,
			subtopic: contextQuestion?.subtopic,
			citation,
			note: msg.pearl
		}));
		setSavedHighlightId(msg.id);
		setTimeout(() => setSavedHighlightId(null), 2e3);
	};
	const copyMessage = (msg) => {
		navigator.clipboard.writeText(msg.content);
		setCopiedMsgId(msg.id);
		setTimeout(() => setCopiedMsgId(null), 1500);
	};
	const createConversation = () => {
		const c = newConversation();
		setConversations((prev) => [c, ...prev]);
		setActiveId(c.id);
	};
	const deleteConversation = (id) => {
		setConversations((prev) => {
			const next = prev.filter((c) => c.id !== id);
			const fallback = next.length ? next : [newConversation()];
			if (id === activeId) setActiveId(fallback[0].id);
			return fallback;
		});
	};
	const commitRename = () => {
		if (renamingId) {
			const title = renameText.trim() || "Untitled chat";
			updateConversation(renamingId, (c) => ({
				...c,
				title
			}));
			setRenamingId(null);
		}
	};
	const quickPrompts = [
		"Explain the trap in this question",
		"Make an Anki cloze from the key fact",
		"Give a 5-question quiz on this topic"
	];
	const connectedCount = connectedProviders.length;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "h-[calc(100vh-64px)] flex flex-col max-w-7xl mx-auto w-full px-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-4 text-white border border-[#13294b] shadow-md mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-9 h-9 rounded-xl bg-[#0f8b8d]/30 border border-[#0f8b8d]/40 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-[#8ff3f4]" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-base font-bold text-white leading-tight",
						children: "Clinical AI Tutor"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-slate-300",
						children: provider && providerMap[provider]?.connected ? `Live · ${provider} · ${model || getEffectiveModel(provider)}` : `No connected provider · ${NOT_CONNECTED_MESSAGE}`
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: persona,
								onChange: (e) => setPersona(e.target.value),
								className: "appearance-none bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-white rounded-lg pl-2.5 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]",
								children: PERSONAS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: p.id,
									children: p.label
								}, p.id))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: provider ?? "",
								onChange: (e) => handleProviderChange(e.target.value),
								className: "appearance-none bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-white rounded-lg pl-2.5 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d] disabled:opacity-50",
								disabled: connectedCount === 0,
								children: [connectedCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "No provider connected"
								}), connectedProviders.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: id,
									children: id
								}, id))]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: model,
							onChange: (e) => handleModelChange(e.target.value),
							disabled: !provider,
							list: "tutor-model-options",
							placeholder: "model id",
							className: "w-36 bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-white rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d] disabled:opacity-50 placeholder-slate-500"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
							id: "tutor-model-options",
							children: provider && providerMap[provider]?.connected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: getEffectiveModel(provider) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: effort,
								onChange: (e) => handleEffortChange(e.target.value),
								title: "Reasoning effort (subscription providers)",
								className: "appearance-none bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-white rounded-lg pl-2.5 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]",
								children: EFFORT_LEVELS.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: level,
									children: [level, " effort"]
								}, level))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" })]
						})
					]
				})]
			}),
			contextQuestion && !contextRemoved && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 flex items-center gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-900",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-3.5 h-3.5 text-amber-600 shrink-0" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-semibold truncate max-w-[320px] lg:max-w-[480px]",
							children: [
								"Context: ",
								contextQuestion.subtopic,
								" — ",
								contextQuestion.stem.slice(0, 80),
								contextQuestion.stem.length > 80 ? "…" : ""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setContextRemoved(true),
							title: "Remove attached question from context",
							className: "text-amber-700 hover:text-amber-900 shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 min-h-0 flex gap-3 mt-2 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden md:flex flex-col w-60 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: createConversation,
							className: "m-3 mb-2 px-3 py-2 rounded-xl bg-[#001432] hover:bg-[#13294b] text-white text-xs font-bold flex items-center justify-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), " New chat"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 overflow-y-auto px-2 pb-2 space-y-1",
							children: conversations.map((c) => {
								const isActive = c.id === activeConversation?.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									onClick: () => setActiveId(c.id),
									className: `group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer text-xs transition-colors ${isActive ? "bg-teal-50 border border-[#0f8b8d]/30 text-[#00696b]" : "hover:bg-slate-50 text-slate-700 border border-transparent"}`,
									children: renamingId === c.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										autoFocus: true,
										value: renameText,
										onChange: (e) => setRenameText(e.target.value),
										onBlur: commitRename,
										onKeyDown: (e) => {
											if (e.key === "Enter") commitRename();
											if (e.key === "Escape") setRenamingId(null);
										},
										className: "flex-1 min-w-0 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs focus:outline-none"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: `w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#0f8b8d]" : "text-slate-400"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "truncate font-medium",
											children: c.title
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "hidden group-hover:flex items-center gap-0.5 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: (e) => {
												e.stopPropagation();
												setRenamingId(c.id);
												setRenameText(c.title);
											},
											className: "p-1 rounded hover:bg-slate-200 text-slate-500",
											title: "Rename",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "w-3 h-3" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: (e) => {
												e.stopPropagation();
												deleteConversation(c.id);
											},
											className: "p-1 rounded hover:bg-rose-100 text-slate-500 hover:text-rose-600",
											title: "Delete",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3 h-3" })
										})]
									})] })
								}, c.id);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3 h-3 text-emerald-600" }), "Chats stored locally on this device"]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm",
					children: [
						statusError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "m-3 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex-1",
									children: statusError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => onNavigate("settings"),
									className: "text-rose-700 hover:text-rose-900 underline shrink-0",
									children: "Settings"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setStatusError(null),
									className: "text-rose-500 hover:text-rose-700 shrink-0",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-h-0 overflow-y-auto p-4 space-y-4",
							children: [
								messages.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "h-full flex flex-col items-center justify-center text-center space-y-3 py-10",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-12 h-12 rounded-2xl bg-teal-50 border border-[#0f8b8d]/20 flex items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "w-6 h-6 text-[#0f8b8d]" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "text-sm font-bold text-slate-800",
											children: "Ask anything clinical"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-slate-500 max-w-sm leading-relaxed",
											children: [
												"Replies are generated live by your connected provider (",
												provider ? `currently ${provider}` : "none connected",
												") with the last 10 turns of this conversation as context. Attach an exam question with the chip above, attach a real page from your PDF library with the paperclip, or start with a quick prompt below."
											]
										})
									]
								}),
								messages.map((msg, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `flex ${msg.role === "user" ? "justify-end" : "justify-start"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `group max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `px-4 py-3 rounded-2xl text-xs leading-relaxed ${msg.role === "user" ? "bg-[#001432] text-white rounded-tr-sm" : msg.isError ? "bg-rose-50 border border-rose-300 text-rose-900 rounded-tl-sm" : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm"}`,
												children: [
													msg.role === "assistant" && !msg.isError && msg.citations && msg.citations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "flex flex-wrap items-center gap-1.5 pb-2 mb-1.5 border-b border-slate-200/70",
														children: msg.citations.map((cite, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600",
															title: "AI-cited reference",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5 text-slate-400" }),
																cite.slice(0, 60),
																cite.length > 60 ? "…" : ""
															]
														}, i))
													}),
													msg.role === "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "whitespace-pre-wrap font-sans",
														children: msg.content
													}), msg.attachments && msg.attachments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "mt-2 flex flex-wrap gap-1.5",
														children: msg.attachments.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-teal-100",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-2.5 h-2.5" }),
																a.docTitle,
																" · p.",
																a.pageNumber
															]
														}, `${a.docTitle}-${a.pageNumber}-${i}`))
													})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "font-sans [&_p]:my-1.5",
														children: renderMarkdown(msg.content)
													}),
													msg.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => onNavigate("settings"),
														className: "mt-2 text-rose-700 hover:text-rose-900 underline font-semibold",
														children: "Open Settings → AI Subscription Hub"
													})
												]
											}),
											msg.role === "assistant" && !msg.isError && msg.reasoningSteps && msg.reasoningSteps.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "w-full p-3 bg-teal-50/60 border border-[#0f8b8d]/20 rounded-xl text-[11px] text-slate-700 space-y-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-bold uppercase tracking-wider text-[#0f8b8d] flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-3 h-3" }), " Reasoning trace"]
												}), msg.reasoningSteps.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-bold text-slate-800 shrink-0",
														children: [s.step, ":"]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "leading-relaxed",
														children: s.detail
													})]
												}, i))]
											}),
											msg.role === "assistant" && !msg.isError && msg.pearl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "w-full p-3 bg-[#001432] text-white rounded-xl text-[11px] flex gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "leading-relaxed",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-amber-400 uppercase tracking-wider mr-1",
														children: "Board pearl:"
													}), msg.pearl]
												})]
											}),
											msg.role === "assistant" && !msg.isError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "hidden group-hover:flex items-center gap-1 pt-0.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => copyMessage(msg),
														className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700",
														title: "Copy",
														children: copiedMsgId === msg.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => regenerate(index),
														disabled: loading,
														className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-40",
														title: "Regenerate reply",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => saveAsHighlight(msg),
														className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600",
														title: "Save as highlight",
														children: savedHighlightId === msg.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookmarkPlus, { className: "w-3.5 h-3.5" })
													})
												]
											}),
											msg.role === "assistant" && !msg.isError && msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && index === messages.length - 1 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex flex-wrap gap-1.5 pt-1",
												children: msg.suggestedFollowups.map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => send(f),
													className: "text-[11px] px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-[#0f8b8d]/40 hover:bg-teal-50 text-slate-700",
													children: f
												}, i))
											})
										]
									})
								}, msg.id)),
								loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex justify-start",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-50 border border-slate-200 flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin text-[#0f8b8d]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] text-slate-500",
											children: [
												"Synthesising with ",
												provider ? `${provider} · ${model || getEffectiveModel(provider)}` : "AI",
												"…"
											]
										})]
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: messagesEndRef })
							]
						}),
						messages.length === 0 && !loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "px-4 pb-2 flex flex-wrap gap-2",
							children: quickPrompts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => send(p),
								disabled: !provider || connectedCount === 0,
								className: "text-[11px] px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-700 disabled:opacity-40",
								children: p
							}, p))
						}),
						(attachments.length > 0 || attachOpen) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-3 pb-2 space-y-2",
							children: [attachments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1.5",
								children: attachments.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-[#0f8b8d]/30 text-[10px] text-[#00696b]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-3 h-3 shrink-0" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold truncate max-w-[260px]",
											children: a.docTitle
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono",
											children: ["p.", a.pageNumber]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => removeAttachment(a.id),
											title: "Remove this page from context",
											className: "text-[#0f8b8d] hover:text-rose-600 shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
										})
									]
								}, a.id))
							}), attachOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] font-bold text-slate-700 flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }), "Attach a page from your PDF library"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setAttachOpen(false),
											className: "text-slate-400 hover:text-slate-700",
											title: "Close",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
										})]
									}),
									attachDocsBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-[11px] text-slate-500",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }), " Reading the local library…"]
									}) : attachDocs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-slate-600 leading-relaxed",
										children: ["No documents in the library yet. Import a PDF or DOCX in the PDF Reader, then attach its pages here.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => onNavigate("pdf-reader"),
											className: "ml-1 font-semibold text-[#0f8b8d] hover:text-[#00696b] underline",
											children: "Open PDF Reader"
										})]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
												value: attachDocId,
												onChange: (e) => {
													setAttachDocId(e.target.value);
													setAttachPage("1");
													setAttachError(null);
												},
												className: "max-w-[300px] flex-1 min-w-[160px] text-[11px] px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]",
												children: attachDocs.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
													value: d.id,
													children: [d.title, d.subject ? ` — ${d.subject}` : ""]
												}, d.id))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1 text-[11px] text-slate-500",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "page" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "number",
														min: 1,
														max: selectedAttachDoc?.numPages || void 0,
														value: attachPage,
														onChange: (e) => {
															setAttachPage(e.target.value);
															setAttachError(null);
														},
														onKeyDown: (e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																attachSelectedPage();
															}
														},
														className: "w-16 text-[11px] font-mono px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["of ", selectedAttachDoc?.numPages ?? "?"] })
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: attachSelectedPage,
												disabled: attachBusy,
												className: "px-3 py-1.5 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-white text-[11px] font-bold disabled:opacity-40 inline-flex items-center gap-1.5",
												children: [attachBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { className: "w-3.5 h-3.5" }), "Attach page"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => {
													loadAttachDocs();
												},
												className: "text-[10px] text-slate-500 hover:text-slate-800 underline",
												title: "Re-read the library (after adding a document)",
												children: "Refresh"
											})
										]
									}),
									attachError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3.5 h-3.5 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: attachError })]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 border-t border-slate-100 flex items-end gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: openAttachPanel,
									title: "Attach a page from your PDF library as context",
									className: `p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 ${attachOpen || attachments.length ? "bg-teal-50 border-[#0f8b8d]/40 text-[#00696b]" : "bg-slate-50 border-slate-200 text-slate-500 hover:text-[#00696b] hover:border-[#0f8b8d]/40"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { className: "w-4 h-4" }), attachments.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[10px]",
										children: attachments.length
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									ref: textareaRef,
									value: input,
									onChange: (e) => setInput(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											send(input);
										}
									},
									rows: 2,
									placeholder: connectedCount === 0 ? "Connect an AI provider in Settings to start chatting…" : attachments.length > 0 ? `Ask about page ${attachments[0].pageNumber} of ${attachments[0].docTitle.slice(0, 40)}… (Enter to send)` : contextQuestion ? "Ask about the attached question… (Enter to send, Shift+Enter for a new line)" : "Type a clinical question… (Enter to send, Shift+Enter for a new line)",
									className: "flex-1 resize-none text-xs text-slate-800 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d] placeholder-slate-400"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => send(input),
									disabled: loading || !input.trim() || connectedCount === 0,
									className: "px-4 py-2.5 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shrink-0",
									children: [loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "w-4 h-4" }), "Send"]
								})
							]
						})
					]
				})]
			})
		]
	});
};
//#endregion
export { AITutorView };
