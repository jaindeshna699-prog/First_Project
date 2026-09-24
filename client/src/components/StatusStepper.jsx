const STEPS = [
  { key: 'posted', label: 'Posted' },
  { key: 'matched', label: 'Matched' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'delivered', label: 'Delivered' },
];

export default function StatusStepper({ status, timeline = [] }) {
  const isSideState = ['cancelled', 'expired', 'unmatched'].includes(status);

  // Find index of current standard step
  const currentIndex = STEPS.findIndex((s) => s.key === status);

  // Helper to check if a step was completed
  const isCompleted = (stepKey, idx) => {
    if (!isSideState && currentIndex >= idx) return true;
    return timeline.some((t) => t.status === stepKey);
  };

  const isCurrent = (stepKey) => {
    return status === stepKey;
  };

  return (
    <div className="w-full py-3">
      {/* Side state alert pill */}
      {isSideState && (
        <div className="mb-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
          <span>⚠️</span>
          <span>Status: {status}</span>
        </div>
      )}

      {/* Responsive Stepper Container */}
      <div className="relative flex items-center justify-between">
        {/* Connecting progress line */}
        <div className="absolute left-4 right-4 top-4 h-1 bg-surface-200 -z-0">
          <div
            className="h-full bg-brand-600 transition-all duration-500"
            style={{
              width:
                currentIndex >= 0
                  ? `${(currentIndex / (STEPS.length - 1)) * 100}%`
                  : '0%',
            }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const completed = isCompleted(step.key, idx);
          const current = isCurrent(step.key);

          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 ${
                  completed
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/30'
                    : current
                    ? 'bg-white border-brand-600 text-brand-600 ring-4 ring-brand-100'
                    : 'bg-white border-surface-300 text-surface-400'
                }`}
              >
                {completed ? '✓' : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  current
                    ? 'text-brand-700 font-bold'
                    : completed
                    ? 'text-surface-900'
                    : 'text-surface-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
