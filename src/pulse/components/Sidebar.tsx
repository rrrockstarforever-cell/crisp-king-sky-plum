import React, { useState, useEffect } from 'react';
import {
  Activity,
  BookOpen,
  Cpu,
  Brain,
  Layers,
  FileQuestion,
  Timer,
  AlertOctagon,
  BarChart3,
  Bookmark,
  Compass,
  Sliders,
  Moon,
  Sun,
  ShieldCheck,
  FileText,
  UploadCloud,
  Calendar,
  Database
} from 'lucide-react';
import { AppView, ExamType } from '../types.ts';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  selectedExam: ExamType;
  onSelectExam: (exam: ExamType) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  unresolvedMistakesCount: number;
  srsDueCount: number;
}

const EXAM_CARDS: { id: ExamType; label: string; storageKeys: string[] }[] = [
  { id: 'NEET_PG', label: 'NEET-PG', storageKeys: ['exam.date.NEET_PG', 'exam.date.NEET-PG'] },
  { id: 'INI_CET', label: 'INI-CET', storageKeys: ['exam.date.INI_CET', 'exam.date.INI-CET'] },
  { id: 'AMC_CAT', label: 'AMC CAT', storageKeys: ['exam.date.AMC_CAT', 'exam.date.AMC-CAT'] },
];

const OFFICIAL_DATES: Record<ExamType, { iso: string; note: string }> = {
  INI_CET: { iso: '2026-11-01T09:00', note: 'Jan 2027 session · 1 Nov 2026' },
  NEET_PG: { iso: '', note: '2026 was 30 Aug. Next date is not published.' },
  AMC_CAT: { iso: '', note: 'No national date. Set the slot you booked.' },
};

