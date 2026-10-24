import type { ExamType, DifficultySubLevel } from '../types.ts';

export type EngineMode = 'exam_faithful' | 'challenge' | 'adaptive_practice';

export interface EngineConfig {
  level: number;
  intensity: number;
  mode: EngineMode;
}

export interface AdaptivePlan {
  exam: ExamType;
  total: number;
  level: number;
  intensity: number;
  subjectSubtopics: { subject: string; subtopics: string[] }[];
  questionTypes?: string[];
  stemPatterns?: string[];
  evidenceSources?: string[];
  patientGroup?: string;
  presentingProblems?: string[];
  sourceMaterial?: string;
}

const KEY = 'pulse.difficulty.engine';
const PLAN = 'pulse.adaptive.plan';

export const LEVELS: { n: number; label: string; steps: string; note: string }[] = [
  { n: 1, label: 'Foundation', steps: '1', note: 'One classic pattern. Two easy distractors.' },
  { n: 2, label: 'Standard', steps: '1–2', note: 'Exam-like. One close competitor.' },
  { n: 3, label: 'Hard', steps: '2–3', note: 'Two close options split by one decisive cue.' },
  { n: 4, label: 'Very hard', steps: '3–4', note: 'Comorbidity, timing, or a constraint buried in the history.' },
  { n: 5, label: 'Extreme', steps: '4–5', note: 'Every option is right in a nearby case. Only one fits these facts.' },
];

function clamp(n: unknown, lo: number, hi: number, fallback: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(x)));
}

export function loadEngine(): EngineConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const mode: EngineMode = p.mode === 'exam_faithful' || p.mode === 'adaptive_practice' ? p.mode : 'challenge';
      return { level: clamp(p.level, 1, 5, 3), intensity: clamp(p.intensity, 0, 100, 70), mode };
    }
  } catch { /* ignore */ }
  return { level: 3, intensity: 70, mode: 'challenge' };
}

export function saveEngine(config: EngineConfig) {
  localStorage.setItem(KEY, JSON.stringify(config));
}

export function levelToTier(level: number): { tier: 'LOW' | 'MEDIUM' | 'HIGH'; sub: DifficultySubLevel } {
  if (level <= 1) return { tier: 'LOW', sub: 'L1' };
  if (level === 2) return { tier: 'MEDIUM', sub: 'M1' };
  if (level === 3) return { tier: 'MEDIUM', sub: 'M2' };
  if (level === 4) return { tier: 'HIGH', sub: 'H1' };
  return { tier: 'HIGH', sub: 'H2' };
}

export function enginePrompt(exam: ExamType, cfg: EngineConfig): string {
  const L = LEVELS[Math.min(5, Math.max(1, cfg.level)) - 1];
  const heat = cfg.intensity >= 60
    ? 'Push distractors closer. The stem must make at least two real clinical facts interact before the answer is safe.'
    : 'Keep the stem short. One clear discriminator is enough.';
  const buried = cfg.level >= 4
    ? 'Hide the decisive constraint in a genuine fact: timing, pregnancy, renal function, a contraindication, or how far the hospital is. Do not announce it.'
    : '';
  const lock = exam === 'AMC_CAT'
    ? 'Exactly 5 options, one best answer, Australian care (GP, emergency, rural, ward).'
    : exam === 'INI_CET'
      ? 'Exactly 4 options, one best answer, Indian MBBS standard. Do not switch to multiple-correct because the item is harder.'
      : 'Exactly 4 options, one best answer, Indian MBBS / NBEMS style. Do not change the option count because the item is harder.';
  return [
    `Designed difficulty ${cfg.level}/5 (${L.label}), intensity ${cfg.intensity}/100, mode ${cfg.mode}. This is a teaching target, not an official item calibration.`,
    `Reasoning steps: ${L.steps}. ${L.note}`,
    heat,
    buried,
    'Never fake difficulty with missing data, trick grammar, obscure trivia, invalid doses, two equally defensible answers, or a described image that is not really shown.',
    lock,
    'Write an original stem. Do not copy or closely paraphrase a recalled exam item.',
  ].filter(Boolean).join('\n');
}

export function savePlan(plan: AdaptivePlan | null) {
  try {
    if (!plan) sessionStorage.removeItem(PLAN);
    else sessionStorage.setItem(PLAN, JSON.stringify(plan));
  } catch { /* ignore */ }
}

export function loadPlan(): AdaptivePlan | null {
  try {
    const raw = sessionStorage.getItem(PLAN);
    return raw ? JSON.parse(raw) as AdaptivePlan : null;
  } catch {
    return null;
  }
}
