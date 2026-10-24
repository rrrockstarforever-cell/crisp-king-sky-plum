import { o as __toESM } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { $ as FileQuestion, A as Play, At as Bell, B as LoaderCircle, C as Search, Ct as Calendar, D as Radio, Dt as Bookmark, E as RotateCcw, F as Moon, G as ImagePlus, H as Lightbulb, J as Gauge, L as Menu, Mt as ArrowRight, N as OctagonAlert, Nt as Activity, P as NotebookPen, Q as FileText, St as ChartColumn, T as Save, Tt as Brain, U as Layers, W as Key, X as Flame, Y as Funnel, Z as Flag, _ as Square, _t as ChevronRight, a as Wrench, at as Download, b as ShieldCheck, bt as Check, ct as Copy, dt as Clock, f as Trash2, ft as Clock3, g as StickyNote, gt as ChevronUp, h as Sun, ht as CircleAlert, i as X, it as ExternalLink, jt as Award, k as Plus, kt as BookOpen, l as Trophy, lt as Compass, m as Target, mt as CircleCheck, nt as Eye, o as User, ot as Database, p as Timer, pt as ClipboardPaste, q as Globe, r as Youtube, rt as EyeOff, s as Upload, st as Cpu, tt as FileCheck, u as TriangleAlert, v as Sparkles, vt as ChevronLeft, w as ScanText, wt as CalendarClock, x as ShieldAlert, xt as ChartPie, y as SlidersVertical, yt as ChevronDown, z as LogOut } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/userHighlightsStore-C9llQRjr.js
var AI_PROVIDER_IDS = [
	"gemini",
	"chatgpt",
	"claude",
	"grok"
];
var DEFAULT_MODELS = {
	gemini: "gemini-3.8-flash",
	chatgpt: "gpt-6.1-sol",
	claude: "claude-sonnet-5-5",
	grok: "grok-4.5"
};
var NOT_CONNECTED_MESSAGE = "Connect an AI provider in Settings → AI Subscription Hub.";
var AiError = class extends Error {
	kind;
	constructor(message, kind = "api") {
		super(message);
		this.name = "AiError";
		this.kind = kind;
	}
};
function getActiveProvider() {
	const value = localStorage.getItem("ai.activeProvider");
	return value && AI_PROVIDER_IDS.includes(value) ? value : null;
}
function setActiveProvider(provider) {
	localStorage.setItem("ai.activeProvider", provider);
}
/** Pick the first connected provider (called after fetching /api/oauth/status). */
function pickDefaultActiveProvider(status) {
	return AI_PROVIDER_IDS.filter((id) => Boolean(status[id]?.connected))[0] ?? null;
}
function getModel(provider) {
	const value = localStorage.getItem(`ai.model.${provider}`);
	return value && value.trim() ? value.trim() : null;
}
function setModel(provider, model) {
	localStorage.setItem(`ai.model.${provider}`, model.trim());
}
function getEffectiveModel(provider) {
	return getModel(provider) ?? DEFAULT_MODELS[provider];
}
async function fetchProviderStatus() {
	try {
		const res = await fetch("/api/oauth/status");
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return (await res.json()).providers ?? {};
	} catch (err) {
		throw new AiError(`Could not reach the local AI server (${err?.message || "network error"}).`, "network");
	}
}
/** Calls POST /api/ai/complete with the active (or given) provider. Throws typed AiError on failure. */
async function aiComplete(options) {
	const provider = options.provider ?? getActiveProvider();
	if (!provider) throw new AiError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`, "not_connected");
	const body = {
		provider,
		model: options.model ?? getEffectiveModel(provider),
		system: options.system,
		messages: options.messages,
		json: options.json,
		effort: options.effort
	};
	let res;
	try {
		res = await fetch("/api/ai/complete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		});
	} catch (err) {
		throw new AiError(`Could not reach the local AI server (${err?.message || "network error"}).`, "network");
	}
	let data = null;
	try {
		data = await res.json();
	} catch {}
	if (!res.ok) {
		const srvMsg = typeof data?.error === "string" ? data.error : `AI request failed (HTTP ${res.status}).`;
		if (res.status === 401) throw new AiError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} is not connected. ${NOT_CONNECTED_MESSAGE}`, "not_connected");
		throw new AiError(srvMsg, "api");
	}
	const text = typeof data?.text === "string" ? data.text : "";
	if (!text.trim()) throw new AiError("The AI provider returned an empty response. Try again.", "api");
	return text;
}
/** Extract the first JSON value from raw model output (tolerates markdown fences and surrounding prose). */
function extractJson(raw) {
	if (!raw) return null;
	let text = raw.trim();
	const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fence) text = fence[1].trim();
	const start = text.search(/[[{]/);
	if (start > 0) text = text.slice(start);
	const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
	if (end > -1) text = text.slice(0, end + 1);
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
/**
* A reply cut off mid-item (token limit, dropped connection) is invalid JSON as a whole,
* but every item before the cut is intact. Walk the "questions" array and keep each
* COMPLETE object so one truncated tail never throws away a whole batch.
*/
function salvageQuestionObjects(text) {
	if (!text) return [];
	const key = text.indexOf("\"questions\"");
	const open = text.indexOf("[", key >= 0 ? key : 0);
	if (open < 0) return [];
	const items = [];
	let depth = 0;
	let inStr = false;
	let esc = false;
	let start = -1;
	for (let i = open + 1; i < text.length; i++) {
		const c = text[i];
		if (inStr) {
			if (esc) esc = false;
			else if (c === "\\") esc = true;
			else if (c === "\"") inStr = false;
			continue;
		}
		if (c === "\"") {
			inStr = true;
			continue;
		}
		if (c === "{") {
			if (depth === 0) start = i;
			depth++;
		} else if (c === "}") {
			depth--;
			if (depth === 0 && start >= 0) {
				try {
					items.push(JSON.parse(text.slice(start, i + 1)));
				} catch {}
				start = -1;
			}
		} else if (c === "]" && depth === 0) break;
	}
	return items;
}
var GENERATOR_SYSTEM = `You are a senior item writer for the Indian and Australian postgraduate medical entrance exams (NEET-PG, INI-CET, AMC CAT).
Your questions are written to DISCRIMINATE between well-prepared candidates, not to confirm what everyone already knows. An item that a candidate can answer from a single buzzword is a failed item.
Every question has exactly one defensible best answer. Distractors are real, plausible entities that a half-prepared candidate would genuinely choose, never absurd or obviously wrong.
Always respond with ONLY a single valid JSON object (no markdown fences, no commentary).`;
/**
* Per-exam item patterns, ported from the original app's generator (its `__cmExam`
* table). These, not a one-line label, are what keep the questions exam-standard.
*/
var EXAM_PATTERNS = {
	NEET_PG: {
		name: "NEET PG",
		opts: 4,
		pat: "NEET PG (NBEMS) pattern. Exactly 4 options (A-D), one correct; +4 for correct, -1 for wrong. Mostly 2-5 line clinical vignettes giving age, sex, presenting complaint, key examination findings and results, ending with ONE lead-in such as 'What is the most likely diagnosis?', 'What is the next best step in management?', 'What is the investigation of choice?', 'What is the drug of choice?' or 'Identify the structure/condition shown'. Mix in one-liner factual recall items, about one in five image-based items (describe the X-ray, CT, histology slide, instrument, ECG or clinical photo finding in words, then ask to identify it), integrated items linking two subjects, and PSM/biostatistics calculations where relevant. Options must be homogeneous and close; avoid 'all of the above', 'none of the above' and 'all except' wording."
	},
	INI_CET: {
		name: "INI-CET",
		opts: 4,
		pat: "INI-CET (AIIMS) pattern. Exactly 4 options (A-D); +1 correct, -1/3 wrong. About half single-best-answer clinical vignettes and half analytical formats: multiple-statement items ('Which of the following statements is/are correct? 1. ... 2. ... 3. ... 4. ...' with options such as '1 and 3 only', '2, 3 and 4 only'), match-the-following (List I with List II, options as code combinations like 'A-2, B-4, C-1, D-3'), assertion-reason (Assertion A / Reason R with the four standard options), arrange-in-correct-sequence, and recent-advances or guideline facts. Image-heavy topics describe the image in words. Distractors must be very close; elimination should be hard."
	},
	AMC_CAT: {
		name: "AMC CAT MCQ",
		opts: 5,
		pat: "AMC CAT MCQ pattern (Australia). Exactly 5 options (A-E), one best answer, no negative marking. Every item is a patient vignette set in Australian practice (general practice, emergency department, ward, rural or remote clinic) giving age, sex, history, examination and relevant results, ending with ONE lead-in such as 'What is the most appropriate next step in management?', 'What is the most likely diagnosis?', 'Which investigation is most appropriate?', 'What is the most appropriate advice?'. Test data gathering, data interpretation and management, favouring safe guideline-based next steps. Follow Australian sources: Therapeutic Guidelines (eTG), Australian Medicines Handbook, RACGP Red Book, John Murtagh's General Practice (safe diagnostic strategy: probability diagnosis, serious disorders not to be missed, pitfalls, masquerades, is the patient trying to tell me something), National Immunisation Program, state Mental Health Acts, consent and Gillick competence, mandatory reporting, Aboriginal and Torres Strait Islander health. Options must be homogeneous (all diagnoses, or all management steps)."
	}
};
var TIER_BEHAVIOUR = {
	LOW: "EASY: still a short clinical vignette (never a bare one-line fact). One inferential step. Distractors are plausible and share the same category as the key, but the key is clearly best to a well-prepared candidate.",
	MEDIUM: "MEDIUM: a full vignette. The candidate must first infer the diagnosis or mechanism, then choose the correct next step. Distractors are close mimickers or classic confusions, so recognising the buzzword alone does not give the answer.",
	HIGH: "HARD: a long vignette with two or three reasoning steps, an atypical or overlapping presentation, and a recent-guideline or evidence-based decision point. Every distractor is individually defensible in some other scenario; only the exact details of THIS patient make one option best. Elimination must be hard and the key must not be guessable from keywords."
};
var GENERATION_RULES = "Rules: medically accurate and current; do not invent doses or values; no two questions on the same fact; the stem must not contain a clue that gives the answer away; options must be homogeneous and of similar length; vary which option is correct across the batch (do not favour B or C).";
var NO_SHUFFLE = /\b(all|none|both|neither)\b.*\b(above|these|of the)\b|\b(a|b|c|d|e)\s*(and|&|,)\s*(a|b|c|d|e)\b|^\s*(a|b|c|d|e)\s*[,&]|\bonly\s*$|^\s*\d(\s*(,|and|&)\s*\d)+/i;
/** Models over-use B/C for the key. Shuffle so the position is not a tell. */
function shuffleOptions(entries, correctId) {
	if (entries.length < 3 || entries.some((e) => NO_SHUFFLE.test(e.text))) return {
		entries,
		correct: correctId
	};
	const order = entries.map((_, i) => i);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}
	const ids = [
		"A",
		"B",
		"C",
		"D",
		"E"
	];
	const origCorrect = entries.findIndex((e) => e.id === correctId);
	return {
		entries: order.map((o, i) => ({
			id: ids[i],
			text: entries[o].text
		})),
		correct: ids[order.indexOf(origCorrect)]
	};
}
var SUB_LEVEL_DEFAULT = {
	LOW: "L1",
	MEDIUM: "M1",
	HIGH: "H1"
};
var TIER_ACCURACY = {
	LOW: 82,
	MEDIUM: 64,
	HIGH: 48
};
var validCogTiers = [
	"Direct Recall",
	"Clinical 2-Step",
	"Multi-Step & IBQ"
];
var tierToCog = {
	LOW: "Direct Recall",
	MEDIUM: "Clinical 2-Step",
	HIGH: "Multi-Step & IBQ"
};
var globalSeq = 0;
function nextId(exam) {
	globalSeq += 1;
	return `AI-${exam.replace("_", "")}-${Date.now().toString(36)}-${globalSeq}`;
}
/** Validate/repair one raw question from the model; null when it must be dropped. */
function buildQuestion(raw, exam, pool, tier, subLevel, requiredOptions) {
	if (!raw || typeof raw !== "object") return null;
	const stem = typeof raw.stem === "string" ? raw.stem.trim() : "";
	if (!stem) return null;
	const entries = [];
	if (Array.isArray(raw.options)) raw.options.forEach((o) => {
		if (o && typeof o.text === "string" && o.text.trim()) {
			const id = (typeof o.id === "string" ? o.id : "").trim().toUpperCase();
			if ([
				"A",
				"B",
				"C",
				"D",
				"E"
			].includes(id)) entries.push({
				id,
				text: o.text.trim()
			});
		}
	});
	else if (raw.options && typeof raw.options === "object") for (const key of [
		"A",
		"B",
		"C",
		"D",
		"E"
	]) {
		const text = raw.options[key];
		if (typeof text === "string" && text.trim()) entries.push({
			id: key,
			text: text.trim()
		});
	}
	if (entries.length !== requiredOptions) return null;
	const keyed = String(raw.correctOption ?? "").trim().toUpperCase();
	if (!entries.some((o) => o.id === keyed)) return null;
	const shuffled = shuffleOptions(entries, keyed);
	const correct = shuffled.correct;
	const requested = pool[Math.floor(Math.random() * pool.length)];
	const subject = typeof raw.subject === "string" && raw.subject.trim() ? raw.subject.trim() : requested.subject;
	const subtopic = typeof raw.subtopic === "string" && raw.subtopic.trim() ? raw.subtopic.trim() : requested.subtopic;
	const cogTier = validCogTiers.includes(raw.cognitiveTier) ? raw.cognitiveTier : tierToCog[tier];
	const aiTier = [
		"LOW",
		"MEDIUM",
		"HIGH"
	].includes(raw.difficultyTier) ? raw.difficultyTier : tier;
	const targetAccuracy = typeof raw.targetAccuracy === "number" && raw.targetAccuracy > 5 && raw.targetAccuracy < 100 ? Math.round(raw.targetAccuracy) : TIER_ACCURACY[aiTier];
	return {
		id: nextId(exam),
		moduleCode: `${exam.replace("_", "-")} · AI Generated Module`,
		examType: exam,
		subject,
		subtopic,
		cognitiveTier: cogTier,
		difficultyTier: aiTier,
		difficultySubLevel: subLevel || SUB_LEVEL_DEFAULT[aiTier],
		stem,
		questionText: typeof raw.questionText === "string" && raw.questionText.trim() ? raw.questionText.trim() : stem,
		options: shuffled.entries.map((o) => ({
			id: o.id,
			text: o.text
		})),
		correctOption: correct,
		boardPearl: typeof raw.boardPearl === "string" ? raw.boardPearl.trim() : "",
		explanation: typeof raw.explanation === "string" && raw.explanation.trim() ? raw.explanation.trim() : void 0,
		citations: Array.isArray(raw.citations) ? raw.citations.filter((c) => typeof c === "string" && c.trim()).map((c) => c.trim()).slice(0, 5) : [],
		trapType: typeof raw.trapType === "string" && raw.trapType.trim() ? raw.trapType.trim() : void 0,
		trapExplanation: typeof raw.trapExplanation === "string" && raw.trapExplanation.trim() ? raw.trapExplanation.trim() : void 0,
		targetAccuracy
	};
}
/**
* Generate `count` MCQs with the user's ACTIVE AI provider, in batches of <=10.
* Returns validated ClinicalQuestion[] tagged sourceType:'ai-generator' plus the number dropped.
*/
async function generateExamQuestions(options) {
	const { exam, count, subjectSubtopics, difficultyTier, difficultySubLevel, effort, onProgress, shouldStop, questionTypes, stemPatterns, evidenceSources, patientGroup, presentingProblems, sourceMaterial } = options;
	const pool = [];
	const subjectEntries = subjectSubtopics.map((s) => ({
		subject: s.subject,
		subs: s.subtopics.filter((t) => typeof t === "string" && t.trim())
	}));
	const maxLen = Math.max(0, ...subjectEntries.map((s) => s.subs.length));
	for (let i = 0; i < maxLen; i++) for (const entry of subjectEntries) if (entry.subs[i]) pool.push({
		subject: entry.subject,
		subtopic: entry.subs[i]
	});
	const workingPool = pool.length ? pool : [{
		subject: subjectSubtopics[0]?.subject ?? "General Medicine",
		subtopic: "General Clinical Sciences"
	}];
	[...new Set(workingPool.map((p) => p.subject))];
	const tier = difficultyTier === "ALL" ? "MEDIUM" : difficultyTier;
	const pattern = EXAM_PATTERNS[exam];
	const questions = [];
	let dropped = 0;
	let batch = 0;
	const plannedBatches = Math.ceil(count / 10);
	const maxBatches = plannedBatches * 3 + 4;
	let consecutiveFailed = 0;
	while (questions.length < count && batch < maxBatches && consecutiveFailed < 3) {
		if (shouldStop?.()) break;
		batch += 1;
		const batchSize = Math.min(10, count - questions.length);
		const before = questions.length;
		const poolStart = (batch - 1) * batchSize % workingPool.length;
		const batchPool = [];
		for (let i = 0; i < batchSize; i++) batchPool.push(workingPool[(poolStart + i) % workingPool.length]);
		const raw = await aiComplete({
			system: GENERATOR_SYSTEM,
			messages: [{
				role: "user",
				content: [
					`Write ${batchSize} NEW, exam-standard MCQs for ${pattern.name}.`,
					difficultyTier === "ALL" ? `Difficulty: a realistic exam mix of about 20% easy, 45% medium and 35% hard. Set each item's "difficultyTier" (LOW / MEDIUM / HIGH) to match what you wrote.\n${TIER_BEHAVIOUR.LOW}\n${TIER_BEHAVIOUR.MEDIUM}\n${TIER_BEHAVIOUR.HIGH}` : `Difficulty: ${difficultyTier}${difficultySubLevel ? ` (sub-level ${difficultySubLevel})` : ""}. Every item must be at this level.\n${TIER_BEHAVIOUR[difficultyTier]}`,
					pattern.pat,
					questionTypes && questionTypes.length ? `Mix these QUESTION TYPES across the batch (label each item's focus implicitly through the stem): ${questionTypes.join("; ")}. For "match the following" or "multiple statements" style, use the options to present the statement sets / roman-numeral choices inside the stem.` : "",
					stemPatterns && stemPatterns.length ? `Rotate the question ("questionText") around these STEM PATTERNS: ${stemPatterns.join("; ")}.` : "",
					evidenceSources && evidenceSources.length ? `Ground management/drug/screening answers in these evidence sources and name them in citations: ${evidenceSources.join("; ")}.` : "",
					patientGroup ? `Where clinically relevant, frame vignettes around this patient group: ${patientGroup}.` : "",
					presentingProblems && presentingProblems.length ? `Present the patients with these presenting problems where possible: ${presentingProblems.join("; ")}.` : "",
					sourceMaterial ? `Base every question on the learner's own saved notes below. Use only facts stated or directly implied there; do not add unrelated content. Cite the note's source in "citations".\n"""\n${sourceMaterial.slice(0, 12e3)}\n"""` : "",
					questions.length ? `Do NOT repeat or lightly paraphrase any of these stems already written in this module:\n${questions.slice(-30).map((q) => `- ${q.stem.replace(/\s+/g, " ").slice(0, 180)}`).join("\n")}` : "",
					`Allowed subjects and their subtopics (each question's subject+subtopic pair MUST come from this list, or omit both to let the app assign one):`,
					...subjectSubtopics.map((s) => `- ${s.subject}: ${s.subtopics.join("; ")}`),
					"",
					"JSON shape — return exactly {\"questions\": [...]} where each item has:",
					"{",
					"  \"examType\": \"" + exam + "\",",
					"  \"subject\": \"one of the allowed subjects\",",
					"  \"subtopic\": \"one of the allowed subtopics for that subject\",",
					"  \"cognitiveTier\": \"Direct Recall\" | \"Clinical 2-Step\" | \"Multi-Step & IBQ\",",
					"  \"difficultyTier\": \"LOW\" | \"MEDIUM\" | \"HIGH\",",
					"  \"stem\": \"clinical vignette / scenario (2-7 sentences, concrete findings, no answer hints)\",",
					"  \"questionText\": \"the actual question sentence asking for the single best answer\",",
					`  "options": {${"ABCDE".slice(0, pattern.opts).split("").map((k) => `"${k}": "text"`).join(", ")}} — EXACTLY ${pattern.opts} options, no more and no fewer,`,
					`  "correctOption": "one of ${"ABCDE".slice(0, pattern.opts).split("").join(", ")}" (the single best answer),`,
					"  \"explanation\": \"120-220 words, each part on its own line: first why the keyed answer is right; then ONE line for EACH of the other options saying exactly why it is wrong; then one exam tip\",",
					"  \"boardPearl\": \"one-line high-yield exam pearl\",",
					"  \"citations\": [\"standard textbook / guideline citation, e.g. Harrison's 21st Ed Ch. 142 or eTG\"],",
					"  \"trapType\": \"short label for the classic trap in this item\",",
					"  \"trapExplanation\": \"why the most tempting distractor is wrong\",",
					"  \"targetAccuracy\": 0-100 expected percent of examinees answering correctly",
					"}",
					GENERATION_RULES,
					"Use authentic current clinical knowledge; no obsolete trivia. Output ONLY the JSON object."
				].join("\n")
			}],
			json: true,
			effort
		});
		const parsed = extractJson(raw);
		let batchItems = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.questions) ? parsed.questions : null;
		if (!batchItems) {
			const salvaged = salvageQuestionObjects(raw);
			if (salvaged.length) batchItems = salvaged;
		}
		if (!batchItems) {
			dropped += batchSize;
			consecutiveFailed += 1;
		} else {
			for (const item of batchItems) {
				if (questions.length >= count) break;
				const q = buildQuestion(item, exam, batchPool, difficultyTier === "ALL" ? [
					"LOW",
					"MEDIUM",
					"HIGH"
				][questions.length % 3] : tier, difficultySubLevel, pattern.opts);
				if (q) questions.push(q);
			}
			dropped += batchSize - (questions.length - before);
			consecutiveFailed = questions.length === before ? consecutiveFailed + 1 : 0;
		}
		onProgress?.(questions.length, count, batch, Math.max(plannedBatches, batch));
	}
	return {
		questions,
		dropped
	};
}
var DATA_CHANGED_EVENT = "pulse:data-changed";
function notifyDataChanged() {
	if (typeof window === "undefined") return;
	try {
		window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
	} catch {}
}
function subscribeDataChanged(listener) {
	if (typeof window === "undefined") return () => {};
	window.addEventListener(DATA_CHANGED_EVENT, listener);
	return () => window.removeEventListener(DATA_CHANGED_EVENT, listener);
}
var KEY$2 = "pulse.userHighlights.v1";
function readArray() {
	try {
		const raw = localStorage.getItem(KEY$2);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function writeArray(items) {
	try {
		localStorage.setItem(KEY$2, JSON.stringify(items));
		notifyDataChanged();
	} catch (err) {
		console.error("Could not save user highlights", err);
	}
}
function listUserHighlights() {
	return readArray();
}
function listUserHighlightsForDoc(docId) {
	return readArray().filter((h) => h.docId === docId);
}
function addUserHighlight(input) {
	const item = {
		...input,
		id: input.id || `UH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		createdAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	const items = readArray();
	items.unshift(item);
	writeArray(items);
	return item;
}
function updateUserHighlight(id, patch) {
	writeArray(readArray().map((h) => h.id === id ? {
		...h,
		...patch
	} : h));
}
function removeUserHighlight(id) {
	writeArray(readArray().filter((h) => h.id !== id));
}
/** Build a SavedHighlight-shaped entry from an AI tutor reply (for "Save as highlight"). */
function highlightFromAiReply(args) {
	return {
		kind: "ai-reply",
		subject: args.subject || "General",
		subtopic: args.subtopic || "AI Tutor",
		yieldTier: "HIGH",
		sourceContext: "AI Tutor",
		citation: args.citation || "AI-generated explanation",
		quote: args.quote,
		memoryAnchor: args.note,
		note: args.note,
		tags: args.tags?.length ? args.tags : ["ai"],
		srsIntervalDays: 1,
		lastReviewed: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
	};
}
/** Build a SavedHighlight-shaped entry from a PDF text selection. */
function highlightFromPdfSelection(args) {
	return {
		kind: "pdf",
		subject: "General",
		subtopic: "PDF Reader",
		yieldTier: "HIGH",
		sourceContext: `${args.docTitle} · p. ${args.page}`,
		citation: `${args.docTitle} — page ${args.page}`,
		quote: args.quote,
		color: args.color,
		note: args.note,
		memoryAnchor: args.note,
		docId: args.docId,
		docTitle: args.docTitle,
		page: args.page,
		rects: args.rects,
		tags: ["pdf"],
		srsIntervalDays: 1,
		lastReviewed: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
	};
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BVhAYNf3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var KEY$1 = "pulse.mistakes.v1";
function readAll() {
	try {
		const raw = localStorage.getItem(KEY$1);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function writeAll(items) {
	try {
		localStorage.setItem(KEY$1, JSON.stringify(items.slice(0, 1e3)));
		notifyDataChanged();
	} catch (err) {
		console.error("Could not save captured questions", err);
		throw new Error("Local storage is full — could not save the captured question.");
	}
}
function listCapturedQuestions() {
	return readAll();
}
function addCapturedQuestion(input) {
	const item = {
		...input,
		id: input.id || `CAP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
		createdAt: input.createdAt || (/* @__PURE__ */ new Date()).toISOString()
	};
	const items = readAll();
	items.unshift(item);
	writeAll(items);
	return item;
}
function updateCapturedQuestion(id, patch) {
	writeAll(readAll().map((q) => q.id === id ? {
		...q,
		...patch
	} : q));
}
function removeCapturedQuestion(id) {
	writeAll(readAll().filter((q) => q.id !== id));
}
function importCapturedQuestions(records) {
	const items = readAll();
	const existing = new Set(items.map((q) => q.id));
	let added = 0;
	for (const rec of records) {
		if (!rec || typeof rec.id !== "string" || !rec.question || existing.has(rec.id)) continue;
		items.push(rec);
		existing.add(rec.id);
		added += 1;
	}
	writeAll(items);
	return added;
}
/** The notebook renders ordinary ClinicalQuestions; marking maps onto isRemediated. */
function capturedToClinicalQuestion(c) {
	return {
		...c.question,
		id: c.id,
		isRemediated: c.status === "remediated",
		timesFailed: c.status === "remediated" ? 1 : Math.max(1, c.question.timesFailed ?? 1)
	};
}
/**
* Recognise English text in an image.
* @param source canvas, image, blob, object URL or data URL
* @param onProgress called by tesseract with real recognition progress
*/
async function ocrImage(source, onProgress) {
	const mod = await import("../_libs/tesseract.js.mjs").then((n) => /* @__PURE__ */ __toESM(n.t()));
	const createWorker = mod.createWorker ?? mod.default?.createWorker;
	if (typeof createWorker !== "function") throw new Error("tesseract.js is not available. Run npm install and restart the app.");
	const worker = await createWorker("eng", 1, { logger: (m) => {
		if (!onProgress) return;
		const status = typeof m?.status === "string" ? m.status : "recognising";
		onProgress({
			progress: typeof m?.progress === "number" ? m.progress : 0,
			status
		});
	} });
	try {
		const result = await worker.recognize(source);
		return {
			text: typeof result?.data?.text === "string" ? result.data.text.trim() : "",
			confidence: typeof result?.data?.confidence === "number" ? result.data.confidence : null
		};
	} finally {
		try {
			await worker.terminate();
		} catch {}
	}
}
var MAX_JOBS = 20;
var jobs = [];
var listeners = /* @__PURE__ */ new Set();
var cancelled = /* @__PURE__ */ new Set();
function emit() {
	const snapshot = [...jobs];
	for (const listener of listeners) listener(snapshot);
}
function startJob(label, detail) {
	const id = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	jobs = [{
		id,
		label,
		detail,
		progress: 0,
		status: "running",
		startedAt: Date.now()
	}, ...jobs].slice(0, MAX_JOBS);
	cancelled.delete(id);
	emit();
	const patch = (next) => {
		jobs = jobs.map((j) => j.id === id ? {
			...j,
			...next
		} : j);
		emit();
	};
	return {
		id,
		update: ({ progress, detail: d, label: l }) => {
			const next = {};
			if (progress !== void 0) next.progress = progress;
			if (d !== void 0) next.detail = d;
			if (l !== void 0) next.label = l;
			if (Object.keys(next).length > 0) patch(next);
		},
		isCancelled: () => cancelled.has(id),
		done: (d) => {
			patch({
				status: "done",
				progress: 100,
				detail: d ?? "Finished"
			});
		},
		fail: (error) => {
			patch({
				status: "error",
				error
			});
		}
	};
}
function stopJob(id) {
	cancelled.add(id);
	jobs = jobs.map((j) => j.id === id && j.status === "running" ? {
		...j,
		status: "stopped",
		detail: "Stopped"
	} : j);
	emit();
}
function dismissJob(id) {
	jobs = jobs.filter((j) => j.id !== id);
	emit();
}
function clearFinishedJobs() {
	jobs = jobs.filter((j) => j.status === "running");
	emit();
}
function getJobs() {
	return [...jobs];
}
function subscribeJobs(listener) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}
/** React hook: current job list, re-rendering on every registry update. */
function useStudyJobs() {
	const [list, setList] = (0, import_react.useState)(() => getJobs());
	(0, import_react.useEffect)(() => subscribeJobs(setList), []);
	return list;
}
/** Render **bold** and `code` inline markers without injecting HTML. */
function renderInline(text, keyPrefix, onOpenPage) {
	const nodes = [];
	text.split(/(\*\*[^*]+\*\*)/g).forEach((part, i) => {
		if (/^\*\*[^*]+\*\*$/.test(part)) {
			nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
				className: "font-semibold text-slate-900",
				children: part.slice(2, -2)
			}, `${keyPrefix}-b${i}`));
			return;
		}
		const re = /\b(p{1,2}\.\s*\d{1,4}|page\s+\d{1,4})\b/gi;
		let last = 0;
		let match;
		while ((match = re.exec(part)) !== null) {
			if (match.index > last) nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: part.slice(last, match.index) }, `${keyPrefix}-t${i}-${match.index}`));
			const pageNum = Number((match[0].match(/\d+/) ?? ["0"])[0]);
			nodes.push(onOpenPage && pageNum > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => onOpenPage(pageNum),
				className: "inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded bg-teal-50 border border-[#0f8b8d]/30 text-[#00696b] font-semibold hover:bg-teal-100",
				title: `Open page ${pageNum} in the reader`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-3 h-3" }),
					" ",
					match[0]
				]
			}, `${keyPrefix}-p${i}-${match.index}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-slate-500",
				children: match[0]
			}, `${keyPrefix}-p${i}-${match.index}`));
			last = match.index + match[0].length;
		}
		if (last < part.length) nodes.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Fragment, { children: part.slice(last) }, `${keyPrefix}-t${i}-end`));
	});
	return nodes;
}
var RevisionNote = ({ text, topic, onOpenPage, className }) => {
	if (!text.trim()) return null;
	const lines = text.split("\n");
	const blocks = [];
	let buffer = [];
	const flush = (key) => {
		if (!buffer.length) return;
		const body = buffer.join(" ");
		blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] leading-relaxed text-slate-700",
			children: renderInline(body, key, onOpenPage)
		}, key));
		buffer = [];
	};
	lines.forEach((rawLine, index) => {
		const trimmed = rawLine.trimEnd().trim();
		if (!trimmed) {
			flush(`p${index}`);
			return;
		}
		const isHighYield = /^(high[- ]yield|pearl|exam pearl)\b/i.test(trimmed) || /^(#+\s*)?high[- ]yield/i.test(trimmed);
		const isMnemonic = /^mnemonic\b/i.test(trimmed) || /^memory hook\b/i.test(trimmed);
		if (isHighYield || isMnemonic) {
			flush(`p${index}`);
			const clean = trimmed.replace(/^(high[- ]yield(\s+pearl)?|pearl|exam pearl|mnemonic|memory hook)\s*[:\-—]\s*/i, "");
			blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: isMnemonic ? "p-2 rounded-lg bg-amber-50 border border-amber-200" : "p-2 rounded-lg bg-teal-50 border border-[#0f8b8d]/25",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5 ${isMnemonic ? "text-amber-800" : "text-[#00696b]"}`,
					children: [isMnemonic ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-3 h-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3" }), isMnemonic ? "Mnemonic" : "High-yield"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-[11px] leading-relaxed text-slate-800",
					children: renderInline(clean, `c${index}`, onOpenPage)
				})]
			}, `callout${index}`));
			return;
		}
		if (/^#{1,4}\s+/.test(trimmed)) {
			flush(`p${index}`);
			const heading = trimmed.replace(/^#{1,4}\s+/, "");
			blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[11px] font-bold text-slate-900 pt-1",
				children: renderInline(heading, `h${index}`, onOpenPage)
			}, `h${index}`));
			return;
		}
		if (/^[-*•]\s+/.test(trimmed)) {
			flush(`p${index}`);
			blocks.push(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-700",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[#0f8b8d] mt-0.5",
					children: "•"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: renderInline(trimmed.replace(/^[-*•]\s+/, ""), `li${index}`, onOpenPage) })]
			}, `li${index}`));
			return;
		}
		buffer.push(trimmed);
	});
	flush("pend");
	const searchTopic = (topic || text.split("\n")[0] || "").replace(/[*#]/g, "").slice(0, 80).trim();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${className ?? ""}`,
		children: [blocks, searchTopic && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${searchTopic} medical lecture`)}`,
			target: "_blank",
			rel: "noreferrer",
			className: "inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 hover:underline pt-1",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Youtube, { className: "w-3.5 h-3.5" }),
				" Search YouTube for this topic",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-2.5 h-2.5" })
			]
		})]
	});
};
/**
* Download revision notes as a PDF using the browser's print-to-PDF dialog.
* Opens a self-contained, print-styled document (headings + line breaks kept),
* never injecting the notes as HTML into the React tree.
*/
function downloadNotesPdf(title, text, providerLabel) {
	const win = window.open("", "_blank", "width=860,height=1000");
	if (!win) throw new Error("The browser blocked the print window. Allow pop-ups for Pulse Med and try again.");
	const doc = win.document;
	const head = doc.createElement("head");
	const meta = doc.createElement("meta");
	meta.setAttribute("charset", "utf-8");
	const style = doc.createElement("style");
	style.textContent = `
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 40px; line-height: 1.6; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 24px; }
    .note { white-space: pre-wrap; font-size: 14px; }
    .footer { margin-top: 32px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #666; }
    @media print { body { margin: 16mm; } }
  `;
	head.appendChild(meta);
	head.appendChild(style);
	doc.head.replaceWith(head);
	const body = doc.body;
	const h1 = doc.createElement("h1");
	h1.textContent = title || "Pulse Med revision notes";
	const sub = doc.createElement("div");
	sub.className = "sub";
	sub.textContent = `Pulse Med · generated ${(/* @__PURE__ */ new Date()).toLocaleString()}${providerLabel ? ` · ${providerLabel}` : ""}`;
	const note = doc.createElement("div");
	note.className = "note";
	note.textContent = text;
	const footer = doc.createElement("div");
	footer.className = "footer";
	footer.textContent = "Revision notes — verify clinical facts against the cited sources before use.";
	body.replaceChildren(h1, sub, note, footer);
	win.focus();
	setTimeout(() => win.print(), 300);
}
var EXAM_CARDS = [
	{
		id: "NEET_PG",
		label: "NEET-PG",
		storageKeys: ["exam.date.NEET_PG", "exam.date.NEET-PG"]
	},
	{
		id: "INI_CET",
		label: "INI-CET",
		storageKeys: ["exam.date.INI_CET", "exam.date.INI-CET"]
	},
	{
		id: "AMC_CAT",
		label: "AMC CAT",
		storageKeys: ["exam.date.AMC_CAT", "exam.date.AMC-CAT"]
	}
];
var loadStoredExamDate = (storageKeys) => {
	for (const k of storageKeys) {
		const val = localStorage.getItem(k);
		if (val) return val;
	}
	return "";
};
var Sidebar = ({ currentView, onNavigate, selectedExam, onSelectExam, darkMode, onToggleDarkMode, unresolvedMistakesCount, srsDueCount }) => {
	const [examDates, setExamDates] = (0, import_react.useState)(() => ({
		NEET_PG: loadStoredExamDate(["exam.date.NEET_PG", "exam.date.NEET-PG"]),
		INI_CET: loadStoredExamDate(["exam.date.INI_CET", "exam.date.INI-CET"]),
		AMC_CAT: loadStoredExamDate(["exam.date.AMC_CAT", "exam.date.AMC-CAT"])
	}));
	const [nowMs, setNowMs] = (0, import_react.useState)(Date.now());
	const [editingExam, setEditingExam] = (0, import_react.useState)(null);
	const [tempDateInput, setTempDateInput] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const timer = setInterval(() => {
			setNowMs(Date.now());
		}, 1e3);
		return () => clearInterval(timer);
	}, []);
	const handleSaveExamDate = (examId, storageKeys) => {
		const trimmed = tempDateInput.trim();
		storageKeys.forEach((k) => {
			if (trimmed) localStorage.setItem(k, trimmed);
			else localStorage.removeItem(k);
		});
		setExamDates((prev) => ({
			...prev,
			[examId]: trimmed
		}));
		setEditingExam(null);
	};
	const handleClearExamDate = (examId, storageKeys) => {
		storageKeys.forEach((k) => localStorage.removeItem(k));
		setExamDates((prev) => ({
			...prev,
			[examId]: ""
		}));
		setTempDateInput("");
		setEditingExam(null);
	};
	const getCountdown = (dateString) => {
		if (!dateString) return {
			status: "UNSET",
			text: "Set exam date"
		};
		const target = new Date(dateString).getTime();
		if (isNaN(target)) return {
			status: "UNSET",
			text: "Set exam date"
		};
		const diff = target - nowMs;
		if (diff <= 0) return {
			status: "PASSED",
			text: "Exam date passed"
		};
		const days = Math.floor(diff / 864e5);
		const hours = Math.floor(diff / 36e5 % 24);
		const minutes = Math.floor(diff / 6e4 % 60);
		const seconds = Math.floor(diff / 1e3 % 60);
		const pad = (n) => n.toString().padStart(2, "0");
		return {
			status: "ACTIVE",
			text: `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
		};
	};
	const navItems = [
		{
			id: "analytics",
			label: "Performance Analytics",
			icon: ChartColumn
		},
		{
			id: "practice",
			label: "Practice Builder",
			icon: FileQuestion
		},
		{
			id: "question-bank",
			label: "Question Bank",
			icon: Database
		},
		{
			id: "test-runner",
			label: "Active Test Runner",
			icon: Timer,
			badge: "Live"
		},
		{
			id: "mistakes",
			label: "Mistakes & Spaced Review",
			icon: OctagonAlert,
			badge: srsDueCount > 0 ? `${srsDueCount} due` : unresolvedMistakesCount > 0 ? String(unresolvedMistakesCount) : void 0
		},
		{
			id: "highlights",
			label: "Highlights & Memory",
			icon: Bookmark
		},
		{
			id: "ai-tutor",
			label: "Clinical AI Tutor",
			icon: Brain
		},
		{
			id: "pdf-reader",
			label: "PDF Reader & OCR",
			icon: BookOpen
		},
		{
			id: "research",
			label: "Clinical Evidence Browser",
			icon: Compass
		},
		{
			id: "settings",
			label: "AI Subscriptions & OCR",
			icon: SlidersVertical
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "w-64 bg-[#001432] text-slate-200 flex flex-col shrink-0 border-r border-[#13294b] h-screen select-none z-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-5 pb-4 border-b border-[#13294b]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0f8b8d] to-[#8ff3f4] flex items-center justify-center text-[#001432] shadow-sm font-black text-lg",
						children: "P"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PULSE MED" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-mono px-1.5 py-0.2 bg-[#0f8b8d]/20 text-[#8ff3f4] rounded border border-[#0f8b8d]/30",
							children: "PRO"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-slate-400 font-medium",
						children: "Postgraduate Exam Engine"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 p-1 bg-[#13294b] rounded-xl flex items-center justify-between text-[11px] font-bold",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSelectExam("NEET_PG"),
							className: `flex-1 py-1.5 rounded-lg transition-all text-center ${selectedExam === "NEET_PG" ? "bg-[#0f8b8d] text-white shadow-xs" : "text-slate-400 hover:text-white"}`,
							children: "NEET-PG"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSelectExam("INI_CET"),
							className: `flex-1 py-1.5 rounded-lg transition-all text-center ${selectedExam === "INI_CET" ? "bg-[#0f8b8d] text-white shadow-xs" : "text-slate-400 hover:text-white"}`,
							children: "INI-CET"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onSelectExam("AMC_CAT"),
							className: `flex-1 py-1.5 rounded-lg transition-all text-center ${selectedExam === "AMC_CAT" ? "bg-[#0f8b8d] text-white shadow-xs" : "text-slate-400 hover:text-white"}`,
							children: "AMC CAT"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex-1 overflow-y-auto px-3 py-3 space-y-1",
				children: navItems.map((item) => {
					const isActive = currentView === item.id;
					const Icon = item.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => onNavigate(item.id),
						className: `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${isActive ? "bg-gradient-to-r from-[#0f8b8d] to-[#00696b] text-white shadow-md" : "text-slate-300 hover:bg-[#13294b]/70 hover:text-white"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `w-4 h-4 transition-colors ${isActive ? "text-[#8ff3f4]" : "text-slate-400 group-hover:text-slate-200"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: item.label
							})]
						}), item.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: `text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : item.badge.includes("Due") || item.badge === "Live" ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-slate-800 text-slate-300"}`,
							children: item.badge
						})]
					}, item.id);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-3 pb-2 space-y-1.5 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }), "Exam Countdowns"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[9px] font-mono text-[#8ff3f4]",
						children: "Live"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-1.5",
					children: EXAM_CARDS.map((exam) => {
						const isSelected = selectedExam === exam.id;
						const dateVal = examDates[exam.id];
						const countdown = getCountdown(dateVal);
						const isEditing = editingExam === exam.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => {
								if (!isEditing && selectedExam !== exam.id) onSelectExam(exam.id);
							},
							className: `p-2.5 rounded-xl border text-xs transition-all ${isSelected ? "bg-gradient-to-br from-[#0f8b8d]/25 to-[#13294b] border-[#0f8b8d] ring-1 ring-[#0f8b8d]/50 shadow-xs" : "bg-[#13294b]/40 hover:bg-[#13294b]/70 border-slate-700/60 text-slate-300"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `font-bold text-xs ${isSelected ? "text-white" : "text-slate-300"}`,
										children: exam.label
									}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#0f8b8d]/30 text-[#8ff3f4] rounded border border-[#0f8b8d]/40",
										children: "Selected"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: (e) => {
										e.stopPropagation();
										if (isEditing) setEditingExam(null);
										else {
											setTempDateInput(dateVal);
											setEditingExam(exam.id);
										}
									},
									className: "p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors",
									title: dateVal ? "Edit exam date" : "Set exam date",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-3 h-3" })
								})]
							}), isEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onClick: (e) => e.stopPropagation(),
								className: "mt-1.5 pt-1.5 border-t border-slate-700/60 space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "datetime-local",
									value: tempDateInput,
									onChange: (e) => setTempDateInput(e.target.value),
									className: "w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white focus:outline-none focus:border-[#0f8b8d]"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-[10px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => handleClearExamDate(exam.id, exam.storageKeys),
										className: "text-slate-400 hover:text-rose-400 px-1 py-0.5",
										children: "Clear"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setEditingExam(null),
											className: "px-2 py-0.5 text-slate-300 hover:text-white rounded bg-slate-800",
											children: "Cancel"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => handleSaveExamDate(exam.id, exam.storageKeys),
											className: "px-2 py-0.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white font-bold rounded",
											children: "Save"
										})]
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								countdown.status === "UNSET" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: (e) => {
										e.stopPropagation();
										setTempDateInput("");
										setEditingExam(exam.id);
									},
									className: "mt-0.5 text-[11px] font-semibold text-[#8ff3f4] hover:underline flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Set exam date" })]
								}),
								countdown.status === "PASSED" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-[11px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-rose-400",
										children: "Exam date passed"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.stopPropagation();
											setTempDateInput(dateVal);
											setEditingExam(exam.id);
										},
										className: "text-[10px] text-slate-400 hover:text-white underline",
										children: "Update"
									})]
								}),
								countdown.status === "ACTIVE" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono font-bold text-xs text-white tracking-wide",
									children: countdown.text
								})
							] })]
						}, exam.id);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-3 border-t border-[#13294b] flex items-center justify-between text-xs text-slate-400 shrink-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-mono text-slate-500",
					children: "Board Exam Engine"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: onToggleDarkMode,
					className: "p-1.5 rounded-lg bg-[#13294b] hover:bg-slate-700 text-slate-300 hover:text-white transition-colors",
					title: "Toggle Dark Mode",
					children: darkMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "w-3.5 h-3.5 text-amber-300" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "w-3.5 h-3.5" })
				})]
			})
		]
	});
};
function getInitials(name) {
	const trimmed = name.trim();
	if (!trimmed) return "?";
	const words = trimmed.replace(/^dr\.?\s+/i, "").split(/\s+/).filter(Boolean);
	if (words.length === 0) return trimmed.slice(0, 2).toUpperCase();
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
var TopBar = ({ onSearchSubmit, selectedExam, onNavigate, mockPace = "-" }) => {
	const [searchVal, setSearchVal] = (0, import_react.useState)("");
	const [showNotificationToast, setShowNotificationToast] = (0, import_react.useState)(false);
	const [profileName, setProfileName] = (0, import_react.useState)(() => {
		return localStorage.getItem("profile.name") || "";
	});
	const [isEditingProfile, setIsEditingProfile] = (0, import_react.useState)(false);
	const [nameInput, setNameInput] = (0, import_react.useState)("");
	const profileEditorRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const handleStorage = () => {
			setProfileName(localStorage.getItem("profile.name") || "");
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);
	(0, import_react.useEffect)(() => {
		const handleClickOutside = (event) => {
			if (profileEditorRef.current && !profileEditorRef.current.contains(event.target)) setIsEditingProfile(false);
		};
		if (isEditingProfile) document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isEditingProfile]);
	const handleOpenEditor = () => {
		setNameInput(profileName);
		setIsEditingProfile(true);
	};
	const handleSaveProfile = (e) => {
		if (e) e.preventDefault();
		const trimmed = nameInput.trim();
		if (trimmed) {
			localStorage.setItem("profile.name", trimmed);
			setProfileName(trimmed);
		} else {
			localStorage.removeItem("profile.name");
			setProfileName("");
		}
		setIsEditingProfile(false);
	};
	const handleClearProfile = () => {
		localStorage.removeItem("profile.name");
		setProfileName("");
		setNameInput("");
		setIsEditingProfile(false);
	};
	const handleKeyDown = (e) => {
		if (e.key === "Enter" && searchVal.trim()) {
			onSearchSubmit(searchVal);
			onNavigate("pdf-reader");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "h-14 bg-white border-b border-[#e3e7ee] px-5 flex items-center justify-between gap-4 shrink-0 shadow-xs z-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 max-w-2xl relative",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "text",
					value: searchVal,
					onChange: (e) => setSearchVal(e.target.value),
					onKeyDown: handleKeyDown,
					placeholder: "Search diseases, high-yield clinical stems, Harrison / Robbins references...",
					className: "w-full pl-9 pr-16 py-1.5 bg-[#f6f7f9] border border-[#e3e7ee] rounded-lg text-xs text-[#1c2430] placeholder-slate-400 focus:outline-none focus:border-[#0f8b8d] focus:bg-white transition-all"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: "px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-[#e3e7ee] rounded",
						children: "⌘K"
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-4 shrink-0",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e3f4f4] text-[#007072] text-xs font-semibold border border-[#8ff3f4]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gauge, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Mock Pace" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono font-bold text-[#13294b]",
							children: mockPace
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setShowNotificationToast(!showNotificationToast),
						className: "p-1.5 text-slate-500 hover:text-[#13294b] rounded-lg hover:bg-slate-100 relative transition-colors",
						title: "Notifications",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-[#d64545] absolute top-1 right-1" })]
					}), showNotificationToast && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-[#e3e7ee] p-3 text-xs z-50 animate-in fade-in slide-in-from-top-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between pb-2 mb-2 border-b border-slate-100 font-semibold text-slate-800",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Clinical Alerts" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-teal-600 font-normal",
								children: "Mark all read"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 text-slate-600",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded bg-amber-50/60 border border-amber-100 flex items-start gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-slate-800",
									children: "7 SRS Cards Overdue"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500",
									children: "Lambert-Eaton vs Myasthenia antibodies interval expired."
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded bg-emerald-50/60 border border-emerald-100 flex items-start gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-slate-800",
									children: "New INI-CET Question Bank Synced"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500",
									children: "24 new AI clinical vignettes added across Antimicrobial Resistance."
								})] })]
							})]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative pl-3 border-l border-slate-200",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: handleOpenEditor,
						className: "flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors group text-left",
						title: "Click to edit profile name",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-right hidden md:block",
							children: profileName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-bold text-xs text-[#13294b] leading-tight group-hover:text-[#0f8b8d] transition-colors",
								children: profileName
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-[#0f8b8d] hover:underline",
								children: "Add your name"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-8 h-8 rounded-full bg-[#13294b] text-[#8ff3f4] font-bold text-xs flex items-center justify-center ring-2 ring-[#e3f4f4] group-hover:ring-[#8ff3f4] transition-all",
							children: profileName ? getInitials(profileName) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "w-4 h-4 text-[#8ff3f4]" })
						})]
					}), isEditingProfile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: profileEditorRef,
						className: "absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between pb-2 mb-3 border-b border-slate-100",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold text-slate-800",
								children: "Edit Profile Name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setIsEditingProfile(false),
								className: "text-slate-400 hover:text-slate-600 text-xs font-bold px-1",
								children: "✕"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: handleSaveProfile,
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[11px] font-semibold text-slate-600 block mb-1",
								children: "Your Name:"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: nameInput,
								onChange: (e) => setNameInput(e.target.value),
								placeholder: "e.g. Dr. Jane Smith",
								autoFocus: true,
								className: "w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#0f8b8d] focus:ring-1 focus:ring-[#0f8b8d]"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: handleClearProfile,
									className: "px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors",
									children: "Clear"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setIsEditingProfile(false),
										className: "px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										className: "px-3 py-1 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-lg transition-colors shadow-xs",
										children: "Save"
									})]
								})]
							})]
						})]
					})]
				})
			]
		})]
	});
};
var KEY = "pulse.attempts.v1";
function addAttempt(input) {
	const rec = {
		...input,
		id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
		at: (/* @__PURE__ */ new Date()).toISOString()
	};
	try {
		const raw = localStorage.getItem(KEY);
		const list = raw ? JSON.parse(raw) : [];
		(Array.isArray(list) ? list : []).unshift(rec);
		localStorage.setItem(KEY, JSON.stringify(list.slice(0, 300)));
		notifyDataChanged();
	} catch {}
	return rec;
}
function listAttempts() {
	try {
		const raw = localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
/** Merge attempts from a backup by id; never duplicates or rewrites existing rows. */
function importAttempts(records) {
	const existing = listAttempts();
	const seen = new Set(existing.map((a) => a.id));
	let added = 0;
	for (const rec of records) {
		if (!rec || typeof rec.id !== "string" || seen.has(rec.id)) continue;
		existing.push(rec);
		seen.add(rec.id);
		added += 1;
	}
	if (added > 0) try {
		existing.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
		localStorage.setItem(KEY, JSON.stringify(existing.slice(0, 300)));
		notifyDataChanged();
	} catch {
		throw new Error("Local storage is full — could not import attempts.");
	}
	return added;
}
/** Attempts submitted on the current calendar day (local time). */
function attemptsToday() {
	const start = /* @__PURE__ */ new Date();
	start.setHours(0, 0, 0, 0);
	const startMs = start.getTime();
	return listAttempts().filter((a) => {
		const t = Date.parse(a.at);
		return Number.isFinite(t) && t >= startMs;
	});
}
/** Aggregate across all attempts; returns null for values with no data yet. */
function summarizeAttempts() {
	const list = listAttempts();
	let questionsAnswered = 0;
	let correct = 0;
	const subjectAgg = {};
	for (const a of list) {
		questionsAnswered += a.attempted;
		correct += a.correct;
		for (const [subject, s] of Object.entries(a.subjects)) {
			const agg = subjectAgg[subject] ?? (subjectAgg[subject] = {
				total: 0,
				correct: 0
			});
			agg.total += s.total;
			agg.correct += s.correct;
		}
	}
	const weakSubjects = Object.entries(subjectAgg).filter(([, s]) => s.total >= 3).map(([subject, s]) => ({
		subject,
		correct: s.correct,
		total: s.total,
		accuracy: Math.round(s.correct / s.total * 100)
	})).sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
	return {
		modules: list.length,
		questionsAnswered,
		correct,
		accuracyPercent: questionsAnswered > 0 ? Math.round(correct / questionsAnswered * 100) : null,
		weakSubjects,
		lastAttemptAt: list[0]?.at ?? null
	};
}
var statusConfig = {
	Mastered: {
		label: "Mastered",
		color: "bg-teal-50 text-teal-800 border-teal-200",
		bar: "bg-[#0f8b8d]"
	},
	Solid: {
		label: "Solid",
		color: "bg-emerald-50 text-emerald-700 border-emerald-200",
		bar: "bg-[#1f9d55]"
	},
	Steady: {
		label: "Steady",
		color: "bg-slate-100 text-slate-700 border-slate-200",
		bar: "bg-[#0f8b8d]"
	},
	Developing: {
		label: "Developing",
		color: "bg-amber-50 text-amber-700 border-amber-200",
		bar: "bg-[#f2a541]"
	},
	"Needs Focus": {
		label: "Needs Focus",
		color: "bg-amber-50 text-amber-700 border-amber-200",
		bar: "bg-[#f2a541]"
	},
	"Red Flag": {
		label: "Red Flag",
		color: "bg-red-50 text-red-700 border-red-200",
		bar: "bg-[#d64545]"
	}
};
function getStatus(accuracy, solved) {
	if (solved === 0) return "Needs Focus";
	if (accuracy >= 85) return "Mastered";
	if (accuracy >= 75) return "Solid";
	if (accuracy >= 70) return "Steady";
	if (accuracy >= 60) return "Developing";
	if (accuracy >= 50) return "Needs Focus";
	return "Red Flag";
}
function getExamDate(exam) {
	if (typeof window === "undefined") return null;
	const key = `exam.date.${exam}`;
	return localStorage.getItem(key) || null;
}
function formatDateForCountdown(dateStr) {
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	});
}
var PerformanceAnalyticsView = ({ onNavigate, onLaunchRemediation }) => {
	const [activeCohort, setActiveCohort] = (0, import_react.useState)("NEET_PG");
	const [sortBy, setSortBy] = (0, import_react.useState)("lowest");
	const [downloadSuccess, setDownloadSuccess] = (0, import_react.useState)(false);
	const [summary, setSummary] = (0, import_react.useState)({
		modules: 0,
		questionsAnswered: 0,
		correct: 0,
		accuracyPercent: null,
		weakSubjects: [],
		lastAttemptAt: null
	});
	const [attempts, setAttempts] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		setSummary(summarizeAttempts());
		setAttempts(listAttempts());
	}, [activeCohort]);
	const cohortAttempts = (0, import_react.useMemo)(() => attempts.filter((a) => a.exam === activeCohort), [attempts, activeCohort]);
	const subjectRows = (0, import_react.useMemo)(() => {
		const agg = {};
		for (const a of cohortAttempts) for (const [subject, s] of Object.entries(a.subjects)) {
			const cur = agg[subject] ?? (agg[subject] = {
				total: 0,
				correct: 0
			});
			cur.total += s.total;
			cur.correct += s.correct;
		}
		return Object.entries(agg).filter(([, s]) => s.total > 0).map(([name, s]) => {
			const solved = s.total;
			const correct = s.correct;
			const incorrect = solved - correct;
			const accuracy = Math.round(correct / solved * 100);
			const status = getStatus(accuracy, solved);
			const cfg = statusConfig[status];
			let sub = "";
			if (name.toLowerCase().includes("biochem")) sub = "Metabolic Pathways, Inborn Errors, Genetics";
			else if (name.toLowerCase().includes("pharma")) sub = "Autonomic, Antimicrobial Resistance, Kinetics";
			else if (name.toLowerCase().includes("surgery")) sub = "General, Polytrauma, Acute Abdomen, Oncology";
			else if (name.toLowerCase().includes("anatomy")) sub = "Head & Neck, Brachial Plexus, Embryology";
			else if (name.toLowerCase().includes("obstet") || name.toLowerCase().includes("gyn")) sub = "Labor Complications, CTG, Contraception";
			else if (name.toLowerCase().includes("patholog") || name.toLowerCase().includes("micro")) sub = "Neoplasia, RPGN Crescents, Bacteriology";
			else if (name.toLowerCase().includes("medicine")) sub = "Cardiology, Neurology, Nephrology, Endocrine";
			else if (name.toLowerCase().includes("applied basic")) sub = "Molecular Pathology, Transposons, Receptors";
			else if (name.toLowerCase().includes("systemic")) sub = "Sepsis, Inotropes, Anti-arrhythmics, ICU";
			else if (name.toLowerCase().includes("surgical special")) sub = "ATLS, Operative Anatomy, Vascular Staging";
			else if (name.toLowerCase().includes("maternal") || name.toLowerCase().includes("child")) sub = "Neonatal Sepsis, PPH, Eclampsia, IEM";
			else if (name.toLowerCase().includes("diagnostic") || name.toLowerCase().includes("imag")) sub = "Silver Stains, IF Patterns, CT Signs";
			else if (name.toLowerCase().includes("adult health") && name.toLowerCase().includes("medicine")) sub = "Cardiology, Pulmonology, eTG Protocols (30%)";
			else if (name.toLowerCase().includes("adult health") && name.toLowerCase().includes("surgery")) sub = "Acute Abdomen, Trauma, Pre-Op (20%)";
			else if (name.toLowerCase().includes("women") || name.toLowerCase().includes("o&g")) sub = "Antenatal, Eclampsia, Contraception (12.5%)";
			else if (name.toLowerCase().includes("child") || name.toLowerCase().includes("paediatr")) sub = "Neonatal Sepsis, Milestones, Aus Schedule (12.5%)";
			else if (name.toLowerCase().includes("mental") || name.toLowerCase().includes("psych")) sub = "Self-Harm Triage, Psychosis, Mental Health Act (12.5%)";
			else if (name.toLowerCase().includes("population") || name.toLowerCase().includes("ethic")) sub = "RACGP Preventive, Notification, Legal (12.5%)";
			else sub = "Core topics";
			return {
				name,
				sub,
				solved,
				incorrect,
				accuracy,
				status,
				statusColor: cfg.color,
				barColor: cfg.bar
			};
		});
	}, [cohortAttempts]);
	const sortedSubjects = (0, import_react.useMemo)(() => {
		const arr = [...subjectRows];
		if (sortBy === "lowest") return arr.sort((a, b) => a.accuracy - b.accuracy);
		if (sortBy === "highest") return arr.sort((a, b) => b.accuracy - a.accuracy);
		return arr.sort((a, b) => b.solved - a.solved);
	}, [subjectRows, sortBy]);
	const weakSubjects = summary.weakSubjects.filter((w) => w.accuracy < 70).slice(0, 5);
	const handleExportPDF = () => {
		setDownloadSuccess(true);
		setTimeout(() => setDownloadSuccess(false), 3e3);
	};
	const examDate = getExamDate(activeCohort);
	const daysToExam = examDate ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 864e5) : null;
	const hasData = summary.questionsAnswered > 0;
	const cohortHasData = cohortAttempts.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-7xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Performance Analytics" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[#0f8b8d]",
								children: "Accuracy & Subject Matrix"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-2xl font-extrabold text-[#13294b] tracking-tight",
						children: "Comprehensive Learning Progress & Accuracy Matrix"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500 mt-0.5",
						children: "Detailed clinical performance across specialties, difficulty tiers, and multi-exam cohorts."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center p-1 bg-slate-200/80 rounded-lg text-xs font-semibold shrink-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveCohort("NEET_PG"),
							className: `px-3 py-1.5 rounded-md transition-all ${activeCohort === "NEET_PG" ? "bg-white text-[#13294b] shadow-xs font-bold" : "text-slate-600 hover:text-[#13294b]"}`,
							children: "NEET PG"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveCohort("INI_CET"),
							className: `px-3 py-1.5 rounded-md transition-all ${activeCohort === "INI_CET" ? "bg-white text-[#13294b] shadow-xs font-bold" : "text-slate-600 hover:text-[#13294b]"}`,
							children: "INI-CET"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setActiveCohort("AMC_CAT"),
							className: `px-3 py-1.5 rounded-md transition-all ${activeCohort === "AMC_CAT" ? "bg-white text-[#13294b] shadow-xs font-bold" : "text-slate-600 hover:text-[#13294b]"}`,
							children: "AMC CAT MCQ"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white border border-[#e3e7ee] rounded-xl p-4 shadow-xs relative",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "COVERAGE VELOCITY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "text-slate-400 hover:text-[#0f8b8d] transition-colors",
									title: "Sync",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-3xl font-extrabold text-[#13294b] font-mono tabular-nums tracking-tight",
									children: hasData ? summary.questionsAnswered.toLocaleString() : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-slate-500 font-medium",
									children: "questions answered"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex items-center justify-between text-xs font-medium pt-2 border-t border-slate-100",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: hasData ? "text-emerald-700 font-semibold" : "text-slate-500",
									children: hasData ? `${summary.accuracyPercent}% accuracy` : "No marked questions yet"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-slate-500",
									children: hasData ? `${summary.correct.toLocaleString()} correct` : "—"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white border border-[#e3e7ee] rounded-xl p-4 shadow-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CUMULATIVE ACCURACY" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4 text-[#0f8b8d]" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-3xl font-extrabold text-[#13294b] font-mono tabular-nums tracking-tight",
									children: hasData ? `${summary.accuracyPercent}%` : "—"
								}), hasData && summary.accuracyPercent !== null && summary.accuracyPercent >= 70 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200",
									children: "↗ On track"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-slate-500 mt-1",
								children: hasData ? `Based on ${summary.questionsAnswered.toLocaleString()} real attempts across ${summary.modules} modules` : "Complete practice modules to see cumulative accuracy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-2 flex items-center gap-3 text-xs font-medium pt-2 border-t border-slate-100",
								children: hasData && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1 text-slate-700",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-emerald-500" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "font-mono",
											children: summary.correct.toLocaleString()
										}),
										" Correct"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "flex items-center gap-1 text-slate-700",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-red-500" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "font-mono",
											children: (summary.questionsAnswered - summary.correct).toLocaleString()
										}),
										" Wrong"
									]
								})] })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white border border-[#e3e7ee] rounded-xl p-4 shadow-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "RESPONSE PARTITION" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartPie, { className: "w-4 h-4 text-slate-400" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-3 gap-2 text-center mt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] text-slate-500 font-medium",
										children: "Correct"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-base font-bold text-emerald-700 font-mono",
										children: hasData ? summary.correct.toLocaleString() : "—"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] text-slate-500 font-medium",
										children: "Incorrect"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-base font-bold text-red-600 font-mono",
										children: hasData ? (summary.questionsAnswered - summary.correct).toLocaleString() : "—"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] text-slate-500 font-medium",
										children: "Skipped"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-base font-bold text-slate-600 font-mono",
										children: "—"
									})] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 w-full h-2 rounded-full bg-slate-100 overflow-hidden flex",
								children: hasData && summary.accuracyPercent !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full bg-emerald-500",
									style: { width: `${summary.accuracyPercent}%` },
									title: `Correct: ${summary.accuracyPercent}%`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full bg-red-500",
									style: { width: `${100 - summary.accuracyPercent}%` },
									title: `Incorrect: ${100 - summary.accuracyPercent}%`
								})] })
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white border border-[#e3e7ee] rounded-xl p-4 shadow-xs bg-linear-to-br from-white to-slate-50/80",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "EXAM COUNTDOWN" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-100 text-teal-800",
									children: activeCohort
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-baseline gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-3xl font-extrabold text-[#13294b] font-mono tabular-nums tracking-tight",
									children: daysToExam !== null && daysToExam > 0 ? `${daysToExam}d` : daysToExam !== null && daysToExam <= 0 ? "TODAY" : "—"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-slate-600 font-medium mt-1",
								children: examDate ? daysToExam !== null && daysToExam > 0 ? `${daysToExam} days until ${activeCohort} (${formatDateForCountdown(examDate)})` : daysToExam !== null && daysToExam <= 0 ? `Exam date reached (${formatDateForCountdown(examDate)})` : `Set exam date for ${activeCohort} in Sidebar` : `Set exam date for ${activeCohort} in Sidebar`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-700 font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "w-3.5 h-3.5 text-[#f2a541]" }), hasData ? `Accuracy: ${summary.accuracyPercent}%` : "No data yet"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-2 bg-white border border-[#e3e7ee] rounded-xl p-5 shadow-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-bold text-[#13294b]",
							children: "Specialty & Subject Accuracy Table"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500",
							children: "Continuous mastery tracking from real attempts"
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-500 font-medium",
								children: "SORT BY:"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: sortBy,
								onChange: (e) => setSortBy(e.target.value),
								className: "bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0f8b8d]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "lowest",
										children: "Lowest Accuracy"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "highest",
										children: "Highest Accuracy"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "solved",
										children: "Most Solved"
									})
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-left text-xs mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "Subject"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "Solved / Wrong"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "Accuracy Band"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3",
										children: "Evaluation"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "py-2.5 px-3 text-right",
										children: "Action"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
								className: "divide-y divide-slate-100",
								children: cohortHasData && sortedSubjects.length > 0 ? sortedSubjects.map((sub) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-slate-50/80 transition-colors",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-3 px-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-bold text-sm text-[#13294b]",
												children: sub.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[11px] text-slate-500",
												children: sub.sub
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-3 px-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "font-mono font-bold text-slate-800",
												children: [sub.solved, " Qs"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[11px] text-red-600 font-mono font-medium",
												children: [sub.incorrect, " Incorrect"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-3 min-w-36",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "flex-1 h-2 bg-slate-100 rounded-full overflow-hidden",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: `h-full ${sub.barColor} rounded-full`,
														style: { width: `${sub.accuracy}%` }
													})
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono font-bold text-slate-800 text-xs w-8 text-right",
													children: [sub.accuracy, "%"]
												})]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-3",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${sub.statusColor}`,
												children: [sub.status === "Red Flag" && "● ", sub.status]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-3 px-3 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => onLaunchRemediation(sub.name),
												className: `px-3 py-1 rounded-md text-xs font-semibold transition-all shadow-xs ${sub.accuracy < 65 ? "bg-[#d64545] hover:bg-red-700 text-white" : "bg-[#0f8b8d] hover:bg-[#00696b] text-white"}`,
												children: "Remediate"
											})
										})
									]
								}, sub.name)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									colSpan: 5,
									className: "py-8 text-center text-slate-500 text-sm",
									children: ["No marked questions yet for ", activeCohort]
								}) })
							})]
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white border border-[#e3e7ee] rounded-xl p-5 shadow-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-bold text-[#13294b]",
									children: "Weak Subjects (Focus Areas)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500 mb-4",
									children: "Subjects with accuracy below 70% (minimum 3 questions)"
								}),
								weakSubjects.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-3",
									children: weakSubjects.map((w, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-xs font-bold text-slate-800 mb-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-[#d64545]" }), w.subject]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-red-600 font-bold",
												children: [w.accuracy, "%"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full bg-[#d64545] rounded-full",
												style: { width: `${w.accuracy}%` }
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-[11px] text-slate-500 mt-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												w.correct,
												" / ",
												w.total,
												" correct"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => onLaunchRemediation(w.subject),
												className: "text-xs font-semibold text-[#d64545] hover:underline",
												children: "Remediate"
											})]
										})
									] }, `${w.subject}-${idx}`))
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-center py-4 text-slate-500 text-sm",
									children: hasData ? "No weak subjects detected (all ≥ 70%)" : "Complete practice modules to identify weak areas"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-[#f8f9ff] border border-[#e3e7ee] rounded-xl p-4 shadow-xs",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, { className: "w-4 h-4 text-[#0f8b8d] shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "text-xs font-bold text-[#13294b]",
									children: "Cognitive Synthesis Insight"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-600 mt-1 leading-relaxed",
									children: hasData && weakSubjects.length > 0 ? `Your weakest area is <strong>${weakSubjects[0].subject}</strong> at ${weakSubjects[0].accuracy}%. Prioritize remediation before the next mock test.` : hasData ? "All subjects are above 70% accuracy. Maintain consistency across all topics." : "Complete practice modules to generate personalized insights."
								})] })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => onNavigate("mistakes"),
							className: "p-4 rounded-xl bg-white border border-[#e3e7ee] hover:border-[#0f8b8d] shadow-xs cursor-pointer transition-all flex items-center justify-between group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-[#0f8b8d] group-hover:scale-105 transition-transform",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCheck, { className: "w-5 h-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-bold text-[#13294b]",
									children: "Mistake Notebook Sync"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-slate-500",
									children: hasData ? `${summary.questionsAnswered - summary.correct} questions queued for spaced review` : "No mistakes recorded yet"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-4 h-4 text-slate-400 group-hover:text-[#0f8b8d] group-hover:translate-x-1 transition-all" })]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white border border-[#e3e7ee] rounded-xl p-5 shadow-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between pb-3 border-b border-slate-100",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base font-bold text-[#13294b]",
						children: "Recent Completed Modules History"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500",
						children: "Log of recently completed mock tests, timed blocks, and tutor sessions"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: handleExportPDF,
						className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3.5 h-3.5 text-slate-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: downloadSuccess ? "Report Downloaded!" : "Export Report (PDF)" })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "divide-y divide-slate-100 text-xs",
					children: cohortAttempts.length > 0 ? cohortAttempts.slice(0, 10).map((a, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] text-slate-400 font-mono",
								children: new Date(a.at).toLocaleString("en-GB", {
									day: "2-digit",
									month: "short",
									hour: "2-digit",
									minute: "2-digit"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-bold text-sm text-[#13294b] flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									a.exam,
									": ",
									a.mode,
									" (",
									a.total,
									" Qs)"
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-[10px] font-semibold px-2 py-0.5 rounded ${a.mode === "EXAM" ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-800"}`,
									children: a.mode
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-slate-500",
								children: Object.entries(a.subjects).map(([s, v]) => `${s}: ${v.correct}/${v.total}`).join(", ")
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono font-bold text-sm text-[#13294b]",
									children: [
										a.correct,
										" / ",
										a.attempted
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-1.5 font-bold text-emerald-700",
									children: [
										"(",
										a.attempted > 0 ? Math.round(a.correct / a.attempted * 100) : 0,
										"%)"
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("test-runner"),
								className: "text-xs font-semibold text-[#0f8b8d] hover:underline flex items-center gap-1",
								children: "Review Answers →"
							})]
						})]
					}, `${a.id}-${idx}`)) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-8 text-center text-slate-500 text-sm",
						children: [
							"No completed modules for ",
							activeCohort,
							" yet"
						]
					})
				})]
			})
		]
	});
};
var SUBTOPICS = {
	"Anatomy": [
		"General Anatomy & Histology Principles",
		"Embryology, Teratology & Pharyngeal Arches",
		"Neuroanatomy: Ventricles, Cranial Nerves & Brainstem",
		"Head & Neck: Cranial Triangles, Larynx & Oral Cavity",
		"Orbit, Eyeball & Auditory Apparatus",
		"Thorax: Mediastinum, Pericardium & Cardiac Valves",
		"Tracheobronchial Tree, Pleura & Bronchopulmonary Segments",
		"Anterior Abdominal Wall, Rectus Sheath & Inguinal Canal",
		"Gastrointestinal Tract: Peritoneal Folds & Gut Rotation",
		"Hepatobiliary System, Pancreas & Splenic Spaces",
		"Kidney, Ureter, Bladder & Pelvic Diaphragm",
		"Perineum, Ischiorectal Fossa & External Genitalia",
		"Upper Limb: Brachial Plexus, Spaces & Hand Spaces",
		"Lower Limb: Femoral Triangle, Gluteal Region & Compartments",
		"Osteology, Joints & Arthrology",
		"Cross-Sectional Imaging & Fascial Spaces"
	],
	"Physiology": [
		"General Physiology & Cell Membrane Transport",
		"Nerve-Muscle Physiology, Action Potential & NMJ",
		"Blood Physiology: Hemostasis, Coagulation Cascade & Hemoglobin",
		"Cardiac Electrophysiology, Action Potential & Arrhythmias",
		"Cardiac Mechanics, Pressure-Volume Loops & Output",
		"Hemodynamics, Microcirculation & BP Regulation",
		"Respiratory Mechanics, Surfactant, Compliance & Volumes",
		"Pulmonary Gas Exchange & Oxygen-Hemoglobin Curve",
		"Renal Clearances, GFR, Autoregulation & Tubular Transport",
		"Countercurrent Multiplier, Concentrating Mechanism & Acid-Base",
		"Gastrointestinal Secretions, Motility & Gut Peptides",
		"Endocrine Hypothalamus, Pituitary & Feedback Loops",
		"Thyroid, Parathyroid, Calcium Homeostasis & Adrenal Axis",
		"Reproductive Physiology, Menstrual Hormones & Gametogenesis",
		"Sensory System, Pain Pathways, Ascending Tracts & Thalamus",
		"Motor Pathways, Basal Ganglia, Cerebellum & Special Senses"
	],
	"Biochemistry": [
		"Amino Acid Chemistry, Peptide Bonds & Protein Folding",
		"Enzyme Kinetics, Lineweaver-Burk, Allostery & Coenzymes",
		"Glycolysis, Pyruvate Dehydrogenase & TCA Cycle",
		"Gluconeogenesis, Glycogen Metabolism & Storage Disorders",
		"HMP Shunt, G6PD Deficiency & Fructose/Galactose Pathways",
		"Fatty Acid Synthesis, Beta-Oxidation & Ketogenesis",
		"Lipoproteins, Dyslipidemias & Cholesterol Biosynthesis",
		"Inborn Errors of Amino Acid Metabolism (PKU, MSUD, Homocystinuria)",
		"Purine & Pyrimidine Metabolism, Gout & Lesch-Nyhan",
		"DNA Replication, Telomerase, DNA Damage & Repair Mechanisms",
		"Transcription, RNA Processing & Alternative Splicing",
		"Translation, Genetic Code, Ribosomes & Post-Translational Tweaks",
		"Molecular Diagnostics: PCR, RFLP, Blotting & Next-Gen Sequencing",
		"Fat-Soluble & Water-Soluble Vitamin Deficiencies",
		"Mineral Metabolism: Iron, Copper, Zinc & Trace Elements",
		"Biological Oxidation, Electron Transport Chain & Free Radicals"
	],
	"Pathology": [
		"Cellular Adaptations, Irreversible Injury, Necrosis & Apoptosis",
		"Acute & Chronic Inflammation, Cytokines & Chemical Mediators",
		"Tissue Repair, Extracellular Matrix & Wound Healing",
		"Hemodynamic Disorders, Virchow Triad, Thrombosis & Embolism",
		"Molecular Basis of Cancer: Oncogenes, p53, Rb & DNA Repair Genes",
		"Invasion, Metastasis, Tumor Grading & Staging (TNM)",
		"Hypersensitivity Reactions, Autoimmunity, SLE & Amyloidosis",
		"Nutritional Anemias, Megaloblastic & Iron Deficiency Anemia",
		"Hemolytic Anemias, Sickle Cell, Thalassemia & PNH",
		"Leukemias: Acute Lymphoblastic, Myeloid (AML), CML & CLL",
		"Lymphomas: Hodgkin Reed-Sternberg vs Non-Hodgkin Subtypes",
		"Plasma Cell Neoplasms: Multiple Myeloma & MGUS",
		"Cardiovascular: Atherosclerosis, MI & Endocarditis Pathology",
		"Pulmonary: Obstructive, Restrictive ILD & Bronchogenic Carcinoma",
		"Renal: Nephritic vs Nephrotic Glomerulopathies & Crescents",
		"Gastrointestinal & Hepatic Pathology: Cirrhosis, Viral Hepatitis & HCC"
	],
	"Pharmacology": [
		"General Pharmacokinetics: Bioavailability, Volume of Distribution & Clearance",
		"Pharmacodynamics: Receptors, Dose-Response & Therapeutic Index",
		"Autonomic: Cholinergic Agonists, Anticholinergics & Organophosphates",
		"Autonomic: Adrenergic Agonists, Alpha-Blockers & Beta-Blockers",
		"Cardiovascular: ACE Inhibitors, ARBs, Neprilysin & Calcium Blockers",
		"Cardiovascular: Antiarrhythmics, Digoxin, Nitrates & Statins",
		"Diuretics: Loop, Thiazide, Potassium-Sparing & Carbonic Anhydrase",
		"CNS: Antiepileptics (Sodium Channel, GABA Modulation)",
		"CNS: Antipsychotics, Antidepressants, Lithium & SSRIs",
		"Analgesics: Opioids, NSAIDs, Paracetamol & Gout Drugs",
		"Antimicrobial: Beta-Lactams, Penicillins & Cephalosporins",
		"Antimicrobial: Carbapenems, Aztreonam, Glycopeptides (Vancomycin)",
		"Antimicrobial: Aminoglycosides, Macrolides, Fluoroquinolones & Tetracyclines",
		"Antimycobacterial: First- & Second-Line ATT Regimens & MDR-TB",
		"Antifungal & Antiviral Drugs, Anti-HIV HAART Protocols",
		"Endocrine: Insulins, GLP-1 Agonists, SGLT-2, Steroids & Thyroid Drugs",
		"Anticancer Chemotherapy: Alkylating Agents, Antimetabolites & Targeted MAbs"
	],
	"Microbiology": [
		"General Bacteriology: Bacterial Morphology, Staining & Culture Media",
		"Bacterial Genetics, Plasmids, Transposons & Resistance Mechanisms",
		"Gram-Positive Cocci: Staphylococci, Streptococci & Enterococci (VRE)",
		"Gram-Negative Bacilli: Enterobacteriaceae, Pseudomonas & Acinetobacter",
		"Anaerobic Infections: Clostridia (Tetanus, Botulism, C. diff) & Bacteroides",
		"Mycobacteria: Mycobacterium tuberculosis, Leprosy & Atypical NTM",
		"Spirochetes: Treponema pallidum (Syphilis), Leptospira & Borrelia",
		"Zoonotic & Rickettsial Infections, Scrub Typhus & Brucellosis",
		"Virology: Herpesviridae, Varicella & Cytomegalovirus",
		"Virology: Viral Hepatitis (HAV, HBV, HCV, HDV, HEV)",
		"Virology: Respiratory Viruses (Influenza, RSV, Coronaviruses)",
		"Virology: Arboviruses (Dengue, Chikungunya, Rabies) & Retroviruses (HIV)",
		"Mycology: Yeasts (Candida, Cryptococcus neoformans)",
		"Mycology: Filamentous Fungi, Aspergillus, Mucorales & Dimorphic Fungi",
		"Parasitology: Intestinal Protozoa (Entamoeba, Giardia, Cryptosporidium)",
		"Parasitology: Blood Protozoa (Plasmodium, Leishmania) & Helminths"
	],
	"Forensic Medicine & Toxicology": [
		"Medical Jurisprudence, Consent, Medical Negligence & NMC Regulations",
		"Thanatology: Algor, Rigor & Livor Mortis, Post-Mortem Decomposition",
		"Mechanical Injuries: Abrasions, Contusions, Lacerations & Incised Wounds",
		"Firearm Ballistics, Wounding Patterns & Blast Injuries",
		"Regional Injuries: Head Injuries, Extradural & Subdural Hematomas",
		"Forensic Thanatology, Autopsy Technique & Exhumation Protocol",
		"Thermal Injuries: Burns, Scalds, Electrocution & Lightning Strike",
		"Mechanical Asphyxia: Hanging, Ligature Strangulation, Throttling & Drowning",
		"Sexual Jurisprudence: Virginity, Rape Examination & POCSO Act Guidelines",
		"General Toxicology: Poison Elimination, Gastric Lavage & Specific Antidotes",
		"Corrosive & Metal Poisons: Arsenic, Lead, Mercury & Copper",
		"Neurotoxic & Inebriant Poisons: Organophosphates, Carbamates & Snake Venom",
		"Plant & Agricultural Poisons: Oleander, Strychnine, Dhatura & Paraquat",
		"Forensic Psychiatry, Testamentary Capacity & Criminal Responsibility"
	],
	"Preventive & Social Medicine (PSM)": [
		"Concept of Health, Disease Natural History & Levels of Prevention",
		"Epidemiological Study Designs: Cohort, Case-Control & Cross-Sectional",
		"Randomized Controlled Trials, Blinding & Consort Guidelines",
		"Measures of Morbidity, Mortality, Incidence, Prevalence & Attributable Risk",
		"Screening Principles, Sensitivity, Specificity, PPV, NPV & ROC Curves",
		"Infectious Disease Epidemiology, Herd Immunity & Quarantine Protocols",
		"National Immunization Schedule (NIS), Cold Chain & Vaccine Vial Monitor",
		"Non-Communicable Disease Epidemiology: CVD, Diabetes, Stroke & Cancers",
		"Demography, Fertility Indicators, Couple Protection Rate & Contraception",
		"Maternal & Child Health Care, Under-5 Mortality & Janani Suraksha Yojana",
		"Nutrition, Protein-Energy Malnutrition, Nutritional Anemias & Iodine Program",
		"Environmental Health: Water Purification, Air Quality Index & Solid Waste",
		"Biomedical Waste Management Guidelines (Color-Coded Segregation)",
		"National Health Programs: NHM, NTEP (TB), NVBDCP & Ayushman Bharat",
		"Biostatistics: Normal Distribution, P-value, Chi-Square & Student t-test"
	],
	"General Medicine": [
		"Cardiology: Acute Coronary Syndrome (STEMI/NSTEMI) & Revascularization",
		"Cardiology: Heart Failure, Reduced Ejection Fraction (HFrEF) & GDMT",
		"Cardiology: Valvular Heart Disease, Rheumatic Fever & Endocarditis",
		"Pulmonology: COPD Exacerbations, Inhaler Regimens & NIV Indications",
		"Pulmonology: Bronchial Asthma, Severe Attacks & Biologic Therapies",
		"Pulmonology: Community & Hospital-Acquired Pneumonia, Tuberculosis",
		"Nephrology: Acute Kidney Injury, KDIGO Staging & Emergency Dialysis",
		"Nephrology: Chronic Kidney Disease, Renal Bone Disease & Glomerular Syndromes",
		"Gastroenterology: Cirrhosis, Ascites, Spontaneous Bacterial Peritonitis & Varices",
		"Gastroenterology: Inflammatory Bowel Disease (Crohn vs Ulcerative Colitis)",
		"Endocrinology: Type 1 & 2 Diabetes, DKA, HHS & Insulin Regimens",
		"Endocrinology: Thyroid Disorders, Adrenal Crisis & Pituitary Tumors",
		"Neurology: Acute Ischemic Stroke, Thrombolysis Window & Thrombectomy",
		"Neurology: Epilepsy, Status Epilepticus Algorithm & Movement Disorders",
		"Rheumatology: Rheumatoid Arthritis, SLE, Scleroderma & Vasculitides",
		"Critical Care: Sepsis 3.0 Guidelines, Shock Resuscitation & Vasopressors"
	],
	"General Surgery": [
		"Fluid, Electrolyte Resuscitation, Acid-Base Imbalances & Transfusion",
		"Shock: Hypovolemic, Septic, Cardiogenic & Anaphylactic Management",
		"Trauma: ATLS Primary & Secondary Survey, FAST Exam & Tension Pneumothorax",
		"Surgical Site Infections, Sterilization & Prophylactic Antibiotics",
		"Burns: Wallace Rule of Nines, Parkland Formula & Tangential Excision",
		"Arterial Diseases: Acute Limb Ischemia, Peripheral Vascular Disease & Aneurysms",
		"Venous Disorders: Deep Vein Thrombosis, Pulmonary Embolism & Varicose Veins",
		"Thyroid & Parathyroid Surgery: Solitary Thyroid Nodule, Papillary Carcinoma",
		"Breast Diseases: Triple Assessment, Fibroadenoma & Carcinoma Staging",
		"Hernias: Inguinal Anatomy, Lichtenstein Mesh Repair & Strangulation",
		"Acute Abdomen: Acute Appendicitis, Peritonitis & Intestinal Obstruction",
		"Gastrointestinal Cancers: Esophagus, Gastric Adenocarcinoma & Colorectal",
		"Hepatobiliary: Gallstone Disease, Acute Cholecystitis & Cholangiocarcinoma",
		"Pancreas: Acute Necrotizing Pancreatitis (Atlanta Criteria) & Pseudocysts",
		"Urology: Urolithiasis, Renal Cell Carcinoma & Benign Prostatic Hyperplasia",
		"Pediatric Surgical Emergencies: Intussusception & Pyloric Stenosis"
	],
	"Obstetrics & Gynaecology": [
		"Gametogenesis, Fertilization, Decidua & Placental Hormones",
		"Maternal Physiological Adaptations to Pregnancy (Cardiovascular, Renal, Blood)",
		"Antenatal Care, Down Syndrome Aneuploidy Screening & Anomaly Ultrasound",
		"Normal Labor, Partogram Stages, Mechanism of Labor & Cardinal Movements",
		"Abnormal Labor, Cephalopelvic Disproportion, Malpresentations & Instrumental Delivery",
		"Hypertensive Disorders: Preeclampsia, Eclampsia, Magnesium Sulfate & HELLP",
		"Antepartum Hemorrhage: Placenta Previa vs Abruptio Placentae Protocols",
		"Postpartum Hemorrhage: 4Ts Etiology, Uterotonics Bundle & Bakri Balloon",
		"Medical Disorders in Pregnancy: Gestational Diabetes, Cardiac Disease & Anemia",
		"Preterm Labor, Premature Rupture of Membranes (PPROM) & Steroids/Tocolysis",
		"Menstrual Disorders: Amenorrhea Algorithms & Polycystic Ovary Syndrome (PCOS)",
		"Abnormal Uterine Bleeding (PALM-COEIN Classification) & Fibroids",
		"Pelvic Inflammatory Disease, Tubo-Ovarian Abscess & Chronic Pelvic Pain",
		"Infertility: Ovulation Induction, Tubal Patency Tests & Assisted Reproduction",
		"Cervical Cancer: Bethesda Pap Smear System, Colposcopy & HPV Vaccination",
		"Endometrial Hyperplasia & Epithelial Ovarian Neoplasms"
	],
	"Pediatrics": [
		"Normal Growth & Development, Milestone Screening & Developmental Red Flags",
		"Infant Nutrition: Exclusive Breastfeeding, Composition & Complementary Diet",
		"Protein-Energy Malnutrition: Severe Acute Malnutrition (SAM) F-75/F-100 Protocol",
		"Vitamin Deficiencies: Rickets, Scurvy & Hypervitaminosis",
		"Neonatal Resuscitation Program (NRP 8th Edition Steps & Compression)",
		"Neonatal Hyperbilirubinemia, Phototherapy Thresholds & Exchange Transfusion",
		"Neonatal Sepsis: Early vs Late Onset, Lumbar Puncture & Antimicrobials",
		"Congenital Heart Diseases: Acyanotic (VSD, ASD, PDA) vs Cyanotic (TOF, TGA)",
		"Pediatric Respiratory: Acute Laryngotracheobronchitis (Croup) & Bronchiolitis",
		"Pediatric Diarrhea, Dehydration Assessment (WHO Plan A, B, C) & Zinc",
		"Pediatric Nephrology: Minimal Change Disease, Steroid Regimens & Nephritic PSGN",
		"Pediatric Hematology: Thalassemia Major, Iron Chelation & Sickle Cell Crises",
		"Pediatric Neurology: Febrile Seizures, Bacterial Meningitis & Hydrocephalus",
		"Vaccinology: Special Immunization Schedules, High-Risk Vaccines & Adverse Events"
	],
	"Orthopedics": [
		"Fracture Biomechanics, Bone Healing Stages & Nonunion / Compartment Syndrome",
		"Upper Limb Fractures: Clavicle, Proximal Humerus, Supracondylar & Distal Radius",
		"Lower Limb Fractures: Neck of Femur, Intertrochanteric, Shaft Femur & Tibia",
		"Pelvic Fractures, Acetabular Disruptions & Emergency Pelvic Binder",
		"Dislocations: Anterior Shoulder, Posterior Hip & Monteggia/Galeazzi Lesions",
		"Pediatric Orthopedics: Congenital Talipes Equinovarus (Ponseti), DDH & Perthes",
		"Bone & Joint Infections: Acute Hematogenous Osteomyelitis & Septic Arthritis",
		"Spinal Tuberculosis (Pott Spine), Neurological Deficits & Cold Abscesses",
		"Bone Tumors: Osteosarcoma, Ewing Sarcoma, Giant Cell Tumor & Osteochondroma",
		"Degenerative & Inflammatory Joint Disease: Osteoarthritis & Rheumatoid Knee",
		"Spinal Disorders: Disc Prolapse, Spondylolisthesis & Cervical Spondylosis",
		"Sports Injuries: ACL/PCL Tears, Meniscal Tears & Rotator Cuff Tendinopathy"
	],
	"Oto-Rhino-Laryngology (ENT)": [
		"Ear Anatomy, Tuning Fork Tests (Rinne, Weber) & Audiometry Interpretation",
		"Diseases of External Ear: Otitis Externa, Malignant Otitis & Furuncle",
		"Acute Otitis Media, Otitis Media with Effusion & Tympanostomy Tubes",
		"Chronic Suppurative Otitis Media (Tubotympanic vs Atticoantral Cholesteatoma)",
		"Complications of Otitis Media: Mastoiditis, Petrositis & Intracranial Spread",
		"Inner Ear Disorders: Otosclerosis, Meniere Disease & Benign Paroxysmal Vertigo",
		"Epistaxis: Little Area (Kiesselbach Plexus), Sphenopalatine Artery & Packing",
		"Sinonasal: Acute & Chronic Sinusitis, Functional Endoscopic Sinus Surgery (FESS)",
		"Nasal Polyps: Antrochoanal vs Ethmoidal & Allergic Fungal Sinusitis",
		"Tonsils & Adenoids: Chronic Tonsillitis, Peritonsillar Abscess (Quinsy)",
		"Laryngeal Diseases: Vocal Nodules, Polyps, Papillomas & Vocal Cord Paralysis",
		"Laryngeal Cancer: Glottic vs Supraglottic Staging & Emergency Tracheostomy"
	],
	"Ophthalmology": [
		"Optics & Refraction: Myopia, Hypermetropia, Astigmatism & Presbyopia",
		"Eyelids & Adnexa: Ptosis, Chalazion, Hordeolum & Blepharitis",
		"Conjunctiva: Bacterial, Viral (EKC), Chlamydial (Trachoma) & Vernal Keratoconjunctivitis",
		"Cornea: Bacterial vs Fungal Keratitis (Slit Lamp Signs) & Acanthamoeba",
		"Corneal Dystrophies, Keratoconus & Keratoplasty Techniques",
		"Sclera & Uvea: Episcleritis, Scleritis & Anterior/Posterior Uveitis Workup",
		"Cataract: Senile, Congenital, Phacoemulsification & Lens Implantation",
		"Glaucoma: Primary Open Angle (POAG) & Acute Angle Closure Crisis Algorithm",
		"Retina: Diabetic Retinopathy (NPDR vs PDR) & Anti-VEGF / Panretinal Laser",
		"Retina: Retinal Detachment (Rhegmatogenous vs Tractional) & Retinal Vascular Occlusions",
		"Neuro-Ophthalmology: Optic Neuritis, Papilledema vs Pseudopapilledema & Pupillary Reflexes",
		"Strabismus, Amblyopia & Ocular Trauma / Chemical Alkali Burns"
	],
	"Dermatology & Venereology": [
		"Primary & Secondary Skin Lesions, Terminology & Dermatopathology Signs",
		"Papulosquamous Disorders: Plaque Psoriasis, Lichen Planus & Pityriasis Rosea",
		"Vesiculobullous Diseases: Pemphigus Vulgaris (Acantholysis) vs Bullous Pemphigoid",
		"Infectious Dermatology: Impetigo, Cellulitis, Leprosy Staging & Lepra Reactions",
		"Viral Dermatology: Herpes Simplex, Varicella-Zoster, Molluscum & HPV Warts",
		"Fungal Dermatoses: Dermatophytoses (Tinea), Candidiasis & Tinea Versicolor",
		"Parasitic Infestations: Scabies (Permethrin Protocol) & Pediculosis",
		"Eczemas: Atopic Dermatitis, Allergic Contact Dermatitis & Seborrheic Dermatitis",
		"Adnexal Disorders: Acne Vulgaris (Topicals to Isotretinoin) & Rosacea",
		"Connective Tissue Diseases: Cutaneous Lupus, Morphea & Dermatomyositis",
		"Sexually Transmitted Infections: Syphilis (VDRL/TPHA), Chancroid & Genital Ulcer Panels",
		"Severe Drug Eruptions: Stevens-Johnson Syndrome (SJS), TEN & DRESS Syndrome"
	],
	"Psychiatry": [
		"Psychiatric Assessment, History Taking & Mental Status Examination (MSE)",
		"Schizophrenia: First-Rank Symptoms, Positive vs Negative Symptoms & Atypicals",
		"Bipolar Disorder: Acute Mania Management, Maintenance & Lithium Toxicity",
		"Depressive Disorders: Major Depressive Episode, Melancholic Signs & SSRI Initiation",
		"Anxiety Disorders: Panic Disorder, Agoraphobia, Social Anxiety & Generalized Anxiety",
		"Obsessive-Compulsive Disorder: Yale-Brown Scale, Exposure-Response & High-Dose SSRIs",
		"Stress-Related Conditions: Acute Stress Disorder & Post-Traumatic Stress Disorder",
		"Somatoform & Dissociative Disorders: Illness Anxiety & Conversion Disorder",
		"Substance Use Disorders: Alcohol Withdrawal (CIWA Scale), Delirium Tremens & Opioids",
		"Eating Disorders: Anorexia Nervosa (Refeeding Syndrome) & Bulimia Nervosa",
		"Sleep Disorders: Insomnia Evaluation, Sleep Hygiene & Polysomnography",
		"Child Psychiatry: ADHD (Methylphenidate), Autism Spectrum & Tic Disorders",
		"Emergency Psychiatry: Suicide Risk Assessment & Neuroleptic Malignant Syndrome"
	],
	"Anesthesiology": [
		"Pre-Anesthetic Evaluation, Mallampati Score & ASA Physical Status Classification",
		"Airway Assessment, Difficult Airway Algorithm & Video-Laryngoscopy",
		"Inhalational Anesthetics: MAC Values, Nitrous Oxide, Sevoflurane & Desflurane",
		"Intravenous Anesthetics: Propofol, Ketamine, Etomidate & Dexmedetomidine",
		"Neuromuscular Blockers: Succinylcholine (Phase I/II) vs Non-Depolarizing Agents",
		"Reversal of Neuromuscular Blockade: Neostigmine-Glycopyrrolate & Sugammadex",
		"Local Anesthetics: Amino Esters vs Amides, Toxic Doses & Intralipid Rescue",
		"Spinal Anesthesia: Subarachnoid Spaces, Absolute Contraindications & Hypotension",
		"Epidural Anesthesia & Combined Spinal-Epidural Analgesia (Labor Analgesia)",
		"Intraoperative Monitoring: Capnography Tracings, Pulse Oximetry & Invasive Arterial Line",
		"Resuscitation: ACLS Cardiopulmonary Arrest Algorithms & Post-ROSC Care",
		"Perioperative Emergencies: Malignant Hyperthermia (Dantrolene) & Laryngospasm"
	],
	"Radiodiagnosis & Radiotherapy": [
		"Physics of Medical Imaging: Radiation Units, Inverse Square Law & ALARA Concept",
		"Chest X-Ray Patterns: Consolidation, Silhouette Sign, Pleural Effusion & Pneumothorax",
		"Abdominal Radiography: Pneumoperitoneum (Rigler Sign, Gas Under Diaphragm) & Obstruction",
		"Fluoroscopy & Barium Studies: Achalasia Bird Beak, Corkscrew Esophagus & Apple Core Sign",
		"Computed Tomography: Principles, Hounsfield Units, Non-Contrast vs Dual-Phase Contrast",
		"Magnetic Resonance Imaging: T1 vs T2 Principles, FLAIR, Diffusion-Weighted Imaging (DWI)",
		"Ultrasound & Doppler Imaging: Acoustic Shadowing, Twinkle Artifact & Resistive Index",
		"Neuroradiology: Hyperacute Ischemic Stroke (CT vs MRI), EDH, SDH & SAH CT Scoring",
		"Musculoskeletal Imaging: Salter-Harris Classification, Fractures & Bone Tumor Radiographs",
		"Abdominal Imaging: Triple-Phase Liver CT, Acute Pancreatitis Balthazar Scoring",
		"Principles of Radiation Therapy: Linear Accelerator, Radiobiology (4 Rs) & Brachytherapy",
		"Radiation Safety: Occupational Exposure Limits, Shielding & Lead Apron Standards"
	],
	"Applied Basic Sciences & Molecular Genetics": [
		"Molecular Pathology, Transposons & Genomic Oncogenesis",
		"Enzymopathies, Inborn Errors & Newborn Screening Panels",
		"Autonomic & Receptor Pharmacodynamics, Signal Transduction",
		"Diagnostic Histochemistry, Special Stains & Microscopic IBQs",
		"Neuroanatomy: Cranial Nerve Nuclei & Functional Pathways",
		"CRISPR-Cas9, Gene Editing & Next-Generation Sequencing Panels",
		"Cell Cycle Regulators, Cyclins, CDKs & Apoptotic Pathways",
		"Immunofluorescence Signatures & Diagnostic Flow Cytometry",
		"Acid-Base Physiology: Anion Gap & Stewart Physico-Chemical Model",
		"Molecular Antimicrobial Resistance Genes (NDM-1, mecA, VanA)",
		"Developmental Teratology & Congenital Dysmorphology Syndromes",
		"Cellular Ultrastructure & Electron Microscopy Findings"
	],
	"Systemic Therapeutics & Critical Care Medicine": [
		"ICU Sepsis Bundles, Hemodynamic Resuscitation & Inotropes",
		"Acute Coronary Syndromes: Invasive Strategies & Antithrombotic Dual Therapy",
		"Refractory Heart Failure, Cardiogenic Shock & Impella / IABP Support",
		"Mechanical Ventilation Strategies in ARDS (Protective TV & PEEP)",
		"Acute Kidney Replacement Therapy (CRRT Indications & Anticoagulation)",
		"Endocrine Crises: Thyroid Storm, Myxedema Coma & Acute Adrenal Failure",
		"Refractory Status Epilepticus & Sedative Infusion Algorithms",
		"Hypertensive Emergencies: Labetalol, Nicardipine & Nitroprusside Titration",
		"Acute Respiratory Failure: High-Flow Nasal Cannula vs Non-Invasive Ventilation",
		"Toxicology ICU Protocols: Toxic Alcohols, Paracetamol & Digoxin Toxicity",
		"Severe Acid-Base Derangements: Hyperkalemia Emergency Cardioprotection",
		"Parenteral & Enteral Nutrition Delivery in Critically Ill Patients"
	],
	"Surgical Specialties, Trauma & Operative Anatomy": [
		"ATLS Polytrauma Resuscitation, Massive Transfusion Protocol & Damage Control",
		"Surgical Margins, Lymphadenectomy & TNM Staging in Oncologic Surgery",
		"Operative Anatomy: Retroperitoneum, Calot Triangle & Inguinal Canal",
		"Thoracic Surgical Emergencies: Flail Chest, Massive Hemothorax & Tracheobronchial Tear",
		"Vascular Trauma: Temporary Shunting, Compartment Syndrome & Fasciotomy",
		"Severe Burns Resuscitation: Inhalation Injury, Bronchoscopy & Tangential Debridement",
		"Diagnostic Laparoscopy in Acute Abdomen & Complicated Peritonitis",
		"Post-Operative Sepsis, Anastomotic Leaks & Enterocutaneous Fistula Care",
		"Emergency Neurosurgical Interventions: Craniotomy for Intracranial Mass & ICP Monitoring",
		"Pediatric Surgical Emergencies: Malrotation with Volvulus & Tracheoesophageal Fistula",
		"Urological Trauma: Renal Lacerations, Urethral Disruptions & Stenting",
		"Principles of Minimal Access Surgery & Robotic-Assisted Procedures"
	],
	"Maternal, Fetal & Child Health": [
		"Severe Preeclampsia, Eclampsia Resuscitation & HELLP Syndrome Protocol",
		"Intrapartum Fetal Heart Rate Monitoring (CTG Categories I, II, III)",
		"Obstetric Hemorrhage: Medical, Mechanical & Surgical Bundle for PPH",
		"Extremely Low Birth Weight (ELBW) Neonatal ICU & Surfactant Delivery",
		"Neonatal Resuscitation Program (NRP) Advanced Airway & UVC Access",
		"Neonatal Encephalopathy, Therapeutic Hypothermia & aEEG Monitoring",
		"Pediatric Septic Shock: Rapid Fluid Boluses vs Early Epinephrine Protocol",
		"Congenital Diaphragmatic Hernia & Abdominal Wall Defects Management",
		"Pediatric Status Epilepticus & Inborn Error Emergency Decompensation",
		"Pediatric Cyanotic Spells (Tet Spells) & Acute Prostaglandin E1 Infusion",
		"Child Abuse, Safeguarding Protocols & Forensic Pediatric Examination",
		"Perinatal Infections (TORCH Screen, Congenital Syphilis & Cytomegalovirus)"
	],
	"Diagnostic Sciences & Interventional Radiology": [
		"Histochemical Stains: Jones Silver, Congo Red & Masson Trichrome IBQs",
		"Flow Cytometry Immunophenotyping: Acute Leukemias & Lymphomas Panels",
		"High-Resolution CT (HRCT) Chest: Interstitial Patterns, Honeycombing & Tree-in-Bud",
		"Brain MRI Stroke Sequences: DWI vs ADC Mismatch & Perfusion Weighted Imaging",
		"Triple-Phase Abdominal CT: Hepatocellular Carcinoma & Hemangioma Dynamics",
		"PET-CT Whole Body Oncologic Staging & SUVmax Evaluation",
		"Catheter Angiography, Coil Embolization & GI Bleeding Interventions",
		"Image-Guided Biopsy: Ultrasound vs CT Guided Tru-Cut Protocols",
		"CSF Analysis: Cytology, Oligoclonal Bands, BioFire FilmArray & Cryptococcal Antigen",
		"Molecular Cytogenetics: Karyotyping, FISH & Chromosomal Microarray",
		"Point-of-Care Ultrasound (POCUS) Protocols: RUSH, BLUE & eFAST",
		"Therapeutic Nuclear Medicine: I-131 Thyroid, Lu-177 PSMA & Bone Scintigraphy"
	],
	"Medical Ethics, Forensic Jurisprudence & Biostatistics": [
		"Informed Consent, Substituted Judgment & Emergency Doctrine in Critical Illness",
		"Declaration of Helsinki, Good Clinical Practice & Ethics Committee Mandate",
		"Clinical Trial Methodology: Phase I to IV Designs, Randomization & Blinding",
		"Diagnostic Accuracy Metrics: Sensitivity, Specificity, Likelihood Ratios & ROC",
		"Measures of Association: Odds Ratio, Relative Risk, Hazard Ratio & NNT",
		"Bias, Confounding, Effect Modification & Multivariable Regression Adjustments",
		"Medico-Legal Autopsy Standards, Chain of Custody & Dying Declarations",
		"Medical Negligence Jurisprudence: Bolam Test, Bolitho Principle & Consumer Law",
		"Brainstem Death Certification Criteria, Apnea Testing & Organ Retrieval Laws",
		"Epidemic Diseases Act, Public Health Surveillance & Quarantine Statutes",
		"Palliative Care Ethics: Do Not Resuscitate (DNR) Orders & Withholding Care"
	],
	"Adult Health – Medicine": [
		"Acute Coronary Syndromes: Australian eTG Protocols & Primary PCI Pathways",
		"Chronic Heart Failure: GDMT Optimization, Sacubitril-Valsartan & SGLT2i",
		"Acute Exacerbations of COPD & Asthma Action Plans (National Asthma Council)",
		"Endocrine: Type 2 Diabetes Glycemic Targets, RACGP Guidelines & SGLT2/GLP-1 RA",
		"Gastroenterology: Reflux, Dyspepsia, H. pylori Eradication & Cirrhosis Surveillance",
		"Nephrology: Chronic Kidney Disease Staging, Albuminuria & Renal Protective Therapy",
		"Rheumatology: Giant Cell Arteritis, Polymyalgia Rheumatica & Crystal Arthropathies",
		"Infectious Diseases: Sepsis Recognition, Cellulitis, Community Pneumonia & eTG Antibiotics",
		"Neurology: TIA Risk Stratification (ABCD2), Stroke Thrombolysis & Bell Palsy",
		"Geriatric Medicine: Comprehensive Geriatric Assessment, Falls Risk & Polypharmacy",
		"Hematology: Iron Deficiency Anemia Diagnostic Workup, Iron Infusion & DVT Anticoagulation",
		"Acute Emergency Medicine: Anaphylaxis Management (Adrenaline Autoinjector) & Overdoses"
	],
	"Adult Health – Surgery": [
		"Acute Abdomen: Triage of Acute Appendicitis, Cholecystitis & Perforated Viscus",
		"Trauma Management: Primary & Secondary Surveys, ATLS & Intercostal Catheter Insertion",
		"Head Injury: Canadian CT Head Rule, Concussion Guidelines & Traumatic Brain Injury",
		"Bowel Obstruction: Small vs Large Bowel Etiology, CT Findings & Conservative vs Operative",
		"Skin Cancer in Australia: Melanoma Excision Margins, BCC & SCC Guidelines",
		"Hernias: Inguinal & Femoral Hernias, Reducibility & Strangulation Emergency",
		"Peripheral Vascular Disease: Ankle-Brachial Index, Diabetic Foot Ulcer & Revascularization",
		"Orthopedic Trauma: Distal Radius Fractures, Fractured Neck of Femur & Neurovascular Assessment",
		"Post-Operative Complications: Day 1-5 Fever Workup (Wind, Water, Wound, Walking, Wonder)",
		"Urological Emergencies: Renal Colic, Acute Urinary Retention & Testicular Torsion",
		"Surgical Sepsis, Wound Management, Suturing Techniques & Tetanus Prophylaxis",
		"Day-Surgery Procedures: Pre-Operative Fasting Guidelines & Anticoagulant Bridging"
	],
	"Women's Health (Obstetrics & Gynaecology)": [
		"Antenatal Care Schedule: First Trimester Combined Screening, NIPT & Morphology Ultrasound",
		"Hypertensive Disorders: Preeclampsia Risk Assessment, Aspirin Prophylaxis & Management",
		"Gestational Diabetes: ADIPS Diagnostic Criteria, Lifestyle vs Insulin Therapy",
		"Early Pregnancy Complications: Miscarriage Subtypes & Ectopic Pregnancy Workup",
		"Antepartum & Postpartum Hemorrhage: Early Detection, Uterotonics & Active Third Stage",
		"Contraceptive Counseling: Long-Acting Reversible Contraception (Implanon, IUD) & Emergency Pill",
		"Abnormal Uterine Bleeding: Investigation Pathways & Endometrial Biopsy Thresholds",
		"National Cervical Screening Program: HPV DNA Primary Screening & Colposcopy Referral",
		"Menopause: Vasomotor Symptoms, Menopausal Hormone Therapy (MHT) & Risk Balancing",
		"Pelvic Inflammatory Disease: Clinical Criteria, Empiric Treatment & Contact Tracing",
		"Infertility: Initial Assessment in General Practice & Specialist Referral Timing",
		"Pelvic Organ Prolapse & Urinary Incontinence (Stress vs Urge) Evaluation"
	],
	"Child Health (Paediatrics)": [
		"Developmental Milestones: Ages 0 to 5 Normal Sequences & Red Flag Delays",
		"National Immunisation Program (NIP) Australian Schedule & Catch-Up Protocols",
		"The Febrile Child: NICE / Australian Traffic Light Risk Tool & Sepsis Red Flags",
		"Acute Pediatric Respiratory Illness: Croup (Dexamethasone), Bronchiolitis & Stridor",
		"Gastroenteritis & Dehydration: Assessment of Dehydration Severity & Oral Rehydration",
		"Neonatal Jaundice: Physiological vs Pathological & Transcutaneous Bilirubin Charts",
		"Pediatric Murmurs: Differentiating Innocent Flow Murmurs from Congenital Heart Defects",
		"Child Safeguarding: Mandatory Reporting Laws & Physical Abuse Red Flags",
		"Atopic Disease: Atopic Dermatitis, Food Allergies & Anaphylaxis Action Plans",
		"Pediatric Seizures: Febrile Convulsions vs Epilepsy & Status Epilepticus First-Line Steps",
		"Constipation & Encopresis in Children: Behavioral & Osmotic Laxative Strategies",
		"Urinary Tract Infection in Infants: Urine Collection Techniques & Renal Ultrasound Referral"
	],
	"Mental Health (Psychiatry)": [
		"Assessment of Depression, Suicide Risk Assessment & Formulation of Safety Plans",
		"Anxiety Disorders: Panic Disorder, Social Phobia & Cognitive Behavioral Therapy Referrals",
		"First-Episode Psychosis: Early Recognition, Metabolic Screening & Second-Gen Antipsychotics",
		"Australian Mental Health Act: Involuntary Assessment Criteria & Community Treatment Orders",
		"Alcohol Use Disorder: AUDIT Score, CIWA Protocol, Thiamine Prophylaxis & Relapse Prevention",
		"Substance Misuse: Cannabis, Opioid Dependence, Naloxone Provision & Harm Minimization",
		"Eating Disorders: Anorexia Nervosa Medical Monitoring, Refeeding Risk & Specialist Care",
		"Dementia vs Delirium: Confusional State Diagnostic Algorithm & 4AT Tool in Elderly",
		"Borderline Personality Disorder: Emotion Dysregulation, Crisis Safety & Dialectical Behavior Therapy",
		"Perinatal Mental Health: Postnatal Depression Screening (EPDS) & Antidepressant Safety",
		"Psychopharmacology: Monitoring of SSRIs, Atypical Antipsychotics & Lithium Serum Levels",
		"Bipolar Disorder: Hypomania vs Mania, Mood Stabilizers & Psychoeducation"
	],
	"Population Health, General Practice & Ethics": [
		"RACGP Guidelines for Preventive Activities in General Practice (Red Book)",
		"Australian Notifiable Conditions & Public Health Notification Timeframes",
		"Consent & Autonomy: Gillick Competence, Minors & Enduring Power of Attorney",
		"Mandatory Reporting Requirements for Health Professionals (AHPRA Guidelines)",
		"Aboriginal & Torres Strait Islander Health: Cultural Safety & Closing the Gap Initiatives",
		"Workplace Health & Injury: Return to Work Plans, WorkCover Certification & Ergonomics",
		"Chronic Disease Management in Australia: GP Management Plans (GPMP) & Team Care (TCA)",
		"Infection Control in Community Settings & Residential Aged Care Outbreak Management",
		"Travel Medicine: Pre-Travel Health Risk Assessment, Yellow Fever & Malaria Prophylaxis",
		"Quality Use of Medicines (NPS MedicineWise): Deprescribing Protocols in Elderly",
		"Open Disclosure Principles & Responding to Medical Adverse Events and Near-Misses"
	]
};
SUBTOPICS["AIIMS_BASIC"] = SUBTOPICS["Applied Basic Sciences & Molecular Genetics"];
SUBTOPICS["AIIMS_MED"] = SUBTOPICS["Systemic Therapeutics & Critical Care Medicine"];
SUBTOPICS["AIIMS_SURG"] = SUBTOPICS["Surgical Specialties, Trauma & Operative Anatomy"];
SUBTOPICS["AIIMS_MCH"] = SUBTOPICS["Maternal, Fetal & Child Health"];
SUBTOPICS["AIIMS_DIAG"] = SUBTOPICS["Diagnostic Sciences & Interventional Radiology"];
SUBTOPICS["AIIMS_ETHICS"] = SUBTOPICS["Medical Ethics, Forensic Jurisprudence & Biostatistics"];
SUBTOPICS["AMC_MED"] = SUBTOPICS["Adult Health – Medicine"];
SUBTOPICS["AMC_SURG"] = SUBTOPICS["Adult Health – Surgery"];
SUBTOPICS["AMC_WOMEN"] = SUBTOPICS["Women's Health (Obstetrics & Gynaecology)"];
SUBTOPICS["AMC_CHILD"] = SUBTOPICS["Child Health (Paediatrics)"];
SUBTOPICS["AMC_PSYCH"] = SUBTOPICS["Mental Health (Psychiatry)"];
SUBTOPICS["AMC_POP"] = SUBTOPICS["Population Health, General Practice & Ethics"];
var NEET_PG_SUBJECTS = [
	{
		id: "ANAT",
		name: "Anatomy",
		phase: "Pre-Clinical",
		weightage: "17 Qs",
		highYield: true
	},
	{
		id: "PHYS",
		name: "Physiology",
		phase: "Pre-Clinical",
		weightage: "17 Qs",
		highYield: true
	},
	{
		id: "BIO",
		name: "Biochemistry",
		phase: "Pre-Clinical",
		weightage: "16 Qs",
		highYield: true
	},
	{
		id: "PATH",
		name: "Pathology",
		phase: "Para-Clinical",
		weightage: "25 Qs",
		highYield: true
	},
	{
		id: "PHARM",
		name: "Pharmacology",
		phase: "Para-Clinical",
		weightage: "20 Qs",
		highYield: true
	},
	{
		id: "MICRO",
		name: "Microbiology",
		phase: "Para-Clinical",
		weightage: "20 Qs",
		highYield: true
	},
	{
		id: "FMT",
		name: "Forensic Medicine & Toxicology",
		phase: "Para-Clinical",
		weightage: "10 Qs",
		highYield: false
	},
	{
		id: "PSM",
		name: "Preventive & Social Medicine (PSM)",
		phase: "Para-Clinical",
		weightage: "25 Qs",
		highYield: true
	},
	{
		id: "MED",
		name: "General Medicine",
		phase: "Clinical",
		weightage: "35 Qs",
		highYield: true
	},
	{
		id: "SURG",
		name: "General Surgery",
		phase: "Clinical",
		weightage: "30 Qs",
		highYield: true
	},
	{
		id: "OBG",
		name: "Obstetrics & Gynaecology",
		phase: "Clinical",
		weightage: "30 Qs",
		highYield: true
	},
	{
		id: "PED",
		name: "Pediatrics",
		phase: "Clinical",
		weightage: "10 Qs",
		highYield: true
	},
	{
		id: "ORTHO",
		name: "Orthopedics",
		phase: "Clinical",
		weightage: "10 Qs",
		highYield: false
	},
	{
		id: "ENT",
		name: "Oto-Rhino-Laryngology (ENT)",
		phase: "Clinical",
		weightage: "10 Qs",
		highYield: false
	},
	{
		id: "OPHTH",
		name: "Ophthalmology",
		phase: "Clinical",
		weightage: "10 Qs",
		highYield: false
	},
	{
		id: "DERM",
		name: "Dermatology & Venereology",
		phase: "Clinical",
		weightage: "6 Qs",
		highYield: false
	},
	{
		id: "PSYCH",
		name: "Psychiatry",
		phase: "Clinical",
		weightage: "6 Qs",
		highYield: false
	},
	{
		id: "ANES",
		name: "Anesthesiology",
		phase: "Clinical",
		weightage: "6 Qs",
		highYield: false
	},
	{
		id: "RADIO",
		name: "Radiodiagnosis & Radiotherapy",
		phase: "Clinical",
		weightage: "7 Qs",
		highYield: true
	}
];
var INI_CET_DOMAINS_6 = [
	{
		id: "AIIMS_BASIC",
		name: "Applied Basic Sciences & Molecular Genetics",
		desc: "Molecular pathology, genomic variants, autonomic/receptor pharmacology, neuroanatomy.",
		weightage: "22%",
		highYieldFocus: "Transposons, CRISPR, Enzymopathies, Microscopic IBQs"
	},
	{
		id: "AIIMS_MED",
		name: "Systemic Therapeutics & Critical Care Medicine",
		desc: "Internal medicine, cardiology, pulmonology, emergency resuscitation protocols, ICU sepsis.",
		weightage: "26%",
		highYieldFocus: "Hemodynamic titration, Arrhythmia algorithms, Endocrine crises"
	},
	{
		id: "AIIMS_SURG",
		name: "Surgical Specialties, Trauma & Operative Anatomy",
		desc: "General surgery, polytrauma triage, vascular reconstruction, oncology staging.",
		weightage: "20%",
		highYieldFocus: "ATLS guidelines, TNM staging, surgical margins"
	},
	{
		id: "AIIMS_MCH",
		name: "Maternal, Fetal & Child Health",
		desc: "Obstetrics emergencies, congenital inborn errors, neonatal intensive care protocols.",
		weightage: "15%",
		highYieldFocus: "Neonatal sepsis, Eclampsia, PPH protocol, Genetic dysmorphism"
	},
	{
		id: "AIIMS_DIAG",
		name: "Diagnostic Sciences & Interventional Radiology",
		desc: "Immunofluorescence, special histological stains, CT/MRI sign identification, flow cytometry.",
		weightage: "10%",
		highYieldFocus: "Jones Methenamine Silver, Apple-green birefringence, CT Signs"
	},
	{
		id: "AIIMS_ETHICS",
		name: "Medical Ethics, Forensic Jurisprudence & Biostatistics",
		desc: "Consent laws, clinical trial phase statistics, patient confidentiality protocols.",
		weightage: "7%",
		highYieldFocus: "Declaration of Helsinki, Sensitivity/Specificity, Bias & Confounding"
	}
];
var AMC_CAT_DOMAINS_6 = [
	{
		id: "AMC_MED",
		name: "Adult Health – Medicine",
		officialWeight: "30%",
		questionRatio: "45 of 150 Qs",
		desc: "Acute medical emergencies, chronic disease management, pharmacotherapy (eTG guidelines).",
		highYield: true
	},
	{
		id: "AMC_SURG",
		name: "Adult Health – Surgery",
		officialWeight: "20%",
		questionRatio: "30 of 150 Qs",
		desc: "Acute abdomen, surgical trauma, post-operative complications, surgical oncology.",
		highYield: true
	},
	{
		id: "AMC_WOMEN",
		name: "Women's Health (Obstetrics & Gynaecology)",
		officialWeight: "12.5%",
		questionRatio: "19 of 150 Qs",
		desc: "Antenatal screening, obstetric emergencies, contraception, abnormal uterine bleeding.",
		highYield: true
	},
	{
		id: "AMC_CHILD",
		name: "Child Health (Paediatrics)",
		officialWeight: "12.5%",
		questionRatio: "19 of 150 Qs",
		desc: "Developmental milestones, neonatal sepsis, pediatric immunization (Australian schedule), acute stridor.",
		highYield: true
	},
	{
		id: "AMC_PSYCH",
		name: "Mental Health (Psychiatry)",
		officialWeight: "12.5%",
		questionRatio: "19 of 150 Qs",
		desc: "Major depression, psychosis, acute mania, deliberate self-harm triage, Mental Health Act.",
		highYield: true
	},
	{
		id: "AMC_POP",
		name: "Population Health, General Practice & Ethics",
		officialWeight: "12.5%",
		questionRatio: "19 of 150 Qs",
		desc: "RACGP preventive health, infectious disease notification, Australian legal consent & Aboriginal health.",
		highYield: true
	}
];
var INITIAL_QUESTIONS = [
	{
		id: "Q10",
		moduleCode: "INI-CET / AIIMS HIGH-YIELD #MCQ-8842",
		examType: "INI_CET",
		subject: "PHARMACOLOGY",
		subtopic: "Antimicrobials: Glycopeptides & Beta-Lactams",
		cognitiveTier: "Multi-Step & IBQ",
		difficultyTier: "HIGH",
		difficultySubLevel: "H2",
		questionText: "Regarding glycopeptide resistance mechanisms in Enterococci, which of the following statements is/are correct?",
		stem: "VRE & Resistance Genetics: A 54-year-old critically ill ICU patient with central line-associated bacteremia is found to have vancomycin-resistant Enterococcus faecium. Genomic profiling reveals the VanA operon.",
		statements: [
			{
				num: 1,
				text: "The VanA phenotype confers high-level resistance to both vancomycin and teicoplanin.",
				isCorrect: true,
				statusBadge: "VANA",
				explanation: "VanA phenotype yields substitution of the terminal D-Ala-D-Ala cell wall peptidoglycan target with D-Ala-D-Lac, reducing vancomycin binding affinity ~1,000-fold. It confers inducible, high-level resistance to both vancomycin (MIC ≥ 64 µg/mL) and teicoplanin (MIC ≥ 16 µg/mL)."
			},
			{
				num: 2,
				text: "The VanB phenotype confers vancomycin resistance while teicoplanin often remains active.",
				isCorrect: true,
				statusBadge: "VANB",
				explanation: "The VanB phenotype is inducible strictly by vancomycin, not teicoplanin. Hence, teicoplanin susceptibility is clinically retained in vitro, although breakout mutations can emerge during monotherapy."
			},
			{
				num: 3,
				text: "The VanC phenotype is intrinsic to Enterococcus gallinarum and Enterococcus casseliflavus and gives low-level vancomycin resistance.",
				isCorrect: true,
				statusBadge: "VANC (INTRINSIC)",
				explanation: "VanC is intrinsic, chromosomal, non-transferable resistance seen specifically in motile enterococci (E. gallinarum, E. casseliflavus). It utilizes a D-Ala-D-Ser ligase causing low-level resistance (MIC 2–32 µg/mL). Teicoplanin remains universally susceptible."
			},
			{
				num: 4,
				text: "The VanA gene cluster is chromosomally encoded in Enterococcus faecium.",
				isCorrect: false,
				statusBadge: "TRAP POINT",
				explanation: "The VanA resistance determinant is carried on the Tn1546 transposon located primarily on conjugative plasmids (readily transferable to Staphylococcus aureus creating VRSA), not inherently chromosomal."
			}
		],
		options: [
			{
				id: "A",
				text: "1 and 2 only"
			},
			{
				id: "B",
				text: "1, 2 and 3 only"
			},
			{
				id: "C",
				text: "2, 3 and 4 only"
			},
			{
				id: "D",
				text: "3 and 4 only"
			}
		],
		correctOption: "B",
		selectedOption: "B",
		trapType: "TRANSPOSON VS CHROMOSOME TRANSLOCATION PITFALL",
		trapExplanation: "You committed a classical Board Distractor error. VanB is chromosome- or plasmid-borne and confers resistance to Vancomycin but remains susceptible to Teicoplanin. VanA confers resistance to both via substitution of D-Ala-D-Ala with D-Ala-D-Lac.",
		boardPearl: "Drug of Choice for VanA VRE bacteremia: Linezolid (Oxazolidinone: 50S subunit inhibitor) or Daptomycin (cyclic lipopeptide for bactericidal clearance, contraindicated in pneumonia due to pulmonary surfactant inactivation).",
		citations: ["Harrison's Principles of Internal Medicine 21st Ed. · Ch. 142 (Enterococcal Infections, pp. 1120-1124)", "Robbins & Cotran Pathologic Basis of Disease 10th Ed. · p. 344"],
		targetAccuracy: 68,
		nationalPercentile: 82
	},
	{
		id: "Q-PA-1049",
		moduleCode: "NEET-PG Histopathology Stem #PA-1049",
		examType: "NEET_PG",
		subject: "PATHOLOGY",
		subtopic: "Renal System · Histopathology Stem",
		cognitiveTier: "Multi-Step & IBQ",
		difficultyTier: "HIGH",
		difficultySubLevel: "H1",
		questionText: "A 42-year-old male presents with hemoptysis, recurrent sinusitis, acute oliguria, and serum creatinine 4.8 mg/dL. Renal core biopsy stained with Silver Methenamine reveals cellular crescent formation compressing the glomerular capillary tuft in >65% of glomeruli. Immunofluorescence shows faint, non-specific immunoglobulin deposition. Which diagnostic marker and classification is most accurate?",
		stem: "Pauci-Immune Crescentic Glomerulonephritis (Granulomatosis with Polyangiitis)",
		image: "/assets/aistudio/Image_9_fc76a8d4.jpeg",
		imageCaption: "H&E / Silver Methenamine Stain: Glomerular Crescent",
		options: [
			{
				id: "A",
				text: "Goodpasture Syndrome: Linear IgG along basement membrane"
			},
			{
				id: "B",
				text: "Anti-GBM Disease with granular subepithelial immune complex humps"
			},
			{
				id: "C",
				text: "GPA / c-ANCA (PR3) Pauci-Immune RPGN Type III"
			},
			{
				id: "D",
				text: "Lupus Nephritis Class IV: Full house immunofluorescence"
			}
		],
		correctOption: "C",
		selectedOption: "A",
		trapType: "IMAGE DISTRACTOR AMBIGUITY • IF PATTERN OVERLOOK",
		trapExplanation: "You latched onto hemoptysis + renal failure and jumped to Anti-GBM (Goodpasture). However, the stem specified \"faint, non-specific immunoglobulin deposition\" (Pauci-Immune). Goodpasture requires smooth linear IgG deposition.",
		boardPearl: "Pauci-immune RPGN Type III is characterized by c-ANCA (PR3) antibodies directed against proteinase-3 neutrophils. The silver stain demarcates ruptured Bowman capsule basement membranes with exuberant parietal cell proliferation.",
		citations: ["Robbins 10th Ed · Glomerular Diseases (p. 912)", "Harrison's 21st Ed · Vasculitis & Nephritic Syndromes (p. 2310)"],
		targetAccuracy: 52,
		isFlagged: true,
		timesFailed: 1
	},
	{
		id: "Q-AMC-501",
		moduleCode: "AMC CAT Examination · Core Clinical Block #501",
		examType: "AMC_CAT",
		subject: "Adult Health – Medicine",
		subtopic: "Cardiology & Emergency Pharmacology (eTG)",
		cognitiveTier: "Clinical 2-Step",
		difficultyTier: "MEDIUM",
		difficultySubLevel: "M1",
		questionText: "A 64-year-old male presents to the Emergency Department in Sydney with acute central chest pain, diaphoresis, and ST-elevation in leads II, III, and aVF. Blood pressure is 84/50 mmHg with heart rate 54 bpm. Jugular venous pulse is elevated to 6 cm above sternal angle, but lung fields are clear to auscultation bilaterally. Which initial pharmacological management is contraindicated?",
		stem: "Right Ventricular Infarction with Hypotension & Clear Lung Bases",
		options: [
			{
				id: "A",
				text: "Intravenous normal saline 500 mL fluid challenge"
			},
			{
				id: "B",
				text: "Sublingual glyceryl trinitrate (GTN) 400 mcg spray"
			},
			{
				id: "C",
				text: "Oral Aspirin 300 mg chewable"
			},
			{
				id: "D",
				text: "Immediate activation of cardiac catheterization laboratory for primary PCI"
			},
			{
				id: "E",
				text: "Supplemental oxygen titrated only if oxygen saturation drops below 92%"
			}
		],
		correctOption: "B",
		trapType: "PRELOAD REDUCTION COLLAPSE IN RV INFARCTION",
		trapExplanation: "Right ventricular infarctions are strictly preload-dependent. Administering vasodilators (GTN / Nitrates or Morphine) causes acute venodilation, plunging right ventricular filling pressures and precipitating catastrophic refractory cardiogenic shock.",
		boardPearl: "Triad of RV Infarction: Hypotension, Raised JVP, and Clear Lungs in the presence of inferior STEMI. Mandatory initial therapy: Aggressive IV normal saline loading to maintain RV preload. Inotropes (Dobutamine) if fluid fails.",
		citations: ["Australian Therapeutic Guidelines (eTG) · Cardiovascular: STEMI 2024", "Harrison's Internal Medicine 21st Ed. · Acute Myocardial Infarction"],
		targetAccuracy: 64
	},
	{
		id: "Q-AMC-502",
		moduleCode: "AMC CAT Examination · Paediatric Sepsis #502",
		examType: "AMC_CAT",
		subject: "Child Health (Paediatrics)",
		subtopic: "Neonatal Antimicrobial Protocols",
		cognitiveTier: "Direct Recall",
		difficultyTier: "LOW",
		difficultySubLevel: "L1",
		questionText: "A 10-day-old neonate with jaundice is admitted to a regional hospital in Queensland with temperature 38.6°C, poor feeding, and lethargy. Full blood examination shows elevated white cell count and CRP 42 mg/L. According to Australian Therapeutic Guidelines (eTG), which empirical intravenous regimen is recommended?",
		stem: "Empirical Regimen for Early/Late-Onset Neonatal Sepsis (<28 Days)",
		options: [
			{
				id: "A",
				text: "Intravenous Ampicillin plus Gentamicin"
			},
			{
				id: "B",
				text: "Intravenous Ceftriaxone monotherapy"
			},
			{
				id: "C",
				text: "Intravenous Vancomycin plus Meropenem"
			},
			{
				id: "D",
				text: "Oral Amoxicillin-Clavulanate"
			},
			{
				id: "E",
				text: "Intravenous Ciprofloxacin plus Metronidazole"
			}
		],
		correctOption: "A",
		trapType: "CEFTRIAXONE BINDING DISPLACEMENT KERNICTERUS",
		trapExplanation: "Ceftriaxone is explicitly contraindicated in jaundiced neonates <28 days due to displacement of bilirubin from albumin binding sites (Kernicterus) and calcium salt precipitation. Ampicillin + Gentamicin or Ampicillin + Cefotaxime is the standard protocol.",
		boardPearl: "Ampicillin covers Listeria monocytogenes and Group B Streptococcus (S. agalactiae). Gentamicin provides synergistic bactericidal coverage for Gram-negative enteric bacilli (E. coli).",
		citations: ["Australian Therapeutic Guidelines (eTG) · Paediatric Sepsis Guidelines 2024", "Royal Children’s Hospital Melbourne Clinical Guidelines"],
		targetAccuracy: 78
	},
	{
		id: "Q-GM-4120",
		moduleCode: "NEET-PG Cardiology & Endocrine Emergencies #GM-4120",
		examType: "NEET_PG",
		subject: "GENERAL MEDICINE",
		subtopic: "Cardiology • Endocrine Emergencies",
		cognitiveTier: "Clinical 2-Step",
		difficultyTier: "MEDIUM",
		difficultySubLevel: "M2",
		questionText: "A 38-year-old woman with severe paroxysmal hypertension, palpitations, and elevated 24-hour urinary metanephrines is scheduled for adrenalectomy. Blood pressure is 198/112 mmHg with heart rate 124 bpm. Which pharmacological sequence is mandatory before operating?",
		stem: "Sequencing of Adrenergic Blockade in Pheochromocytoma Resection",
		options: [
			{
				id: "A",
				text: "Initiate labetalol or carvedilol combined alpha/beta blockade simultaneously on day 1"
			},
			{
				id: "B",
				text: "Initiate Propranolol or Atenolol immediately to control severe reflex tachycardia, then titrate Phenoxybenzamine"
			},
			{
				id: "C",
				text: "Administer oral clonidine and verapamil for 7 days followed by beta-blockade"
			},
			{
				id: "D",
				text: "Alpha-blockade FIRST with Phenoxybenzamine for 10-14 days; Beta-blockers added ONLY after effective alpha blockade is established"
			}
		],
		correctOption: "D",
		selectedOption: "B",
		trapType: "UNOPPOSED ALPHA-1 VASOCONSTRICTION LETHAL CONTRAINDICATION",
		trapExplanation: "Classic board lethal error: Beta-blockade before alpha-blockade eliminates beta-2 mediated vasodilation in skeletal muscle vascular beds, leaving pure, unopposed alpha-1 stimulation. This precipitates fatal hypertensive crises and acute pulmonary edema.",
		boardPearl: "Rule of tens for Pheochromocytoma: 10% bilateral, 10% extra-adrenal (paraganglioma), 10% malignant, 10% familial (MEN 2A/2B, VHL, NF1). Always alpha-block first!",
		citations: ["Harrison's Internal Medicine 21st Ed. · Ch. 379 (Adrenal Medulla)", "Goodman & Gilman Pharmacology 14th Ed. · Adrenergic Antagonists"],
		targetAccuracy: 61,
		isFlagged: true,
		timesFailed: 3
	}
];
var buildExplanationPrompt = (q, userChoice, length) => {
	const optionLines = q.options.map((o) => `${o.id}. ${o.text}`).join("\n");
	return [
		`Question (subject: ${q.subject}, subtopic: ${q.subtopic}):`,
		q.stem ? `Stem: ${q.stem}` : "",
		`Task: ${q.questionText}`,
		`Options:`,
		optionLines,
		`Correct answer: ${q.correctOption}`,
		userChoice && userChoice !== q.correctOption ? `The student selected ${userChoice} (a trap).` : "",
		q.trapType ? `Known trap: ${q.trapType} — ${q.trapExplanation ?? ""}` : "",
		"",
		length === "Brief" ? "Answer in 3-4 short sentences total: the key discriminator and one line per decisive option." : length === "Detailed" ? "Answer thoroughly: first principles, then a dedicated 1-3 sentence verdict on EVERY option (why right or why wrong, with the classic mistake each distractor catches), then one board pearl. Include 1-2 textbook citations." : "Answer in two parts: (1) the core reasoning leading to the correct option; (2) a one-line verdict on every option. Include one textbook citation."
	].filter(Boolean).join("\n");
};
var AiQuestionTools = ({ question, userChoice, className }) => {
	const [length, setLength] = (0, import_react.useState)("Standard");
	const [busy, setBusy] = (0, import_react.useState)(null);
	const [output, setOutput] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const [savedFlags, setSavedFlags] = (0, import_react.useState)({});
	const provider = getActiveProvider();
	const providerLabel = provider ? `${provider} · ${getEffectiveModel(provider)}` : "no active provider";
	const run = async (kind) => {
		if (!provider || busy) return;
		setBusy(kind);
		setError(null);
		setSavedFlags({});
		try {
			let prompt;
			let system;
			if (kind === "explain") {
				system = "You are a rigorous clinical exam tutor. Explain exactly what is asked; be accurate, cite standard textbooks/guidelines. Plain readable text (may use **bold** and short lists). No JSON.";
				prompt = buildExplanationPrompt(question, userChoice, length);
			} else if (kind === "note") {
				system = "Write a compact revision note card for a postgraduate medical exam student. Start with a one-line bold title, then 3-6 high-yield bullet points (fact + mechanism/discriminator), then one \"High-yield:\" line, then a \"Mnemonic:\" line if natural, then a citation. Keep it dense, no JSON.";
				prompt = buildExplanationPrompt(question, void 0, "Brief") + "\n\nDistill this into a revision NOTE CARD (not an explanation).";
			} else {
				system = "You are a high-yield medical educator. Write a revision summary of the given exam topic. Plain readable text, bold headers, short bullets, mark the key takeaway with a line beginning \"High-yield:\" and any memory device with \"Mnemonic:\", end with 2-3 exam pearls and a citation. No JSON.";
				prompt = `Topic: ${question.subject} — ${question.subtopic}\n\nWrite a revision summary of this topic oriented to postgraduate medical exams (NEET-PG / INI-CET / AMC CAT): core concepts, must-know facts, classic traps, 2-3 pearls, one citation.`;
			}
			const text = await aiComplete({
				system,
				messages: [{
					role: "user",
					content: prompt
				}],
				provider,
				model: getEffectiveModel(provider)
			});
			setOutput({
				kind,
				text
			});
			if (kind === "note") {
				addUserHighlight(highlightFromAiReply({
					quote: text,
					subject: question.subject,
					subtopic: question.subtopic,
					citation: `AI note · ${question.subtopic}`,
					tags: ["ai-note"]
				}));
				setSavedFlags((prev) => ({
					...prev,
					note: true
				}));
			}
		} catch (err) {
			setError(err?.message || "AI request failed.");
		} finally {
			setBusy(null);
		}
	};
	const saveTopicNote = () => {
		if (!output || output.kind !== "topic") return;
		addUserHighlight(highlightFromAiReply({
			quote: output.text,
			subject: question.subject,
			subtopic: question.subtopic,
			citation: `AI topic summary · ${question.subtopic}`,
			tags: ["ai-note"]
		}));
		setSavedFlags((prev) => ({
			...prev,
			topic: true
		}));
	};
	const lengthChip = (val) => `px-2 py-0.5 rounded-full text-[10px] font-bold border ${length === val ? "bg-[#0f8b8d]/10 border-[#0f8b8d]/40 text-[#00696b]" : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `p-3.5 rounded-xl border border-[#0f8b8d]/25 bg-teal-50/30 space-y-2.5 ${className ?? ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-[10px] font-bold uppercase tracking-wider text-[#0f8b8d] flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3" }), " AI tools"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[9px] font-mono text-slate-400",
					children: providerLabel
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[10px] text-slate-500 font-semibold mr-0.5",
					children: "Length"
				}), [
					"Brief",
					"Standard",
					"Detailed"
				].map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setLength(v),
					className: lengthChip(v),
					children: v
				}, v))]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => run("explain"),
						disabled: !!busy || !provider,
						className: "px-2.5 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
						children: [busy === "explain" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-3 h-3 text-[#8ff3f4]" }), "Explain every option"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => run("note"),
						disabled: !!busy || !provider,
						className: "px-2.5 py-1.5 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
						children: [busy === "note" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookPen, { className: "w-3 h-3" }), savedFlags.note ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3" }), " Note saved"] }) : "Note for this question"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => run("topic"),
						disabled: !!busy || !provider,
						className: "px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#0f8b8d]/40 text-slate-700 text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
						children: [busy === "topic" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotebookPen, { className: "w-3 h-3" }), savedFlags.topic ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3 text-emerald-600" }), " Saved"] }) : "Notes for the whole topic"]
					}),
					output?.kind === "topic" && !savedFlags.topic && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: saveTopicNote,
						className: "text-[10px] font-bold text-[#0f8b8d] underline",
						children: "Save to Highlights"
					})
				]
			}),
			!provider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] text-rose-700",
				children: "Connect an AI provider in Settings → AI Subscription Hub."
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1",
						children: error
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setError(null),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
					})
				]
			}),
			output && !busy && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-lg bg-white border border-slate-200 max-h-80 overflow-y-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-2.5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RevisionNote, {
						text: output.text,
						topic: `${question.subject} ${question.subtopic}`
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-slate-100 px-2.5 py-1.5 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[9px] font-mono text-slate-400",
						children: output.kind === "explain" ? "Explanation" : output.kind === "note" ? "Question note" : "Topic notes"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							try {
								downloadNotesPdf(`${question.subject} — ${question.subtopic}`, output.text, providerLabel);
							} catch (err) {
								setError(err?.message || "Could not open the print window.");
							}
						},
						className: "inline-flex items-center gap-1 text-[10px] font-bold text-[#0f8b8d] hover:underline",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3 h-3" }), " Download PDF"]
					})]
				})]
			})
		]
	});
};
var SCHEDULE_KEY = "pulse.flashcards.v1";
var DAY_MS$1 = 864e5;
function safeParse(raw, fallback) {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) ?? fallback;
	} catch {
		return fallback;
	}
}
function loadSchedules() {
	return safeParse(localStorage.getItem(SCHEDULE_KEY), {});
}
function saveSchedules(map) {
	try {
		localStorage.setItem(SCHEDULE_KEY, JSON.stringify(map));
		notifyDataChanged();
	} catch (err) {
		console.error("Could not save flashcard schedule", err);
	}
}
/** Every card that can be reviewed, with its real schedule attached. */
function buildReviewCards() {
	const schedules = loadSchedules();
	const cards = [];
	for (const h of listUserHighlights()) cards.push(highlightToCard(h));
	for (const q of listCapturedQuestions()) {
		const correct = q.question.options.find((o) => o.id === q.question.correctOption);
		cards.push({
			key: `q:${q.id}`,
			source: "captured",
			subject: q.question.subject,
			topic: q.question.subtopic || q.topic || "Captured question",
			front: `${q.question.stem}\n\n${q.question.questionText}`.trim(),
			back: `${q.question.correctOption}. ${correct?.text ?? ""}\n\n${q.explanation || q.question.boardPearl || "No explanation captured."}`,
			citation: q.source || "Mistake notebook",
			createdAt: q.createdAt
		});
	}
	return cards.map((card) => {
		const existing = schedules[card.key];
		const created = Date.parse(card.createdAt);
		return {
			card,
			schedule: existing ?? {
				due: Number.isFinite(created) ? created : Date.now(),
				intervalDays: 0,
				ease: 2.3,
				reps: 0,
				lapses: 0
			}
		};
	});
}
function highlightToCard(h) {
	const back = [
		h.memoryAnchor,
		h.note,
		h.citation ? `Source: ${h.citation}` : ""
	].filter((v) => typeof v === "string" && v.trim().length > 0).join("\n\n");
	return {
		key: `hl:${h.id}`,
		source: "highlight",
		subject: h.subject || "General",
		topic: h.subtopic || "Note",
		front: h.quote,
		back: back || "No extra note saved for this highlight.",
		citation: h.citation,
		page: h.page,
		docId: h.docId,
		color: h.color,
		createdAt: h.createdAt || (/* @__PURE__ */ new Date()).toISOString()
	};
}
function sourceLabel(card) {
	if (card.source === "captured") return "Mistake notebook";
	if (card.docId) return "PDF notes";
	if (card.citation?.startsWith("AI")) return "AI notes";
	return "Notes";
}
/** Cards due right now, oldest due first. */
function dueReviewCards(now = Date.now()) {
	return buildReviewCards().filter(({ schedule }) => !schedule.suspended && schedule.due <= now).sort((a, b) => a.schedule.due - b.schedule.due);
}
/** Earliest future due time (ignores suspended cards). Null when no cards exist. */
function nextDueAt() {
	const future = buildReviewCards().filter(({ schedule }) => !schedule.suspended && schedule.due > Date.now()).map(({ schedule }) => schedule.due);
	return future.length ? Math.min(...future) : null;
}
function dueCount(now = Date.now()) {
	return dueReviewCards(now).length;
}
/** Human-readable "in 3 days" / "10 min" style label. */
function formatDueIn(due, now = Date.now()) {
	const diff = due - now;
	if (diff <= 0) return "Due now";
	const mins = Math.round(diff / 6e4);
	if (mins < 60) return `${mins} min`;
	const hours = Math.round(diff / 36e5);
	if (hours < 36) return `${hours} h`;
	const days = Math.round(diff / DAY_MS$1);
	return `${days} day${days === 1 ? "" : "s"}`;
}
/** Project the interval (in days) that a rating would schedule from the current state. */
function projectInterval(schedule, rating) {
	const isNew = schedule.reps === 0;
	switch (rating) {
		case "again": return 10 / 1440;
		case "hard": return isNew ? .5 : Math.max(.5, schedule.intervalDays * 1.2);
		case "good": return isNew ? 1 : Math.max(1, schedule.intervalDays * schedule.ease);
		case "easy": return isNew ? 4 : Math.max(4, schedule.intervalDays * schedule.ease * 1.35);
	}
}
function previewLabel(schedule, rating) {
	const days = projectInterval(schedule, rating);
	if (days < 1) return `${Math.max(1, Math.round(days * 24 * 60))} min`;
	const rounded = Math.round(days);
	return `${rounded} day${rounded === 1 ? "" : "s"}`;
}
/** Apply a real rating and persist the new due date. Returns the updated schedule. */
function rateCard(cardKey, rating) {
	const schedules = loadSchedules();
	const current = schedules[cardKey] ?? {
		due: Date.now(),
		intervalDays: 0,
		ease: 2.3,
		reps: 0,
		lapses: 0
	};
	const intervalDays = Math.min(365, projectInterval(current, rating));
	let ease = current.ease;
	if (rating === "again") ease = Math.max(1.3, ease - .2);
	else if (rating === "hard") ease = Math.max(1.3, ease - .05);
	else if (rating === "easy") ease = Math.min(2.8, ease + .15);
	const next = {
		due: Date.now() + intervalDays * DAY_MS$1,
		intervalDays,
		ease,
		reps: current.reps + 1,
		lapses: current.lapses + (rating === "again" ? 1 : 0),
		lastReviewedAt: Date.now(),
		suspended: current.suspended,
		reviewedLaterUntil: void 0
	};
	schedules[cardKey] = next;
	saveSchedules(schedules);
	return next;
}
/** "Review later" — postpone for a day without recording a failed recall. */
function reviewLater(cardKey, days = 1) {
	const schedules = loadSchedules();
	schedules[cardKey] = {
		...schedules[cardKey] ?? {
			due: Date.now(),
			intervalDays: 0,
			ease: 2.3,
			reps: 0,
			lapses: 0
		},
		due: Date.now() + days * DAY_MS$1,
		reviewedLaterUntil: Date.now() + days * DAY_MS$1
	};
	saveSchedules(schedules);
}
/** Remove from review without deleting the underlying note/question. */
function removeFromReview(cardKey) {
	const schedules = loadSchedules();
	schedules[cardKey] = {
		...schedules[cardKey] ?? {
			due: Date.now(),
			intervalDays: 0,
			ease: 2.3,
			reps: 0,
			lapses: 0
		},
		suspended: true
	};
	saveSchedules(schedules);
}
/** Put a suspended card back into the deck, due now. */
function restoreToReview(cardKey) {
	const schedules = loadSchedules();
	const current = schedules[cardKey];
	if (!current) return;
	schedules[cardKey] = {
		...current,
		suspended: false,
		due: Date.now()
	};
	saveSchedules(schedules);
}
var BACKUP_FORMAT = "pulse-med-backup";
function exportBackup() {
	return {
		format: BACKUP_FORMAT,
		version: 1,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		app: "Pulse Med",
		data: {
			highlights: listUserHighlights(),
			schedules: loadSchedules(),
			attempts: listAttempts(),
			capturedQuestions: listCapturedQuestions()
		}
	};
}
function backupToJson() {
	return JSON.stringify(exportBackup(), null, 2);
}
/** Minimal shape check so a corrupt backup cannot poison the scheduler. */
function isReviewSchedule(value) {
	if (!value || typeof value !== "object") return false;
	const v = value;
	return typeof v.due === "number" && Number.isFinite(v.due) && typeof v.intervalDays === "number" && Number.isFinite(v.intervalDays) && typeof v.ease === "number" && Number.isFinite(v.ease) && typeof v.reps === "number" && typeof v.lapses === "number";
}
/**
* Merge a backup into the current data.
* - Schedules are only applied to card keys that do not already have one, so a
*   restore can never overwrite the learner's current scheduling progress.
* - Items are matched by id; duplicates are skipped.
*/
function importBackup(raw) {
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("That file is not valid JSON.");
	}
	if (!parsed || parsed.format !== "pulse-med-backup") throw new Error("Unrecognised backup file (expected a Pulse Med backup).");
	if (typeof parsed.version !== "number" || parsed.version > 1) throw new Error(`Backup version ${String(parsed.version)} is newer than this app understands.`);
	const data = parsed.data || {};
	const result = {
		highlights: 0,
		schedules: 0,
		attempts: 0,
		capturedQuestions: 0
	};
	if (Array.isArray(data.highlights)) {
		const existing = new Set(listUserHighlights().map((h) => h.id));
		const toAdd = data.highlights.filter((h) => h && typeof h.id === "string" && h.id && !existing.has(h.id));
		for (const h of toAdd) {
			const all = listUserHighlights();
			all.unshift(h);
			try {
				localStorage.setItem("pulse.userHighlights.v1", JSON.stringify(all));
				result.highlights += 1;
			} catch {
				throw new Error("Local storage is full — could not import highlights.");
			}
		}
	}
	if (data.schedules && typeof data.schedules === "object") {
		const schedules = loadSchedules();
		for (const [key, value] of Object.entries(data.schedules)) if (!schedules[key] && isReviewSchedule(value)) {
			schedules[key] = value;
			result.schedules += 1;
		}
		saveSchedules(schedules);
	}
	if (Array.isArray(data.attempts)) result.attempts = importAttempts(data.attempts);
	if (Array.isArray(data.capturedQuestions)) result.capturedQuestions = importCapturedQuestions(data.capturedQuestions);
	notifyDataChanged();
	return result;
}
/** Reset all scheduling (decks become due now). Returns the backup JSON to save. */
function resetSchedules() {
	const backup = backupToJson();
	try {
		localStorage.removeItem(SCHEDULE_KEY);
		notifyDataChanged();
	} catch {
		throw new Error("Could not clear the local schedule store.");
	}
	return backup;
}
/** Delete everything review-related, including highlights and captured questions. */
function clearAllStudyData() {
	const backup = backupToJson();
	try {
		localStorage.removeItem(SCHEDULE_KEY);
		localStorage.removeItem("pulse.userHighlights.v1");
		localStorage.removeItem("pulse.mistakes.v1");
		localStorage.removeItem("pulse.attempts.v1");
		notifyDataChanged();
	} catch {
		throw new Error("Could not clear the local study data.");
	}
	return backup;
}
var FlashcardReviewPanel = ({ compact, onOpenPage }) => {
	const [refreshToken, setRefreshToken] = (0, import_react.useState)(0);
	const [revealed, setRevealed] = (0, import_react.useState)(false);
	const [showSuspended, setShowSuspended] = (0, import_react.useState)(false);
	const [rated, setRated] = (0, import_react.useState)(null);
	const refresh = () => {
		setRevealed(false);
		setRated(null);
		setRefreshToken((t) => t + 1);
	};
	(0, import_react.useEffect)(() => subscribeDataChanged(() => setRefreshToken((t) => t + 1)), []);
	const { queue, all, next } = (0, import_react.useMemo)(() => {
		return {
			queue: dueReviewCards(),
			all: buildReviewCards(),
			next: nextDueAt()
		};
	}, [refreshToken]);
	const current = queue[0] ?? null;
	const schedule = current?.schedule;
	const suspended = (0, import_react.useMemo)(() => {
		const schedules = loadSchedules();
		return all.filter(({ card }) => schedules[card.key]?.suspended);
	}, [all, refreshToken]);
	const activeCount = Math.max(0, all.length - suspended.length);
	const rate = (rating) => {
		if (!current) return;
		const updated = rateCard(current.card.key, rating);
		setRated({
			card: current.card,
			next: updated.due
		});
		setRevealed(false);
		setRefreshToken((t) => t + 1);
	};
	const ratingChip = (rating, label, className) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => rate(rating),
		className: `flex-1 min-w-[68px] px-2 py-1.5 rounded-lg border text-[10px] font-bold ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "block text-[9px] font-mono font-normal opacity-80",
			children: schedule ? previewLabel(schedule, rating) : "—"
		})]
	}, rating);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `bg-white rounded-2xl border border-slate-200 shadow-sm ${compact ? "p-4" : "p-5"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between mb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-sm font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock3, { className: "w-4 h-4 text-amber-500" }), " Spaced review"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${queue.length > 0 ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`,
					children: [queue.length, " due now"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between text-[10px] text-slate-500 pb-2 border-b border-slate-100",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					activeCount,
					" card",
					activeCount === 1 ? "" : "s",
					" in deck",
					suspended.length > 0 ? ` · ${suspended.length} paused` : ""
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono",
					children: next ? `next ${formatDueIn(next)}` : queue.length ? "all due now" : "no upcoming"
				})]
			}),
			rated && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 flex items-center gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					"Rated — next due ",
					formatDueIn(rated.next),
					"."
				] })]
			}),
			!current && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: all.length === 0 ? "No cards yet. Save a highlight, an AI note, or capture a mistake — it becomes a review card automatically." : activeCount === 0 ? "Every card in your deck is removed from review. Restore one below to bring it back." : "Nothing is due right now. Your next card is scheduled for later." })]
			}),
			current && schedule && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 space-y-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600",
								children: sourceLabel(current.card)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-semibold text-[#00696b]",
								children: current.card.subject
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-slate-500 truncate",
								children: current.card.topic
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-800 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap",
						children: current.card.front
					}),
					!revealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setRevealed(true),
						className: "w-full py-2 rounded-lg bg-[#001432] text-white text-[11px] font-bold flex items-center justify-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), " Reveal answer"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-3 rounded-xl bg-teal-50/60 border border-[#0f8b8d]/25 text-[11px] text-slate-800 leading-relaxed max-h-44 overflow-y-auto whitespace-pre-wrap",
							children: current.card.back
						}),
						current.card.docId && current.card.page && onOpenPage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => onOpenPage(current.card.docId, current.card.page),
							className: "text-[10px] font-bold text-[#0f8b8d] underline",
							children: ["Open source page ", current.card.page]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-1.5",
							children: [
								ratingChip("again", "Again", "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"),
								ratingChip("hard", "Hard", "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"),
								ratingChip("good", "Good", "bg-teal-50 border-[#0f8b8d]/30 text-[#00696b] hover:bg-teal-100"),
								ratingChip("easy", "Easy", "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100")
							]
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-[10px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								reviewLater(current.card.key);
								refresh();
							},
							className: "font-semibold text-slate-600 hover:text-[#0f8b8d] flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "w-3 h-3" }), " Review later (tomorrow)"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								removeFromReview(current.card.key);
								refresh();
							},
							className: "font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3 h-3" }), " Remove from review"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-[9px] font-mono text-slate-400",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"reps ",
							schedule.reps,
							" · lapses ",
							schedule.lapses,
							" · ease ",
							schedule.ease.toFixed(2)
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDueIn(schedule.due) })]
					})
				]
			}),
			suspended.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 pt-2 border-t border-slate-100",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setShowSuspended((v) => !v),
					className: "text-[10px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-3 h-3" }),
						" ",
						suspended.length,
						" removed from review",
						showSuspended ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3 h-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3 h-3" })
					]
				}), showSuspended && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1.5 space-y-1 max-h-32 overflow-y-auto",
					children: suspended.map(({ card }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2 text-[10px] text-slate-600",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: card.front.slice(0, 60)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								restoreToReview(card.key);
								refresh();
							},
							className: "shrink-0 font-bold text-[#0f8b8d] flex items-center gap-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-2.5 h-2.5" }), " Restore"]
						})]
					}, card.key))
				})]
			}),
			all.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex items-center gap-1.5 text-[10px] text-slate-400",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-3 h-3" }), " Cards come from your real notes — nothing is preloaded."]
			})
		]
	});
};
var EMPTY_DRAFT = {
	stem: "",
	questionText: "",
	options: [
		{
			id: "A",
			text: ""
		},
		{
			id: "B",
			text: ""
		},
		{
			id: "C",
			text: ""
		},
		{
			id: "D",
			text: ""
		}
	],
	correctOption: "A",
	explanation: "",
	subject: "",
	subtopic: "",
	boardPearl: "",
	citations: []
};
var QuestionCaptureModal = ({ exam, onClose, onSaved }) => {
	const [image, setImage] = (0, import_react.useState)(null);
	const [ocrText, setOcrText] = (0, import_react.useState)("");
	const [ocrBusy, setOcrBusy] = (0, import_react.useState)(false);
	const [ocrConfidence, setOcrConfidence] = (0, import_react.useState)(null);
	const [structBusy, setStructBusy] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [draft, setDraft] = (0, import_react.useState)(EMPTY_DRAFT);
	const [source, setSource] = (0, import_react.useState)("");
	const [topic, setTopic] = (0, import_react.useState)("");
	const [markedCorrect, setMarkedCorrect] = (0, import_react.useState)(false);
	const [savedId, setSavedId] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const jobRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const onPaste = (e) => {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of Array.from(items)) if (item.type.startsWith("image/")) {
				const file = item.getAsFile();
				if (!file) continue;
				const reader = new FileReader();
				reader.onload = () => {
					setImage(typeof reader.result === "string" ? reader.result : null);
					setOcrText("");
					setOcrConfidence(null);
					setError(null);
				};
				reader.readAsDataURL(file);
				e.preventDefault();
				return;
			}
		};
		document.addEventListener("paste", onPaste);
		return () => document.removeEventListener("paste", onPaste);
	}, []);
	(0, import_react.useEffect)(() => () => {
		if (jobRef.current) stopJob(jobRef.current.id);
	}, []);
	const pickImage = (file) => {
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setError("That file is not an image.");
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			setImage(typeof reader.result === "string" ? reader.result : null);
			setOcrText("");
			setOcrConfidence(null);
			setError(null);
		};
		reader.readAsDataURL(file);
	};
	const runOcr = async () => {
		if (!image || ocrBusy) return;
		setOcrBusy(true);
		setError(null);
		const job = startJob("Mistake screenshot OCR", "Preparing tesseract.js…");
		jobRef.current = job;
		try {
			const result = await ocrImage(image, (p) => {
				job.update({
					progress: Math.round(p.progress * 100),
					detail: `${p.status} · ${Math.round(p.progress * 100)}%`
				});
				if (job.isCancelled()) throw new Error("OCR stopped by the user.");
			});
			if (job.isCancelled()) throw new Error("OCR stopped by the user.");
			if (!result.text.trim()) throw new Error("No readable text was found in the screenshot.");
			setOcrText(result.text);
			setOcrConfidence(result.confidence);
			job.done(`Recognised ${result.text.length} characters`);
		} catch (err) {
			const message = err?.message || "OCR failed.";
			setError(message);
			job.fail(message);
		} finally {
			setOcrBusy(false);
		}
	};
	const structureWithAi = async () => {
		const provider = getActiveProvider();
		if (!provider) {
			setError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		const text = ocrText.trim();
		if (!text) {
			setError("Run OCR or paste the question text first.");
			return;
		}
		setStructBusy(true);
		setError(null);
		try {
			const parsed = extractJson(await aiComplete({
				system: "You convert raw OCR text from a medical exam question into structured JSON. Never invent clinical content that is not present in the text; leave fields empty when unclear. Respond with ONLY a JSON object, no markdown.",
				messages: [{
					role: "user",
					content: `Exam: ${exam.replace("_", "-")}\n\nRaw text:\n"""\n${text.slice(0, 8e3)}\n"""\n\nReturn exactly: {"stem":"vignette / scenario","questionText":"the actual question sentence","options":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."},{"id":"D","text":"..."}],"correctOption":"A","explanation":"why the answer is correct and the main distractor is wrong","subject":"discipline","subtopic":"topic","boardPearl":"one-line pearl","citations":["source if present"]}`
				}],
				json: true,
				provider,
				model: getEffectiveModel(provider)
			}));
			if (!parsed || typeof parsed !== "object") throw new Error("The AI response was not valid JSON. Try again.");
			const options = (Array.isArray(parsed.options) ? parsed.options : []).map((o, i) => {
				const id = (typeof o?.id === "string" ? o.id : String.fromCharCode(65 + i)).toUpperCase();
				const text = typeof o?.text === "string" ? o.text.trim() : "";
				return [
					"A",
					"B",
					"C",
					"D",
					"E"
				].includes(id) && text ? {
					id,
					text
				} : null;
			}).filter(Boolean).slice(0, 5);
			if (options.length < 2) throw new Error("The AI could not find at least two answer options. Edit the OCR text or fill the fields manually.");
			const correct = String(parsed.correctOption || "A").trim().toUpperCase();
			setDraft({
				stem: typeof parsed.stem === "string" ? parsed.stem.trim() : "",
				questionText: typeof parsed.questionText === "string" ? parsed.questionText.trim() : "",
				options,
				correctOption: options.some((o) => o.id === correct) ? correct : options[0].id,
				explanation: typeof parsed.explanation === "string" ? parsed.explanation.trim() : "",
				subject: typeof parsed.subject === "string" ? parsed.subject.trim() : "",
				subtopic: typeof parsed.subtopic === "string" ? parsed.subtopic.trim() : "",
				boardPearl: typeof parsed.boardPearl === "string" ? parsed.boardPearl.trim() : "",
				citations: Array.isArray(parsed.citations) ? parsed.citations.filter((c) => typeof c === "string" && c.trim()).slice(0, 4) : []
			});
		} catch (err) {
			setError(err?.message || "Could not structure the question.");
		} finally {
			setStructBusy(false);
		}
	};
	const updateOption = (id, text) => {
		setDraft((d) => ({
			...d,
			options: d.options.map((o) => o.id === id ? {
				...o,
				text
			} : o)
		}));
	};
	const save = () => {
		if (savedId) return;
		if (!draft.stem.trim() || !draft.questionText.trim()) {
			setError("The question needs a stem and a question sentence.");
			return;
		}
		const cleaned = draft.options.filter((o) => o.text.trim());
		if (cleaned.length < 2) {
			setError("Add at least two answer options.");
			return;
		}
		const correct = cleaned.some((o) => o.id === draft.correctOption) ? draft.correctOption : cleaned[0].id;
		const id = `CAP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
		const question = {
			id,
			examType: exam,
			subject: draft.subject.trim() || "General Medicine",
			subtopic: draft.subtopic.trim() || topic.trim() || "Captured question",
			cognitiveTier: "Clinical 2-Step",
			difficultyTier: "MEDIUM",
			stem: draft.stem.trim(),
			questionText: draft.questionText.trim(),
			options: cleaned,
			correctOption: correct,
			selectedOption: markedCorrect ? correct : void 0,
			boardPearl: draft.boardPearl.trim(),
			citations: draft.citations.length ? draft.citations : draft.explanation ? ["AI-structured capture — verify against the original source"] : [],
			targetAccuracy: 60,
			isRemediated: false,
			timesFailed: 1
		};
		try {
			addCapturedQuestion({
				id,
				source: source.trim() || "Captured from a mock test",
				ocrText: ocrText.trim() || void 0,
				imageDataUrl: image ?? void 0,
				status: markedCorrect ? "remediated" : "unresolved",
				markedCorrect,
				explanation: draft.explanation.trim() || void 0,
				topic: topic.trim() || draft.subtopic.trim() || void 0,
				question
			});
			setSavedId(id);
			onSaved?.(id);
		} catch (err) {
			setError(err?.message || "Could not save the captured question.");
		}
	};
	const providerLabel = getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : "no active provider";
	const field = "w-full text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white rounded-2xl max-w-3xl w-full my-6 p-5 shadow-2xl border border-slate-200 space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between border-b border-slate-100 pb-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-base font-bold text-slate-900 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardPaste, { className: "w-4 h-4 text-[#0f8b8d]" }), " Capture a question"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-[11px] text-slate-500 mt-0.5",
						children: [
							"Paste a screenshot with ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Ctrl+V" }),
							" (or choose an image), OCR it, then structure it with your active AI."
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "p-1 rounded-lg hover:bg-slate-100 text-slate-400",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
					})]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-xl flex items-start gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 mt-0.5 shrink-0" }),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex-1",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setError(null),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
						})
					]
				}),
				savedId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5" }),
						" Saved to the Mistake Notebook as ",
						savedId,
						".",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "ml-auto font-bold underline",
							children: "Close"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								onDrop: (e) => {
									e.preventDefault();
									pickImage(e.dataTransfer.files?.[0] ?? null);
								},
								onDragOver: (e) => e.preventDefault(),
								className: "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 min-h-36 flex flex-col items-center justify-center p-3 text-center",
								children: [image ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2 w-full",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: image,
										alt: "Pasted question screenshot",
										className: "max-h-56 w-full object-contain rounded-lg border border-slate-200 bg-white"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => {
											setImage(null);
											setOcrText("");
											setOcrConfidence(null);
										},
										className: "text-[10px] text-slate-500 hover:text-rose-600 inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3 h-3" }), " Remove image"]
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardPaste, { className: "w-6 h-6 text-slate-300 mb-1" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-slate-600 font-semibold",
										children: "Paste a screenshot (Ctrl+V)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[10px] text-slate-400 mt-0.5",
										children: "or drop an image here / choose a file"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => fileRef.current?.click(),
										className: "mt-2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImagePlus, { className: "w-3 h-3" }), " Choose image"]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: fileRef,
									type: "file",
									accept: "image/*",
									className: "hidden",
									onChange: (e) => {
										pickImage(e.target.files?.[0] ?? null);
										e.target.value = "";
									}
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: runOcr,
									disabled: !image || ocrBusy,
									className: "flex-1 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1",
									children: [ocrBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanText, { className: "w-3 h-3 text-[#8ff3f4]" }), ocrBusy ? "Recognising…" : "Run OCR"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: structureWithAi,
									disabled: !ocrText.trim() || structBusy,
									className: "flex-1 py-1.5 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-white text-[10px] font-bold disabled:opacity-40 flex items-center justify-center gap-1",
									children: [structBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3" }), "Structure with AI"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[9px] font-mono text-slate-400 text-right",
								children: providerLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-slate-600 block",
								children: "OCR text (editable)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: ocrText,
								onChange: (e) => setOcrText(e.target.value),
								rows: 6,
								placeholder: "Paste the question text here if you prefer not to use OCR…",
								className: `${field} resize-y`
							}),
							ocrConfidence !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[9px] text-slate-500 font-mono",
								children: [
									"tesseract confidence: ",
									Math.round(ocrConfidence),
									"%"
								]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[10px] font-bold text-slate-600 block mb-0.5",
									children: "Source / test"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: source,
									onChange: (e) => setSource(e.target.value),
									placeholder: "e.g. AMC CAT mock 3",
									className: field
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[10px] font-bold text-slate-600 block mb-0.5",
									children: "Subject"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: draft.subject,
									onChange: (e) => setDraft((d) => ({
										...d,
										subject: e.target.value
									})),
									placeholder: "e.g. Cardiology",
									className: field
								})] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-slate-600 block mb-0.5",
								children: "Topic"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: draft.subtopic,
								onChange: (e) => setDraft((d) => ({
									...d,
									subtopic: e.target.value
								})),
								placeholder: "e.g. Acute coronary syndrome",
								className: field
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-slate-600 block mb-0.5",
								children: "Stem"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: draft.stem,
								onChange: (e) => setDraft((d) => ({
									...d,
									stem: e.target.value
								})),
								rows: 3,
								className: `${field} resize-y`
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-slate-600 block mb-0.5",
								children: "Question"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: draft.questionText,
								onChange: (e) => setDraft((d) => ({
									...d,
									questionText: e.target.value
								})),
								className: field
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[10px] font-bold text-slate-600 block",
										children: "Options (select the correct one)"
									}),
									draft.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setDraft((d) => ({
												...d,
												correctOption: o.id
											})),
											className: `w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${draft.correctOption === o.id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`,
											title: "Mark as correct answer",
											children: o.id
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: o.text,
											onChange: (e) => updateOption(o.id, e.target.value),
											className: `${field} flex-1`,
											placeholder: `Option ${o.id}`
										})]
									}, o.id)),
									draft.options.length < 5 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setDraft((d) => ({
											...d,
											options: [...d.options, {
												id: "E",
												text: ""
											}]
										})),
										className: "text-[10px] font-semibold text-[#0f8b8d] underline",
										children: "+ Add option E"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-slate-600 block mb-0.5",
								children: "Explanation (optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: draft.explanation,
								onChange: (e) => setDraft((d) => ({
									...d,
									explanation: e.target.value
								})),
								rows: 3,
								className: `${field} resize-y`
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 pt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-bold text-slate-600",
										children: "In the source test I got this:"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setMarkedCorrect(false),
										className: `px-2 py-1 rounded-lg text-[10px] font-bold border ${!markedCorrect ? "bg-rose-50 border-rose-300 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-500"}`,
										children: "Incorrect"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setMarkedCorrect(true),
										className: `px-2 py-1 rounded-lg text-[10px] font-bold border ${markedCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"}`,
										children: "Correct"
									})
								]
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-t border-slate-100 pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] text-slate-400",
						children: "Saved locally — no question banks or screenshots leave this machine."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "px-3 py-1.5 text-[11px] font-semibold text-slate-600 rounded-lg hover:bg-slate-100",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: save,
							disabled: !!savedId,
							className: "px-3 py-1.5 text-[11px] font-bold bg-[#001432] hover:bg-[#13294b] text-white rounded-lg flex items-center gap-1.5 disabled:opacity-40",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), " Save to notebook"]
						})]
					})]
				})
			]
		})
	});
};
var MistakeNotebookView = ({ onNavigate, onStartSprint, currentExam = "NEET_PG" }) => {
	const [filterSubject, setFilterSubject] = (0, import_react.useState)("ALL");
	const [filterStatus, setFilterStatus] = (0, import_react.useState)("ALL");
	const [capturedVersion, setCapturedVersion] = (0, import_react.useState)(0);
	const [captureOpen, setCaptureOpen] = (0, import_react.useState)(false);
	const [showSample, setShowSample] = (0, import_react.useState)(false);
	const [expandedCards, setExpandedCards] = (0, import_react.useState)({});
	const [notesBusy, setNotesBusy] = (0, import_react.useState)(false);
	const [notesError, setNotesError] = (0, import_react.useState)(null);
	const [sprintError, setSprintError] = (0, import_react.useState)(null);
	const [revisionNotes, setRevisionNotes] = (0, import_react.useState)(null);
	const captured = (0, import_react.useMemo)(() => {
		return listCapturedQuestions();
	}, [capturedVersion]);
	const realQuestions = (0, import_react.useMemo)(() => captured.map(capturedToClinicalQuestion), [captured]);
	const usingSamples = realQuestions.length === 0 && showSample;
	const allQuestions = usingSamples ? INITIAL_QUESTIONS : realQuestions;
	const toggleExpand = (id) => {
		setExpandedCards((prev) => ({
			...prev,
			[id]: !prev[id]
		}));
	};
	const markStatus = (id, status) => {
		if (captured.some((c) => c.id === id)) {
			updateCapturedQuestion(id, {
				status,
				markedCorrect: status === "remediated"
			});
			setCapturedVersion((v) => v + 1);
		}
	};
	const deleteCaptured = (id) => {
		if (!captured.some((c) => c.id === id)) return;
		removeCapturedQuestion(id);
		setCapturedVersion((v) => v + 1);
	};
	/**
	* Real SRS sprint: only the learner's own captured questions, unresolved first.
	* If nothing has been captured yet the action explains that instead of loading
	* preloaded sample questions into the runner.
	*/
	const startSprint = () => {
		setSprintError(null);
		const unresolved = realQuestions.filter((q) => !q.isRemediated);
		const pool = (unresolved.length ? unresolved : realQuestions).slice(0, 10);
		if (!pool.length) {
			setSprintError("Capture at least one question first — the sprint only uses your own mistakes.");
			return;
		}
		if (!onStartSprint) {
			setSprintError("The sprint launcher is not connected in this build.");
			return;
		}
		onStartSprint(pool);
	};
	const subjects = (0, import_react.useMemo)(() => [...new Set(allQuestions.map((q) => q.subject))].sort(), [allQuestions]);
	const questions = allQuestions.filter((q) => {
		if (filterStatus === "UNRESOLVED" && q.isRemediated) return false;
		if (filterStatus === "REMEDIATED" && !q.isRemediated) return false;
		if (filterSubject !== "ALL" && q.subject !== filterSubject) return false;
		return true;
	});
	const stats = (0, import_react.useMemo)(() => {
		const unresolved = allQuestions.filter((q) => !q.isRemediated).length;
		const remediated = allQuestions.filter((q) => q.isRemediated).length;
		return {
			total: allQuestions.length,
			unresolved,
			remediated
		};
	}, [allQuestions]);
	const attemptStats = (0, import_react.useMemo)(() => summarizeAttempts(), [capturedVersion]);
	const todayModules = (0, import_react.useMemo)(() => attemptsToday().length, [capturedVersion]);
	const generateRevisionNotes = async () => {
		const provider = getActiveProvider();
		if (!provider) {
			setNotesError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		const weak = attemptStats.weakSubjects.slice(0, 4).map((s) => `${s.subject} (${s.accuracy}% accuracy on ${s.total} questions)`);
		const mistakeTopics = [...new Set(captured.map((c) => `${c.question.subject} — ${c.question.subtopic}`))].slice(0, 8);
		const topics = weak.length ? weak : mistakeTopics;
		if (!topics.length) {
			setNotesError("Answer some questions or capture a mistake first — these notes are built only from your real weak topics.");
			return;
		}
		setNotesBusy(true);
		setNotesError(null);
		try {
			const text = await aiComplete({
				system: "You are a medical exam revision coach. Write concise, high-yield revision notes for the learner's weakest topics. Use short headings and bullets, mark key takeaways with a line starting \"High-yield:\" and memory aids with \"Mnemonic:\". End with 3 exam pearls. Plain text only.",
				messages: [{
					role: "user",
					content: `Exam: ${currentExam.replace("_", "-")}\n\nMy weakest topics (from real attempt data):\n${topics.map((t) => `- ${t}`).join("\n")}\n\n` + (mistakeTopics.length ? `Mistakes I captured:\n${mistakeTopics.map((t) => `- ${t}`).join("\n")}\n\n` : "") + "Write the revision notes, prioritising discriminators and classic traps."
				}],
				provider,
				model: getEffectiveModel(provider)
			});
			setRevisionNotes({
				text,
				topics: topics.join(" · ")
			});
			addUserHighlight(highlightFromAiReply({
				quote: text,
				subject: "Revision",
				subtopic: "Weak topics",
				citation: `AI revision · ${topics.slice(0, 3).join(", ")}`,
				tags: ["ai-note", "revision"]
			}));
		} catch (err) {
			setNotesError(err?.message || "Could not generate revision notes.");
		} finally {
			setNotesBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" }),
									"SRS Engine · ",
									dueCount(),
									" card",
									dueCount() === 1 ? "" : "s",
									" due"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-2xl font-bold tracking-tight text-white",
								children: "Clinical Mistake Notebook & Cognitive Root-Cause Analysis"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-slate-300 text-sm mt-1 max-w-2xl",
								children: "Capture real mistakes from any mock test, mark them resolved as you master them, and review note cards on a real spaced schedule."
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setCaptureOpen(true),
								className: "inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-xl transition-all",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), "Capture Question"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: startSprint,
								className: "inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f8b8d] to-[#00696b] hover:from-[#00696b] hover:to-[#0f8b8d] text-white text-sm font-semibold rounded-xl shadow-lg transition-all transform active:scale-95",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-4 h-4" }), "Start SRS Mistake Sprint"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-700/60",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-900/50 backdrop-blur rounded-xl p-3 border border-slate-700/50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-400 font-medium",
									children: "Captured Questions"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-mono font-bold text-white mt-1",
									children: [captured.length, usingSamples && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-amber-300 font-normal block",
										children: "sample rows shown"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-900/50 backdrop-blur rounded-xl p-3 border border-slate-700/50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-400 font-medium",
									children: "Remediated & Retested"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-mono font-bold text-emerald-400 mt-1",
									children: [stats.remediated, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-emerald-400/80 font-normal",
										children: stats.total ? ` (${Math.round(stats.remediated / stats.total * 100)}%)` : ""
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-900/50 backdrop-blur rounded-xl p-3 border border-slate-700/50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-400 font-medium",
									children: "Unresolved Misconceptions"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-mono font-bold text-rose-400 mt-1",
									children: [stats.unresolved, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-rose-300 font-normal",
										children: [" ", stats.unresolved ? "Priority" : ""]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-900/50 backdrop-blur rounded-xl p-3 border border-slate-700/50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-400 font-medium",
									children: "Due for Spaced Review Today"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-mono font-bold text-amber-400 mt-1",
									children: [
										dueCount(),
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-amber-200 font-normal",
											children: "Cards"
										})
									]
								})]
							})
						]
					})
				]
			}),
			sprintError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800",
				children: sprintError
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-8 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "w-3.5 h-3.5" }), " Filter:"]
								}), [
									"ALL",
									"UNRESOLVED",
									"REMEDIATED"
								].map((status) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setFilterStatus(status),
									className: `px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${filterStatus === status ? "bg-[#001432] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
									children: status === "ALL" ? `All Mistakes (${stats.total})` : status === "UNRESOLVED" ? `Unresolved (${stats.unresolved})` : `Remediated (${stats.remediated})`
								}, status))]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: filterSubject,
									onChange: (e) => setFilterSubject(e.target.value),
									className: "text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "ALL",
										children: "All Disciplines"
									}), subjects.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: s,
										children: s
									}, s))]
								})
							})]
						}),
						captured.length === 0 && !showSample && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardPaste, { className: "w-8 h-8 text-slate-300 mx-auto" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-bold text-slate-800",
									children: "No real mistakes captured yet"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-500 max-w-md mx-auto leading-relaxed",
									children: "Paste a screenshot from any mock test and structure it with your AI. Captured questions persist locally and feed the spaced-review deck."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setCaptureOpen(true),
										className: "px-3 py-1.5 rounded-lg bg-[#001432] text-white text-xs font-bold flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), " Capture Question"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setShowSample(true),
										className: "px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold",
										children: "View sample rows"
									})]
								})
							]
						}),
						usingSamples && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "These are sample rows to show the layout — they are not your progress." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowSample(false),
								className: "font-bold underline",
								children: "Hide samples"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: questions.map((q) => {
								const isExpanded = expandedCards[q.id] ?? false;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `bg-white rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${q.isRemediated ? "border-emerald-200/80 hover:border-emerald-400" : "border-slate-200 hover:border-slate-300"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-5 pb-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-wrap items-center justify-between gap-2 mb-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 flex-wrap",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200",
																children: q.id
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-xs font-semibold px-2 py-0.5 rounded bg-[#0f8b8d]/10 text-[#0f8b8d]",
																children: q.subject
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-xs text-slate-500 font-medium",
																children: q.subtopic
															})
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2",
														children: [
															q.isRemediated ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3 text-emerald-600" }),
																	" Remediated in ",
																	q.remediatedInTest || "Grand Test"
																]
															}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200",
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3 h-3 text-rose-600" }),
																	" Failed ",
																	q.timesFailed || 1,
																	"x · Unresolved"
																]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600",
																children: q.examType.replace("_", "-")
															}),
															captured.some((c) => c.id === q.id) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
																onClick: () => markStatus(q.id, q.isRemediated ? "unresolved" : "remediated"),
																title: q.isRemediated ? "Mark as unresolved again" : "Mark this mistake as resolved",
																className: `inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${q.isRemediated ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-600 hover:border-emerald-300"}`,
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3 h-3" }),
																	" ",
																	q.isRemediated ? "Resolved" : "Mark resolved"
																]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																onClick: () => deleteCaptured(q.id),
																title: "Delete this captured question",
																className: "text-slate-400 hover:text-rose-600",
																children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
															})] })
														]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-sm font-semibold text-slate-900 mt-2",
													children: q.stem
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed",
													children: q.questionText
												}),
												q.image && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
														src: q.image,
														alt: "Clinical Histopathology",
														className: "w-32 h-24 object-cover rounded-lg border border-slate-300 shadow-sm"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex-1 text-left",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[11px] font-bold text-slate-800 uppercase tracking-wider block",
															children: q.imageCaption || "Histopathology Specimen"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-xs text-slate-600 mt-0.5 leading-relaxed",
															children: "Cellular crescent compression of capillary tuft >65% with basement membrane rupture on Jones Methenamine Silver stain."
														})]
													})]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => toggleExpand(q.id),
												className: "text-xs font-semibold text-[#0f8b8d] hover:text-[#00696b] flex items-center gap-1",
												children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Hide Cognitive Root Cause & Options ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3.5 h-3.5" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["View Board Distractor Analysis & Options ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3.5 h-3.5" })] })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => onNavigate("ai-tutor", q.id),
													className: "text-xs font-semibold text-slate-600 hover:text-[#0f8b8d] flex items-center gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5 text-amber-500" }), " Dissect with AI Tutor"]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => onNavigate("test-runner", q.id),
													className: "text-xs font-semibold text-[#001432] hover:text-[#0f8b8d] flex items-center gap-1",
													children: ["Retest Now ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3.5 h-3.5" })]
												})]
											})]
										}),
										isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-5 pt-4 border-t border-slate-200 bg-white space-y-4",
											children: [
												q.trapExplanation && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "p-4 rounded-xl bg-amber-50/90 border border-amber-200",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-start gap-2.5",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-4 h-4 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "text-xs font-bold text-amber-900 uppercase tracking-wider",
															children: ["Board Distractor Analysis: ", q.trapType || "COGNITIVE HEURISTIC ERROR"]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-xs text-amber-800 mt-1 leading-relaxed",
															children: q.trapExplanation
														})] })]
													})
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "space-y-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-xs font-semibold text-slate-700",
														children: "Answer Breakdown:"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "grid grid-cols-1 gap-2",
														children: q.options.map((opt) => {
															const isCorrect = opt.id === q.correctOption;
															const isSelected = opt.id === q.selectedOption;
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																className: `p-3 rounded-xl border text-xs flex items-start gap-3 ${isCorrect ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium" : isSelected ? "bg-rose-50/80 border-rose-300 text-rose-950" : "bg-slate-50/60 border-slate-200 text-slate-700"}`,
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: `w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 ${isCorrect ? "bg-emerald-600 text-white" : isSelected ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-700"}`,
																	children: opt.id
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "flex-1 leading-relaxed",
																	children: [
																		opt.text,
																		isSelected && !isCorrect && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "ml-2 font-bold text-rose-600 text-[10px] uppercase tracking-wide",
																			children: "[Your Selection — Trap]"
																		}),
																		isCorrect && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "ml-2 font-bold text-emerald-700 text-[10px] uppercase tracking-wide",
																			children: "[Correct Answer]"
																		})
																	]
																})]
															}, opt.id);
														})
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-3.5 rounded-xl bg-[#001432] text-white",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-3.5 h-3.5" }), " High-Yield Board Pearl"]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-xs text-slate-200 leading-relaxed font-sans",
														children: q.boardPearl
													})]
												}),
												q.citations && q.citations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[11px] text-slate-500 flex items-center gap-2 pt-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-3.5 h-3.5 text-slate-400" }),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-semibold text-slate-600",
															children: "Standard Text Citations:"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: q.citations.join(" · ") })
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiQuestionTools, {
													question: q,
													userChoice: q.selectedOption ?? void 0
												})
											]
										})
									]
								}, q.id);
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-4 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-gradient-to-br from-[#001432] to-[#13294b] text-white rounded-2xl p-5 border border-[#13294b] shadow-md",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-[#8ff3f4] text-xs font-bold uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "w-4 h-4" }), " Spaced Repetition Sprint"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-base font-bold mt-1 text-white",
									children: "Fix 10 Recurring Traps"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-300 mt-1 leading-relaxed",
									children: "Curated by error frequency. High-yield items where you scored <50% accuracy or picked the top distractor."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 flex items-center justify-between text-xs font-mono text-slate-300 pb-3 border-b border-slate-700",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Time Target: 12 min" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#8ff3f4]",
										children: "Penalty: Board Rules"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: startSprint,
									className: "w-full mt-4 py-2.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
									children: ["Launch Targeted Sprint ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "w-3.5 h-3.5" })]
								}),
								sprintError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800",
									children: sprintError
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-sm font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-4 h-4 text-[#0f8b8d]" }), " Mistake Attribution Breakdown"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-500 mt-0.5",
									children: attemptStats.questionsAnswered > 0 ? `Built from ${attemptStats.questionsAnswered} answered questions in ${attemptStats.modules} real module${attemptStats.modules === 1 ? "" : "s"}` : "No attempts recorded yet — submit a module or capture a mistake to populate this"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 space-y-3.5",
									children: [
										attemptStats.weakSubjects.length === 0 && captured.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-400 leading-relaxed",
											children: "Once you answer questions, your weakest subjects and their accuracy appear here. Nothing is simulated."
										}),
										attemptStats.weakSubjects.slice(0, 3).map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-xs font-medium mb-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-slate-700 truncate mr-2",
												children: s.subject
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono font-bold text-rose-600",
												children: [
													s.accuracy,
													"% (",
													s.correct,
													"/",
													s.total,
													")"
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-full h-2 rounded-full bg-slate-100 overflow-hidden",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full bg-rose-500 rounded-full",
												style: { width: `${Math.max(2, s.accuracy)}%` }
											})
										})] }, s.subject)),
										captured.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "pt-1 text-[10px] text-slate-500 flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												todayModules,
												" module",
												todayModules === 1 ? "" : "s",
												" today"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono",
												children: [attemptStats.accuracyPercent === null ? "—" : `${attemptStats.accuracyPercent}%`, " overall accuracy"]
											})]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlashcardReviewPanel, {
							compact: true,
							onOpenPage: (docId, page) => {
								try {
									sessionStorage.setItem("pulse.openPdf", JSON.stringify({
										docId,
										page
									}));
								} catch {}
								onNavigate("pdf-reader");
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "text-sm font-bold text-slate-900 flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-amber-500" }), " Revision notes"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[9px] font-mono text-slate-400 truncate max-w-[55%]",
										children: getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : "no provider"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500 leading-relaxed",
									children: "Generated from your weakest subjects and captured mistakes — nothing preloaded."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: generateRevisionNotes,
										disabled: notesBusy,
										className: "px-3 py-1.5 rounded-lg bg-[#001432] text-white text-[10px] font-bold disabled:opacity-40 flex items-center gap-1",
										children: [notesBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3 text-[#8ff3f4]" }), notesBusy ? "Writing…" : "Make my revision notes"]
									}), revisionNotes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											try {
												downloadNotesPdf(`Weak-topic revision — ${currentExam.replace("_", "-")}`, revisionNotes.text, getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : void 0);
											} catch (err) {
												setNotesError(err?.message || "Could not open the print window.");
											}
										},
										className: "text-[10px] font-bold text-[#0f8b8d] hover:underline",
										children: "Download PDF"
									})]
								}),
								notesError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-800",
									children: notesError
								}),
								revisionNotes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-2.5 rounded-lg bg-slate-50 border border-slate-200 max-h-64 overflow-y-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RevisionNote, {
										text: revisionNotes.text,
										topic: revisionNotes.topics
									})
								})
							]
						})
					]
				})]
			}),
			captureOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionCaptureModal, {
				exam: currentExam,
				onClose: () => setCaptureOpen(false),
				onSaved: () => setCapturedVersion((v) => v + 1)
			})
		]
	});
};
var SRS_KEY = "pulse.srs.v1";
var MINUTE_DAYS = 1 / 1440;
function readSrs() {
	try {
		const raw = localStorage.getItem(SRS_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
function writeSrs(map) {
	try {
		localStorage.setItem(SRS_KEY, JSON.stringify(map));
	} catch (err) {
		console.error("Could not save SRS schedule", err);
	}
}
function clamp(n, lo, hi) {
	return Math.min(hi, Math.max(lo, n));
}
/** FSRS-style next interval (days) for a card + rating. */
function nextIntervalDays(card, rating) {
	const first = !card || card.reps === 0;
	switch (rating) {
		case "Again": return 10 * MINUTE_DAYS;
		case "Hard": return first ? 1 : Math.max(1, card.intervalDays * 1.2);
		case "Good": return first ? 3 : Math.max(3, card.intervalDays * 2.5);
		case "Easy": return first ? 7 : Math.max(7, card.intervalDays * 4);
	}
}
function nextDifficulty(card, rating) {
	const d = card ? card.difficulty : 5;
	switch (rating) {
		case "Again": return clamp(d + 1, 1, 10);
		case "Hard": return clamp(d + .5, 1, 10);
		case "Good": return d;
		case "Easy": return clamp(d - .7, 1, 10);
	}
}
function scheduleReview(id, rating) {
	const map = readSrs();
	const prev = map[id] || null;
	const interval = nextIntervalDays(prev, rating);
	const card = {
		id,
		due: new Date(Date.now() + interval * 864e5).toISOString(),
		intervalDays: interval,
		difficulty: nextDifficulty(prev, rating),
		reps: rating === "Again" ? 0 : (prev?.reps || 0) + 1,
		lapses: (prev?.lapses || 0) + (rating === "Again" ? 1 : 0),
		lastRating: rating,
		lastRatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		suspended: false
	};
	map[id] = card;
	writeSrs(map);
	return card;
}
/** "Review later" — defer one day without changing the interval or reps. */
function deferReview(id) {
	const map = readSrs();
	const prev = map[id];
	map[id] = {
		id,
		due: new Date(Date.now() + 864e5).toISOString(),
		intervalDays: prev?.intervalDays ?? 0,
		difficulty: prev?.difficulty ?? 5,
		reps: prev?.reps ?? 0,
		lapses: prev?.lapses ?? 0,
		lastRating: prev?.lastRating,
		lastRatedAt: prev?.lastRatedAt,
		suspended: false
	};
	writeSrs(map);
}
/** "Remove from review" — suspend; the highlight itself stays saved. */
function suspendReview(id) {
	const map = readSrs();
	const prev = map[id];
	map[id] = {
		id,
		due: prev?.due ?? (/* @__PURE__ */ new Date()).toISOString(),
		intervalDays: prev?.intervalDays ?? 0,
		difficulty: prev?.difficulty ?? 5,
		reps: prev?.reps ?? 0,
		lapses: prev?.lapses ?? 0,
		lastRating: prev?.lastRating,
		lastRatedAt: prev?.lastRatedAt,
		suspended: true
	};
	writeSrs(map);
}
function resumeReview(id) {
	const map = readSrs();
	const prev = map[id];
	if (!prev) return;
	map[id] = {
		...prev,
		suspended: false,
		due: (/* @__PURE__ */ new Date()).toISOString()
	};
	writeSrs(map);
}
function formatSpan(days) {
	if (days < 1 / 24) return `${Math.max(1, Math.round(days * 1440))} min`;
	if (days < 1) return `${Math.round(days * 24)} hr`;
	if (days < 30) return `${Math.round(days)} d`;
	return `${(days / 30).toFixed(1)} mo`;
}
function dueLabel(due) {
	const delta = new Date(due).getTime() - Date.now();
	if (delta <= 0) return "Due now";
	return `in ${formatSpan(delta / 864e5)}`;
}
function dueDateText(due) {
	try {
		return new Date(due).toLocaleString(void 0, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	} catch {
		return due;
	}
}
var KIND_LABEL = {
	manual: "My note",
	"ai-reply": "AI Tutor note",
	pdf: "PDF highlight"
};
var HighlightsSavedView = ({ onNavigate }) => {
	const [selectedTag, setSelectedTag] = (0, import_react.useState)("ALL");
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [showAddModal, setShowAddModal] = (0, import_react.useState)(false);
	const [revealed, setRevealed] = (0, import_react.useState)(false);
	const [ratedNote, setRatedNote] = (0, import_react.useState)(null);
	const [deckIndex, setDeckIndex] = (0, import_react.useState)(0);
	const [customPearlText, setCustomPearlText] = (0, import_react.useState)("");
	const [modalSubject, setModalSubject] = (0, import_react.useState)("");
	const [modalConcept, setModalConcept] = (0, import_react.useState)("");
	const [modalNote, setModalNote] = (0, import_react.useState)("");
	const [highlights, setHighlights] = (0, import_react.useState)(() => listUserHighlights());
	const [srsVersion, setSrsVersion] = (0, import_react.useState)(0);
	const refreshHighlights = () => setHighlights(listUserHighlights());
	const bumpSrs = () => setSrsVersion((v) => v + 1);
	(0, import_react.useEffect)(() => {
		setRevealed(false);
	}, [deckIndex, srsVersion]);
	const srs = (0, import_react.useMemo)(() => {
		return readSrs();
	}, [srsVersion]);
	const dueDeck = (0, import_react.useMemo)(() => {
		const now = Date.now();
		const overdue = highlights.filter((h) => {
			const rec = srs[h.id];
			return !!rec && !rec.suspended && new Date(rec.due).getTime() <= now;
		}).sort((a, b) => new Date(srs[a.id].due).getTime() - new Date(srs[b.id].due).getTime());
		const fresh = highlights.filter((h) => !srs[h.id]);
		return [...overdue, ...fresh];
	}, [highlights, srs]);
	const currentCard = dueDeck[Math.min(deckIndex, Math.max(0, dueDeck.length - 1))] || null;
	const currentRec = currentCard ? srs[currentCard.id] : void 0;
	const isNewCard = !!currentCard && !currentRec;
	const dueNowCount = dueDeck.length;
	const nextDue = (0, import_react.useMemo)(() => {
		return highlights.map((h) => srs[h.id]).filter((r) => !!r && !r.suspended && new Date(r.due).getTime() > Date.now()).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime())[0] || null;
	}, [highlights, srs]);
	const inReviewCount = highlights.filter((h) => {
		const rec = srs[h.id];
		return !!rec && !rec.suspended;
	}).length;
	const newThisWeekCount = highlights.filter((h) => {
		const created = new Date(h.createdAt).getTime();
		return Date.now() - created < 6048e5;
	}).length;
	const tagTabs = (0, import_react.useMemo)(() => {
		const counts = /* @__PURE__ */ new Map();
		highlights.forEach((h) => h.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
		const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag, count]) => ({
			id: tag,
			label: `${tag} (${count})`
		}));
		return [{
			id: "ALL",
			label: `All Highlights (${highlights.length})`
		}, ...top];
	}, [highlights]);
	const filteredHighlights = (0, import_react.useMemo)(() => {
		return highlights.filter((h) => {
			if (selectedTag !== "ALL" && !h.tags.includes(selectedTag)) return false;
			if (searchQuery.trim() !== "") {
				const q = searchQuery.toLowerCase();
				return h.subject.toLowerCase().includes(q) || h.subtopic.toLowerCase().includes(q) || h.quote.toLowerCase().includes(q) || h.memoryAnchor && h.memoryAnchor.toLowerCase().includes(q) || h.note && h.note.toLowerCase().includes(q);
			}
			return true;
		});
	}, [
		highlights,
		selectedTag,
		searchQuery
	]);
	const saveManualHighlight = (input) => {
		addUserHighlight({
			kind: "manual",
			subject: input.subject,
			subtopic: input.subtopic,
			yieldTier: "HIGH",
			sourceContext: "Personal note",
			citation: "Personal note",
			quote: input.quote,
			memoryAnchor: input.note,
			note: input.note,
			tags: ["note"],
			srsIntervalDays: 1,
			lastReviewed: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
		});
		refreshHighlights();
		bumpSrs();
	};
	const handleExportTsv = () => {
		if (highlights.length === 0) {
			alert("Nothing to export yet — save a highlight first.");
			return;
		}
		const esc = (s) => s.replace(/[\t\r\n]+/g, " ").trim();
		const header = [
			"Front",
			"Back",
			"Subject",
			"Subtopic",
			"Citation",
			"Tags"
		].join("	");
		const rows = highlights.map((h) => [
			esc(h.quote),
			esc(h.memoryAnchor || h.note || ""),
			esc(h.subject),
			esc(h.subtopic),
			esc(h.citation),
			esc(h.tags.join(","))
		].join("	"));
		const blob = new Blob([[header, ...rows].join("\n")], { type: "text/tab-separated-values" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "pulse-highlights.tsv";
		a.click();
		URL.revokeObjectURL(url);
	};
	const handleRate = (rating) => {
		if (!currentCard) return;
		const card = scheduleReview(currentCard.id, rating);
		updateUserHighlight(currentCard.id, {
			srsIntervalDays: Math.max(1, Math.round(card.intervalDays)),
			lastReviewed: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
		});
		setRatedNote(`Scheduled — next review ${dueLabel(card.due)} (${formatSpan(card.intervalDays)} interval).`);
		setRevealed(false);
		setDeckIndex(0);
		refreshHighlights();
		bumpSrs();
	};
	const handleReviewLater = () => {
		if (!currentCard) return;
		deferReview(currentCard.id);
		setRatedNote("Deferred — back in the deck tomorrow.");
		setRevealed(false);
		setDeckIndex(0);
		bumpSrs();
	};
	const handleRemoveFromReview = () => {
		if (!currentCard) return;
		suspendReview(currentCard.id);
		setRatedNote("Removed from the review deck. It stays in your saved highlights.");
		setRevealed(false);
		setDeckIndex(0);
		bumpSrs();
	};
	const handleDeleteHighlight = (id) => {
		removeUserHighlight(id);
		const map = readSrs();
		delete map[id];
		writeSrs(map);
		refreshHighlights();
		bumpSrs();
	};
	const ratingPreview = (rating) => formatSpan(nextIntervalDays(currentRec || null, rating));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "w-3.5 h-3.5" }), "Saved Highlights & Memory Anchors"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-2xl font-bold tracking-tight text-white",
								children: "Clinical Highlights & Memory Anchors Repository"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-slate-300 text-sm mt-1 max-w-2xl",
								children: ["Your saved highlights with spaced-repetition review. ", dueNowCount > 0 ? `${dueNowCount} card${dueNowCount === 1 ? "" : "s"} due now.` : nextDue ? `Nothing due right now — next review ${dueLabel(nextDue.due)}.` : "Save a highlight to start a review deck."]
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: handleExportTsv,
								className: "inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-4 h-4 text-slate-300" }), "Export Anki TSV"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setShowAddModal(true),
								className: "inline-flex items-center gap-2 px-4 py-2.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), "Add Clinical Pearl"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 pt-5 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0",
							children: tagTabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSelectedTag(tab.id),
								className: `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${selectedTag === tab.id ? "bg-[#0f8b8d] text-white shadow-sm" : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"}`,
								children: tab.label
							}, tab.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative w-full sm:w-64",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 absolute left-3 top-2.5 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "Search your saved highlights...",
								value: searchQuery,
								onChange: (e) => setSearchQuery(e.target.value),
								className: "w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#0f8b8d]"
							})]
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:col-span-8 space-y-6",
					children: highlights.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0f8b8d]/10 mb-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "w-6 h-6 text-[#0f8b8d]" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold text-slate-900",
								children: "Nothing saved yet"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed",
								children: "Highlights you save from the PDF reader, the AI tutor, or the quick capture box land here and join your spaced-repetition deck."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setShowAddModal(true),
								className: "mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-semibold rounded-xl transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), " Add your first highlight"]
							})
						]
					}) : filteredHighlights.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-xs text-slate-500",
						children: "No saved highlights match this filter."
					}) : filteredHighlights.map((highlight) => {
						const rec = srs[highlight.id];
						const footerSrs = !rec ? "New · not scheduled yet" : rec.suspended ? "Removed from review" : `Next review ${dueLabel(rec.due)} · interval ${formatSpan(rec.intervalDays)}`;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-6 pb-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-2 mb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[11px] font-bold px-2 py-0.5 rounded bg-[#0f8b8d]/10 text-[#0f8b8d] uppercase tracking-wide",
													children: highlight.subject
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs font-semibold text-slate-700",
													children: highlight.subtopic
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider",
													children: KIND_LABEL[highlight.kind] || "Saved"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider",
											children: highlight.yieldTier
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 text-xs text-slate-500 font-medium mb-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-3.5 h-3.5 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: highlight.citation })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border-l-4 border-[#0f8b8d] text-slate-800 text-xs leading-relaxed font-sans italic",
										children: [
											"\"",
											highlight.quote,
											"\""
										]
									}),
									highlight.memoryAnchor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-4 p-4 rounded-xl bg-amber-50/80 border border-amber-200",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-4 h-4 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-bold text-amber-900 uppercase tracking-wider",
												children: "Memory Anchor & Rapid Recall Mnemonic:"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-amber-800 font-medium mt-1 leading-relaxed",
												children: highlight.memoryAnchor
											})] })]
										})
									}),
									highlight.boardTrapAlert && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-rose-900 uppercase tracking-wider text-[11px]",
											children: "Board Trap Warning: "
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-rose-800 font-medium leading-relaxed",
											children: highlight.boardTrapAlert
										})] })]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-6 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-slate-500 font-medium",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5 text-slate-400" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: footerSrs }),
										rec?.suspended && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => {
												resumeReview(highlight.id);
												bumpSrs();
											},
											className: "text-[#0f8b8d] hover:underline font-semibold inline-flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3 h-3" }), " Resume review"]
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => onNavigate("ai-tutor"),
										className: "text-slate-600 hover:text-[#0f8b8d] font-semibold flex items-center gap-1 transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5 text-amber-500" }), " Ask AI Tutor"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => handleDeleteHighlight(highlight.id),
										className: "text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors",
										title: "Delete this saved highlight",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
									})]
								})]
							})]
						}, highlight.id);
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-4 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-gradient-to-br from-[#001432] to-[#13294b] text-white rounded-2xl p-5 border border-[#13294b] shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] font-mono uppercase tracking-wider text-[#8ff3f4] font-bold flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }), " Review Deck"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300",
									children: dueNowCount > 0 ? `Due ${dueNowCount}` : "All clear"
								})]
							}), highlights.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 text-center",
								children: "No saved highlights yet — add one to build your review deck."
							}) : currentCard ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between mb-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-amber-400 font-bold",
												children: "Prompt:"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[10px] text-slate-400 font-semibold",
												children: [
													KIND_LABEL[currentCard.kind] || "Saved",
													" · ",
													currentCard.subject
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-slate-200 leading-relaxed font-medium",
											children: currentCard.quote
										}),
										isNewCard && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2 text-[10px] text-slate-400 italic",
											children: "New card · correct answer never confirmed by a rating yet."
										}),
										revealed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3 pt-3 border-t border-slate-700",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-amber-400 font-bold mb-1",
												children: "Answer:"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-slate-200 leading-relaxed",
												children: currentCard.memoryAnchor || currentCard.note || "No answer saved with this highlight yet."
											})]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setRevealed(true),
											className: "mt-3 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5" }), " Show answer"]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] text-slate-400 mb-2 font-medium",
										children: "Rate recall difficulty to set the next due date:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-2 gap-2 text-xs",
										children: [
											{
												label: "Again",
												tone: "rose",
												preview: ratingPreview("Again")
											},
											{
												label: "Hard",
												tone: "amber",
												preview: ratingPreview("Hard")
											},
											{
												label: "Good",
												tone: "sky",
												preview: ratingPreview("Good")
											},
											{
												label: "Easy",
												tone: "emerald",
												preview: ratingPreview("Easy")
											}
										].map((btn) => {
											const toneCls = btn.tone === "rose" ? "text-rose-300 border-slate-700 hover:bg-slate-800" : btn.tone === "amber" ? "text-amber-300 border-slate-700 hover:bg-slate-800" : btn.tone === "sky" ? "text-sky-300 border-slate-700 hover:bg-slate-800" : "text-emerald-300 border-slate-700 hover:bg-slate-800";
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												disabled: !revealed,
												onClick: () => handleRate(btn.label),
												className: `py-2 px-2.5 rounded-xl border text-center font-bold transition-all bg-slate-800/60 disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`,
												children: [
													btn.label,
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-[10px] block font-normal opacity-80",
														children: ["in ", btn.preview]
													})
												]
											}, btn.label);
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3.5 flex items-center justify-between gap-2 text-[11px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: handleReviewLater,
										className: "text-slate-300 hover:text-white font-semibold inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }), " Review later"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: handleRemoveFromReview,
										className: "text-slate-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "w-3.5 h-3.5" }), " Remove from review"]
									})]
								}),
								ratedNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 p-2 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] text-center font-semibold",
									children: ["✓ ", ratedNote]
								})
							] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-semibold text-slate-200 mb-1",
									children: "Nothing due right now."
								}), nextDue && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-slate-400",
									children: [
										"Next review ",
										dueLabel(nextDue.due),
										" — ",
										dueDateText(nextDue.due),
										"."
									]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-sm font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4 text-[#0f8b8d]" }), " Quick Pearl Capture"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-500 mt-0.5",
									children: "Paste or type high-yield board facts from bedside rounds or mock tests"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										value: customPearlText,
										onChange: (e) => setCustomPearlText(e.target.value),
										placeholder: "e.g. Linezolid causes bone marrow suppression & weak reversible MAO inhibition (risk of serotonin syndrome with SSRIs)...",
										rows: 3,
										className: "w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] text-slate-400 font-mono",
											children: "Saved as your note"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => {
												const text = customPearlText.trim();
												if (!text) return;
												saveManualHighlight({
													subject: "General",
													subtopic: "Quick Capture",
													quote: text
												});
												setCustomPearlText("");
											},
											className: "px-3.5 py-1.5 bg-[#001432] hover:bg-[#13294b] text-white text-xs font-semibold rounded-lg transition-colors",
											children: "Save Pearl"
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-sm font-bold text-slate-900 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-4 h-4 text-[#0f8b8d]" }), " Study Deck Retention Status"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid grid-cols-2 gap-3 text-center",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-slate-50 border border-slate-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xl font-mono font-bold text-slate-900",
											children: highlights.length
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-slate-500 mt-0.5 font-medium",
											children: "Total Anchors"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-amber-50 border border-amber-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xl font-mono font-bold text-amber-700",
											children: dueNowCount
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-amber-600 mt-0.5 font-medium",
											children: "Due Now"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-sky-50 border border-sky-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xl font-mono font-bold text-sky-700",
											children: inReviewCount
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-sky-600 mt-0.5 font-medium",
											children: "In Active Review"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-emerald-50 border border-emerald-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xl font-mono font-bold text-emerald-700",
											children: newThisWeekCount
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-emerald-600 mt-0.5 font-medium",
											children: "New This Week"
										})]
									})
								]
							})]
						})
					]
				})]
			}),
			showAddModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-lg font-bold text-slate-900",
							children: "Add New Clinical Highlight"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500 mt-1",
							children: "Saved to your highlights and added to the review deck."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-xs font-semibold text-slate-700 block mb-1",
									children: "Subject"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: modalSubject,
									onChange: (e) => setModalSubject(e.target.value),
									placeholder: "e.g. PHARMACOLOGY",
									className: "w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-xs font-semibold text-slate-700 block mb-1",
									children: "Concept / Title"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: modalConcept,
									onChange: (e) => setModalConcept(e.target.value),
									placeholder: "e.g. Daptomycin Surfactant Inactivation",
									className: "w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-xs font-semibold text-slate-700 block mb-1",
									children: "Memory Anchor / Board Trap Note"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 3,
									value: modalNote,
									onChange: (e) => setModalNote(e.target.value),
									placeholder: "Key high yield point...",
									className: "w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50"
								})] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex justify-end gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowAddModal(false),
								className: "px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg",
								children: "Cancel"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									const quote = modalConcept.trim() || modalNote.trim();
									if (!quote) return;
									saveManualHighlight({
										subject: modalSubject.trim() || "General",
										subtopic: modalConcept.trim() || "Clinical Pearl",
										quote,
										note: modalNote.trim() || void 0
									});
									setModalSubject("");
									setModalConcept("");
									setModalNote("");
									setShowAddModal(false);
								},
								className: "px-4 py-2 text-xs font-semibold bg-[#0f8b8d] text-white rounded-lg hover:bg-[#00696b]",
								children: "Save & Index"
							})]
						})
					]
				})
			})
		]
	});
};
function download(name, mime, content) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	setTimeout(() => URL.revokeObjectURL(url), 5e3);
}
function stamp() {
	return (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-");
}
var DataBackupPanel = () => {
	const [version, setVersion] = (0, import_react.useState)(0);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)(null);
	const fileRef = (0, import_react.useRef)(null);
	const counts = (0, import_react.useMemo)(() => {
		return {
			highlights: listUserHighlights().length,
			attempts: listAttempts().length,
			captured: listCapturedQuestions().length,
			cards: buildReviewCards().length,
			due: dueCount()
		};
	}, [version]);
	const refresh = () => setVersion((v) => v + 1);
	const exportNow = () => {
		setError(null);
		try {
			download(`pulse-med-backup-${stamp()}.json`, "application/json", backupToJson());
			setMessage("Backup downloaded (no keys or tokens included).");
		} catch (err) {
			setError(err?.message || "Could not create the backup.");
		}
	};
	const importFile = async (file) => {
		if (!file) return;
		setError(null);
		setMessage(null);
		try {
			const result = importBackup(await file.text());
			setMessage(`Merged: ${result.highlights} highlight(s), ${result.schedules} schedule(s), ${result.attempts} attempt(s), ${result.capturedQuestions} captured question(s). Existing schedules were kept.`);
			refresh();
		} catch (err) {
			setError(err?.message || "Import failed.");
		}
	};
	const reset = () => {
		if (!window.confirm("Reset every review schedule? A backup will download first; your highlights and questions are kept.")) return;
		setError(null);
		try {
			const backup = resetSchedules();
			download(`pulse-med-before-schedule-reset-${stamp()}.json`, "application/json", backup);
			setMessage("Schedules reset — every card is due now. Backup downloaded.");
			refresh();
		} catch (err) {
			setError(err?.message || "Could not reset the schedules.");
		}
	};
	const clearAll = () => {
		if (!window.confirm("Delete ALL highlights, captured questions, attempts and schedules? A backup downloads first. This cannot be undone from the app.")) return;
		setError(null);
		try {
			const backup = clearAllStudyData();
			download(`pulse-med-before-delete-${stamp()}.json`, "application/json", backup);
			setMessage("Study data deleted. Backup downloaded.");
			refresh();
		} catch (err) {
			setError(err?.message || "Could not clear the data.");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-base font-bold text-slate-900 flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "w-4 h-4 text-[#0f8b8d]" }), " Data, backup & review schedule"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-slate-500 mt-0.5",
					children: [
						"Versioned JSON backup (v",
						1,
						") — never includes OAuth tokens or API keys."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600",
					children: [
						counts.cards,
						" cards · ",
						counts.due,
						" due"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center",
				children: [
					{
						label: "Highlights",
						value: counts.highlights
					},
					{
						label: "Captured Qs",
						value: counts.captured
					},
					{
						label: "Attempts",
						value: counts.attempts
					},
					{
						label: "Review cards",
						value: counts.cards
					}
				].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-2.5 rounded-xl bg-slate-50 border border-slate-200",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-lg font-mono font-bold text-slate-800",
						children: c.value
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] text-slate-500",
						children: c.label
					})]
				}, c.label))
			}),
			message && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-xl flex items-start gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 mt-0.5 shrink-0" }),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: message })
				]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-xl flex items-start gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3.5 h-3.5 mt-0.5 shrink-0" }),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex-1",
						children: error
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: exportNow,
						className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#001432] hover:bg-[#13294b] text-white text-xs font-bold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), " Export backup (JSON)"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => fileRef.current?.click(),
						className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-[#0f8b8d]/50 text-slate-700 text-xs font-bold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }), " Merge import"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						ref: fileRef,
						type: "file",
						accept: "application/json,.json",
						className: "hidden",
						onChange: (e) => {
							importFile(e.target.files?.[0] ?? null);
							e.target.value = "";
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: reset,
						className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 text-xs font-bold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" }), " Reset schedules (backup first)"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: clearAll,
						className: "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" }), " Delete study data"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 leading-relaxed flex items-start gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Merge import matches items by id and never overwrites a schedule that already exists on this machine. Export/import stay entirely on this computer." })]
			})
		]
	});
};
var REAL_PROVIDERS = [
	{
		id: "gemini",
		name: "Gemini (Google AI)",
		brand: "google",
		model: DEFAULT_MODELS.gemini,
		status: "ready",
		type: "API Key (user-supplied)",
		features: ["API Key in Settings", "Flash & Pro models"],
		isDefault: true,
		isSignedIn: false,
		hasTokenConfigured: false,
		availableModels: [{
			id: DEFAULT_MODELS.gemini,
			name: "Gemini 3.8 Flash",
			description: "Default fast model",
			latencyEstimate: "—",
			contextWindow: "—"
		}, {
			id: "gemini-3.8-pro",
			name: "Gemini 3.8 Pro",
			description: "Deep reasoning",
			latencyEstimate: "—",
			contextWindow: "—"
		}]
	},
	{
		id: "chatgpt",
		name: "ChatGPT (OpenAI Subscription)",
		brand: "openai",
		model: DEFAULT_MODELS.chatgpt,
		status: "ready",
		type: "Device Code Sign-In",
		features: ["Device Code Sign-In", "Subscription Tokens"],
		isDefault: false,
		isSignedIn: false,
		hasTokenConfigured: false,
		availableModels: [{
			id: DEFAULT_MODELS.chatgpt,
			name: "GPT 6.1 Sol (Default)",
			description: "Current default",
			latencyEstimate: "—",
			contextWindow: "—"
		}]
	},
	{
		id: "claude",
		name: "Claude (Anthropic Subscription)",
		brand: "anthropic",
		model: DEFAULT_MODELS.claude,
		status: "ready",
		type: "PKCE Sign-In (paste code)",
		features: ["Paste-Code Sign-In", "Subscription Tokens"],
		isDefault: false,
		isSignedIn: false,
		hasTokenConfigured: false,
		availableModels: [{
			id: DEFAULT_MODELS.claude,
			name: "Claude Sonnet 5.5 (Default)",
			description: "Current default",
			latencyEstimate: "—",
			contextWindow: "—"
		}]
	},
	{
		id: "grok",
		name: "Grok (xAI)",
		brand: "xai",
		model: DEFAULT_MODELS.grok,
		status: "ready",
		type: "Built-in on the web",
		features: ["Connected in this app", "Grok 4.5"],
		isDefault: false,
		isSignedIn: false,
		hasTokenConfigured: false,
		availableModels: [{
			id: DEFAULT_MODELS.grok,
			name: "Grok 4.5",
			description: "Built-in model",
			latencyEstimate: "—",
			contextWindow: "—"
		}]
	}
];
function getClientSessionId() {
	let sid = localStorage.getItem("pulse_session_id");
	if (!sid) {
		sid = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
		localStorage.setItem("pulse_session_id", sid);
	}
	return sid;
}
var SettingsAIView = () => {
	const [providers, setProviders] = (0, import_react.useState)(REAL_PROVIDERS);
	const [activeProviderId, setActiveProviderId] = (0, import_react.useState)(() => getActiveProvider() ?? "gemini");
	const [models, setModels] = (0, import_react.useState)(() => {
		const initial = {};
		REAL_PROVIDERS.forEach((p) => {
			initial[p.id] = getEffectiveModel(p.id);
		});
		return initial;
	});
	const [selectedProvider, setSelectedProvider] = (0, import_react.useState)(null);
	const [isLoadingFlow, setIsLoadingFlow] = (0, import_react.useState)(false);
	const [deviceCodeData, setDeviceCodeData] = (0, import_react.useState)(null);
	const [pkceData, setPkceData] = (0, import_react.useState)(null);
	const [claudeInputCode, setClaudeInputCode] = (0, import_react.useState)("");
	const [isPolling, setIsPolling] = (0, import_react.useState)(false);
	const [isVerifying, setIsVerifying] = (0, import_react.useState)(false);
	const [authError, setAuthError] = (0, import_react.useState)(null);
	const [authSuccess, setAuthSuccess] = (0, import_react.useState)(false);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const [geminiKeyInput, setGeminiKeyInput] = (0, import_react.useState)("");
	const [isSavingKey, setIsSavingKey] = (0, import_react.useState)(false);
	const [keySavedMsg, setKeySavedMsg] = (0, import_react.useState)(null);
	const [modelCatalog, setModelCatalog] = (0, import_react.useState)({});
	const [catalogInfo, setCatalogInfo] = (0, import_react.useState)({
		busy: false,
		error: null,
		at: null
	});
	const [accountModels, setAccountModels] = (0, import_react.useState)({});
	const [accountErrors, setAccountErrors] = (0, import_react.useState)({});
	const [accountBusy, setAccountBusy] = (0, import_react.useState)(false);
	const loadModelCatalog = async () => {
		setCatalogInfo((s) => ({
			...s,
			busy: true,
			error: null
		}));
		try {
			const res = await fetch("/api/models/catalog");
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
			setModelCatalog(data.providers ?? {});
			setCatalogInfo({
				busy: false,
				error: null,
				at: typeof data.fetchedAt === "string" ? data.fetchedAt : (/* @__PURE__ */ new Date()).toISOString()
			});
		} catch (err) {
			setCatalogInfo({
				busy: false,
				error: err?.message || "Could not load the live model catalog.",
				at: null
			});
		}
	};
	const loadAccountModels = async () => {
		setAccountBusy(true);
		try {
			const res = await fetch("/api/models/available");
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
			setAccountModels(data.providers ?? {});
			setAccountErrors(data.errors ?? {});
		} catch (err) {
			setAccountErrors({ _global: err?.message || "Could not list the models on your account." });
		} finally {
			setAccountBusy(false);
		}
	};
	const pollTimerRef = (0, import_react.useRef)(null);
	const fetchOAuthStatus = async () => {
		try {
			const res = await fetch("/api/oauth/status", { headers: { "x-session-id": getClientSessionId() } });
			if (res.ok) {
				const data = await res.json();
				if (data.providers) {
					setProviders((prev) => prev.map((p) => {
						const providerStatus = data.providers[p.id];
						const isConn = Boolean(providerStatus?.connected);
						return {
							...p,
							hasTokenConfigured: isConn,
							status: isConn ? p.id === activeProviderId ? "active" : "connected" : "ready",
							userEmail: providerStatus?.userEmail || void 0
						};
					}));
					if (!getActiveProvider()) {
						const firstConnected = pickDefaultActiveProvider(data.providers);
						if (firstConnected) {
							setActiveProviderId(firstConnected);
							setActiveProvider(firstConnected);
						}
					}
				}
			} else if (res.status !== 200) console.error("OAuth status fetch failed:", res.status);
		} catch (err) {
			console.error("Error fetching OAuth status:", err);
		}
	};
	(0, import_react.useEffect)(() => {
		fetchOAuthStatus();
	}, [activeProviderId]);
	(0, import_react.useEffect)(() => {
		loadModelCatalog();
		loadAccountModels();
	}, []);
	const connectedProviderKey = providers.filter((p) => p.hasTokenConfigured).map((p) => p.id).sort().join(",");
	(0, import_react.useEffect)(() => {
		loadAccountModels();
	}, [activeProviderId, connectedProviderKey]);
	(0, import_react.useEffect)(() => {
		return () => {
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		};
	}, []);
	const handleOpenSignInModal = async (provider) => {
		setSelectedProvider(provider);
		setAuthError(null);
		setAuthSuccess(false);
		setKeySavedMsg(null);
		setCopied(false);
		setClaudeInputCode("");
		setDeviceCodeData(null);
		setPkceData(null);
		if (provider.id === "gemini") {
			setIsLoadingFlow(false);
			return;
		}
		setIsLoadingFlow(true);
		if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		try {
			const res = await fetch("/api/oauth/start", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-session-id": getClientSessionId()
				},
				body: JSON.stringify({ provider: provider.id })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || `Failed to start ${provider.name} sign-in flow.`);
			setIsLoadingFlow(false);
			if (data.flow === "device_code") {
				setDeviceCodeData({
					userCode: data.userCode,
					verificationUri: data.verificationUri,
					deviceCode: data.deviceCode,
					interval: data.interval || 5
				});
				startDeviceCodePolling(provider.id, data.deviceCode, data.interval || 5);
			} else if (data.flow === "pkce") setPkceData({
				authUrl: data.authUrl,
				state: data.state
			});
			else throw new Error("Unexpected sign-in flow response.");
		} catch (err) {
			setIsLoadingFlow(false);
			setAuthError(err.message || "Failed to start authorization flow.");
		}
	};
	const startDeviceCodePolling = (providerId, deviceCode, intervalSeconds) => {
		if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		setIsPolling(true);
		const pollEveryMs = Math.max(2, intervalSeconds || 3) * 1e3;
		pollTimerRef.current = setInterval(async () => {
			try {
				const res = await fetch("/api/oauth/poll", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-session-id": getClientSessionId()
					},
					body: JSON.stringify({
						provider: providerId,
						deviceCode
					})
				});
				if (res.ok) {
					const data = await res.json();
					if (data.status === "success" && data.connected) {
						clearInterval(pollTimerRef.current);
						setIsPolling(false);
						setAuthSuccess(true);
						await fetchOAuthStatus();
						setTimeout(() => {
							setSelectedProvider(null);
						}, 1200);
					} else if (data.status === "expired") {
						clearInterval(pollTimerRef.current);
						setIsPolling(false);
						setAuthError("Device authorization code has expired. Please restart sign-in.");
					} else if (data.status === "error") {
						clearInterval(pollTimerRef.current);
						setIsPolling(false);
						setAuthError(data?.error || "Authorization failed. Please restart sign-in.");
					}
				}
			} catch (err) {
				console.error("Polling error:", err);
			}
		}, pollEveryMs);
	};
	const handleCompleteDeviceCode = async () => {
		if (!selectedProvider || !deviceCodeData) return;
		setIsVerifying(true);
		setAuthError(null);
		try {
			const res = await fetch("/api/oauth/complete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-session-id": getClientSessionId()
				},
				body: JSON.stringify({
					provider: selectedProvider.id,
					deviceCode: deviceCodeData.deviceCode
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || "Not approved yet. Approve the code on the provider page, then click Verify again.");
			if (pollTimerRef.current) clearInterval(pollTimerRef.current);
			setIsPolling(false);
			setIsVerifying(false);
			setAuthSuccess(true);
			await fetchOAuthStatus();
			setTimeout(() => {
				setSelectedProvider(null);
			}, 1200);
		} catch (err) {
			setIsVerifying(false);
			setAuthError(err.message || "Verification failed.");
		}
	};
	const handleCompleteClaudePKCE = async () => {
		if (!selectedProvider || !claudeInputCode.trim() || !pkceData) return;
		setIsVerifying(true);
		setAuthError(null);
		try {
			const res = await fetch("/api/oauth/complete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-session-id": getClientSessionId()
				},
				body: JSON.stringify({
					provider: "claude",
					code: claudeInputCode.trim(),
					state: pkceData.state
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || "Failed to verify Claude authorization code.");
			setIsVerifying(false);
			setAuthSuccess(true);
			await fetchOAuthStatus();
			setTimeout(() => {
				setSelectedProvider(null);
			}, 1200);
		} catch (err) {
			setIsVerifying(false);
			setAuthError(err.message || "Authorization failed.");
		}
	};
	const handleSaveGeminiKey = async () => {
		const key = geminiKeyInput.trim();
		if (!key) return;
		setIsSavingKey(true);
		setAuthError(null);
		try {
			const res = await fetch("/api/settings/gemini-key", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-session-id": getClientSessionId()
				},
				body: JSON.stringify({ apiKey: key })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || "Could not save the API key.");
			setKeySavedMsg("API key saved and active. Gemini is now connected.");
			setGeminiKeyInput("");
			await fetchOAuthStatus();
			setTimeout(() => setSelectedProvider(null), 1200);
		} catch (err) {
			setAuthError(err.message || "Could not save the API key.");
		} finally {
			setIsSavingKey(false);
		}
	};
	const handleLogout = async (providerId, e) => {
		if (e) e.stopPropagation();
		try {
			await fetch("/api/oauth/logout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-session-id": getClientSessionId()
				},
				body: JSON.stringify({ provider: providerId })
			});
			await fetchOAuthStatus();
			if (activeProviderId === providerId) setActiveProviderId("gemini");
		} catch (err) {
			console.error("Logout error:", err);
		}
	};
	const handleCopyCode = () => {
		if (deviceCodeData?.userCode) {
			navigator.clipboard.writeText(deviceCodeData.userCode);
			setCopied(true);
			setTimeout(() => setCopied(false), 2e3);
		}
	};
	const handleSetActive = (provider) => {
		if (!provider.hasTokenConfigured) {
			setAuthError(null);
			return;
		}
		setActiveProviderId(provider.id);
		setActiveProvider(provider.id);
	};
	const handleModelChange = (providerId, model) => {
		setModels((prev) => ({
			...prev,
			[providerId]: model
		}));
		setModel(providerId, model);
	};
	const [testState, setTestState] = (0, import_react.useState)(null);
	const handleTestConnection = async (providerId) => {
		if (testState?.status === "busy") return;
		setTestState({
			id: providerId,
			status: "busy",
			detail: null
		});
		try {
			const res = await fetch("/api/ai/complete", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					provider: providerId,
					model: models[providerId] || getEffectiveModel(providerId),
					messages: [{
						role: "user",
						content: "Reply with exactly: OK"
					}]
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status}).`);
			const text = typeof data?.text === "string" ? data.text.trim() : "";
			if (text === "OK") setTestState({
				id: providerId,
				status: "ok",
				detail: null
			});
			else setTestState({
				id: providerId,
				status: "fail",
				detail: `Unexpected reply: ${text.slice(0, 60) || "(empty)"}`
			});
		} catch (err) {
			setTestState({
				id: providerId,
				status: "fail",
				detail: err?.message || "Test request failed."
			});
		} finally {
			setTimeout(() => setTestState(null), 6e3);
		}
	};
	const handleCloseModal = () => {
		if (pollTimerRef.current) clearInterval(pollTimerRef.current);
		setIsPolling(false);
		setKeySavedMsg(null);
		setGeminiKeyInput("");
		setSelectedProvider(null);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "w-3.5 h-3.5" }), "AI Subscription & Model Routing"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-bold tracking-tight text-white",
							children: "AI Subscriptions, Model Tokens & Local Engine"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-300 text-sm mt-1 max-w-2xl",
							children: "Sign in with your Claude Pro, ChatGPT Plus, or Grok subscription, or add your Gemini API key — then route every AI feature through your active model."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono text-emerald-400 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }), "Local Server Routing · Tokens Never Leave This Machine"]
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-5 space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between border-b border-slate-100 pb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-base font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "w-4 h-4 text-[#0f8b8d]" }), " Active Engine & Model Routing"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-500 mt-0.5",
									children: "Every AI feature uses the active provider and model below"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200",
									children: "LIVE"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between items-center text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-slate-500 font-semibold",
										children: "Active Provider:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono font-bold text-[#0f8b8d] truncate max-w-[60%] text-right",
										children: [
											activeProviderId,
											" · ",
											models[activeProviderId] || getEffectiveModel(activeProviderId)
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-500 leading-relaxed",
									children: "The active engine is used by the AI Tutor, Practice Module Builder, and any other AI action. Change it with “Use Engine” on any connected provider card."
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-[11px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-slate-500",
										children: "Subscription tokens stored:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-medium text-slate-800",
										children: "~\\.neet-pg-prep\\oauth.json (local only)"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-[11px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-slate-500",
										children: "Gemini key stored:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-medium text-slate-800",
										children: "user data dir \\.env"
									})]
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 shadow-sm space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4" }), " Server-Keyed Session Security"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-300 leading-relaxed",
							children: "Subscription tokens and your Gemini key live only on this machine, managed by the local server. They are never returned to the browser and never committed to repository storage."
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-7 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-base font-bold text-slate-900 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-amber-500" }), " AI Subscription Hub & Model Routing"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-slate-500 mt-0.5",
								children: "Sign in with your Claude, ChatGPT, or Grok subscription — or paste a Gemini API key"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700",
								children: [
									providers.filter((p) => p.hasTokenConfigured).length,
									" of ",
									providers.length,
									" Connected"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: catalogInfo.error ? `Live catalog unavailable — static suggestions shown (${catalogInfo.error})` : catalogInfo.at ? `Live model catalog loaded ${new Date(catalogInfo.at).toLocaleString()} · ${Object.values(modelCatalog).reduce((n, list) => n + list.length, 0)} models` : "Loading live model catalog…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: loadModelCatalog,
								disabled: catalogInfo.busy,
								className: "font-bold text-[#0f8b8d] hover:underline disabled:opacity-40",
								children: catalogInfo.busy ? "Refreshing…" : "Refresh catalog"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-3.5",
							children: providers.map((p) => {
								const isActive = p.id === activeProviderId;
								const isConnected = Boolean(p.hasTokenConfigured);
								const catalogModels = modelCatalog[p.id] ?? [];
								const liveAccountModels = accountModels[p.id] ?? [];
								const accountError = accountErrors[p.id];
								const selectedModelId = models[p.id] ?? p.model;
								const selectedMeta = catalogModels.find((m) => m.id === selectedModelId);
								const releaseBadge = (() => {
									const released = selectedMeta?.released ? Date.parse(selectedMeta.released) : NaN;
									if (!Number.isFinite(released)) return null;
									const days = (Date.now() - released) / 864e5;
									return days <= 120 ? "NEW" : days >= 540 ? "OLD" : null;
								})();
								const suggestions = liveAccountModels.length ? liveAccountModels.map((m) => ({
									id: m.id,
									label: m.name || m.id
								})) : catalogModels.length ? catalogModels.map((m) => ({
									id: m.id,
									label: `${m.name}${m.context ? ` · ${Math.round(m.context / 1e3)}k context` : ""}`
								})) : p.availableModels.map((m) => ({
									id: m.id,
									label: m.name
								}));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `bg-white rounded-2xl border p-5 transition-all shadow-sm ${isActive ? "border-[#0f8b8d] ring-2 ring-[#0f8b8d]/20 bg-teal-50/10" : "border-slate-200 hover:border-slate-300"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${p.id === "gemini" ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white" : p.id === "claude" ? "bg-gradient-to-br from-amber-600 to-orange-700 text-white" : p.id === "chatgpt" ? "bg-gradient-to-br from-emerald-600 to-teal-800 text-white" : "bg-gradient-to-br from-slate-800 to-black text-white"}`,
												children: p.name.charAt(0)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 flex-wrap",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
																className: "text-sm font-bold text-slate-900",
																children: p.name
															}),
															isActive && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3" }), " ACTIVE ENGINE"]
															}),
															isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200",
																children: "Connected"
															}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200",
																children: "Not connected"
															})
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex flex-wrap items-center gap-2 mt-2",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
																className: "text-[11px] text-slate-500 font-semibold",
																children: "Model"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																type: "text",
																value: models[p.id] ?? p.model,
																onChange: (e) => handleModelChange(p.id, e.target.value),
																className: "w-52 text-[11px] font-mono px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]",
																list: `models-${p.id}`,
																placeholder: p.model
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
																id: `models-${p.id}`,
																children: suggestions.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
																	value: m.id,
																	children: m.label
																}, m.id))
															}),
															accountError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "basis-full text-[10px] leading-snug text-amber-600",
																title: accountError,
																children: accountError.length > 170 ? accountError.slice(0, 167) + "…" : accountError
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[9px] font-mono text-slate-400 max-w-[130px] truncate",
																title: selectedMeta?.released ? `Released ${selectedMeta.released}` : void 0,
																children: selectedMeta?.context ? `${Math.round(selectedMeta.context / 1e3)}k ctx` : "any model id"
															}),
															releaseBadge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: `text-[9px] font-bold px-1.5 py-0.5 rounded border ${releaseBadge === "NEW" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"}`,
																title: selectedMeta?.released ? `Released ${selectedMeta.released}` : void 0,
																children: releaseBadge
															})
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "flex flex-wrap items-center gap-2 mt-2",
														children: p.features.map((feat, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600",
															children: feat
														}, idx))
													})
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 self-end sm:self-center shrink-0",
											children: [
												p.id === "gemini" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${isConnected ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-500"}`,
														children: isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Key Saved" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { className: "w-3.5 h-3.5 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "No Key" })] })
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														onClick: () => handleOpenSignInModal(p),
														className: "text-xs font-bold px-3 py-1.5 rounded-lg border bg-white border-slate-200 text-slate-700 hover:border-[#0f8b8d]/40 hover:text-[#0f8b8d] flex items-center gap-1.5 transition-colors",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isConnected ? "Update Key" : "Add API Key" })]
													})]
												}) : isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-xs font-bold px-3 py-1.5 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center gap-1.5",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Connected" })]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: (e) => handleLogout(p.id, e),
														title: "Disconnect subscription",
														className: "text-xs text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "w-3.5 h-3.5" })
													})]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => handleOpenSignInModal(p),
													className: "text-xs font-bold px-3 py-1.5 rounded-lg border bg-teal-50 border-[#0f8b8d]/30 text-[#00696b] hover:bg-[#0f8b8d]/10 flex items-center gap-1.5 transition-colors",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.id === "chatgpt" ? "Sign in with ChatGPT" : p.id === "claude" ? "Sign in with Claude" : "Sign in with Grok" })]
												}),
												isConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => handleTestConnection(p.id),
													disabled: testState?.status === "busy" && testState.id === p.id,
													title: testState?.id === p.id && testState.status === "fail" ? `Test failed: ${testState.detail ?? "unknown error"}` : "Send \"Reply with exactly: OK\" through this provider",
													className: `text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${testState?.id === p.id && testState.status === "ok" ? "bg-emerald-50 border-emerald-300 text-emerald-800" : testState?.id === p.id && testState.status === "fail" ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-white border-slate-200 text-slate-700 hover:border-[#0f8b8d]/40 hover:text-[#0f8b8d]"}`,
													children: [testState?.id === p.id && testState.status === "busy" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-3.5 h-3.5 animate-spin" }) : testState?.id === p.id && testState.status === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-3.5 h-3.5 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: testState?.id === p.id && testState.status === "ok" ? "OK" : testState?.id === p.id && testState.status === "fail" ? "Failed" : "Test" })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => handleSetActive(p),
													disabled: isActive || !isConnected,
													className: `text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isActive ? "bg-emerald-600 text-white cursor-default" : isConnected ? "bg-[#001432] hover:bg-[#13294b] text-white active:scale-95" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`,
													children: isActive ? "Active" : "Use Engine"
												})
											]
										})]
									})
								}, p.id);
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataBackupPanel, {})
			}),
			selectedProvider && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-slate-100 pb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-8 h-8 rounded-xl bg-[#001432] text-white flex items-center justify-center font-bold text-sm",
									children: selectedProvider.name.charAt(0)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-base font-bold text-slate-900",
									children: selectedProvider.id === "gemini" ? "Gemini API Key" : `Sign in with ${selectedProvider.name}`
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-slate-500",
									children: selectedProvider.id === "claude" ? "Paste-Code Authorization Flow" : selectedProvider.id === "gemini" ? "Key saved locally — never shown again" : "Device Authorization Flow (RFC 8628)"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: handleCloseModal,
								className: "p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
							})]
						}),
						authError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: authError })]
						}),
						authSuccess && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-semibold",
								children: [
									"Successfully Connected to ",
									selectedProvider.name,
									"!"
								]
							})]
						}),
						keySavedMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-emerald-600 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold",
								children: keySavedMsg
							})]
						}),
						selectedProvider.id === "gemini" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 font-bold text-slate-800",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Server-Side Key Handling" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-slate-600 leading-relaxed",
										children: [
											"Create the key in Google AI Studio and paste it here. It is saved by the local server to your user data directory (",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
												className: "font-mono text-[#0f8b8d]",
												children: ".env"
											}),
											", outside the repo) and is never displayed again or sent back to the browser."
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold text-slate-700 block",
										children: "Gemini API Key"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "password",
										value: geminiKeyInput,
										onChange: (e) => setGeminiKeyInput(e.target.value),
										placeholder: "AIza… / your Gemini API key",
										className: "w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 flex items-center justify-end gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleCloseModal,
										className: "px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleSaveGeminiKey,
										disabled: isSavingKey || !geminiKeyInput.trim(),
										className: "px-4 py-2 text-xs font-bold bg-[#001432] hover:bg-[#13294b] disabled:opacity-40 text-white rounded-xl flex items-center gap-1.5 transition-all",
										children: isSavingKey ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-3.5 h-3.5 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Saving…" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Save & Connect" })] })
									})]
								})
							]
						}),
						(selectedProvider.id === "chatgpt" || selectedProvider.id === "grok") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: isLoadingFlow ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-5 h-5 animate-spin text-[#0f8b8d]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Requesting real device code from ",
									selectedProvider.name,
									"..."
								] })]
							}) : deviceCodeData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold text-slate-700 block",
										children: "Step 1: Your One-Time Authorization Code"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-xl font-extrabold tracking-wider text-[#001432]",
											children: deviceCodeData.userCode
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: handleCopyCode,
											className: "px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1.5 text-slate-700 transition-colors shadow-2xs",
											children: copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-emerald-700 font-bold",
												children: "Copied!"
											})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5 text-slate-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Copy Code" })] })
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "text-xs font-bold text-slate-700 block",
											children: ["Step 2: Approve on ", selectedProvider.name]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: deviceCodeData.verificationUri,
											target: "_blank",
											rel: "noopener noreferrer",
											className: "w-full py-2.5 px-4 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
												"Open ",
												selectedProvider.name,
												" Approval Page"
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-3.5 h-3.5" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] text-slate-500 leading-relaxed",
											children: [
												"Sign in to your subscription in the opened tab, paste the code ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "font-mono text-slate-800",
													children: deviceCodeData.userCode
												}),
												", and click Approve."
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "relative flex h-2 w-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0f8b8d] opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-[#0f8b8d]" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-slate-600 font-medium",
											children: "Waiting for authorization on provider..."
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-mono text-slate-400",
										children: "Polling /api/oauth/poll"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 flex items-center justify-end gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleCloseModal,
										className: "px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleCompleteDeviceCode,
										disabled: isVerifying,
										className: "px-4 py-2 text-xs font-bold bg-[#001432] hover:bg-[#13294b] text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs",
										children: isVerifying ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-3.5 h-3.5 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verifying with provider..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "I've Approved on Provider" })] })
									})]
								})
							] }) : null
						}),
						selectedProvider.id === "claude" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: isLoadingFlow ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "py-8 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-5 h-5 animate-spin text-[#0f8b8d]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preparing Claude authorization URL..." })]
							}) : pkceData ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-bold text-slate-700 block",
											children: "Step 1: Authorize on Anthropic Claude"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: pkceData.authUrl,
											target: "_blank",
											rel: "noopener noreferrer",
											className: "w-full py-2.5 px-4 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open Claude Authorization Page" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-3.5 h-3.5" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-slate-500 leading-relaxed",
											children: "Log in with your Claude Pro or Team subscription, approve access, then copy the code shown on the page."
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-bold text-slate-700 block",
											children: "Step 2: Paste the Approval Code"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: claudeInputCode,
											onChange: (e) => setClaudeInputCode(e.target.value),
											placeholder: "Paste the code shown by Claude (format: code#state)",
											className: "w-full text-xs font-mono p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-slate-400",
											children: "The code is verified server-side with S256 PKCE and exchanged for tokens stored locally on this machine."
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 flex items-center justify-end gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleCloseModal,
										className: "px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleCompleteClaudePKCE,
										disabled: isVerifying || !claudeInputCode.trim(),
										className: "px-4 py-2 text-xs font-bold bg-[#001432] hover:bg-[#13294b] disabled:opacity-40 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs",
										children: isVerifying ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-3.5 h-3.5 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verifying code..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Complete Claude Sign-In" })] })
									})]
								})
							] }) : null
						})
					]
				})
			})
		]
	});
};
var SCRATCH_KEY = "pulse.research.scratchpad.v1";
function loadScratch() {
	try {
		const raw = localStorage.getItem(SCRATCH_KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
var ClinicalBrowserView = ({ onNavigate }) => {
	const [query, setQuery] = (0, import_react.useState)(() => {
		try {
			const handoff = sessionStorage.getItem("pulse.research.query");
			if (handoff) {
				sessionStorage.removeItem("pulse.research.query");
				return handoff;
			}
		} catch {}
		return "";
	});
	const [sources, setSources] = (0, import_react.useState)([]);
	const [retrievedAt, setRetrievedAt] = (0, import_react.useState)(null);
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [searchError, setSearchError] = (0, import_react.useState)(null);
	/** the query the visible sources actually came from (the input can be edited afterwards) */
	const [searchedQuery, setSearchedQuery] = (0, import_react.useState)("");
	const [aiSummary, setAiSummary] = (0, import_react.useState)("");
	const [aiBusy, setAiBusy] = (0, import_react.useState)(false);
	const engineLabel = (() => {
		const p = getActiveProvider();
		return p ? `${p} · ${getEffectiveModel(p)}` : "inactive";
	})();
	const [aiError, setAiError] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(null);
	const inputRef = (0, import_react.useRef)(null);
	const [scratch, setScratch] = (0, import_react.useState)(() => loadScratch());
	const [showScratch, setShowScratch] = (0, import_react.useState)(false);
	const [scratchText, setScratchText] = (0, import_react.useState)("");
	const persistScratch = (list) => {
		setScratch(list);
		try {
			localStorage.setItem(SCRATCH_KEY, JSON.stringify(list));
		} catch {}
	};
	const captureSourceToScratch = (s) => {
		persistScratch([{
			id: `sn-${Date.now().toString(36)}`,
			title: s.title,
			url: s.url,
			text: s.text.slice(0, 800),
			addedAt: (/* @__PURE__ */ new Date()).toISOString()
		}, ...scratch]);
		setShowScratch(true);
	};
	const addManualScratchNote = () => {
		const text = scratchText.trim();
		if (!text) return;
		persistScratch([{
			id: `sn-${Date.now().toString(36)}`,
			title: "Manual note",
			text,
			addedAt: (/* @__PURE__ */ new Date()).toISOString()
		}, ...scratch]);
		setScratchText("");
	};
	const deleteScratchNote = (id) => persistScratch(scratch.filter((n) => n.id !== id));
	const copyScratch = () => {
		navigator.clipboard.writeText(scratch.map((n) => `- ${n.title}${n.url ? ` (${n.url})` : ""}\n${n.text}`).join("\n\n"));
		setCopied("scratch");
		setTimeout(() => setCopied(null), 1500);
	};
	const runResearch = async () => {
		const q = query.trim();
		if (!q || searching) return;
		setSearching(true);
		setSearchError(null);
		setSources([]);
		setAiSummary("");
		setAiError(null);
		setRetrievedAt(null);
		try {
			const res = await fetch("/api/web/research", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ query: q })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(data?.error || `Research failed (HTTP ${res.status}).`);
			setSources(Array.isArray(data.sources) ? data.sources : []);
			setRetrievedAt(typeof data.retrievedAt === "string" ? data.retrievedAt : null);
			setSearchedQuery(q);
		} catch (err) {
			setSearchError(err?.message || "Network request failed. Check your connection.");
		} finally {
			setSearching(false);
		}
	};
	const handleKeyDown = (e) => {
		if (e.key === "Enter") runResearch();
	};
	(0, import_react.useEffect)(() => {
		if (query.trim()) runResearch();
	}, []);
	const askAboutResults = async () => {
		if (!sources.length || aiBusy) return;
		const provider = getActiveProvider();
		if (!provider) {
			setAiError(`No AI provider is active. ${NOT_CONNECTED_MESSAGE}`);
			return;
		}
		setAiBusy(true);
		setAiError(null);
		setAiSummary("");
		try {
			const corpus = sources.map((s) => `[${s.n}] ${s.kind === "pubmed" ? "PubMed" : "Web"} — "${s.title}" (${s.url})\n${s.text}`).join("\n\n");
			const text = await aiComplete({
				system: "You are a clinical evidence assistant for a postgraduate medical exam student. Answer using ONLY the numbered sources provided by the user. Cite sources as [n] like PubMed citation markers. If the sources do not cover something, say so explicitly instead of guessing. Structure the answer in markdown: 1-2 sentence bottom line first, then key findings with citations, then any conflicting evidence, then one clinical takeaway for exams.",
				messages: [{
					role: "user",
					content: `Clinical query: ${searchedQuery || query.trim()}\n\nSources retrieved today (retrieved ${retrievedAt ?? ""}):\n\n${corpus}\n\nSummarise the evidence in these sources for the query. Cite at least three distinct sources by number.`
				}],
				provider,
				model: getEffectiveModel(provider)
			});
			setAiSummary(text);
		} catch (err) {
			setAiError(err?.message || "AI request failed.");
		} finally {
			setAiBusy(false);
		}
	};
	const copySource = (s) => {
		navigator.clipboard.writeText(`${s.title} — ${s.url}`);
		setCopied(String(s.n));
		setTimeout(() => setCopied(null), 1500);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "w-3.5 h-3.5" }), "Live Evidence Retrieval"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-bold tracking-tight text-white",
							children: "Clinical Evidence Browser"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-300 text-sm mt-1 max-w-2xl",
							children: "Searches the live web (DuckDuckGo) and PubMed abstracts at query time. Sources are fetched with their URLs — ask the AI to summarise exactly what was found."
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-[#0f8b8d]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-slate-400 shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									ref: inputRef,
									value: query,
									onChange: (e) => setQuery(e.target.value),
									onKeyDown: handleKeyDown,
									disabled: searching,
									placeholder: "e.g. vanA enterococcus teicoplanin susceptibility OR glucagon-like peptide 1 renal outcomes",
									className: "flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
								}),
								query && !searching && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setQuery(""),
									className: "text-slate-400 hover:text-slate-600",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: runResearch,
							disabled: searching || !query.trim(),
							className: "px-4 py-2.5 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0",
							children: [searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4" }), searching ? "Searching…" : "Search Live Sources"]
						})]
					}),
					searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: searchError })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-[11px] text-slate-500",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5 text-emerald-600" }), "Only public pages are fetched; results ranked with trusted medical domains first"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setShowScratch(!showScratch),
								className: `flex items-center gap-1.5 font-semibold px-2 py-1 rounded-lg border ${showScratch ? "bg-amber-50 border-amber-200 text-amber-800" : "hover:bg-slate-100 text-slate-600 border-slate-200"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, { className: "w-3.5 h-3.5" }),
									"Scratchpad (",
									scratch.length,
									")"
								]
							}), retrievedAt && sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-1.5 font-mono",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }),
									sources.length,
									" sources · retrieved ",
									retrievedAt
								]
							})]
						})]
					})
				]
			}),
			showScratch && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-4 border border-amber-200 shadow-sm space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs font-bold text-slate-900 flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, { className: "w-3.5 h-3.5 text-amber-500" }),
								" Research scratchpad",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[10px] font-normal text-slate-500",
									children: [
										"· saved locally (",
										scratch.length,
										" notes)"
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [scratch.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: copyScratch,
								className: "text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1",
								children: [copied === "scratch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" }), " Copy all"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowScratch(false),
								className: "text-slate-400 hover:text-slate-600",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: scratchText,
							onChange: (e) => setScratchText(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") addManualScratchNote();
							},
							placeholder: "Type a note and press Enter, or capture a result below…",
							className: "flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f8b8d]"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: addManualScratchNote,
							disabled: !scratchText.trim(),
							className: "px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), " Add"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2 max-h-56 overflow-y-auto",
						children: [scratch.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-slate-400",
							children: "Empty — capture sources with the note icon, or add a manual note above."
						}), scratch.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "group p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] font-bold text-slate-800 truncate",
									children: n.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: n.url,
										target: "_blank",
										rel: "noopener noreferrer",
										className: "hover:text-[#0f8b8d]",
										children: n.title
									}) : n.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-slate-600 leading-relaxed line-clamp-3 mt-0.5",
									children: n.text
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => deleteScratchNote(n.id),
								className: "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
							})]
						}, n.id))]
					})
				]
			}),
			sources.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-amber-600" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-bold text-slate-900",
								children: "Ask AI about these results"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-slate-500",
								children: [
									"The model answers only from the ",
									sources.length,
									" sources above, citing them by number. Engine: ",
									engineLabel
								]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: askAboutResults,
							disabled: aiBusy || !getActiveProvider(),
							className: "px-4 py-2 rounded-xl bg-[#001432] hover:bg-[#13294b] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shrink-0",
							children: [aiBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-[#8ff3f4]" }), aiBusy ? "Reading sources…" : !getActiveProvider() ? "Connect an AI provider" : "Summarise Evidence"]
						})]
					}),
					aiError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: aiError })]
					}),
					aiSummary && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-5 border border-[#0f8b8d]/30 shadow-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between border-b border-slate-100 pb-2 mb-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs font-bold uppercase tracking-wider text-[#0f8b8d] flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-3.5 h-3.5" }), " Evidence Synthesis (source-anchored)"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => navigator.clipboard.writeText(aiSummary),
								className: "text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" }), " Copy"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans",
							children: aiSummary
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2.5",
						children: sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${s.kind === "pubmed" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`,
												children: [
													s.kind === "pubmed" ? "PUBMED" : "WEB",
													" [",
													s.n,
													"]"
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
												href: s.url,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "text-sm font-bold text-slate-900 hover:text-[#0f8b8d] truncate flex items-center gap-1",
												children: s.title || s.url
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[11px] text-slate-500 font-mono truncate mt-0.5",
											children: s.url
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-700 mt-2 leading-relaxed line-clamp-4",
											children: s.text
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1 shrink-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => captureSourceToScratch(s),
											title: "Capture to scratchpad",
											className: "p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StickyNote, { className: "w-4 h-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => copySource(s),
											title: "Copy citation",
											className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700",
											children: copied === String(s.n) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-4 h-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: s.url,
											target: "_blank",
											rel: "noopener noreferrer",
											title: "Open source",
											className: "p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#0f8b8d]",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-4 h-4" })
										})
									]
								})]
							})
						}, s.n))
					})
				]
			}),
			!sources.length && !searching && !searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "w-6 h-6 text-slate-400" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-bold text-slate-800",
						children: "No sources loaded yet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500 max-w-md mx-auto leading-relaxed",
						children: "Type a clinical query and press Enter. Results come from a real DuckDuckGo search plus PubMed (NCBI E-utilities) at the moment you search — nothing is preloaded."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-center gap-2 pt-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setQuery("latest guidelines management of community acquired pneumonia 2024");
								inputRef.current?.focus();
							},
							className: "px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700",
							children: "Try: CAP guidelines 2024"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								setQuery("vancomycin resistant enterococcus-linezolid daptomycin bacteremia");
								inputRef.current?.focus();
							},
							className: "px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700",
							children: "Try: VRE bacteremia"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-[11px] text-slate-400 px-1 pb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "PubMed abstracts via NCBI E-utilities; web pages fetched for full text. Educational use — verify before clinical decisions." })]
			})
		]
	});
};
var QUESTION_TYPE_CHIPS = [
	"Clinical vignette",
	"One-liner recall",
	"Match the following",
	"Multiple statements (\"1 and 3 only\")",
	"ECG / X-ray interpretation",
	"Identify the structure"
];
var STEM_PATTERN_CHIPS = [
	"Most likely diagnosis",
	"Next best step",
	"Drug of choice",
	"Investigation of choice",
	"Treatment of choice",
	"Most appropriate advice"
];
var EVIDENCE_SOURCE_CHIPS = [
	"Australian eTG",
	"RACGP Red Book",
	"National Immunisation Program (NIP)",
	"Good Medical Practice (Ahpra/Medical Board)"
];
var PATIENT_GROUP_CHIPS = [
	"Women's health",
	"Men's health",
	"Children & adolescents",
	"Older adults",
	"Aboriginal & Torres Strait Islander health",
	"Culturally & linguistically diverse patients",
	"Mental health presentations"
];
var PRESENTING_PROBLEM_CHIPS = [
	"Chest pain",
	"Dyspnoea",
	"Fever",
	"Abdominal pain",
	"Headache",
	"Dizziness/vertigo",
	"Cough",
	"Fatigue",
	"Back pain",
	"Joint pain",
	"Palpitations",
	"Weight loss",
	"Anaemia",
	"Jaundice",
	"Confusion",
	"Syncope",
	"Dysuria",
	"Rash",
	"Sleep problems",
	"Low mood"
];
var PracticeModuleBuilderView = ({ currentExam, onLaunchModule, onNavigate }) => {
	const [selectedExam, setSelectedExam] = (0, import_react.useState)(currentExam);
	const [iniSyllabusMode, setIniSyllabusMode] = (0, import_react.useState)("19_SUBJECTS");
	const [questionCount, setQuestionCount] = (0, import_react.useState)(25);
	const [mode, setMode] = (0, import_react.useState)("TUTOR");
	const [difficultyTier, setDifficultyTier] = (0, import_react.useState)("ALL");
	const [difficultySubLevel, setDifficultySubLevel] = (0, import_react.useState)(void 0);
	const [selectedNeetSubjects, setSelectedNeetSubjects] = (0, import_react.useState)([
		"Pathology",
		"Pharmacology",
		"General Medicine",
		"Obstetrics & Gynaecology"
	]);
	const [selectedIniSubjects, setSelectedIniSubjects] = (0, import_react.useState)([
		"Pathology",
		"Pharmacology",
		"General Medicine"
	]);
	const [selectedIniDomains, setSelectedIniDomains] = (0, import_react.useState)([
		"AIIMS_BASIC",
		"AIIMS_MED",
		"AIIMS_SURG"
	]);
	const [selectedAmcDomains, setSelectedAmcDomains] = (0, import_react.useState)([
		"AMC_MED",
		"AMC_SURG",
		"AMC_CHILD"
	]);
	const [selectedSubtopics, setSelectedSubtopics] = (0, import_react.useState)(() => {
		const initial = {};
		Object.keys(SUBTOPICS).forEach((key) => {
			initial[key] = [...SUBTOPICS[key]];
		});
		return initial;
	});
	const [expandedSubjects, setExpandedSubjects] = (0, import_react.useState)({});
	const [genState, setGenState] = (0, import_react.useState)({
		busy: false,
		generated: 0,
		total: 0,
		batch: 0,
		totalBatches: 0,
		dropped: 0,
		error: null
	});
	const stopEarlyRef = (0, import_react.useRef)(false);
	const [questionTypes, setQuestionTypes] = (0, import_react.useState)([]);
	const [stemPatterns, setStemPatterns] = (0, import_react.useState)([]);
	const [evidenceSources, setEvidenceSources] = (0, import_react.useState)([]);
	const [patientGroup, setPatientGroup] = (0, import_react.useState)("");
	const [presentingProblems, setPresentingProblems] = (0, import_react.useState)([]);
	const [sourceMode, setSourceMode] = (0, import_react.useState)("AI");
	const toggleFromList = (list, setList, value) => {
		setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
	};
	const chip = (selected) => `px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${selected ? "bg-[#0f8b8d]/10 border-[#0f8b8d]/40 text-[#00696b]" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"}`;
	const toggleSubjectExpanded = (key, e) => {
		if (e) e.stopPropagation();
		setExpandedSubjects((prev) => ({
			...prev,
			[key]: !prev[key]
		}));
	};
	const toggleSubtopic = (subjectKey, subtopic) => {
		setSelectedSubtopics((prev) => {
			const current = prev[subjectKey] ?? SUBTOPICS[subjectKey] ?? [];
			const updated = current.includes(subtopic) ? current.filter((s) => s !== subtopic) : [...current, subtopic];
			return {
				...prev,
				[subjectKey]: updated
			};
		});
	};
	const selectAllSubtopics = (subjectKey, e) => {
		if (e) e.stopPropagation();
		const all = SUBTOPICS[subjectKey] || [];
		setSelectedSubtopics((prev) => ({
			...prev,
			[subjectKey]: [...all]
		}));
	};
	const clearAllSubtopics = (subjectKey, e) => {
		if (e) e.stopPropagation();
		setSelectedSubtopics((prev) => ({
			...prev,
			[subjectKey]: []
		}));
	};
	const toggleNeetSubject = (name) => {
		setSelectedNeetSubjects((prev) => {
			if (prev.includes(name)) return prev.length > 1 ? prev.filter((s) => s !== name) : prev;
			else {
				if (!selectedSubtopics[name] && SUBTOPICS[name]) setSelectedSubtopics((s) => ({
					...s,
					[name]: [...SUBTOPICS[name]]
				}));
				return [...prev, name];
			}
		});
	};
	const toggleIniSubject = (name) => {
		setSelectedIniSubjects((prev) => {
			if (prev.includes(name)) return prev.length > 1 ? prev.filter((s) => s !== name) : prev;
			else {
				if (!selectedSubtopics[name] && SUBTOPICS[name]) setSelectedSubtopics((s) => ({
					...s,
					[name]: [...SUBTOPICS[name]]
				}));
				return [...prev, name];
			}
		});
	};
	const toggleIniDomain = (id) => {
		setSelectedIniDomains((prev) => {
			if (prev.includes(id)) return prev.length > 1 ? prev.filter((d) => d !== id) : prev;
			else {
				if (!selectedSubtopics[id] && SUBTOPICS[id]) setSelectedSubtopics((s) => ({
					...s,
					[id]: [...SUBTOPICS[id]]
				}));
				return [...prev, id];
			}
		});
	};
	const toggleAmcDomain = (id) => {
		setSelectedAmcDomains((prev) => {
			if (prev.includes(id)) return prev.length > 1 ? prev.filter((d) => d !== id) : prev;
			else {
				if (!selectedSubtopics[id] && SUBTOPICS[id]) setSelectedSubtopics((s) => ({
					...s,
					[id]: [...SUBTOPICS[id]]
				}));
				return [...prev, id];
			}
		});
	};
	const examDetails = {
		NEET_PG: {
			name: "NEET-PG Pattern",
			scoring: "+4 / -1 Marking Rule",
			desc: "National Board of Examinations (NBE) blueprint across 19 NMC subjects with clinical vignettes."
		},
		INI_CET: {
			name: "INI-CET AIIMS Pattern",
			scoring: "+1 / -0.33 Marking Rule",
			desc: "AIIMS clinical matrix matching, assertion-reasoning, and multiple statement completion."
		},
		AMC_CAT: {
			name: "AMC CAT Examination",
			scoring: "Computer Adaptive Scoring (0-500 scale, 250 pass mark)",
			desc: "Australian Medical Council 6 core domains with dynamic item difficulty calibration."
		}
	};
	const resolveSubjects = () => {
		if (selectedExam === "NEET_PG") return selectedNeetSubjects;
		if (selectedExam === "INI_CET") return iniSyllabusMode === "19_SUBJECTS" ? selectedIniSubjects : selectedIniDomains;
		return selectedAmcDomains;
	};
	const handleLaunch = async () => {
		if (genState.busy) return;
		const subjects = resolveSubjects();
		const chosenSubtopics = [];
		subjects.forEach((subj) => {
			const list = selectedSubtopics[subj] ?? SUBTOPICS[subj] ?? [];
			chosenSubtopics.push(...list);
		});
		if (!getActiveProvider()) {
			setGenState({
				busy: false,
				generated: 0,
				total: 0,
				batch: 0,
				totalBatches: 0,
				dropped: 0,
				error: `No AI provider is active. ${NOT_CONNECTED_MESSAGE}`
			});
			return;
		}
		let sourceMaterial;
		if (sourceMode === "MY_NOTES") {
			const highlights = listUserHighlights();
			if (!highlights.length) {
				setGenState({
					busy: false,
					generated: 0,
					total: 0,
					batch: 0,
					totalBatches: 0,
					dropped: 0,
					error: "No saved notes yet. Save a highlight or an AI note first, or switch the source to AI-generated questions."
				});
				return;
			}
			sourceMaterial = highlights.slice(0, 60).map((h, i) => `[${i + 1}] ${h.subject} — ${h.subtopic}\n${h.quote}${h.memoryAnchor || h.note ? `\nKey point: ${h.memoryAnchor || h.note}` : ""}`).join("\n\n").slice(0, 12e3);
		}
		setGenState({
			busy: true,
			generated: 0,
			total: questionCount,
			batch: 0,
			totalBatches: Math.ceil(questionCount / 10),
			dropped: 0,
			error: null
		});
		stopEarlyRef.current = false;
		try {
			const { questions, dropped } = await generateExamQuestions({
				exam: selectedExam,
				count: questionCount,
				subjectSubtopics: subjects.map((s) => ({
					subject: s,
					subtopics: selectedSubtopics[s] ?? SUBTOPICS[s] ?? []
				})),
				difficultyTier,
				difficultySubLevel,
				onProgress: (generated, total, batch, totalBatches) => setGenState((st) => ({
					...st,
					generated,
					batch,
					totalBatches
				})),
				shouldStop: () => stopEarlyRef.current,
				questionTypes,
				stemPatterns,
				evidenceSources: selectedExam === "AMC_CAT" ? evidenceSources : void 0,
				patientGroup: selectedExam === "AMC_CAT" && patientGroup ? patientGroup : void 0,
				presentingProblems: selectedExam === "AMC_CAT" ? presentingProblems : void 0,
				sourceMaterial
			});
			if (questions.length === 0) {
				const stopped = stopEarlyRef.current;
				setGenState({
					busy: false,
					generated: 0,
					total: questionCount,
					batch: 0,
					totalBatches: 0,
					dropped,
					error: stopped ? "Generation stopped before the first batch returned a valid question. Try again or reduce the count." : `The AI provider returned 0 valid questions (${dropped} dropped by validation). Try again, reduce the count, or change the active provider in Settings.`
				});
				return;
			}
			setGenState({
				busy: false,
				generated: questions.length,
				total: questionCount,
				batch: Math.ceil(questions.length / 10),
				totalBatches: Math.ceil(questionCount / 10),
				dropped,
				error: null
			});
			onLaunchModule(selectedExam, questions.length, mode, subjects, difficultyTier, difficultySubLevel, chosenSubtopics, questions);
		} catch (err) {
			const message = err instanceof AiError ? err.message : err?.message || "AI question generation failed.";
			setGenState({
				busy: false,
				generated: 0,
				total: questionCount,
				batch: 0,
				totalBatches: 0,
				dropped: 0,
				error: message
			});
		}
	};
	const totalChosenSubtopicsCount = (() => {
		let activeKeys = [];
		if (selectedExam === "NEET_PG") activeKeys = selectedNeetSubjects;
		else if (selectedExam === "INI_CET") activeKeys = iniSyllabusMode === "19_SUBJECTS" ? selectedIniSubjects : selectedIniDomains;
		else activeKeys = selectedAmcDomains;
		return activeKeys.reduce((sum, key) => {
			return sum + (selectedSubtopics[key] ?? SUBTOPICS[key] ?? []).length;
		}, 0);
	})();
	const progressStats = (0, import_react.useMemo)(() => {
		const summary = summarizeAttempts();
		const today = attemptsToday();
		const last = listAttempts()[0] ?? null;
		return {
			summary,
			todayCount: today.length,
			last
		};
	}, []);
	const subjectNames = (0, import_react.useMemo)(() => NEET_PG_SUBJECTS.map((s) => s.name), []);
	const canDrillBySubject = selectedExam === "NEET_PG" || selectedExam === "INI_CET" && iniSyllabusMode === "19_SUBJECTS";
	const weakForDrill = (0, import_react.useMemo)(() => progressStats.summary.weakSubjects.filter((w) => subjectNames.includes(w.subject)), [progressStats.summary.weakSubjects, subjectNames]);
	const applyWeakDrill = () => {
		const targets = weakForDrill.map((w) => w.subject);
		if (!targets.length) return;
		if (selectedExam === "NEET_PG") setSelectedNeetSubjects(targets);
		else setSelectedIniSubjects(targets);
		setSelectedSubtopics((prev) => {
			const next = { ...prev };
			for (const subject of targets) next[subject] = [...SUBTOPICS[subject] ?? []];
			return next;
		});
		setGenState((st) => ({
			...st,
			error: null
		}));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersVertical, { className: "w-3.5 h-3.5" }), "Dynamic Test Engine & Blueprint Calibrator"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-bold tracking-tight text-white",
							children: "Adaptive Practice Module Generator & Exam Builder"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-300 text-sm mt-1 max-w-2xl",
							children: "Configure question sets calibrated to target board marking rules, authentic syllabi (NEET-PG, INI-CET, AMC CAT), and granular difficulty tiers."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "w-4 h-4 text-amber-400" }), " Blueprint Calibrated"]
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-xl border border-slate-200 shadow-sm p-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase tracking-wider text-slate-500",
								children: "Modules today"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-bold text-slate-900 mt-0.5",
								children: progressStats.todayCount
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] text-slate-400",
								children: [progressStats.summary.modules, " submitted in total"]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-xl border border-slate-200 shadow-sm p-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase tracking-wider text-slate-500",
								children: "Overall accuracy"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-mono font-bold text-[#0f8b8d] mt-0.5",
								children: progressStats.summary.accuracyPercent === null ? "—" : `${progressStats.summary.accuracyPercent}%`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-slate-400",
								children: progressStats.summary.questionsAnswered > 0 ? `${progressStats.summary.correct} correct of ${progressStats.summary.questionsAnswered} answered` : "No questions answered yet"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-xl border border-slate-200 shadow-sm p-3.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-bold uppercase tracking-wider text-slate-500",
								children: "Last module"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-bold text-slate-900 mt-1 truncate",
								children: progressStats.last ? `${progressStats.last.correct}/${progressStats.last.attempted} correct · ${progressStats.last.exam.replace("_", "-")}` : "No module submitted yet"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-slate-400",
								children: progressStats.last ? `${progressStats.last.mode === "EXAM" ? "Strict exam" : "Tutor"} mode · ${new Date(progressStats.last.at).toLocaleString()}` : "Finish a module to see your summary here"
							})
						]
					})
				]
			}),
			progressStats.summary.modules > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-sm font-bold text-slate-900 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "w-4 h-4 text-rose-500" }), " Targeted drill — weakest real topics"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-[10px] text-slate-500",
						children: [
							"Built only from your submitted modules (",
							progressStats.summary.questionsAnswered,
							" answers)"
						]
					})]
				}), weakForDrill.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-slate-500 leading-relaxed",
					children: canDrillBySubject ? "Not enough answers per subject yet (at least 3 per subject) to rank weak topics. Submit another module." : "Weak-topic ranking uses NEET-PG / INI-CET subject names. Switch the target exam (or INI syllabus mode) to drill by subject."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1.5",
					children: weakForDrill.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "px-2.5 py-1 rounded-full text-[10px] font-semibold border bg-rose-50 border-rose-200 text-rose-800",
						title: `${w.correct} correct of ${w.total} answered`,
						children: [
							w.subject,
							" · ",
							w.accuracy,
							"% (",
							w.correct,
							"/",
							w.total,
							")"
						]
					}, w.subject))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: applyWeakDrill,
					className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001432] hover:bg-[#13294b] text-white text-[11px] font-bold",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }),
						"Select these ",
						weakForDrill.length,
						" subject",
						weakForDrill.length === 1 ? "" : "s",
						" + all their subtopics"
					]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-sm font-bold text-slate-900 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-4 h-4 text-[#0f8b8d]" }), " Question source"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] text-slate-500",
							children: sourceMode === "MY_NOTES" ? `${listUserHighlights().length} saved note${listUserHighlights().length === 1 ? "" : "s"} will ground the questions` : "Fresh questions written by your active AI provider"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSourceMode("AI"),
								className: chip(sourceMode === "AI"),
								children: "New AI questions"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSourceMode("MY_NOTES"),
								className: chip(sourceMode === "MY_NOTES"),
								children: "My notes → MCQs"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-px h-5 bg-slate-200 mx-1" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("mistakes"),
								className: chip(false),
								title: "Open the Mistake Notebook and its real SRS sprint",
								children: "My mistakes ↗"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("question-bank"),
								className: chip(false),
								title: "Open the Question Bank (load your own bank files there)",
								children: "Recall bank ↗"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("question-bank"),
								className: chip(false),
								title: "Open the Question Bank (load your own bank files there)",
								children: "eMedici ↗"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("question-bank"),
								className: chip(false),
								title: "Open the Question Bank (load your own bank files there)",
								children: "AMC SUCCESS ↗"
							})
						]
					}),
					sourceMode === "MY_NOTES" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] text-slate-500 leading-relaxed",
						children: "Questions are written only from the highlights and AI notes you have saved. Nothing else is invented; the note's citation is carried into the generated question."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-8 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-base font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "w-4 h-4 text-[#0f8b8d]" }), " 1. Target Board Blueprint"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-semibold text-slate-500",
									children: "Selects marking rules & exam styling"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
								children: [
									"NEET_PG",
									"INI_CET",
									"AMC_CAT"
								].map((examKey) => {
									const isSelected = selectedExam === examKey;
									const info = examDetails[examKey];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => setSelectedExam(examKey),
										className: `p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-[#0f8b8d] bg-teal-50/20 ring-2 ring-[#0f8b8d]/20 shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between mb-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs font-bold text-slate-900",
													children: info.name
												}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#0f8b8d]" })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-[10px] font-mono font-bold text-[#0f8b8d] mb-1",
												children: info.scoring
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[11px] text-slate-500 leading-relaxed",
												children: info.desc
											})
										]
									}, examKey);
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "text-base font-bold text-slate-900 flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-4 h-4 text-[#0f8b8d]" }), " 2. Granular Question Difficulty & Sub-Tiers"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-500 mt-0.5",
										children: "Select baseline complexity or target specific cognitive challenges"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700",
										children: [
											"Tier: ",
											difficultyTier,
											" ",
											difficultySubLevel ? `(${difficultySubLevel})` : ""
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
									children: [
										{
											id: "ALL",
											label: "All Levels (Adaptive Mix)",
											desc: "Dynamic mix from basic to ranker"
										},
										{
											id: "LOW",
											label: "Low Difficulty",
											desc: "Direct recall & buzzword cues"
										},
										{
											id: "MEDIUM",
											label: "Medium Difficulty",
											desc: "2-step reasoning & mimickers"
										},
										{
											id: "HIGH",
											label: "High Difficulty",
											desc: "Multi-step traps & complex cases"
										}
									].map((tier) => {
										const isSelected = difficultyTier === tier.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => {
												setDifficultyTier(tier.id);
												setDifficultySubLevel(void 0);
											},
											className: `p-3 rounded-xl border text-left transition-all ${isSelected ? "bg-[#001432] text-white border-[#001432] shadow-sm ring-1 ring-[#001432]" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs font-bold",
												children: tier.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `text-[10px] mt-1 leading-snug ${isSelected ? "text-slate-300" : "text-slate-500"}`,
												children: tier.desc
											})]
										}, tier.id);
									})
								}),
								difficultyTier !== "ALL" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] font-bold text-slate-700 uppercase tracking-wider block",
										children: [
											"Fine-Tune ",
											difficultyTier,
											" Sub-Level (Optional):"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap gap-2",
										children: [
											difficultyTier === "LOW" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "L1" ? void 0 : "L1"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "L1" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level L1: 1-Step Direct Fact Retrieval (Enzymes, normal ranges)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "L2" ? void 0 : "L2"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "L2" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level L2: Characteristic Sign & Buzzwords (Pathognomonic cues)"
											})] }),
											difficultyTier === "MEDIUM" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "M1" ? void 0 : "M1"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "M1" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level M1: Clinical 2-Step Reasoning (Vignette + Labs $\\rightarrow$ Diagnosis)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "M2" ? void 0 : "M2"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "M2" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level M2: Plausible Distractor Discrimination (Eliminate paired traps)"
											})] }),
											difficultyTier === "HIGH" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "H1" ? void 0 : "H1"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "H1" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level H1: Multi-Step Management & Complications (Condition $\\rightarrow$ Failure $\\rightarrow$ Emergency)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setDifficultySubLevel(difficultySubLevel === "H2" ? void 0 : "H2"),
												className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficultySubLevel === "H2" ? "bg-[#0f8b8d] text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
												children: "Sub-level H2: High-Yield Board Traps & Atypical IBQs (Subtle normal lab distractors)"
											})] })
										]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "text-base font-bold text-slate-900 flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-4 h-4 text-[#0f8b8d]" }), " 3. Official Syllabus & Subject Coverage"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-slate-500 mt-0.5",
										children: [
											selectedExam === "NEET_PG" && "19 Standard NMC/NBE Medical Disciplines",
											selectedExam === "INI_CET" && "AIIMS Integrated Clinical Disciplines",
											selectedExam === "AMC_CAT" && "Australian Medical Council 6 Core Patient Domains"
										]
									})] }), selectedExam === "INI_CET" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setIniSyllabusMode("19_SUBJECTS"),
											className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${iniSyllabusMode === "19_SUBJECTS" ? "bg-[#001432] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
											children: "19 NMC Subjects View"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setIniSyllabusMode("6_INTEGRATED_DOMAINS"),
											className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${iniSyllabusMode === "6_INTEGRATED_DOMAINS" ? "bg-[#001432] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`,
											children: "6 AIIMS Organ Domains View"
										})]
									})]
								}),
								selectedExam === "NEET_PG" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs text-slate-500 font-medium",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [selectedNeetSubjects.length, " of 19 Subjects Selected"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] text-slate-400",
											children: "Expand subtopics under any selected subject"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start",
										children: NEET_PG_SUBJECTS.map((subj) => {
											const isSelected = selectedNeetSubjects.includes(subj.name);
											const subtopicsTotal = SUBTOPICS[subj.name] || [];
											const subtopicsSelected = selectedSubtopics[subj.name] ?? subtopicsTotal;
											const isExpanded = !!expandedSubjects[subj.name];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `rounded-xl border transition-all ${isSelected ? "border-[#001432] bg-white shadow-xs" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													onClick: () => toggleNeetSubject(subj.name),
													className: `p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${isSelected ? "bg-[#001432] text-white" : "text-slate-700"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 min-w-0 pr-1",
														children: [isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#8ff3f4] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "truncate",
															children: subj.name
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-[9px] font-mono px-1 rounded shrink-0 ${isSelected ? "bg-slate-700 text-[#8ff3f4]" : "bg-slate-200 text-slate-600"}`,
														children: subj.weightage
													})]
												}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-2.5 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between text-[11px]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															type: "button",
															onClick: (e) => toggleSubjectExpanded(subj.name, e),
															className: "flex items-center gap-1 font-semibold text-slate-700 hover:text-[#0f8b8d] transition-colors",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"Subtopics (",
																subtopicsSelected.length,
																"/",
																subtopicsTotal.length,
																")"
															] }), isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3.5 h-3.5 text-slate-500" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3.5 h-3.5 text-slate-500" })]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1 text-[10px] font-bold",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => selectAllSubtopics(subj.name, e),
																	className: "text-[#0f8b8d] hover:underline px-1 py-0.5 rounded hover:bg-teal-50",
																	children: "Select All"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-slate-300",
																	children: "·"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => clearAllSubtopics(subj.name, e),
																	className: "text-slate-500 hover:text-rose-600 px-1 py-0.5 rounded hover:bg-rose-50",
																	children: "Clear"
																})
															]
														})]
													}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "max-h-52 overflow-y-auto pr-1 space-y-1 pt-1.5 border-t border-slate-200",
														children: subtopicsTotal.map((subtopic) => {
															const isChecked = subtopicsSelected.includes(subtopic);
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
																onClick: (e) => e.stopPropagation(),
																className: `flex items-start gap-2 p-1.5 rounded-lg text-[11px] leading-snug cursor-pointer transition-colors ${isChecked ? "bg-teal-50/80 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-100"}`,
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: isChecked,
																	onChange: () => toggleSubtopic(subj.name, subtopic),
																	className: "mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] focus:ring-[#0f8b8d] accent-[#0f8b8d]"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "select-none",
																	children: subtopic
																})]
															}, subtopic);
														})
													})]
												})]
											}, subj.id);
										})
									})]
								}),
								selectedExam === "INI_CET" && iniSyllabusMode === "19_SUBJECTS" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs text-slate-500 font-medium",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [selectedIniSubjects.length, " of 19 Subjects Selected"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] text-slate-400",
											children: "Expand subtopics under any selected subject"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start",
										children: NEET_PG_SUBJECTS.map((subj) => {
											const isSelected = selectedIniSubjects.includes(subj.name);
											const subtopicsTotal = SUBTOPICS[subj.name] || [];
											const subtopicsSelected = selectedSubtopics[subj.name] ?? subtopicsTotal;
											const isExpanded = !!expandedSubjects[subj.name];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `rounded-xl border transition-all ${isSelected ? "border-[#001432] bg-white shadow-xs" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													onClick: () => toggleIniSubject(subj.name),
													className: `p-2.5 rounded-xl cursor-pointer flex items-center justify-between text-xs font-semibold select-none ${isSelected ? "bg-[#001432] text-white" : "text-slate-700"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 min-w-0 pr-1",
														children: [isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3.5 h-3.5 text-[#8ff3f4] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "truncate",
															children: subj.name
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1 shrink-0",
														children: [subj.highYield && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[9px] font-bold text-amber-500",
															children: "★ AIIMS"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: `text-[9px] font-mono px-1 rounded ${isSelected ? "bg-slate-700 text-[#8ff3f4]" : "bg-slate-200 text-slate-600"}`,
															children: subj.weightage
														})]
													})]
												}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-2.5 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between text-[11px]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															type: "button",
															onClick: (e) => toggleSubjectExpanded(subj.name, e),
															className: "flex items-center gap-1 font-semibold text-slate-700 hover:text-[#0f8b8d] transition-colors",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"Subtopics (",
																subtopicsSelected.length,
																"/",
																subtopicsTotal.length,
																")"
															] }), isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3.5 h-3.5 text-slate-500" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3.5 h-3.5 text-slate-500" })]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1 text-[10px] font-bold",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => selectAllSubtopics(subj.name, e),
																	className: "text-[#0f8b8d] hover:underline px-1 py-0.5 rounded hover:bg-teal-50",
																	children: "Select All"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-slate-300",
																	children: "·"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => clearAllSubtopics(subj.name, e),
																	className: "text-slate-500 hover:text-rose-600 px-1 py-0.5 rounded hover:bg-rose-50",
																	children: "Clear"
																})
															]
														})]
													}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "max-h-52 overflow-y-auto pr-1 space-y-1 pt-1.5 border-t border-slate-200",
														children: subtopicsTotal.map((subtopic) => {
															const isChecked = subtopicsSelected.includes(subtopic);
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
																onClick: (e) => e.stopPropagation(),
																className: `flex items-start gap-2 p-1.5 rounded-lg text-[11px] leading-snug cursor-pointer transition-colors ${isChecked ? "bg-teal-50/80 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-100"}`,
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: isChecked,
																	onChange: () => toggleSubtopic(subj.name, subtopic),
																	className: "mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] focus:ring-[#0f8b8d] accent-[#0f8b8d]"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "select-none",
																	children: subtopic
																})]
															}, subtopic);
														})
													})]
												})]
											}, subj.id);
										})
									})]
								}),
								selectedExam === "INI_CET" && iniSyllabusMode === "6_INTEGRATED_DOMAINS" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start",
										children: INI_CET_DOMAINS_6.map((domain) => {
											const isSelected = selectedIniDomains.includes(domain.id);
											const subtopicsTotal = SUBTOPICS[domain.name] || SUBTOPICS[domain.id] || [];
											const subtopicsSelected = selectedSubtopics[domain.id] ?? selectedSubtopics[domain.name] ?? subtopicsTotal;
											const isExpanded = !!expandedSubjects[domain.id];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `rounded-xl border transition-all ${isSelected ? "border-[#0f8b8d] bg-white ring-1 ring-[#0f8b8d] shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													onClick: () => toggleIniDomain(domain.id),
													className: "p-3.5 cursor-pointer",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between mb-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs font-bold text-slate-900",
															children: domain.name
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[10px] font-mono font-bold text-[#0f8b8d] bg-teal-50 px-1.5 py-0.5 rounded",
															children: domain.weightage
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-[11px] text-slate-500 leading-relaxed",
														children: domain.desc
													})]
												}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-3 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between text-[11px]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															type: "button",
															onClick: (e) => toggleSubjectExpanded(domain.id, e),
															className: "flex items-center gap-1 font-semibold text-slate-700 hover:text-[#0f8b8d] transition-colors",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"Subtopics (",
																subtopicsSelected.length,
																"/",
																subtopicsTotal.length,
																")"
															] }), isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3.5 h-3.5 text-slate-500" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3.5 h-3.5 text-slate-500" })]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1.5 text-[10px] font-bold",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => selectAllSubtopics(domain.id, e),
																	className: "text-[#0f8b8d] hover:underline px-1 py-0.5 rounded hover:bg-teal-50",
																	children: "Select All"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-slate-300",
																	children: "·"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => clearAllSubtopics(domain.id, e),
																	className: "text-slate-500 hover:text-rose-600 px-1 py-0.5 rounded hover:bg-rose-50",
																	children: "Clear"
																})
															]
														})]
													}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "max-h-52 overflow-y-auto pr-1 space-y-1 pt-1.5 border-t border-slate-200",
														children: subtopicsTotal.map((subtopic) => {
															const isChecked = subtopicsSelected.includes(subtopic);
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
																onClick: (e) => e.stopPropagation(),
																className: `flex items-start gap-2 p-1.5 rounded-lg text-[11px] leading-snug cursor-pointer transition-colors ${isChecked ? "bg-teal-50/80 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-100"}`,
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: isChecked,
																	onChange: () => toggleSubtopic(domain.id, subtopic),
																	className: "mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] focus:ring-[#0f8b8d] accent-[#0f8b8d]"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "select-none",
																	children: subtopic
																})]
															}, subtopic);
														})
													})]
												})]
											}, domain.id);
										})
									})
								}),
								selectedExam === "AMC_CAT" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-3 items-start",
										children: AMC_CAT_DOMAINS_6.map((domain) => {
											const isSelected = selectedAmcDomains.includes(domain.id);
											const subtopicsTotal = SUBTOPICS[domain.name] || SUBTOPICS[domain.id] || [];
											const subtopicsSelected = selectedSubtopics[domain.id] ?? selectedSubtopics[domain.name] ?? subtopicsTotal;
											const isExpanded = !!expandedSubjects[domain.id];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `rounded-xl border transition-all ${isSelected ? "border-[#0f8b8d] bg-white ring-1 ring-[#0f8b8d] shadow-xs" : "border-slate-200 hover:border-slate-300 bg-white"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													onClick: () => toggleAmcDomain(domain.id),
													className: "p-3.5 cursor-pointer",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between mb-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs font-bold text-slate-900",
															children: domain.name
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-[10px] font-mono font-bold text-[#0f8b8d] bg-teal-50 px-1.5 py-0.5 rounded",
															children: [
																domain.officialWeight,
																" (",
																domain.questionRatio,
																")"
															]
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "text-[11px] text-slate-500 leading-relaxed",
														children: domain.desc
													})]
												}), isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "p-3 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center justify-between text-[11px]",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															type: "button",
															onClick: (e) => toggleSubjectExpanded(domain.id, e),
															className: "flex items-center gap-1 font-semibold text-slate-700 hover:text-[#0f8b8d] transition-colors",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"Subtopics (",
																subtopicsSelected.length,
																"/",
																subtopicsTotal.length,
																")"
															] }), isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "w-3.5 h-3.5 text-slate-500" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-3.5 h-3.5 text-slate-500" })]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1.5 text-[10px] font-bold",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => selectAllSubtopics(domain.id, e),
																	className: "text-[#0f8b8d] hover:underline px-1 py-0.5 rounded hover:bg-teal-50",
																	children: "Select All"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-slate-300",
																	children: "·"
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	type: "button",
																	onClick: (e) => clearAllSubtopics(domain.id, e),
																	className: "text-slate-500 hover:text-rose-600 px-1 py-0.5 rounded hover:bg-rose-50",
																	children: "Clear"
																})
															]
														})]
													}), isExpanded && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "max-h-52 overflow-y-auto pr-1 space-y-1 pt-1.5 border-t border-slate-200",
														children: subtopicsTotal.map((subtopic) => {
															const isChecked = subtopicsSelected.includes(subtopic);
															return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
																onClick: (e) => e.stopPropagation(),
																className: `flex items-start gap-2 p-1.5 rounded-lg text-[11px] leading-snug cursor-pointer transition-colors ${isChecked ? "bg-teal-50/80 text-slate-900 font-medium" : "text-slate-600 hover:bg-slate-100"}`,
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
																	type: "checkbox",
																	checked: isChecked,
																	onChange: () => toggleSubtopic(domain.id, subtopic),
																	className: "mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] focus:ring-[#0f8b8d] accent-[#0f8b8d]"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "select-none",
																	children: subtopic
																})]
															}, subtopic);
														})
													})]
												})]
											}, domain.id);
										})
									})
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-4 space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-sm font-bold text-slate-900 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-4 h-4 text-[#0f8b8d]" }), " Execution & Feedback Mode"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setMode("TUTOR"),
									className: `p-3 rounded-xl border text-center transition-all ${mode === "TUTOR" ? "border-[#0f8b8d] bg-[#0f8b8d]/10 text-[#0f8b8d] font-bold ring-1 ring-[#0f8b8d]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs",
										children: "Tutor Mode"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-slate-500 font-normal mt-0.5",
										children: "Instant explanations & pearls"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setMode("EXAM"),
									className: `p-3 rounded-xl border text-center transition-all ${mode === "EXAM" ? "border-[#001432] bg-[#001432] text-white font-bold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs",
										children: "Strict Exam Mode"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-slate-300 font-normal mt-0.5",
										children: "Countdown & negative scoring"
									})]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-bold text-slate-900",
										children: "Question Volume"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs font-mono font-bold text-[#0f8b8d]",
										children: [questionCount, " MCQs"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-4 gap-2",
									children: [[
										10,
										25,
										50,
										100
									].map((count) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setQuestionCount(count),
										className: `py-2 rounded-xl text-xs font-bold transition-all ${questionCount === count ? "bg-[#001432] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
										children: [count, " Qs"]
									}, count)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setQuestionCount(100),
										className: `py-2 rounded-xl text-xs font-bold transition-all ${questionCount === 100 ? "bg-[#001432] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`,
										children: "ALL"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-slate-600",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Estimated Duration:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-slate-800",
											children: [
												"~",
												Math.round(questionCount * 1.1),
												" min"
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-slate-600",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Target Pace:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-emerald-600",
											children: "1.1 min / Question"
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-bold text-slate-900",
										children: "AI Writing Options"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-slate-500 font-mono",
										children: "sent to the AI with every batch"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5",
									children: "Question types"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-1.5",
									children: QUESTION_TYPE_CHIPS.map((q) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => toggleFromList(questionTypes, setQuestionTypes, q),
										className: chip(questionTypes.includes(q)),
										children: q
									}, q))
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5",
									children: "Stem patterns"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-1.5",
									children: STEM_PATTERN_CHIPS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => toggleFromList(stemPatterns, setStemPatterns, p),
										className: chip(stemPatterns.includes(p)),
										children: p
									}, p))
								})] }),
								selectedExam === "AMC_CAT" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5",
										children: "Evidence sources (AMC practice)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: EVIDENCE_SOURCE_CHIPS.map((src) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => toggleFromList(evidenceSources, setEvidenceSources, src),
											className: chip(evidenceSources.includes(src)),
											children: src
										}, src))
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5",
										children: "Patient group (AMC blueprint)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: PATIENT_GROUP_CHIPS.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setPatientGroup(patientGroup === g ? "" : g),
											className: chip(patientGroup === g),
											children: g
										}, g))
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5",
										children: "Presenting problems (Murtagh)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5 max-h-28 overflow-y-auto",
										children: PRESENTING_PROBLEM_CHIPS.map((pp) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => toggleFromList(presentingProblems, setPresentingProblems, pp),
											className: chip(presentingProblems.includes(pp)),
											children: pp
										}, pp))
									})] })
								] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "bg-gradient-to-br from-[#001432] to-[#13294b] text-white rounded-2xl p-5 border border-[#13294b] shadow-lg space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[11px] font-mono uppercase tracking-wider text-[#8ff3f4] font-bold",
										children: "Ready to Assemble"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
										className: "text-base font-bold text-white mt-1",
										children: [selectedExam.replace("_", "-"), " Practice Module"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-slate-300 mt-1 leading-relaxed",
										children: [
											questionCount,
											" Questions · ",
											difficultyTier,
											" Tier ",
											difficultySubLevel ? `(${difficultySubLevel})` : "",
											" · ",
											totalChosenSubtopicsCount,
											" Subtopics Active · ",
											examDetails[selectedExam].scoring
										]
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl bg-black/20 border border-white/10 p-3 text-[11px] font-mono text-slate-200 space-y-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#8ff3f4] font-bold uppercase tracking-wider",
											children: "AI Generator"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: getActiveProvider() ? `${getActiveProvider()} · ${getEffectiveModel(getActiveProvider())}` : "no active provider" })]
									}), genState.busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-full h-1.5 rounded-full bg-white/10 overflow-hidden",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-full bg-[#0f8b8d] transition-all",
											style: { width: `${genState.total > 0 ? Math.min(100, Math.round(genState.generated / genState.total * 100)) : 0}%` }
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										"Batch ",
										genState.batch,
										" of ",
										genState.totalBatches,
										" · ",
										genState.generated,
										" / ",
										genState.total,
										" ready",
										genState.dropped > 0 ? ` · ${genState.dropped} dropped invalid` : ""
									] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Questions are written live by your active AI provider on launch." })]
								}),
								genState.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-[11px] leading-relaxed flex items-start gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: genState.error })]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: handleLaunch,
							disabled: genState.busy || !getActiveProvider(),
							className: "w-full py-3 bg-[#0f8b8d] hover:bg-[#00696b] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 transform active:scale-95",
							children: genState.busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"Generating… ",
								genState.generated,
								"/",
								genState.total
							] })] }) : !getActiveProvider() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Connect an AI provider in Settings" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "w-4 h-4 fill-current" }), " Launch Clinical Module"] })
						}),
						genState.busy && genState.generated > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								stopEarlyRef.current = true;
							},
							className: "w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "w-4 h-4" }),
								"Stop & launch with ",
								genState.generated,
								" ready"
							]
						}),
						genState.total > 0 && genState.dropped > 0 && !genState.busy && !genState.error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-white/70 font-mono",
							children: [
								"Validation report: ",
								genState.generated,
								" valid questions, ",
								genState.dropped,
								" dropped by the validator."
							]
						})
					]
				})]
			})
		]
	});
};
var DB_NAME = "PulseMedDB";
var DB_VERSION = 1;
var STORE_NAME = "question_banks";
function openDB() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}
/**
* Store validated bank questions in IndexedDB under key `bank:<name>`
*/
async function saveBankToIDB(bankId, questions, skippedCount = 0) {
	const db = await openDB();
	const key = `bank:${bankId}`;
	const metaKey = `meta:${bankId}`;
	const meta = {
		bankId,
		name: bankId === "emedici" ? "eMedici" : bankId === "success" ? "AMC Success" : "AMC Recall",
		count: questions.length,
		skippedCount,
		importedAt: (/* @__PURE__ */ new Date()).toLocaleDateString()
	};
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.put(questions, key);
		store.put(meta, metaKey);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
/**
* Retrieve questions from IndexedDB under key `bank:<name>`
*/
async function getBankFromIDB(bankId) {
	const db = await openDB();
	const key = `bank:${bankId}`;
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
		req.onsuccess = () => resolve(req.result || []);
		req.onerror = () => reject(req.error);
	});
}
/**
* Retrieve bank metadata (count and skipped count)
*/
async function getBankMetaFromIDB(bankId) {
	const db = await openDB();
	const metaKey = `meta:${bankId}`;
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(metaKey);
		req.onsuccess = () => resolve(req.result || null);
		req.onerror = () => reject(req.error);
	});
}
/**
* Remove bank from IndexedDB
*/
async function removeBankFromIDB(bankId) {
	const db = await openDB();
	const key = `bank:${bankId}`;
	const metaKey = `meta:${bankId}`;
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		store.delete(key);
		store.delete(metaKey);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
/**
* Parse and strictly validate bank JSON file in browser
* Validation rules:
* - question must be a non-empty string
* - options must be strings, minimum 2 (recall banks legitimately have 2-3 options, do NOT require 4)
* - answerIndex must be an integer inside the options range
* - skip questions with needsReview=true
* - drop duplicates by lowercase alphanumeric question text
* - image only if it starts with data:image/(jpeg|png|webp);base64, else ignore it
* - Never use dangerouslySetInnerHTML
*/
function validateAndParseBankJSON(jsonString, bankId) {
	let parsedData;
	try {
		parsedData = JSON.parse(jsonString);
	} catch (err) {
		throw new Error("Invalid JSON file format: Failed to parse JSON.");
	}
	const rawList = Array.isArray(parsedData) ? parsedData : Array.isArray(parsedData?.questions) ? parsedData.questions : [];
	if (rawList.length === 0) throw new Error("No questions found in JSON. File must be an array of questions or contain a \"questions\" array.");
	const seenAlphanumeric = /* @__PURE__ */ new Set();
	const valid = [];
	let duplicatesDropped = 0;
	let needsReviewSkipped = 0;
	let invalidFormatSkipped = 0;
	rawList.forEach((item, index) => {
		if (item.needsReview === true) {
			needsReviewSkipped++;
			return;
		}
		if (typeof item.question !== "string" || !item.question.trim()) {
			invalidFormatSkipped++;
			return;
		}
		if (!Array.isArray(item.options) || item.options.length < 2 || !item.options.every((opt) => typeof opt === "string" && opt.trim() !== "")) {
			invalidFormatSkipped++;
			return;
		}
		const answerIdx = Number(item.answerIndex);
		if (!Number.isInteger(answerIdx) || answerIdx < 0 || answerIdx >= item.options.length) {
			invalidFormatSkipped++;
			return;
		}
		const normalizedKey = item.question.toLowerCase().replace(/[^a-z0-9]/g, "");
		if (!normalizedKey || seenAlphanumeric.has(normalizedKey)) {
			duplicatesDropped++;
			return;
		}
		seenAlphanumeric.add(normalizedKey);
		let validImage = void 0;
		if (typeof item.image === "string" && /^data:image\/(jpeg|png|webp);base64,/i.test(item.image)) validImage = item.image;
		const cleanQuestion = {
			id: item.id ? String(item.id) : `${bankId}_${index + 1}`,
			question: item.question.trim(),
			options: item.options.map((opt) => opt.trim()),
			answerIndex: answerIdx,
			explanation: typeof item.explanation === "string" && item.explanation.trim() ? item.explanation.trim() : void 0,
			subject: typeof item.subject === "string" && item.subject.trim() ? item.subject.trim() : void 0,
			topic: typeof item.topic === "string" && item.topic.trim() ? item.topic.trim() : typeof item.group === "string" && item.group.trim() ? item.group.trim() : void 0,
			group: typeof item.group === "string" && item.group.trim() ? item.group.trim() : void 0,
			difficulty: typeof item.difficulty === "string" ? item.difficulty.trim() : void 0,
			image: validImage,
			bank: bankId
		};
		valid.push(cleanQuestion);
	});
	const totalSkipped = needsReviewSkipped + duplicatesDropped + invalidFormatSkipped;
	return {
		valid,
		totalParsed: rawList.length,
		importedCount: valid.length,
		skippedCount: totalSkipped,
		duplicatesDropped,
		needsReviewSkipped,
		invalidFormatSkipped
	};
}
/**
* Seen questions tracking in localStorage per-bank
*/
function getSeenQuestionIds(bankId) {
	try {
		const raw = localStorage.getItem(`seen_bank_${bankId}`);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function markQuestionsAsSeen(bankId, ids) {
	try {
		const current = new Set(getSeenQuestionIds(bankId));
		ids.forEach((id) => current.add(id));
		localStorage.setItem(`seen_bank_${bankId}`, JSON.stringify(Array.from(current)));
	} catch (err) {
		console.error("Failed to update seen questions", err);
	}
}
function resetSeenQuestions(bankId) {
	localStorage.removeItem(`seen_bank_${bankId}`);
}
var BANK_CONFIGS = {
	emedici: {
		name: "eMedici",
		key: "bank:emedici",
		desc: "Australian medical case & clinical scenario question bank",
		defaultExam: "AMC_CAT"
	},
	success: {
		name: "AMC Success",
		key: "bank:success",
		desc: "High-yield AMC CAT clinical examination questions & rationales",
		defaultExam: "AMC_CAT"
	},
	amc: {
		name: "AMC Recall",
		key: "bank:amc",
		desc: "Authentic AMC candidate recall collection (supports 2-5 option items)",
		defaultExam: "AMC_CAT"
	}
};
var DAY_MS = 864e5;
var normalizeQuestionKey = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
var parseDateValue = (value) => {
	if (typeof value === "number" && Number.isFinite(value)) {
		const fromNumber = new Date(value);
		return Number.isNaN(fromNumber.getTime()) ? void 0 : fromNumber.toISOString();
	}
	if (typeof value === "string" && value.trim()) {
		const fromString = new Date(value.trim());
		return Number.isNaN(fromString.getTime()) ? void 0 : fromString.toISOString();
	}
};
var extractExtraMeta = (item) => {
	const meta = {};
	if (!item || typeof item !== "object") return meta;
	if (typeof item.paper === "string" && item.paper.trim()) meta.paper = item.paper.trim();
	else if (typeof item.paper === "number" && Number.isFinite(item.paper)) meta.paper = String(item.paper);
	const updatedAt = parseDateValue(item.updatedAt ?? item.updated ?? item.lastUpdated ?? item.lastUpdatedAt ?? item.modifiedAt);
	if (updatedAt) meta.updatedAt = updatedAt;
	if (typeof item.redFlag === "boolean") meta.redFlag = item.redFlag;
	else if (typeof item.redFlag === "string" && /^(true|yes|1|y)$/i.test(item.redFlag.trim())) meta.redFlag = true;
	else if (typeof item.redFlag === "string" && /^(false|no|0|n)$/i.test(item.redFlag.trim())) meta.redFlag = false;
	if (Array.isArray(item.redFlags)) {
		const flags = item.redFlags.filter((flag) => typeof flag === "string" && flag.trim() !== "").map((flag) => flag.trim());
		meta.redFlags = flags;
		if (flags.length > 0) meta.redFlag = true;
	} else if (typeof item.redFlags === "string" && item.redFlags.trim()) {
		meta.redFlags = [item.redFlags.trim()];
		meta.redFlag = true;
	}
	return meta;
};
var stripCodeFence = (text) => {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```[a-z]*\s*\n?([\s\S]*?)\n?```$/i);
	return fenced ? fenced[1].trim() : trimmed;
};
var getRawQuestionList = (jsonText) => {
	try {
		const parsed = JSON.parse(jsonText);
		if (Array.isArray(parsed)) return parsed;
		if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
	} catch {}
	return [];
};
var extractExtrasFromRawList = (rawList) => {
	const extras = /* @__PURE__ */ new Map();
	rawList.forEach((item) => {
		if (!item || typeof item.question !== "string") return;
		const key = normalizeQuestionKey(item.question);
		if (!key) return;
		const meta = extractExtraMeta(item);
		if (Object.keys(meta).length > 0 && !extras.has(key)) extras.set(key, meta);
	});
	return extras;
};
var withExtraMeta = (questions, extras) => questions.map((question) => {
	const extra = extras.get(normalizeQuestionKey(question.question));
	return extra ? {
		...question,
		...extra
	} : question;
});
var getBankQuestionMeta = (question) => question;
var OPTION_LINE = /^([A-Ha-h])[).:\-]\s*(.+)$/;
var ANSWER_LINE = /^(?:answer|correct answer|ans|key)\s*[:\-]\s*([A-Ha-h]|\d+)\b/i;
var PAPER_LINE = /^paper(?:\s*(?:name|code|title))?\s*[:\-]\s*(.+)$/i;
var UPDATED_LINE = /^(?:updated(?:\s*at)?|last updated|date)\s*[:\-]\s*(.+)$/i;
var RED_FLAG_LINE = /^red\s*flags?(?:\s*notes?)?\s*[:\-]\s*(.+)$/i;
var parseRecallText = (text) => {
	const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
	const items = [];
	let invalidBlocks = 0;
	blocks.forEach((block) => {
		const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
		const stemLines = [];
		const options = [];
		let answerValue;
		let paper;
		let updatedAt;
		let redFlag;
		lines.forEach((line) => {
			const answerMatch = line.match(ANSWER_LINE);
			if (answerMatch) {
				answerValue = answerMatch[1];
				return;
			}
			const paperMatch = line.match(PAPER_LINE);
			if (paperMatch) {
				paper = paperMatch[1].trim();
				return;
			}
			const updatedMatch = line.match(UPDATED_LINE);
			if (updatedMatch) {
				updatedAt = parseDateValue(updatedMatch[1]);
				return;
			}
			const redFlagMatch = line.match(RED_FLAG_LINE);
			if (redFlagMatch) {
				const value = redFlagMatch[1].trim();
				redFlag = !/^(no|false|0|n)$/i.test(value);
				return;
			}
			const optionMatch = line.match(OPTION_LINE);
			if (optionMatch) {
				const expectedIndex = options.length;
				if (optionMatch[1].toUpperCase().charCodeAt(0) - 65 === expectedIndex) {
					options.push(optionMatch[2].trim());
					return;
				}
			}
			if (options.length === 0) stemLines.push(line);
		});
		const stem = stemLines.join(" ").trim();
		let answerIndex = -1;
		if (answerValue) {
			if (/^\d+$/.test(answerValue)) answerIndex = Number(answerValue) - 1;
			else answerIndex = answerValue.toUpperCase().charCodeAt(0) - 65;
		}
		if (!stem || options.length < 2 || answerIndex < 0 || answerIndex >= options.length) {
			invalidBlocks++;
			return;
		}
		const item = {
			question: stem,
			options,
			answerIndex
		};
		if (paper) item.paper = paper;
		if (updatedAt) item.updatedAt = updatedAt;
		if (redFlag !== void 0) item.redFlag = redFlag;
		items.push(item);
	});
	return {
		items,
		invalidBlocks
	};
};
var QuestionBankPracticeView = ({ onNavigate, onLaunchTest }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)("emedici");
	const [bankMetas, setBankMetas] = (0, import_react.useState)({
		emedici: null,
		success: null,
		amc: null
	});
	const [bankQuestions, setBankQuestions] = (0, import_react.useState)({
		emedici: [],
		success: [],
		amc: []
	});
	const [seenCounts, setSeenCounts] = (0, import_react.useState)({
		emedici: 0,
		success: 0,
		amc: 0
	});
	const [isLoading, setIsLoading] = (0, import_react.useState)(true);
	const [importMessage, setImportMessage] = (0, import_react.useState)(null);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [selectedSubjects, setSelectedSubjects] = (0, import_react.useState)([]);
	const [selectedTopics, setSelectedTopics] = (0, import_react.useState)([]);
	const [selectedGroups, setSelectedGroups] = (0, import_react.useState)([]);
	const [selectedPapers, setSelectedPapers] = (0, import_react.useState)([]);
	const [recentWindow, setRecentWindow] = (0, import_react.useState)("any");
	const [redFlagsOnly, setRedFlagsOnly] = (0, import_react.useState)(false);
	const [unseenOnly, setUnseenOnly] = (0, import_react.useState)(false);
	const [questionCount, setQuestionCount] = (0, import_react.useState)(25);
	const [testMode, setTestMode] = (0, import_react.useState)("TUTOR");
	const [pasteBank, setPasteBank] = (0, import_react.useState)("amc");
	const [pasteText, setPasteText] = (0, import_react.useState)("");
	const pasteTextareaRef = (0, import_react.useRef)(null);
	const fileInputRefs = {
		emedici: (0, import_react.useRef)(null),
		success: (0, import_react.useRef)(null),
		amc: (0, import_react.useRef)(null)
	};
	const refreshSeenCounts = () => {
		setSeenCounts({
			emedici: getSeenQuestionIds("emedici").length,
			success: getSeenQuestionIds("success").length,
			amc: getSeenQuestionIds("amc").length
		});
	};
	const loadAllBanks = async () => {
		setIsLoading(true);
		try {
			const [emediciMeta, successMeta, amcMeta] = await Promise.all([
				getBankMetaFromIDB("emedici"),
				getBankMetaFromIDB("success"),
				getBankMetaFromIDB("amc")
			]);
			const [emediciQs, successQs, amcQs] = await Promise.all([
				getBankFromIDB("emedici"),
				getBankFromIDB("success"),
				getBankFromIDB("amc")
			]);
			setBankMetas({
				emedici: emediciMeta,
				success: successMeta,
				amc: amcMeta
			});
			setBankQuestions({
				emedici: emediciQs,
				success: successQs,
				amc: amcQs
			});
			refreshSeenCounts();
		} catch (err) {
			console.error("Failed to load bank data from IndexedDB", err);
		} finally {
			setIsLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		loadAllBanks();
	}, []);
	const triggerImport = (bankId) => {
		fileInputRefs[bankId].current?.click();
	};
	const handleFileChange = async (bankId, e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const text = await file.text();
			const result = validateAndParseBankJSON(text, bankId);
			const extras = extractExtrasFromRawList(getRawQuestionList(text));
			await saveBankToIDB(bankId, withExtraMeta(result.valid, extras), result.skippedCount);
			await loadAllBanks();
			setImportMessage({
				type: "success",
				text: `Successfully imported ${result.importedCount} questions to ${BANK_CONFIGS[bankId].name} (${result.skippedCount} skipped: ${result.duplicatesDropped} duplicates, ${result.needsReviewSkipped} needs review, ${result.invalidFormatSkipped} invalid format).`
			});
		} catch (err) {
			setImportMessage({
				type: "error",
				text: err.message || "Failed to import question bank file."
			});
		} finally {
			if (e.target) e.target.value = "";
		}
	};
	const handleRemoveBank = async (bankId) => {
		if (window.confirm(`Are you sure you want to remove all imported questions from ${BANK_CONFIGS[bankId].name}?`)) {
			await removeBankFromIDB(bankId);
			resetSeenQuestions(bankId);
			await loadAllBanks();
			setImportMessage({
				type: "success",
				text: `Removed ${BANK_CONFIGS[bankId].name} from local storage.`
			});
		}
	};
	const handleResetSeen = (bankId) => {
		resetSeenQuestions(bankId);
		refreshSeenCounts();
		setImportMessage({
			type: "success",
			text: `Reset seen question tracker for ${BANK_CONFIGS[bankId].name}. Questions can now be drawn again.`
		});
	};
	const handleStartOver = () => {
		if (activeTab === "all") return;
		const bankName = BANK_CONFIGS[activeTab].name;
		if (!window.confirm(`Start over and forget every seen question in ${bankName}? Questions and the other banks' seen history are not affected.`)) return;
		resetSeenQuestions(activeTab);
		refreshSeenCounts();
		setImportMessage({
			type: "success",
			text: `Started over in ${bankName}: seen history cleared for this bank only. All ${bankMetas[activeTab]?.count || 0} questions can be drawn again.`
		});
	};
	const handlePasteImport = async () => {
		const pasted = stripCodeFence(pasteText);
		if (!pasted) return;
		const targetBank = pasteBank;
		try {
			let rawItems = getRawQuestionList(pasted);
			let invalidBlocks = 0;
			let sourceLabel = "JSON";
			if (rawItems.length === 0) {
				const parsedText = parseRecallText(pasted);
				rawItems = parsedText.items;
				invalidBlocks = parsedText.invalidBlocks;
				sourceLabel = "recall text";
			}
			if (rawItems.length === 0) throw new Error(invalidBlocks > 0 ? `Could not read any questions from the pasted text (${invalidBlocks} block(s) were missing a stem, at least two A./B. options, or a valid Answer line).` : "No questions found in pasted text. Paste bank JSON, or blocks with a stem, A./B./C. options and an \"Answer: A\" line.");
			const result = validateAndParseBankJSON(JSON.stringify({ questions: rawItems }), targetBank);
			if (result.valid.length === 0) throw new Error(`No valid questions found in pasted ${sourceLabel} (${result.skippedCount} skipped for invalid format, duplicates or needs-review).`);
			const extras = extractExtrasFromRawList(rawItems);
			const enriched = withExtraMeta(result.valid, extras);
			const existing = bankQuestions[targetBank] || [];
			const existingKeys = new Set(existing.map((q) => normalizeQuestionKey(q.question)));
			const usedIds = new Set(existing.map((q) => q.id));
			const additions = [];
			enriched.forEach((question, index) => {
				const key = normalizeQuestionKey(question.question);
				if (existingKeys.has(key)) return;
				let id = question.id;
				if (!id || usedIds.has(id)) {
					id = `${targetBank}_paste_${Date.now()}_${index + 1}`;
					while (usedIds.has(id)) id = `${id}_x`;
				}
				usedIds.add(id);
				existingKeys.add(key);
				additions.push({
					...question,
					id
				});
			});
			if (additions.length === 0) {
				setImportMessage({
					type: "error",
					text: `No new questions added to ${BANK_CONFIGS[targetBank].name}: all ${result.valid.length} pasted question(s) already exist in this bank.`
				});
				return;
			}
			await saveBankToIDB(targetBank, [...existing, ...additions], (bankMetas[targetBank]?.skippedCount || 0) + result.skippedCount);
			await loadAllBanks();
			setPasteText("");
			setImportMessage({
				type: "success",
				text: `Added ${additions.length} question(s) to ${BANK_CONFIGS[targetBank].name} from pasted ${sourceLabel}${result.skippedCount ? ` (${result.skippedCount} skipped)` : ""}${invalidBlocks ? `; ${invalidBlocks} block(s) could not be read` : ""}.`
			});
		} catch (err) {
			setImportMessage({
				type: "error",
				text: err?.message || "Failed to import pasted recall text."
			});
		}
	};
	const currentPool = (0, import_react.useMemo)(() => {
		if (activeTab === "all") return [
			...bankQuestions.emedici,
			...bankQuestions.success,
			...bankQuestions.amc
		];
		return bankQuestions[activeTab] || [];
	}, [activeTab, bankQuestions]);
	const availableSubjects = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		currentPool.forEach((q) => {
			if (q.subject && q.subject.trim()) set.add(q.subject.trim());
		});
		return Array.from(set).sort();
	}, [currentPool]);
	const availableTopics = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		currentPool.forEach((q) => {
			if (q.topic && q.topic.trim()) set.add(q.topic.trim());
		});
		return Array.from(set).sort();
	}, [currentPool]);
	const availableGroups = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		currentPool.forEach((q) => {
			if (q.group && q.group.trim()) set.add(q.group.trim());
		});
		return Array.from(set).sort();
	}, [currentPool]);
	const availablePapers = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		currentPool.forEach((q) => {
			const paper = getBankQuestionMeta(q).paper;
			if (paper) set.add(paper);
		});
		return Array.from(set).sort();
	}, [currentPool]);
	const hasUpdatedField = (0, import_react.useMemo)(() => currentPool.some((q) => Boolean(getBankQuestionMeta(q).updatedAt)), [currentPool]);
	const hasRedFlagField = (0, import_react.useMemo)(() => currentPool.some((q) => {
		const meta = getBankQuestionMeta(q);
		return typeof meta.redFlag === "boolean" || Array.isArray(meta.redFlags);
	}), [currentPool]);
	const redFlagCount = (0, import_react.useMemo)(() => currentPool.filter((q) => {
		const meta = getBankQuestionMeta(q);
		return meta.redFlag === true || Array.isArray(meta.redFlags) && meta.redFlags.length > 0;
	}).length, [currentPool]);
	const recentCounts = (0, import_react.useMemo)(() => {
		const now = Date.now();
		const counts = {
			d7: 0,
			d30: 0,
			d90: 0
		};
		currentPool.forEach((q) => {
			const updatedAt = getBankQuestionMeta(q).updatedAt;
			if (!updatedAt) return;
			const age = now - new Date(updatedAt).getTime();
			if (Number.isNaN(age)) return;
			if (age <= 7 * DAY_MS) counts.d7++;
			if (age <= 30 * DAY_MS) counts.d30++;
			if (age <= 90 * DAY_MS) counts.d90++;
		});
		return counts;
	}, [currentPool]);
	(0, import_react.useEffect)(() => {
		setSelectedSubjects((prev) => prev.filter((s) => availableSubjects.includes(s)));
		setSelectedTopics((prev) => prev.filter((t) => availableTopics.includes(t)));
		setSelectedGroups((prev) => prev.filter((g) => availableGroups.includes(g)));
		setSelectedPapers((prev) => prev.filter((p) => availablePapers.includes(p)));
	}, [
		activeTab,
		availableSubjects,
		availableTopics,
		availableGroups,
		availablePapers
	]);
	(0, import_react.useEffect)(() => {
		if (!hasUpdatedField) setRecentWindow("any");
		if (!hasRedFlagField) setRedFlagsOnly(false);
	}, [
		activeTab,
		hasUpdatedField,
		hasRedFlagField
	]);
	const currentSeenSet = (0, import_react.useMemo)(() => {
		const set = /* @__PURE__ */ new Set();
		if (activeTab === "all") {
			getSeenQuestionIds("emedici").forEach((id) => set.add(id));
			getSeenQuestionIds("success").forEach((id) => set.add(id));
			getSeenQuestionIds("amc").forEach((id) => set.add(id));
		} else getSeenQuestionIds(activeTab).forEach((id) => set.add(id));
		return set;
	}, [activeTab, seenCounts]);
	const filteredQuestions = (0, import_react.useMemo)(() => {
		const query = searchQuery.trim().toLowerCase();
		return currentPool.filter((q) => {
			if (query) {
				const inQuestion = q.question.toLowerCase().includes(query);
				const inOptions = q.options.some((opt) => opt.toLowerCase().includes(query));
				const inExplanation = q.explanation ? q.explanation.toLowerCase().includes(query) : false;
				const inTopic = q.topic ? q.topic.toLowerCase().includes(query) : false;
				const inSubject = q.subject ? q.subject.toLowerCase().includes(query) : false;
				if (!inQuestion && !inOptions && !inExplanation && !inTopic && !inSubject) return false;
			}
			if (selectedSubjects.length > 0) {
				if (!q.subject || !selectedSubjects.includes(q.subject)) return false;
			}
			if (selectedTopics.length > 0) {
				if (!q.topic || !selectedTopics.includes(q.topic)) return false;
			}
			if (selectedGroups.length > 0) {
				if (!q.group || !selectedGroups.includes(q.group)) return false;
			}
			if (selectedPapers.length > 0) {
				const paper = getBankQuestionMeta(q).paper;
				if (!paper || !selectedPapers.includes(paper)) return false;
			}
			if (recentWindow !== "any") {
				const updatedAt = getBankQuestionMeta(q).updatedAt;
				if (!updatedAt) return false;
				const age = Date.now() - new Date(updatedAt).getTime();
				if (Number.isNaN(age) || age > Number(recentWindow) * DAY_MS) return false;
			}
			if (redFlagsOnly) {
				const meta = getBankQuestionMeta(q);
				if (!(meta.redFlag === true || Array.isArray(meta.redFlags) && meta.redFlags.length > 0)) return false;
			}
			if (unseenOnly) {
				if (currentSeenSet.has(q.id)) return false;
			}
			return true;
		});
	}, [
		currentPool,
		searchQuery,
		selectedSubjects,
		selectedTopics,
		selectedGroups,
		selectedPapers,
		recentWindow,
		redFlagsOnly,
		unseenOnly,
		currentSeenSet
	]);
	const toggleItem = (list, setList, item) => {
		setList((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
	};
	const handleLaunch = () => {
		if (filteredQuestions.length === 0) {
			alert("No questions match your current filter selection. Please adjust your filters or import questions.");
			return;
		}
		const chosen = [...filteredQuestions].sort(() => Math.random() - .5).slice(0, questionCount);
		const drawnByBank = {};
		chosen.forEach((q) => {
			if (!drawnByBank[q.bank]) drawnByBank[q.bank] = [];
			drawnByBank[q.bank].push(q.id);
		});
		Object.entries(drawnByBank).forEach(([bid, ids]) => {
			markQuestionsAsSeen(bid, ids);
		});
		refreshSeenCounts();
		const letters = [
			"A",
			"B",
			"C",
			"D",
			"E"
		];
		const clinicalQuestions = chosen.map((bq) => {
			const safeOptions = bq.options.map((optText, idx) => ({
				id: letters[idx] || "E",
				text: optText
			}));
			const safeCorrectOption = letters[bq.answerIndex] || "A";
			const bankTitle = bq.bank === "emedici" ? "eMedici Question Bank" : bq.bank === "success" ? "AMC Success High-Yield" : "AMC Official Recall";
			const defaultExam = bq.bank === "emedici" || bq.bank === "success" || bq.bank === "amc" ? "AMC_CAT" : "NEET_PG";
			return {
				id: bq.id,
				moduleCode: bq.bank.toUpperCase(),
				sourceType: bq.bank,
				examType: defaultExam,
				subject: bq.subject || "Clinical Medicine",
				subtopic: bq.topic || bq.group || "Clinical Recall Application",
				cognitiveTier: "Clinical 2-Step",
				difficultyTier: "MEDIUM",
				stem: bq.question,
				questionText: bq.question,
				options: safeOptions,
				correctOption: safeCorrectOption,
				image: bq.image,
				boardPearl: bq.explanation || "Key clinical board recall concept.",
				citations: [bankTitle],
				targetAccuracy: 75
			};
		});
		const targetExam = activeTab !== "all" ? BANK_CONFIGS[activeTab].defaultExam : "AMC_CAT";
		onLaunchTest(clinicalQuestions, testMode, targetExam);
	};
	const totalImportedCount = (bankMetas.emedici?.count || 0) + (bankMetas.success?.count || 0) + (bankMetas.amc?.count || 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto pb-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-6 text-white border border-[#13294b] shadow-md relative overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#0f8b8d]/20 to-transparent pointer-events-none" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0f8b8d]/20 text-[#8ff3f4] text-xs font-semibold uppercase tracking-wider mb-2 border border-[#0f8b8d]/30",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "w-3.5 h-3.5" }), "Dedicated Question Bank Module Runner"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-bold tracking-tight text-white",
							children: "Imported Question Banks & Candidate Recall Engine"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-300 text-sm mt-1 max-w-2xl",
							children: "Practice exclusively from imported collections (eMedici, AMC Success, AMC Recall). Questions, filters, and attempt histories are kept strictly isolated from AI-generated modules."
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800 text-[#8ff3f4] border border-slate-700 flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-4 h-4 text-[#0f8b8d]" }),
								" Total Stored: ",
								totalImportedCount,
								" Qs"
							]
						})
					})]
				})]
			}),
			importMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `p-4 rounded-xl text-xs flex items-start justify-between gap-3 ${importMessage.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-900" : "bg-rose-50 border border-rose-200 text-rose-900"}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-2.5",
					children: [importMessage.type === "success" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-5 h-5 text-emerald-600 shrink-0 mt-0.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-5 h-5 text-rose-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "leading-relaxed",
						children: importMessage.text
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setImportMessage(null),
					className: "text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-200/50",
					children: "✕"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row sm:items-center justify-between gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "text-base font-bold text-slate-900 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "w-4 h-4 text-[#0f8b8d]" }), " Question Bank Storage & File Imports"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-slate-500 mt-0.5",
							children: [
								"Secure client-side IndexedDB persistence (",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "font-mono text-[#0f8b8d]",
									children: "bank:<name>"
								}),
								") with duplicate pruning and answer index validation"
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs font-mono text-slate-500",
							children: ["Accepts JSON arrays or ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "text-slate-700 font-semibold",
								children: "{ questions: [] }"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-1 md:grid-cols-3 gap-4 pt-1",
						children: [
							"emedici",
							"success",
							"amc"
						].map((bankId) => {
							const cfg = BANK_CONFIGS[bankId];
							const meta = bankMetas[bankId];
							const count = meta?.count || 0;
							const skipped = meta?.skippedCount || 0;
							const seen = seenCounts[bankId] || 0;
							const isImported = count > 0;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `p-4 rounded-xl border flex flex-col justify-between space-y-3.5 transition-all ${isImported ? "bg-white border-slate-200 shadow-xs ring-1 ring-slate-100" : "bg-slate-50/70 border-dashed border-slate-300"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between mb-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold text-slate-900",
											children: cfg.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[10px] font-mono font-bold px-2 py-0.5 rounded ${isImported ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"}`,
											children: isImported ? `${count} Qs` : "Empty"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-500 leading-snug",
										children: cfg.desc
									}),
									isImported && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 pt-2.5 border-t border-slate-100 space-y-1.5 text-xs font-mono text-slate-600",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Imported:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-bold text-slate-800",
													children: [count, " Qs"]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between text-slate-500",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Skipped:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [skipped, " invalid/dupes"] })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Seen questions:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-bold text-[#0f8b8d]",
													children: [
														seen,
														" / ",
														count
													]
												})]
											})
										]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5",
									children: [!isImported ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => triggerImport(bankId),
										className: "w-full py-2 px-3 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }), "Import bank (.json)"]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => triggerImport(bankId),
											className: "flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs",
											title: "Replace bank with a new JSON file",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3 h-3 text-[#0f8b8d]" }), "Replace"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => handleResetSeen(bankId),
											className: "py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs",
											title: "Reset seen questions list in localStorage",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3 h-3 text-amber-600" }), "Reset seen"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => handleRemoveBank(bankId),
											className: "py-1.5 px-2 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-2xs",
											title: "Remove bank from IndexedDB",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3 h-3 text-rose-600" }), "Remove"]
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "file",
										ref: fileInputRefs[bankId],
										accept: ".json",
										onChange: (e) => handleFileChange(bankId, e),
										className: "hidden"
									})]
								})]
							}, bankId);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pt-4 border-t border-slate-200 space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
									className: "text-sm font-bold text-slate-900 flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5 text-[#0f8b8d]" }), "Paste recall text"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-slate-500 mt-0.5 max-w-2xl",
									children: [
										"Paste bank JSON (same schema as the file import) or plain recall blocks: stem, then",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "A."
										}),
										"/",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "B."
										}),
										" options and",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "Answer: B"
										}),
										", with optional",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "Paper:"
										}),
										", ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "Updated:"
										}),
										" and",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
											className: "font-mono",
											children: "Red flag:"
										}),
										" lines. Pasted questions are added to the selected bank; existing questions are kept and duplicates are skipped."
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex items-center gap-1.5 shrink-0",
									children: [
										"emedici",
										"success",
										"amc"
									].map((bankId) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setPasteBank(bankId);
											pasteTextareaRef.current?.focus();
										},
										className: `px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${pasteBank === bankId ? "bg-[#001432] text-white ring-1 ring-[#0f8b8d]" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`,
										title: `Add pasted text to ${BANK_CONFIGS[bankId].name}`,
										children: BANK_CONFIGS[bankId].name
									}, bankId))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								ref: pasteTextareaRef,
								value: pasteText,
								onChange: (e) => setPasteText(e.target.value),
								rows: 5,
								placeholder: `Paste JSON: [{"question":"...","options":["...","..."],"answerIndex":0,"paper":"2024 March","updatedAt":"2026-10-20","redFlag":true}]\n\nOr paste recall blocks separated by a blank line:\nA 62-year-old man presents with crushing central chest pain.\nA. Aortic dissection\nB. Acute myocardial infarction\nC. Pericarditis\nAnswer: B\nPaper: 2024 March`,
								className: "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-[#0f8b8d] focus:bg-white transition-all resize-y"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] text-slate-500",
									children: [
										"Pasted questions are added to ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-slate-700",
											children: BANK_CONFIGS[pasteBank].name
										}),
										"."
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setPasteText(""),
										disabled: !pasteText,
										className: "px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
										children: "Clear"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: handlePasteImport,
										disabled: !pasteText.trim(),
										className: "px-4 py-1.5 rounded-lg bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }), "Import pasted text"]
									})]
								})]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-base font-bold text-slate-900 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "w-4 h-4 text-[#0f8b8d]" }), " Active Bank Practice Set & Dynamic Filters"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-500 mt-0.5",
						children: "Select bank source, refine by extracted fields, and launch timed exams or tutor sessions"
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2 border-b border-slate-200 pb-3",
						children: [
							{
								id: "emedici",
								label: "eMedici",
								count: bankMetas.emedici?.count || 0
							},
							{
								id: "success",
								label: "AMC Success",
								count: bankMetas.success?.count || 0
							},
							{
								id: "amc",
								label: "AMC Recall",
								count: bankMetas.amc?.count || 0
							},
							{
								id: "all",
								label: "All Imported Banks",
								count: totalImportedCount
							}
						].map((tab) => {
							const isTabActive = activeTab === tab.id;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveTab(tab.id),
								className: `px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${isTabActive ? "bg-[#001432] text-white shadow-sm ring-2 ring-[#0f8b8d]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tab.label }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: `text-[10px] font-mono px-2 py-0.5 rounded-full ${isTabActive ? "bg-[#0f8b8d] text-white" : tab.count > 0 ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`,
									children: [tab.count, " Qs"]
								})]
							}, tab.id);
						})
					}),
					currentPool.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-8 rounded-2xl bg-amber-50/70 border-2 border-dashed border-amber-200 text-center space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "w-6 h-6" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-base font-bold text-amber-900",
								children: activeTab === "all" ? "All Imported Banks are Empty" : `${BANK_CONFIGS[activeTab].name} is currently empty`
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-amber-700 max-w-md mx-auto mt-1 leading-relaxed",
								children: "No questions found in IndexedDB. Click below to select a .json question bank file to populate this collection."
							})] }),
							activeTab !== "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => triggerImport(activeTab),
								className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all shadow-md",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-4 h-4" }),
									"Import ",
									BANK_CONFIGS[activeTab].name,
									" (.json)"
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex justify-center gap-2",
								children: [
									"emedici",
									"success",
									"amc"
								].map((bid) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => triggerImport(bid),
									className: "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }),
										"Import ",
										BANK_CONFIGS[bid].name
									]
								}, bid))
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row items-stretch sm:items-center gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative flex-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: searchQuery,
												onChange: (e) => setSearchQuery(e.target.value),
												placeholder: "Filter by question stem keywords, clinical signs, drugs, or explanation...",
												className: "w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0f8b8d] focus:bg-white transition-all"
											}),
											searchQuery && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setSearchQuery(""),
												className: "absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600",
												children: "Clear"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: unseenOnly,
												onChange: (e) => setUnseenOnly(e.target.checked),
												className: "h-4 w-4 rounded border-slate-300 text-[#0f8b8d] focus:ring-[#0f8b8d] accent-[#0f8b8d]"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-bold text-slate-700",
												children: "Unseen only"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200",
												children: [currentPool.length - currentSeenSet.size, " Unseen"]
											})
										]
									}),
									activeTab !== "all" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: handleStartOver,
										className: "flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 text-xs font-bold transition-colors shrink-0",
										title: `Clear seen history for ${BANK_CONFIGS[activeTab].name} only`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" }), "Start over (forget seen)"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 md:grid-cols-3 gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold text-slate-800 uppercase tracking-wider",
												children: [
													"Subjects (",
													availableSubjects.length,
													")"
												]
											}), selectedSubjects.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => setSelectedSubjects([]),
												className: "text-[10px] text-teal-700 font-semibold hover:underline",
												children: [
													"Clear (",
													selectedSubjects.length,
													")"
												]
											})]
										}), availableSubjects.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-400 italic",
											children: "No subject tags found in imported file"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "max-h-44 overflow-y-auto space-y-1 pr-1",
											children: availableSubjects.map((subject) => {
												const isChecked = selectedSubjects.includes(subject);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: `flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? "bg-teal-50 text-teal-900 font-bold" : "text-slate-700 hover:bg-slate-200/60"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: isChecked,
														onChange: () => toggleItem(selectedSubjects, setSelectedSubjects, subject),
														className: "h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] accent-[#0f8b8d]"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: subject
													})]
												}, subject);
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold text-slate-800 uppercase tracking-wider",
												children: [
													"Topics (",
													availableTopics.length,
													")"
												]
											}), selectedTopics.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => setSelectedTopics([]),
												className: "text-[10px] text-teal-700 font-semibold hover:underline",
												children: [
													"Clear (",
													selectedTopics.length,
													")"
												]
											})]
										}), availableTopics.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-400 italic",
											children: "No topic tags found in imported file"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "max-h-44 overflow-y-auto space-y-1 pr-1",
											children: availableTopics.map((topic) => {
												const isChecked = selectedTopics.includes(topic);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: `flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? "bg-teal-50 text-teal-900 font-bold" : "text-slate-700 hover:bg-slate-200/60"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: isChecked,
														onChange: () => toggleItem(selectedTopics, setSelectedTopics, topic),
														className: "h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] accent-[#0f8b8d]"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: topic
													})]
												}, topic);
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold text-slate-800 uppercase tracking-wider",
												children: [
													"Groups / Sub-categories (",
													availableGroups.length,
													")"
												]
											}), selectedGroups.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => setSelectedGroups([]),
												className: "text-[10px] text-teal-700 font-semibold hover:underline",
												children: [
													"Clear (",
													selectedGroups.length,
													")"
												]
											})]
										}), availableGroups.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-400 italic",
											children: "No group tags found in imported file"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "max-h-44 overflow-y-auto space-y-1 pr-1",
											children: availableGroups.map((group) => {
												const isChecked = selectedGroups.includes(group);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: `flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? "bg-teal-50 text-teal-900 font-bold" : "text-slate-700 hover:bg-slate-200/60"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: isChecked,
														onChange: () => toggleItem(selectedGroups, setSelectedGroups, group),
														className: "h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] accent-[#0f8b8d]"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: group
													})]
												}, group);
											})
										})]
									})
								]
							}),
							(availablePapers.length > 0 || hasUpdatedField || hasRedFlagField) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 md:grid-cols-3 gap-4",
								children: [
									availablePapers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold text-slate-800 uppercase tracking-wider",
												children: [
													"Papers (",
													availablePapers.length,
													")"
												]
											}), selectedPapers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												onClick: () => setSelectedPapers([]),
												className: "text-[10px] text-teal-700 font-semibold hover:underline",
												children: [
													"Clear (",
													selectedPapers.length,
													")"
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "max-h-44 overflow-y-auto space-y-1 pr-1",
											children: availablePapers.map((paper) => {
												const isChecked = selectedPapers.includes(paper);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: `flex items-center gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${isChecked ? "bg-teal-50 text-teal-900 font-bold" : "text-slate-700 hover:bg-slate-200/60"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: isChecked,
														onChange: () => toggleItem(selectedPapers, setSelectedPapers, paper),
														className: "h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] accent-[#0f8b8d]"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: paper
													})]
												}, paper);
											})
										})]
									}),
									hasUpdatedField && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }), " Recent updates"]
												}), recentWindow !== "any" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => setRecentWindow("any"),
													className: "text-[10px] text-teal-700 font-semibold hover:underline",
													children: "Clear"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: recentWindow,
												onChange: (e) => setRecentWindow(e.target.value),
												className: "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0f8b8d]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: "any",
														children: [
															"Any time (",
															currentPool.length,
															")"
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: "7",
														children: [
															"Last 7 days (",
															recentCounts.d7,
															")"
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: "30",
														children: [
															"Last 30 days (",
															recentCounts.d30,
															")"
														]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
														value: "90",
														children: [
															"Last 90 days (",
															recentCounts.d90,
															")"
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-slate-500 leading-relaxed",
												children: "Uses each question's own updated date from the imported file."
											})
										]
									}),
									hasRedFlagField && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3.5 h-3.5" }),
														" Red flags (",
														redFlagCount,
														")"
													]
												}), redFlagsOnly && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => setRedFlagsOnly(false),
													className: "text-[10px] text-teal-700 font-semibold hover:underline",
													children: "Clear"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "checkbox",
														checked: redFlagsOnly,
														onChange: (e) => setRedFlagsOnly(e.target.checked),
														className: "h-3.5 w-3.5 rounded border-slate-300 text-[#0f8b8d] accent-[#0f8b8d]"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-xs font-bold text-slate-700",
														children: "Red-flagged only"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "ml-auto text-[10px] font-mono text-slate-500",
														children: [redFlagCount, " flagged"]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-slate-500 leading-relaxed",
												children: "Shows questions whose imported red-flag field is set."
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50/30 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap items-center gap-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider",
										children: "Question Count:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5",
										children: [[
											10,
											25,
											50,
											100
										].map((cnt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setQuestionCount(cnt),
											className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${questionCount === cnt ? "bg-[#001432] text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
											children: [cnt, " Qs"]
										}, cnt)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setQuestionCount(filteredQuestions.length || 10),
											className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${questionCount === filteredQuestions.length && filteredQuestions.length > 0 ? "bg-[#001432] text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
											children: [
												"All (",
												filteredQuestions.length,
												")"
											]
										})]
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider",
										children: "Execution Mode:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setTestMode("TUTOR"),
											className: `px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${testMode === "TUTOR" ? "bg-[#0f8b8d] text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
											children: "Tutor Mode (Immediate Feedback)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setTestMode("EXAM"),
											className: `px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${testMode === "EXAM" ? "bg-[#001432] text-white shadow-xs" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"}`,
											children: "Exam Mode (Strict Timed)"
										})]
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-right",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs font-mono text-slate-500 mb-1.5",
										children: [
											"Available: ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
												className: "text-slate-800",
												children: filteredQuestions.length
											}),
											" matching questions"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: handleLaunch,
										disabled: filteredQuestions.length === 0,
										className: "w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "w-4 h-4 fill-current" }),
											"Launch Bank Practice (",
											Math.min(questionCount, filteredQuestions.length),
											" Qs)"
										]
									})]
								})]
							})
						]
					})
				]
			})
		]
	});
};
var loadActiveTest = () => {
	try {
		const saved = localStorage.getItem("activeTest");
		return saved ? JSON.parse(saved) : null;
	} catch (e) {
		console.error("Failed to load active test:", e);
		return null;
	}
};
var saveActiveTest = (testData) => {
	try {
		localStorage.setItem("activeTest", JSON.stringify(testData));
	} catch (e) {
		console.error("Failed to save active test:", e);
	}
};
var loadRunSession = (sig) => {
	try {
		const saved = localStorage.getItem("runSession-" + sig);
		return saved ? JSON.parse(saved) : null;
	} catch (e) {
		console.error("Failed to load run session:", e);
		return null;
	}
};
var saveRunSession = (sessionData) => {
	try {
		localStorage.setItem("runSession-" + sessionData.sig, JSON.stringify(sessionData));
	} catch (e) {
		console.error("Failed to save run session:", e);
	}
};
var signature = (questions) => {
	try {
		return "sig-" + questions.map((q) => q.id).join(",");
	} catch (e) {
		console.error("Failed to create signature:", e);
		return "sig-unknown";
	}
};
var TestRunnerView = ({ initialQuestionId, onNavigate, questions: propQuestions, mode = "TUTOR" }) => {
	const [restoredRun] = (0, import_react.useState)(() => propQuestions && propQuestions.length > 0 ? loadRunSession(signature(propQuestions)) : null);
	const skipFirstSync = (0, import_react.useRef)(Boolean(restoredRun));
	const [questions, setQuestions] = (0, import_react.useState)(propQuestions ?? []);
	const [currentIndex, setCurrentIndex] = (0, import_react.useState)(restoredRun?.index ?? 0);
	const [userAnswers, setUserAnswers] = (0, import_react.useState)(restoredRun?.answers ?? {});
	const [flaggedIds, setFlaggedIds] = (0, import_react.useState)(restoredRun?.flags ?? {});
	const [examSubmitted, setExamSubmitted] = (0, import_react.useState)(restoredRun?.submitted ?? false);
	const [showExplanation, setShowExplanation] = (0, import_react.useState)(restoredRun?.showExplanation ?? mode === "TUTOR");
	const [secondsElapsed, setSecondsElapsed] = (0, import_react.useState)(restoredRun?.seconds ?? 0);
	const [showResultsScreen, setShowResultsScreen] = (0, import_react.useState)(restoredRun?.showResults ?? false);
	(0, import_react.useEffect)(() => {
		if (skipFirstSync.current) {
			skipFirstSync.current = false;
			return;
		}
		if (propQuestions && propQuestions.length > 0) {
			setQuestions(propQuestions);
			setCurrentIndex(0);
			setUserAnswers({});
			setFlaggedIds({});
			setExamSubmitted(false);
			setShowResultsScreen(false);
			setShowExplanation(mode === "TUTOR");
			setSecondsElapsed(0);
		}
	}, [propQuestions, mode]);
	(0, import_react.useEffect)(() => {
		if (initialQuestionId) {
			const idx = questions.findIndex((q) => q.id === initialQuestionId);
			if (idx !== -1) setCurrentIndex(idx);
		}
	}, [initialQuestionId, questions]);
	(0, import_react.useEffect)(() => {
		const timer = setInterval(() => {
			setSecondsElapsed((prev) => prev + 1);
		}, 1e3);
		return () => clearInterval(timer);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!questions.length) return;
		saveRunSession({
			sig: signature(questions),
			answers: userAnswers,
			flags: flaggedIds,
			index: currentIndex,
			seconds: secondsElapsed,
			submitted: examSubmitted,
			showResults: showResultsScreen,
			showExplanation
		});
	}, [
		questions,
		userAnswers,
		flaggedIds,
		currentIndex,
		secondsElapsed,
		examSubmitted,
		showResultsScreen,
		showExplanation
	]);
	const formatTimer = (secs) => {
		const mins = Math.floor(secs / 60);
		const remainder = secs % 60;
		return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
	};
	const currentQ = questions[currentIndex] || questions[0];
	const selectedAnswer = userAnswers[currentQ?.id];
	const isAnswered = !!selectedAnswer;
	const isFlagged = !!flaggedIds[currentQ?.id];
	const isAMC = questions.length > 0 && questions.some((q) => q.examType === "AMC_CAT") || currentQ?.examType === "AMC_CAT";
	const totalQuestions = questions.length;
	const answeredCount = Object.keys(userAnswers).length;
	const flaggedCount = Object.values(flaggedIds).filter(Boolean).length;
	const correctCount = Object.entries(userAnswers).filter(([qid, chosen]) => {
		const q = questions.find((item) => item.id === qid);
		return q && q.correctOption === chosen;
	}).length;
	const accuracy = answeredCount > 0 ? Math.round(correctCount / answeredCount * 100) : null;
	const paceSeconds = answeredCount > 0 ? Math.round(secondsElapsed / answeredCount) : null;
	const paceDisplay = paceSeconds !== null ? `${paceSeconds}s / Q` : "-";
	const amcEstimatedScore = accuracy !== null ? Math.round(100 + accuracy / 100 * 400) : 0;
	const handleSelectOption = (optId) => {
		if (!currentQ) return;
		setUserAnswers((prev) => ({
			...prev,
			[currentQ.id]: optId
		}));
		if (mode === "TUTOR" || examSubmitted) setShowExplanation(true);
	};
	const toggleFlag = () => {
		if (!currentQ) return;
		setFlaggedIds((prev) => ({
			...prev,
			[currentQ.id]: !prev[currentQ.id]
		}));
	};
	const recordAttempt = (_submitters) => {
		try {
			const subjects = {};
			for (const q of questions) {
				if (!userAnswers[q.id]) continue;
				const s = subjects[q.subject] ?? (subjects[q.subject] = {
					total: 0,
					correct: 0
				});
				s.total += 1;
				if (userAnswers[q.id] === q.correctOption) s.correct += 1;
			}
			const attemptedQs = questions.filter((q) => userAnswers[q.id]);
			let correct = 0;
			for (const q of attemptedQs) if (userAnswers[q.id] === q.correctOption) correct += 1;
			addAttempt({
				exam: questions[0]?.examType ?? "NEET_PG",
				mode,
				total: questions.length,
				attempted: attemptedQs.length,
				correct,
				subjects,
				questionIds: questions.map((q) => q.id),
				incorrectIds: attemptedQs.filter((q) => userAnswers[q.id] !== q.correctOption).map((q) => q.id)
			});
		} catch {}
	};
	const confirmSubmit = (label) => {
		const unanswered = questions.length - answeredCount;
		if (unanswered <= 0) return true;
		return window.confirm(`${unanswered} of ${questions.length} question${questions.length === 1 ? "" : "s"} are unanswered. Submit ${label} anyway?`);
	};
	const handleSubmitExam = () => {
		if (!confirmSubmit("the exam")) return;
		recordAttempt("exam");
		setExamSubmitted(true);
		setShowExplanation(true);
		setShowResultsScreen(true);
	};
	const handleSubmitModule = () => {
		if (!confirmSubmit("this module")) return;
		recordAttempt("module");
		setExamSubmitted(true);
		setShowExplanation(true);
		setShowResultsScreen(true);
	};
	if (questions.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "max-w-2xl mx-auto mt-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-9 h-9 text-slate-300 mx-auto" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-base font-bold text-slate-900",
					children: "No active module"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-500 leading-relaxed max-w-md mx-auto",
					children: "The runner only shows questions you actually launched. Build a module in the Practice Builder, or open a question from your bank, and it will appear here with your answers recorded to your real progress."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-center gap-2 pt-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onNavigate("practice"),
						className: "px-4 py-2 rounded-xl bg-[#001432] hover:bg-[#13294b] text-white text-xs font-bold",
						children: "Open Practice Builder"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onNavigate("question-bank"),
						className: "px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold",
						children: "Open Question Bank"
					})]
				})
			]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6 max-w-7xl mx-auto",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-[#001432] rounded-2xl p-4 sm:p-5 text-white border border-[#13294b] shadow-md flex flex-wrap items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onNavigate(currentQ.sourceType ? "question-bank" : "practice"),
						className: "p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors",
						title: "Back",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-4 h-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-mono font-bold text-[#8ff3f4]",
								children: currentQ.moduleCode || "CLINICAL BLOCK #8842"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-bold px-2 py-0.5 rounded bg-[#0f8b8d]/20 text-[#8ff3f4] border border-[#0f8b8d]/30",
								children: currentQ.cognitiveTier
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300",
								children: mode === "EXAM" ? "Exam Mode (Strict Timed)" : "Tutor Mode (Immediate Feedback)"
							}),
							currentQ.sourceType && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/60 text-[#8ff3f4] border border-teal-500/30",
								children: ["Bank: ", currentQ.sourceType.toUpperCase()]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-slate-300 font-medium mt-1",
						children: [
							currentQ.subject,
							" · ",
							currentQ.subtopic
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [
						mode === "EXAM" && !examSubmitted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: handleSubmitExam,
							className: "px-3.5 py-1.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-xl transition-all shadow-xs",
							children: "Submit Exam"
						}),
						examSubmitted && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono",
							children: "Exam Submitted"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-mono",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-400",
								children: "Mock Pace:"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-emerald-400 font-bold",
								children: paceDisplay
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5 text-amber-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatTimer(secondsElapsed) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: toggleFlag,
							className: `p-2 rounded-xl border transition-colors ${isFlagged ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`,
							title: "Flag question for review",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flag, { className: `w-4 h-4 ${isFlagged ? "fill-current" : ""}` })
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: "w-4 h-4 text-[#0f8b8d]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-slate-900",
									children: "Session Progress:"
								}),
								answeredCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200",
									children: "0 attempted"
								}) : mode === "EXAM" && !examSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200",
										children: [
											"Answered: ",
											answeredCount,
											" / ",
											totalQuestions
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200",
										children: ["Flagged: ", flaggedCount]
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200",
											children: [
												"Answered: ",
												answeredCount,
												" / ",
												totalQuestions
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200",
											children: [
												"Correct: ",
												correctCount,
												" / ",
												answeredCount
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200",
											children: [
												"Accuracy: ",
												accuracy,
												"%"
											]
										})
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-3 font-mono text-[11px]",
							children: answeredCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-400",
								children: "0 attempted · No score or accuracy computed yet"
							}) : mode === "EXAM" && !examSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-slate-500",
								children: "Exam Mode · Scoring withheld until submit"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-slate-600",
								children: [
									"Session Accuracy: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
										className: "text-slate-900",
										children: [accuracy, "%"]
									}),
									" (",
									correctCount,
									"/",
									answeredCount,
									")"
								]
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-full h-2 bg-slate-100 rounded-full overflow-hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-[#0f8b8d] transition-all duration-300 rounded-full",
							style: { width: `${totalQuestions > 0 ? answeredCount / totalQuestions * 100 : 0}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between text-[10px] text-slate-400 font-mono",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Question 1" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								answeredCount,
								" of ",
								totalQuestions,
								" answered (",
								totalQuestions > 0 ? Math.round(answeredCount / totalQuestions * 100) : 0,
								"%)"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Question ", totalQuestions] })
						]
					})
				]
			}),
			showResultsScreen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 animate-in fade-in",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-6 h-6 text-[#0f8b8d]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-xl font-bold text-slate-900",
									children: "Session Results & Analysis"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#001432] text-[#8ff3f4]",
									children: currentQ?.examType || "CLINICAL BLOCK"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2.5 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-600",
									children: mode === "EXAM" ? "Exam Mode" : "Tutor Mode"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-slate-500 mt-1",
							children: [
								"Completed in ",
								formatTimer(secondsElapsed),
								" · ",
								questions.length,
								" Questions Block"
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowResultsScreen(false),
								className: "px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all",
								children: "Review Questions with Explanations"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => onNavigate("analytics"),
								className: "px-4 py-2 rounded-xl bg-[#001432] hover:bg-[#13294b] text-white text-xs font-bold transition-all",
								children: "Go to Analytics"
							})]
						})]
					}),
					isAMC && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-5 rounded-2xl bg-[#001432] text-white border border-[#13294b] space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs font-bold text-[#8ff3f4] uppercase tracking-wider flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Award, { className: "w-4 h-4 text-[#8ff3f4]" }), " AMC CAT Scaled Score"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30",
									children: "Estimate"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-3xl font-mono font-bold text-white",
										children: amcEstimatedScore
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-mono text-slate-400",
										children: "/ 500"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `ml-auto px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${amcEstimatedScore >= 250 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`,
										children: amcEstimatedScore >= 250 ? "Estimated Pass (≥250)" : "Below Passing Cutoff (<250)"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-slate-300 leading-relaxed border-t border-slate-700/60 pt-2.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-slate-100",
										children: "Estimate Computation:"
									}),
									" Computed from this session's real performance (",
									correctCount,
									" correct of ",
									totalQuestions,
									" total questions = ",
									totalQuestions > 0 ? Math.round(correctCount / totalQuestions * 100) : 0,
									"%) using the standard linear scaling formula: ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
										className: "bg-slate-800 px-1.5 py-0.5 rounded text-[#8ff3f4]",
										children: "Score = 100 + (Accuracy % × 4)"
									}),
									". Official AMC CAT examinations apply multi-parameter Computerized Adaptive Testing (IRT 3PL model)."
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 sm:grid-cols-4 gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-slate-50 border border-slate-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-500 font-semibold uppercase",
									children: "Attempted"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-2xl font-mono font-bold text-slate-900 mt-1",
									children: [
										answeredCount,
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-slate-400 font-normal",
											children: ["/ ", totalQuestions]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-emerald-50/70 border border-emerald-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-emerald-800 font-semibold uppercase",
									children: "Correct"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-mono font-bold text-emerald-700 mt-1",
									children: correctCount
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-rose-50/70 border border-rose-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-rose-800 font-semibold uppercase",
									children: "Incorrect"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-mono font-bold text-rose-700 mt-1",
									children: answeredCount - correctCount
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-teal-50/70 border border-teal-200",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-teal-800 font-semibold uppercase",
									children: "Session Accuracy"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-2xl font-mono font-bold text-teal-700 mt-1",
									children: accuracy !== null ? `${accuracy}%` : "-"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-bold text-slate-900",
							children: "Session Statistics:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 font-mono",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Time Elapsed: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-slate-800",
									children: formatTimer(secondsElapsed)
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Average Pace: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-slate-800",
									children: paceDisplay
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Flagged Questions: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
									className: "text-slate-800",
									children: flaggedCount
								})] })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between pt-4 border-t border-slate-200",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => onNavigate(currentQ?.sourceType ? "question-bank" : "practice"),
							className: "px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50",
							children: ["Back to ", currentQ?.sourceType ? "Question Bank" : "Practice Builder"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setShowResultsScreen(false),
							className: "px-4 py-2 rounded-xl bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold transition-all shadow-xs",
							children: "Review Test Questions with Explanations →"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-12 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "lg:col-span-8 space-y-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6",
						children: [
							(() => {
								const questionPrompt = (currentQ?.question || currentQ?.questionText || "").trim();
								const rawStem = (currentQ?.stem || "").trim();
								const isStemMissingOrEqual = !rawStem || rawStem.toLowerCase() === questionPrompt.toLowerCase();
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									!isStemMissingOrEqual && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-slate-50 border-l-4 border-[#001432] text-slate-800 text-sm leading-relaxed font-sans",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-slate-900 block mb-1",
											children: "Clinical Vignette:"
										}), rawStem]
									}),
									currentQ?.image && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-xs font-bold text-slate-700",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: currentQ.imageCaption || "Histopathology Specimen" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-slate-400 font-mono",
												children: "Special Stain"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: currentQ.image,
											alt: "Clinical Specimen",
											className: "w-full max-h-72 object-cover rounded-lg border border-slate-300 shadow-sm"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base sm:text-lg font-bold text-slate-900 leading-snug",
										children: questionPrompt
									})
								] });
							})(),
							currentQ.statements && currentQ.statements.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-bold uppercase tracking-wider text-slate-500",
									children: "Clinical Assertions to Evaluate:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2.5",
									children: currentQ.statements.map((stmt) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed space-y-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-bold text-slate-900 font-mono",
													children: [
														"Statement ",
														stmt.num,
														":"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[10px] font-mono font-bold px-2 py-0.5 rounded ${stmt.statusBadge === "TRAP POINT" ? "bg-rose-100 text-rose-800" : "bg-teal-100 text-teal-800"}`,
													children: stmt.statusBadge
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-sans text-slate-700",
												children: stmt.text
											}),
											isAnswered && showExplanation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: `mt-2 pt-2 border-t text-[11px] leading-relaxed ${stmt.isCorrect ? "border-teal-200 text-teal-900" : "border-rose-200 text-rose-900"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-bold",
													children: stmt.isCorrect ? "✓ True: " : "✗ False (Trap): "
												}), stmt.explanation]
											})
										]
									}, stmt.num))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-bold uppercase tracking-wider text-slate-500",
									children: isAMC ? "Select Single Best Answer (5 Options):" : "Select Answer Option:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2.5",
									children: currentQ.options.map((opt) => {
										const isSelected = selectedAnswer === opt.id;
										const isCorrect = currentQ.correctOption === opt.id;
										let borderClass = "border-slate-200 hover:border-slate-300 bg-white";
										let badgeClass = "bg-slate-100 text-slate-700";
										if (isAnswered && showExplanation) {
											if (isCorrect) {
												borderClass = "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500";
												badgeClass = "bg-emerald-600 text-white";
											} else if (isSelected) {
												borderClass = "border-rose-500 bg-rose-50/70 ring-1 ring-rose-500";
												badgeClass = "bg-rose-600 text-white";
											}
										} else if (isSelected) {
											borderClass = "border-[#0f8b8d] bg-teal-50/20 ring-1 ring-[#0f8b8d]";
											badgeClass = "bg-[#0f8b8d] text-white";
										}
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											onClick: () => handleSelectOption(opt.id),
											className: `p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 text-xs ${borderClass}`,
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${badgeClass}`,
													children: opt.id
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "flex-1 font-medium text-slate-800 leading-relaxed pt-0.5",
													children: opt.text
												}),
												isAnswered && showExplanation && isCorrect && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-5 h-5 text-emerald-600 shrink-0 mt-0.5" }),
												isAnswered && showExplanation && isSelected && !isCorrect && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5 text-rose-600 shrink-0 mt-0.5" })
											]
										}, opt.id);
									})
								})]
							}),
							isAnswered && showExplanation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-4 pt-4 border-t border-slate-200",
								children: [
									currentQ.trapExplanation && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "p-4 rounded-xl bg-amber-50/90 border border-amber-200",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-4 h-4 text-amber-600 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-xs font-bold text-amber-900 uppercase tracking-wider",
												children: ["Distractor Dissection: ", currentQ.trapType || "COGNITIVE HEURISTIC ERROR"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-amber-800 mt-1 leading-relaxed",
												children: currentQ.trapExplanation
											})] })]
										})
									}),
									currentQ.explanation && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-white border border-slate-200 space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs font-bold text-slate-900 uppercase tracking-wider",
											children: "Explanation"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-700 leading-relaxed whitespace-pre-line",
											children: currentQ.explanation
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-4 rounded-xl bg-[#001432] text-white space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 text-xs font-bold text-[#8ff3f4] uppercase tracking-wider",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Brain, { className: "w-4 h-4 text-[#8ff3f4]" }), " High-Yield Board Pearl"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs text-slate-200 leading-relaxed",
											children: currentQ.boardPearl
										})]
									}),
									currentQ.citations && currentQ.citations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, { className: "w-4 h-4 text-slate-400 shrink-0" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-slate-700",
												children: "Verified Citations:"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-slate-600",
												children: currentQ.citations.join(" · ")
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiQuestionTools, {
										question: currentQ,
										userChoice: selectedAnswer ?? void 0
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pt-4 border-t border-slate-100",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										disabled: currentIndex === 0,
										onClick: () => setCurrentIndex((prev) => Math.max(0, prev - 1)),
										className: "px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-4 h-4" }), " Previous"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => onNavigate("ai-tutor", currentQ.id),
										className: "px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-amber-600" }), " Dissect with AI Tutor"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										disabled: currentIndex === questions.length - 1,
										onClick: () => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1)),
										className: "px-4 py-2 rounded-xl bg-[#001432] text-white text-xs font-bold hover:bg-[#13294b] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5",
										children: ["Next ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4" })]
									})
								]
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:col-span-4 space-y-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-bold text-slate-900",
								children: "Question Palette"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-mono text-slate-500",
								children: [
									answeredCount,
									" / ",
									totalQuestions,
									" Attempted"
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-5 gap-2",
							children: questions.map((q, idx) => {
								const ans = userAnswers[q.id];
								const isCurrent = idx === currentIndex;
								const isFlag = !!flaggedIds[q.id];
								let bgClass = "bg-slate-100 text-slate-700 hover:bg-slate-200";
								if (ans) {
									if (mode === "EXAM" && !examSubmitted) bgClass = "bg-[#001432] text-white font-bold";
									else if (ans === q.correctOption) bgClass = "bg-emerald-600 text-white font-bold";
									else bgClass = "bg-rose-600 text-white font-bold";
								}
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setCurrentIndex(idx),
									className: `h-9 rounded-xl text-xs font-mono font-medium transition-all relative ${bgClass} ${isCurrent ? "ring-2 ring-[#0f8b8d] ring-offset-2" : ""}`,
									children: [idx + 1, isFlag && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" })]
								}, q.id);
							})
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-bold text-slate-900",
								children: "Session Performance"
							}),
							answeredCount === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-base font-mono font-bold text-slate-700",
									children: "0 attempted"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-slate-400",
									children: "No score or accuracy computed yet"
								})]
							}) : mode === "EXAM" && !examSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2 text-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-slate-50 border border-slate-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xl font-mono font-bold text-slate-900",
											children: [
												answeredCount,
												" / ",
												totalQuestions
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[10px] text-slate-500 uppercase tracking-wide",
											children: "Answered"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-xl bg-slate-50 border border-slate-100",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xl font-mono font-bold text-amber-600",
											children: flaggedCount
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-[10px] text-slate-500 uppercase tracking-wide",
											children: "Flagged"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[11px] text-slate-500 text-center font-mono",
									children: "Exam mode: scoring revealed upon submission"
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2 text-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-slate-50 border border-slate-100",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xl font-mono font-bold text-slate-900",
										children: [
											correctCount,
											" / ",
											answeredCount
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-slate-500 uppercase tracking-wide",
										children: "Correct Answers"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-slate-50 border border-slate-100",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xl font-mono font-bold text-emerald-600",
										children: [accuracy, "%"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-[10px] text-slate-500 uppercase tracking-wide",
										children: "Session Accuracy"
									})]
								})]
							}),
							!examSubmitted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: handleSubmitModule,
								className: "w-full mt-3 py-2.5 bg-[#001432] hover:bg-[#13294b] text-white text-xs font-bold rounded-xl transition-all",
								children: mode === "EXAM" ? "Submit Exam & View Results" : "Submit Module & View Results"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 mt-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setShowResultsScreen(true),
									className: "w-full py-2.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white text-xs font-bold rounded-xl transition-all shadow-xs",
									children: "View Results Summary"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => onNavigate("analytics"),
									className: "w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all",
									children: "Go to Analytics"
								})]
							})
						]
					})]
				})]
			})
		]
	});
};
var JobsBanner = () => {
	const jobs = useStudyJobs();
	if (jobs.length === 0) return null;
	const running = jobs.filter((j) => j.status === "running");
	const finished = jobs.filter((j) => j.status !== "running");
	const visible = [...running, ...finished.slice(0, 3)];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between bg-[#001432] text-white rounded-t-xl px-3 py-2 border border-[#13294b] shadow-lg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wrench, { className: "w-3.5 h-3.5 text-[#8ff3f4]" }),
					" Background tasks",
					running.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-amber-300",
						children: [
							"(",
							running.length,
							" running)"
						]
					})
				]
			}), finished.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: clearFinishedJobs,
				className: "text-[10px] font-semibold text-slate-300 hover:text-white underline",
				children: "Clear finished"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "bg-white border border-slate-200 border-t-0 rounded-b-xl shadow-xl divide-y divide-slate-100 max-h-72 overflow-y-auto",
			children: visible.map((job) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-2.5 space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] font-semibold text-slate-800 truncate flex items-center gap-1.5",
							children: [
								job.status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3 h-3 text-[#0f8b8d] animate-spin shrink-0" }),
								job.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-3 h-3 text-emerald-600 shrink-0" }),
								job.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-3 h-3 text-rose-600 shrink-0" }),
								job.status === "stopped" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "w-3 h-3 text-slate-400 shrink-0" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate",
									children: job.label
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] text-slate-500 truncate",
							children: job.status === "error" ? job.error : job.detail || (job.status === "running" ? "Working…" : job.status)
						})]
					}), job.status === "running" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => stopJob(job.id),
						title: "Stop this task",
						className: "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold hover:bg-rose-100",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "w-2.5 h-2.5" }), " Stop"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => dismissJob(job.id),
						title: "Dismiss",
						className: "shrink-0 p-0.5 text-slate-400 hover:text-slate-700",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
					})]
				}), typeof job.progress === "number" && job.status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1.5 rounded-full bg-slate-100 overflow-hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-[#0f8b8d] transition-all",
						style: { width: `${Math.max(2, Math.min(100, job.progress))}%` }
					})
				})]
			}, job.id))
		})]
	});
};
var AITutorView = (0, import_react.lazy)(() => import("./AITutorView-BB9u7rX-.mjs").then((m) => ({ default: m.AITutorView })));
var PDFReaderView = (0, import_react.lazy)(() => import("./PDFReaderView-CVpub2wL.mjs").then((m) => ({ default: m.PDFReaderView })));
function App() {
	const [currentView, setCurrentView] = (0, import_react.useState)("analytics");
	const [restoredTest] = (0, import_react.useState)(() => loadActiveTest());
	const [currentExam, setCurrentExam] = (0, import_react.useState)(restoredTest?.exam ?? "INI_CET");
	const [activeQuestionId, setActiveQuestionId] = (0, import_react.useState)(restoredTest?.activeQuestionId ?? "");
	const [activeTestQuestions, setActiveTestQuestions] = (0, import_react.useState)(restoredTest?.questions);
	const [activeTestMode, setActiveTestMode] = (0, import_react.useState)(restoredTest?.mode ?? "TUTOR");
	(0, import_react.useEffect)(() => {
		saveActiveTest(activeTestQuestions && activeTestQuestions.length ? {
			questions: activeTestQuestions,
			mode: activeTestMode,
			exam: currentExam,
			activeQuestionId
		} : null);
	}, [
		activeTestQuestions,
		activeTestMode,
		currentExam,
		activeQuestionId
	]);
	const KEEP_ALIVE = [
		"practice",
		"test-runner",
		"question-bank"
	];
	const [mountedViews, setMountedViews] = (0, import_react.useState)([]);
	const currentViewRef = (0, import_react.useRef)(currentView);
	(0, import_react.useEffect)(() => {
		currentViewRef.current = currentView;
	}, [currentView]);
	const [readyNotice, setReadyNotice] = (0, import_react.useState)(null);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [isDarkMode, setIsDarkMode] = (0, import_react.useState)(false);
	const [, setDataVersion] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => subscribeDataChanged(() => setDataVersion((v) => v + 1)), []);
	const unresolvedMistakes = listCapturedQuestions().filter((q) => q.status === "unresolved").length;
	const srsDue = dueCount();
	(0, import_react.useEffect)(() => {
		if (KEEP_ALIVE.includes(currentView)) setMountedViews((m) => m.includes(currentView) ? m : [...m, currentView]);
	}, [currentView]);
	const handleNavigate = (view, targetId) => {
		if (view === "test-runner") setReadyNotice(null);
		setCurrentView(view);
		setMenuOpen(false);
		if (targetId) setActiveQuestionId(targetId);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const handleSearchSubmit = (query) => {
		const q = query.trim();
		if (!q) return;
		try {
			sessionStorage.setItem("pulse.research.query", q);
		} catch {}
		setCurrentView("research");
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const handleLaunchModule = (exam, count, mode, subjects, difficultyTier, difficultySubLevel, chosenSubtopics, generatedQuestions) => {
		setCurrentExam(exam);
		setActiveTestMode(mode);
		const questions = generatedQuestions ?? [];
		if (questions.length === 0) {
			setCurrentView("practice");
			return;
		}
		const tagged = questions.map((q) => ({
			...q,
			sourceType: "ai-generator"
		}));
		setActiveTestQuestions(tagged);
		if (tagged.length > 0) setActiveQuestionId(tagged[0].id);
		if (currentViewRef.current === "practice") {
			setReadyNotice(null);
			setCurrentView("test-runner");
		} else setReadyNotice({ count: tagged.length });
	};
	const handleLaunchBankQuestions = (questions, mode, exam) => {
		setCurrentExam(exam);
		setActiveTestMode(mode);
		setActiveTestQuestions(questions);
		if (questions.length > 0) setActiveQuestionId(questions[0].id);
		setCurrentView("test-runner");
	};
	const renderView = (view) => {
		switch (view) {
			case "analytics": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PerformanceAnalyticsView, {
				onNavigate: handleNavigate,
				onLaunchRemediation: (subject) => handleNavigate("test-runner", subject.includes("Pathology") ? "Q-PA-1049" : "Q10")
			});
			case "practice": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PracticeModuleBuilderView, {
				currentExam,
				onLaunchModule: handleLaunchModule,
				onNavigate: handleNavigate
			});
			case "question-bank": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuestionBankPracticeView, {
				onNavigate: handleNavigate,
				onLaunchTest: handleLaunchBankQuestions
			});
			case "test-runner": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TestRunnerView, {
				initialQuestionId: activeQuestionId,
				onNavigate: handleNavigate,
				questions: activeTestQuestions,
				mode: activeTestMode
			});
			case "mistakes": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MistakeNotebookView, {
				onNavigate: handleNavigate,
				onStartSprint: (questions) => {
					if (!questions.length) return;
					setActiveTestMode("TUTOR");
					setActiveTestQuestions(questions);
					setActiveQuestionId(questions[0].id);
					setCurrentView("test-runner");
				},
				currentExam
			});
			case "highlights": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HighlightsSavedView, { onNavigate: handleNavigate });
			case "ai-tutor": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AITutorView, {
				initialQuestionId: activeQuestionId,
				attachedQuestion: (activeQuestionId ? activeTestQuestions?.find((q) => q.id === activeQuestionId) : null) ?? null,
				onNavigate: handleNavigate,
				currentExam
			});
			case "pdf-reader": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PDFReaderView, {
				onNavigate: handleNavigate,
				onGenerateQuizFromPage: (book, page, snippet) => {
					handleNavigate("practice");
				}
			});
			case "research": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClinicalBrowserView, { onNavigate: handleNavigate });
			case "settings": return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsAIView, {});
			default: return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PerformanceAnalyticsView, {
				onNavigate: handleNavigate,
				onLaunchRemediation: (subject) => handleNavigate("test-runner")
			});
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `min-h-screen bg-[#f8f9ff] text-slate-800 flex font-sans antialiased selection:bg-[#0f8b8d]/20 selection:text-[#001432] ${isDarkMode ? "dark" : ""}`,
		children: [
			menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Close menu",
				className: "fixed inset-0 z-30 bg-[#001432]/50 md:hidden",
				onClick: () => setMenuOpen(false)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `${menuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} md:flex md:static md:z-20`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {
					currentView,
					onNavigate: handleNavigate,
					selectedExam: currentExam,
					onSelectExam: setCurrentExam,
					darkMode: isDarkMode,
					onToggleDarkMode: () => setIsDarkMode(!isDarkMode),
					unresolvedMistakesCount: unresolvedMistakes,
					srsDueCount: srsDue
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 flex flex-col min-w-0 h-screen overflow-y-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "md:hidden sticky top-0 z-20 flex items-center gap-2 bg-[#001432] px-2 py-2 text-white",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-label": "Open menu",
							onClick: () => setMenuOpen(true),
							className: "rounded-lg p-2 hover:bg-white/10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-extrabold tracking-tight",
							children: "PULSE MED"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TopBar, {
						selectedExam: currentExam,
						onSearchSubmit: handleSearchSubmit,
						onNavigate: handleNavigate
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
						className: "flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Suspense, {
							fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-slate-500",
								children: "Loading this screen…"
							}),
							children: [
								readyNotice && currentView !== "test-runner" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									role: "status",
									className: "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-sm font-semibold text-slate-800",
										children: [
											"Your ",
											readyNotice.count,
											"-question module finished generating and is ready."
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleNavigate("test-runner"),
											className: "rounded-lg bg-[#0f8b8d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00696b]",
											children: "Open test"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setReadyNotice(null),
											className: "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200",
											children: "Dismiss"
										})]
									})]
								}),
								KEEP_ALIVE.filter((v) => mountedViews.includes(v) || v === currentView).map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: v === currentView ? "" : "hidden",
									children: renderView(v)
								}, v)),
								!KEEP_ALIVE.includes(currentView) && renderView(currentView)
							]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(JobsBanner, {})
		]
	});
}
var routes_exports = /* @__PURE__ */ __exportAll({ component: () => Home });
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {});
}
//#endregion
export { highlightFromPdfSelection as _, stopJob as a, setActiveProvider as b, listCapturedQuestions as c, aiComplete as d, extractJson as f, highlightFromAiReply as g, getEffectiveModel as h, startJob as i, NOT_CONNECTED_MESSAGE as l, getActiveProvider as m, RevisionNote as n, ocrImage as o, fetchProviderStatus as p, downloadNotesPdf as r, capturedToClinicalQuestion as s, routes_exports as t, addUserHighlight as u, listUserHighlightsForDoc as v, setModel as x, removeUserHighlight as y };
