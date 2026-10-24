import { o as __toESM, r as __exportAll } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react, _ as createFileRoute, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, v as createRootRoute, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { u as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Cp3WgXnR.js
var router_Cp3WgXnR_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: errorMessage(error)
			})
		]
	});
}
/**
* Path-based preview hosts serve the dev server under `/{port_id}/` and strip
* that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
* prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
* client routing and generated links aligned with the public URL.
*/
var PATH_BASED_PREVIEW_HOSTS = /* @__PURE__ */ new Set([
	"preview.grok.genai.mil",
	"preview.grok.mil",
	"preview.grokgsac.com"
]);
var PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;
function previewPathPrefix(hostname, pathname) {
	if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return void 0;
	return PORT_ID_PREFIX.exec(pathname)?.[0];
}
function prefixRewrite(prefix) {
	return {
		input: ({ url }) => {
			if (url.pathname === prefix) url.pathname = "/";
			else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length);
			return url;
		},
		output: ({ url }) => {
			url.pathname = `${prefix}${url.pathname}`;
			return url;
		}
	};
}
function previewPathRewrite() {
	if (typeof window === "undefined") return void 0;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? prefixRewrite(prefix) : void 0;
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-BCyb5Sr3.css";
var APP_NAME = "Pulse Med";
var Route$2 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Pulse Med — NEET-PG, INI-CET and AMC CAT study engine with practice, a mistake notebook, and a clinical AI tutor."
			},
			{
				name: "theme-color",
				content: "#001432"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "bg-[#f8f9ff] text-[#141c28] antialiased",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	})
});
var $$splitComponentImporter = () => import("./routes-BVhAYNf3.mjs").then((n) => n.t);
var Route$1 = createFileRoute("/")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var UA = "Mozilla/5.0 (X11; Linux x86_64) PulseMed/0.2 (study tool)";
var TRUSTED = /(nih\.gov|ncbi\.nlm|who\.int|cdc\.gov|nice\.org\.uk|medlineplus|mayoclinic|msdmanuals|statpearls|radiopaedia|cochrane|bmj\.com|thelancet|nejm|jamanetwork|icmr|mohfw|aiims)/i;
var ents = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": "\"",
	"&#39;": "'",
	"&#x27;": "'",
	"&nbsp;": " "
};
var decode = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ents[m] ?? m);
var strip = (h) => decode(h.replace(/<(script|style|nav|header|footer|aside|svg|noscript|form)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
function isPublicUrl(u) {
	let x;
	try {
		x = new URL(u);
	} catch {
		return false;
	}
	if (!/^https?:$/.test(x.protocol)) return false;
	const h = x.hostname.toLowerCase();
	if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.includes(":")) return false;
	const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (m) {
		const [a, b] = [+m[1], +m[2]];
		if (a === 10 || a === 127 || a === 0 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168) return false;
	}
	return true;
}
async function get(url, ms = 12e3) {
	const r = await fetch(url, {
		headers: {
			"User-Agent": UA,
			Accept: "text/html,application/xhtml+xml,application/json,application/xml"
		},
		redirect: "follow",
		signal: AbortSignal.timeout(ms)
	});
	if (!r.ok) throw new Error("HTTP " + r.status);
	return r;
}
async function ddg(q) {
	const html = await (await get("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q))).text();
	const out = [];
	const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
	const snip = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => strip(m[1]));
	let m, i = 0;
	while ((m = re.exec(html)) && out.length < 8) {
		let href = decode(m[1]);
		if (href.startsWith("//")) href = "https:" + href;
		try {
			const u = new URL(href);
			if (u.hostname.endsWith("duckduckgo.com") && u.searchParams.get("uddg")) href = u.searchParams.get("uddg");
		} catch {}
		if (isPublicUrl(href)) out.push({
			title: strip(m[2]),
			url: href,
			snippet: snip[i] ?? ""
		});
		i++;
	}
	return out;
}
async function pubmed(q) {
	const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
	const ids = (await (await get(`${base}esearch.fcgi?db=pubmed&retmode=json&retmax=3&sort=relevance&term=${encodeURIComponent(q)}`)).json()).esearchresult?.idlist ?? [];
	if (!ids.length) return [];
	return [...(await (await get(`${base}efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`)).text()).matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)].map((m) => {
		const a = m[1];
		const pick = (re) => strip((a.match(re) || [])[1] || "");
		const abs = [...a.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((x) => {
			const label = (x[1].match(/Label="([^"]+)"/) || [])[1];
			return (label ? label + ": " : "") + strip(x[2]);
		}).join(" ");
		const id = pick(/<PMID[^>]*>(\d+)<\/PMID>/);
		return {
			title: pick(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/),
			url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
			text: `${pick(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/)} ${pick(/<PubDate>[\s\S]*?<Year>(\d+)<\/Year>/)}. ${abs}`.slice(0, 2500)
		};
	}).filter((s) => s.text.length > 40);
}
async function pageText(url) {
	const r = await get(url);
	const type = r.headers.get("content-type") || "";
	if (!/text\/html|text\/plain|xml/.test(type)) throw new Error("not a web page");
	return strip((await r.text()).slice(0, 15e5)).slice(0, 2500);
}
async function research(query) {
	const q = String(query || "").trim().slice(0, 300);
	if (!q) throw new Error("Nothing to search for.");
	const [w, p] = await Promise.allSettled([ddg(q), pubmed(q)]);
	const web = (w.status === "fulfilled" ? w.value : []).sort((a, b) => Number(TRUSTED.test(b.url)) - Number(TRUSTED.test(a.url))).slice(0, 3);
	const pm = p.status === "fulfilled" ? p.value : [];
	const pages = await Promise.allSettled(web.map((x) => pageText(x.url)));
	const sources = [...web.map((x, i) => ({
		title: x.title,
		url: x.url,
		text: (pages[i].status === "fulfilled" && pages[i].value.length > 200 ? pages[i].value : x.snippet) || x.snippet,
		kind: "web"
	})), ...pm.map((x) => ({
		...x,
		kind: "pubmed"
	}))].filter((s) => s.text).map((s, i) => ({
		n: i + 1,
		...s
	}));
	if (!sources.length) throw new Error("No sources found (check your internet connection, or try different wording).");
	return {
		sources,
		retrievedAt: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
	};
}
var GROK_MODEL = "grok-4.5";
var DEFAULT_MODELS = {
	gemini: "gemini-2.5-flash",
	chatgpt: "gpt-4.1",
	claude: "claude-sonnet-4-5",
	grok: GROK_MODEL
};
var g = globalThis;
function geminiKey() {
	return (g.__pulseGeminiKey || "").trim();
}
function setGeminiKey(key) {
	g.__pulseGeminiKey = key;
}
function grokReady() {
	return Boolean(process.env.XAI_API_KEY?.trim());
}
function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json",
			"cache-control": "no-store"
		}
	});
}
var DESKTOP_ONLY = "ChatGPT and Claude subscription sign-in is part of the Pulse Med desktop app. This web version uses the built-in Grok connection.";
function clampMessages(raw) {
	if (!Array.isArray(raw) || raw.length === 0 || raw.length > 16) return null;
	const out = [];
	let total = 0;
	for (const m of raw) {
		if (!m || m.role !== "user" && m.role !== "assistant" || typeof m.content !== "string") return null;
		const content = m.content.slice(0, 24e3);
		total += content.length;
		if (total > 8e4) return null;
		out.push({
			role: m.role,
			content
		});
	}
	return out;
}
async function callGrok(opts) {
	const apiKey = process.env.XAI_API_KEY?.trim();
	if (!apiKey) throw Object.assign(/* @__PURE__ */ new Error("Grok is not available in this environment."), { status: 401 });
	const requested = (opts.model || "").trim();
	const model = requested.startsWith("grok-") ? requested : GROK_MODEL;
	const messages = [...opts.system ? [{
		role: "system",
		content: opts.system.slice(0, 12e3)
	}] : [], ...opts.messages];
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model,
			messages,
			max_tokens: 4096,
			temperature: .4,
			...opts.json ? { response_format: { type: "json_object" } } : {}
		})
	});
	const body = await res.json().catch(() => null);
	if (!res.ok) {
		const msg = body?.error?.message || `Grok request failed (HTTP ${res.status}).`;
		if (res.status === 400 && model !== GROK_MODEL && /model/i.test(msg)) return callGrok({
			...opts,
			model: GROK_MODEL
		});
		throw Object.assign(new Error(msg), { status: res.status === 401 ? 401 : 502 });
	}
	return body?.choices?.[0]?.message?.content ?? "";
}
async function callGemini(opts) {
	const key = geminiKey();
	if (!key) throw Object.assign(/* @__PURE__ */ new Error("Gemini is not connected. Add a Gemini API key in Settings."), { status: 401 });
	const model = (opts.model || DEFAULT_MODELS.gemini).replace(/^models\//, "");
	const contents = opts.messages.map((m) => ({
		role: m.role === "assistant" ? "model" : "user",
		parts: [{ text: m.content }]
	}));
	const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			systemInstruction: opts.system ? { parts: [{ text: opts.system.slice(0, 12e3) }] } : void 0,
			contents,
			generationConfig: {
				temperature: .4,
				maxOutputTokens: 4096,
				...opts.json ? { responseMimeType: "application/json" } : {}
			}
		})
	});
	const body = await res.json().catch(() => null);
	if (!res.ok) throw Object.assign(new Error(body?.error?.message || `Gemini request failed (HTTP ${res.status}).`), { status: 502 });
	return body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
}
async function runCompletion(opts) {
	if (opts.provider === "grok") return callGrok(opts);
	if (opts.provider === "gemini") return callGemini(opts);
	if (opts.provider === "chatgpt" || opts.provider === "claude") throw Object.assign(/* @__PURE__ */ new Error(DESKTOP_ONLY), { status: 401 });
	throw Object.assign(/* @__PURE__ */ new Error(`Unknown AI provider: ${opts.provider}`), { status: 400 });
}
function parseJsonBlock(raw) {
	if (!raw) return null;
	let text = raw.trim();
	const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fence) text = fence[1].trim();
	const start = text.search(/[[{]/);
	if (start > 0) text = text.slice(start);
	const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
	if (end > -1) text = text.slice(0, end + 1);
	try {
		const value = JSON.parse(text);
		if (value && typeof value === "object" && !Array.isArray(value)) return value;
		return null;
	} catch {
		return null;
	}
}
var PERSONA = {
	BOARD_MASTER: "You are the PULSE MED Board Exam Master for NEET-PG / INI-CET / AMC CAT: razor-sharp high-yield clinical breakdowns, distractor dissection, and exam-board pearls.",
	ATTENDING: "You are the PULSE MED Socratic Attending Physician on teaching rounds: reason step by step with the resident.",
	PHARMACOLOGIST: "You are the PULSE MED Mechanism & Kinetics Specialist: pharmacodynamics, pharmacokinetics, receptors and resistance explained precisely."
};
function statusBody() {
	return {
		success: true,
		providers: {
			gemini: { connected: Boolean(geminiKey()) },
			chatgpt: { connected: false },
			claude: { connected: false },
			grok: {
				connected: grokReady(),
				userEmail: grokReady() ? "Built-in Grok" : void 0
			}
		},
		defaults: DEFAULT_MODELS
	};
}
async function handlePost(path, request) {
	let body = {};
	if (request.headers.get("content-length") && Number(request.headers.get("content-length")) > 4e5) return json({ error: "Request is too large." }, 413);
	try {
		const parsed = await request.json();
		if (parsed && typeof parsed === "object") body = parsed;
	} catch {
		body = {};
	}
	if (path === "/api/oauth/start" || path === "/api/oauth/poll" || path === "/api/oauth/complete") {
		if (String(body.provider || "") === "grok" && grokReady()) return json({ error: "Grok is already connected in this web app. Open Settings and set it active." }, 400);
		return json({ error: DESKTOP_ONLY }, 400);
	}
	if (path === "/api/oauth/logout") {
		const provider = String(body.provider || "");
		if (provider === "gemini") setGeminiKey("");
		if (provider === "grok") return json({
			ok: true,
			connected: grokReady(),
			note: "Built-in Grok stays available in the web app."
		});
		return json({
			ok: true,
			connected: false,
			provider
		});
	}
	if (path === "/api/settings/gemini-key") {
		const key = String(body.apiKey || "").trim();
		if (!/^[A-Za-z0-9_\-]{10,}$/.test(key)) return json({ error: "That does not look like a valid Gemini API key." }, 400);
		setGeminiKey(key);
		return json({
			ok: true,
			connected: true
		});
	}
	if (path === "/api/ai/complete") {
		const provider = String(body.provider || "");
		const messages = clampMessages(body.messages);
		if (!provider) return json({ error: "No AI provider selected. Connect an AI provider in Settings." }, 400);
		if (!messages) return json({ error: "messages must be a short array of {role, content}." }, 400);
		try {
			const text = await runCompletion({
				provider,
				model: typeof body.model === "string" ? body.model : void 0,
				system: typeof body.system === "string" ? body.system : void 0,
				messages,
				json: Boolean(body.json)
			});
			if (!text.trim()) return json({ error: "The AI provider returned an empty response. Try again." }, 502);
			return json({
				success: true,
				text,
				model: typeof body.model === "string" && body.model || DEFAULT_MODELS[provider] || GROK_MODEL
			});
		} catch (err) {
			const e = err;
			return json({ error: e.message || "AI request failed." }, e.status || 502);
		}
	}
	if (path === "/api/ai/tutor-chat") {
		const message = typeof body.message === "string" ? body.message.slice(0, 12e3) : "";
		if (!message.trim()) return json({ error: "message is required." }, 400);
		let provider = typeof body.provider === "string" ? body.provider : "";
		if (!provider) provider = grokReady() ? "grok" : geminiKey() ? "gemini" : "";
		if (!provider) return json({ error: "No AI provider is connected yet." }, 401);
		const persona = typeof body.persona === "string" ? body.persona : "BOARD_MASTER";
		const exam = typeof body.exam === "string" ? body.exam : "";
		const contextQuestion = body.contextQuestion;
		const system = [
			"You are the PULSE MED clinical AI tutor for postgraduate medical exams (NEET-PG, INI-CET, AMC CAT).",
			exam ? `The learner's active exam is ${exam.replaceAll("_", "-")}.` : "",
			PERSONA[persona] || PERSONA.BOARD_MASTER,
			"Be high-yield and clinically grounded. Do not invent citations.",
			contextQuestion?.stem ? `Attached question (${contextQuestion.subject || "n/a"} / ${contextQuestion.subtopic || "n/a"}). Stem: "${String(contextQuestion.stem).slice(0, 2e3)}". Marked key: ${contextQuestion.correctOption || "n/a"}.` : "",
			"Respond with ONLY a JSON object: {\"reply\":\"markdown answer\",\"reasoningSteps\":[{\"step\":\"\",\"detail\":\"\"}],\"pearl\":\"\",\"citations\":[],\"suggestedFollowups\":[]}"
		].filter(Boolean).join("\n");
		const history = clampMessages(body.history) ?? [];
		try {
			const raw = await runCompletion({
				provider,
				model: typeof body.model === "string" ? body.model : void 0,
				system,
				messages: [...history.slice(-8), {
					role: "user",
					content: message
				}],
				json: true
			});
			const parsed = parseJsonBlock(raw);
			const reply = typeof parsed?.reply === "string" && parsed.reply.trim() ? parsed.reply : raw.trim();
			if (!reply) return json({ error: "The AI provider returned an empty response. Try again." }, 502);
			const result = {
				success: true,
				reply,
				modelUsed: DEFAULT_MODELS[provider] || GROK_MODEL
			};
			if (Array.isArray(parsed?.reasoningSteps)) result.reasoningSteps = parsed.reasoningSteps.slice(0, 6);
			if (typeof parsed?.pearl === "string" && parsed.pearl.trim()) result.pearl = parsed.pearl.trim();
			if (Array.isArray(parsed?.citations)) result.citations = parsed.citations.filter((c) => typeof c === "string").slice(0, 6);
			if (Array.isArray(parsed?.suggestedFollowups)) result.suggestedFollowups = parsed.suggestedFollowups.filter((c) => typeof c === "string").slice(0, 4);
			return json(result);
		} catch (err) {
			const e = err;
			return json({ error: e.message || "AI request failed." }, e.status || 502);
		}
	}
	if (path === "/api/web/research") {
		const query = typeof body.query === "string" ? body.query : "";
		try {
			const out = await research(query);
			return json({
				success: true,
				sources: out.sources,
				retrievedAt: out.retrievedAt
			});
		} catch (err) {
			return json({ error: err.message || "Web research failed." }, 502);
		}
	}
	return json({ error: "Not found" }, 404);
}
async function handleGet(path) {
	if (path === "/api/oauth/status" || path === "/api/providers/status") {
		if (path === "/api/providers/status") return json({ providers: [
			"gemini",
			"chatgpt",
			"claude",
			"grok"
		].map((id) => ({
			id,
			model: DEFAULT_MODELS[id],
			connected: id === "grok" ? grokReady() : id === "gemini" ? Boolean(geminiKey()) : false
		})) });
		return json(statusBody());
	}
	if (path === "/api/models/available") return json({
		providers: {
			grok: grokReady() ? [{
				id: GROK_MODEL,
				name: "Grok 4.5",
				source: "account"
			}] : [],
			gemini: geminiKey() ? [{
				id: DEFAULT_MODELS.gemini,
				name: "Gemini 2.5 Flash",
				source: "account"
			}] : [],
			chatgpt: [],
			claude: []
		},
		errors: {
			chatgpt: DESKTOP_ONLY,
			claude: DESKTOP_ONLY,
			...grokReady() ? {} : { grok: "Grok is not available in this environment." },
			...geminiKey() ? {} : { gemini: "No Gemini API key saved." }
		},
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	if (path === "/api/models/catalog") try {
		const upstream = await fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(12e3) });
		if (!upstream.ok) throw new Error(`models.dev returned HTTP ${upstream.status}`);
		const raw = await upstream.json();
		const map = {
			chatgpt: "openai",
			claude: "anthropic",
			gemini: "google",
			grok: "xai"
		};
		const providers = {};
		for (const [ours, theirs] of Object.entries(map)) {
			const modelsObj = raw?.[theirs]?.models ?? {};
			providers[ours] = Object.values(modelsObj).map((m) => ({
				id: typeof m?.id === "string" ? m.id : "",
				name: typeof m?.name === "string" ? m.name : typeof m?.id === "string" ? m.id : "",
				context: typeof m?.limit?.context === "number" ? m.limit.context : null,
				released: typeof m?.release_date === "string" ? m.release_date : null
			})).filter((m) => m.id).slice(0, 40);
		}
		if (!providers.grok?.some((m) => m.id === GROK_MODEL)) providers.grok = [{
			id: GROK_MODEL,
			name: "Grok 4.5",
			context: null,
			released: null
		}, ...providers.grok || []];
		return json({
			providers,
			fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
		});
	} catch (err) {
		return json({ error: `Could not load the live model catalog (${err.message || "network error"}).` }, 502);
	}
	return json({ error: "Not found" }, 404);
}
async function handlePulseApi(request) {
	const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
	try {
		if (request.method === "GET") return await handleGet(path);
		if (request.method === "POST") return await handlePost(path, request);
		return json({ error: "method not allowed" }, 405);
	} catch (err) {
		console.error("[pulse] api error", err);
		return json({ error: "Request failed." }, 500);
	}
}
var handle = ({ request }) => handlePulseApi(request);
var Route = createFileRoute("/api/$")({ server: { handlers: {
	GET: handle,
	POST: handle
} } });
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$2
	}),
	ApiSplatRoute: Route.update({
		id: "/api/$",
		path: "/api/$",
		getParentRoute: () => Route$2
	})
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		rewrite: previewPathRewrite(),
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getRouter, router_Cp3WgXnR_exports as t };
