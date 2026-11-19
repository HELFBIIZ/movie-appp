'use client';

import { BookOpen, Film } from 'lucide-react';

export default function LearningModeToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div
        className="inline-flex rounded-xl border border-white/10 bg-slate-900 p-1"
        role="group"
        aria-label="Watch mode"
      >
        {[
          { value: false, label: 'Normal', Icon: Film },
          { value: true, label: 'Learning Mode', Icon: BookOpen },
        ].map(({ value, label, Icon }) => (
          <button
            type="button"
            key={label}
            aria-pressed={enabled === value}
            onClick={() => onChange(value)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-amber-300 ${enabled === value ? 'bg-[#c9a227] text-slate-950' : 'text-slate-300 hover:bg-white/5'}`}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-400">
        {enabled ? 'SceneChain · Watch. Understand. Remember.' : 'Киноноос үг, өгүүлбэр сур.'}
      </p>
    </div>
  );
}