const loadStoredExamDate = (examId: ExamType, storageKeys: string[]): string => {
  const manual = localStorage.getItem(`exam.date.manual.${examId}`);
  if (manual === 'cleared') return '';
  for (const k of storageKeys) {
    const val = localStorage.getItem(k);
    if (val) return val;
  }
  const official = OFFICIAL_DATES[examId].iso;
  if (official) {
    localStorage.setItem(storageKeys[0], official);
    localStorage.setItem(`exam.date.manual.${examId}`, 'auto');
    return official;
  }
  return '';
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  selectedExam,
  onSelectExam,
  darkMode,
  onToggleDarkMode,
  unresolvedMistakesCount,
  srsDueCount,
}) => {
  const [examDates, setExamDates] = useState<Record<ExamType, string>>(() => ({
    NEET_PG: loadStoredExamDate('NEET_PG', ['exam.date.NEET_PG', 'exam.date.NEET-PG']),
    INI_CET: loadStoredExamDate('INI_CET', ['exam.date.INI_CET', 'exam.date.INI-CET']),
    AMC_CAT: loadStoredExamDate('AMC_CAT', ['exam.date.AMC_CAT', 'exam.date.AMC-CAT']),
  }));

  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [editingExam, setEditingExam] = useState<ExamType | null>(null);
  const [tempDateInput, setTempDateInput] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveExamDate = (examId: ExamType, storageKeys: string[]) => {
    const trimmed = tempDateInput.trim();
    storageKeys.forEach(k => {
      if (trimmed) {
        localStorage.setItem(k, trimmed);
      } else {
        localStorage.removeItem(k);
      }
    });
    localStorage.setItem(`exam.date.manual.${examId}`, trimmed ? 'user' : 'cleared');
    setExamDates(prev => ({ ...prev, [examId]: trimmed }));
    setEditingExam(null);
  };

  const handleClearExamDate = (examId: ExamType, storageKeys: string[]) => {
    storageKeys.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(`exam.date.manual.${examId}`, 'cleared');
    setExamDates(prev => ({ ...prev, [examId]: '' }));
    setTempDateInput('');
    setEditingExam(null);
  };

  const getCountdown = (dateString: string) => {
    if (!dateString) return { status: 'UNSET' as const, text: 'Set exam date' };
    const target = new Date(dateString).getTime();
    if (isNaN(target)) return { status: 'UNSET' as const, text: 'Set exam date' };
    const diff = target - nowMs;
    if (diff <= 0) return { status: 'PASSED' as const, text: 'Exam date passed' };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      status: 'ACTIVE' as const,
      text: `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`,
    };
  };

  const navItems = [
    { id: 'analytics' as AppView, label: 'Performance Analytics', icon: BarChart3 },
    { id: 'practice' as AppView, label: 'Practice Builder', icon: FileQuestion },
    { id: 'question-bank' as AppView, label: 'Question Bank', icon: Database },
    { id: 'test-runner' as AppView, label: 'Active Test Runner', icon: Timer, badge: 'Live' },
    { id: 'mistakes' as AppView, label: 'Mistakes & Spaced Review', icon: AlertOctagon, badge: srsDueCount > 0 ? `${srsDueCount} due` : unresolvedMistakesCount > 0 ? String(unresolvedMistakesCount) : undefined },
    { id: 'highlights' as AppView, label: 'Highlights & Memory', icon: Bookmark },
    { id: 'ai-tutor' as AppView, label: 'Clinical AI Tutor', icon: Brain },
    { id: 'pdf-reader' as AppView, label: 'PDF Reader & OCR', icon: BookOpen },
    { id: 'research' as AppView, label: 'Clinical Evidence Browser', icon: Compass },
    { id: 'settings' as AppView, label: 'AI Subscriptions & OCR', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-black text-zinc-300 flex flex-col shrink-0 border-r border-white/10 h-screen select-none z-20">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center font-black text-sm">
            P
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
              <span>Pulse</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300">Med</span>
            </div>
            <p className="text-[11px] text-zinc-500">Exam studio</p>
          </div>
        </div>

        {/* 3-Way Exam Switcher (USMLE Removed) */}
        <div className="mt-4 p-1 bg-white/5 rounded-full flex items-center justify-between text-[11px] font-semibold">
          <button
            onClick={() => onSelectExam('NEET_PG')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              selectedExam === 'NEET_PG'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            NEET-PG
          </button>
          <button
            onClick={() => onSelectExam('INI_CET')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              selectedExam === 'INI_CET'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            INI-CET
          </button>
          <button
            onClick={() => onSelectExam('AMC_CAT')}
            className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
              selectedExam === 'AMC_CAT'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            AMC CAT
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-[13px] font-medium transition-all group ${
                isActive
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-black' : 'text-zinc-500 group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-black/10 text-black'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Real Live Countdown Cards per Exam */}
      <div className="px-3 pb-2 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-[#0f8b8d]" />
            Exam Countdowns
          </span>
          <span className="text-[9px] font-mono text-[#8ff3f4]">Live</span>
        </div>

        <div className="space-y-1.5">
          {EXAM_CARDS.map((exam) => {
            const isSelected = selectedExam === exam.id;
            const dateVal = examDates[exam.id];
            const countdown = getCountdown(dateVal);
            const isEditing = editingExam === exam.id;

            return (
              <div
                key={exam.id}
                onClick={() => {
                  if (!isEditing && selectedExam !== exam.id) {
                    onSelectExam(exam.id);
                  }
                }}
                className={`p-2.5 rounded-xl border text-xs transition-all ${
                  isSelected
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                }`}
              >
                {/* Header: Exam Title & Selected Badge */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {exam.label}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-[#0f8b8d]/30 text-[#8ff3f4] rounded border border-[#0f8b8d]/40">
                        Selected
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditing) {
                        setEditingExam(null);
                      } else {
                        setTempDateInput(dateVal);
                        setEditingExam(exam.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/60 transition-colors"
                    title={dateVal ? "Edit exam date" : "Set exam date"}
                  >
                    <Calendar className="w-3 h-3" />
                  </button>
                </div>

                {/* Inline Editing Form */}
                {isEditing ? (
                  <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="mt-1.5 pt-1.5 border-t border-slate-700/60 space-y-2"
                  >
                    <input
                      type="datetime-local"
                      value={tempDateInput}
                      onChange={(e) => setTempDateInput(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-white focus:outline-none focus:border-[#0f8b8d]"
                    />
                    <div className="flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleClearExamDate(exam.id, exam.storageKeys)}
                        className="text-slate-400 hover:text-rose-400 px-1 py-0.5"
                      >
                        Clear
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingExam(null)}
                          className="px-2 py-0.5 text-slate-300 hover:text-white rounded bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveExamDate(exam.id, exam.storageKeys)}
                          className="px-2 py-0.5 bg-[#0f8b8d] hover:bg-[#00696b] text-white font-bold rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Display: Live Countdown / Set exam date / Exam date passed */
                  <div>
                    {countdown.status === 'UNSET' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTempDateInput('');
                          setEditingExam(exam.id);
                        }}
                        className="mt-0.5 text-[11px] font-semibold text-[#8ff3f4] hover:underline flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Set exam date</span>
                      </button>
                    )}

                    {countdown.status === 'PASSED' && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-rose-400">Exam date passed</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempDateInput(dateVal);
                            setEditingExam(exam.id);
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline"
                        >
                          Update
                        </button>
                      </div>
                    )}

                    {countdown.status === 'ACTIVE' && (
                      <div className="font-mono font-bold text-xs text-white tracking-wide">
                        {countdown.text}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] leading-snug text-zinc-400">{OFFICIAL_DATES[exam.id].note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Controls: Dark Mode Toggle */}
      <div className="p-3 border-t border-[#13294b] flex items-center justify-between text-xs text-slate-400 shrink-0">
        <span className="text-[11px] font-mono text-slate-500">Board Exam Engine</span>

        <button
          onClick={onToggleDarkMode}
          className="p-1.5 rounded-lg bg-[#13294b] hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
