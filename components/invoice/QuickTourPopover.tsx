type QuickTourPopoverProps = {
  tourStep: number | null;
  tourSteps: string[];
  onSkip: () => void;
  onNext: () => void;
};

export default function QuickTourPopover({ tourStep, tourSteps, onSkip, onNext }: QuickTourPopoverProps) {
  if (tourStep === null) return null;

  return (
    <div className="fixed bottom-[130px] left-4 z-50 w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:bottom-6">
      <p className="text-sm font-semibold text-indigo-700">Quick Tour</p>
      <p className="mt-2 text-sm text-slate-700">{tourSteps[tourStep]}</p>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          onClick={onSkip}
        >
          Skip tour
        </button>
        <div className="flex items-center gap-1">
          {tourSteps.map((_, index) => (
            <span key={index} className={`h-1.5 w-1.5 rounded-full ${index === tourStep ? 'bg-indigo-600' : 'bg-slate-300'}`} />
          ))}
        </div>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          onClick={onNext}
        >
          {tourStep >= tourSteps.length - 1 ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}
