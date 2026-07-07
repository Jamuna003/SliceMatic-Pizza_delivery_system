import React from 'react';

interface EdgeCaseLabProps {
  onTrigger: (caseId: number) => void;
  activeCase: number | null;
}

export const EdgeCaseLab: React.FC<EdgeCaseLabProps> = ({ onTrigger, activeCase }) => {
  const cases = [
    {
      id: 1,
      title: 'Name with only spaces',
      desc: 'Injects "     " (whitespace-only) as the customer name, triggering trimmable validation rejection.',
    },
    {
      id: 2,
      title: 'Phone starting with 1',
      desc: 'Injects "1234567890" as customer phone. Specifically caught and rejected as invalid Indian mobile format.',
    },
    {
      id: 3,
      title: 'Quantity = 0 or 11',
      desc: 'Sets quantity to 11 to demonstrate strict range enforcement (valid range is 1-10 inclusive).',
    },
    {
      id: 4,
      title: 'Out of bounds item index',
      desc: 'Enters index "99" into the Crust Base text selection, catching out-of-range indices gracefully.',
    },
    {
      id: 5,
      title: 'Price instead of index',
      desc: 'Enters "299" (a common pizza price) into the Base selection, detecting that it matches a price instead of an index.',
    },
    {
      id: 6,
      title: 'Empty input submission',
      desc: 'Submits the active step with completely blank inputs to demonstrate field-specific inline error messages.',
    },
    {
      id: 7,
      title: 'Non-integer quantity',
      desc: 'Enters "4.5" (decimal) or "three" (text) to verify strict integer-only validation.',
    },
    {
      id: 8,
      title: 'Missing menu price',
      desc: 'Examines "Gluten-Free Extra (B6)", "Specialty Truffle (P9)" or "Gold Flakes (T11)" which have null/invalid prices.',
    },
  ];

  return (
    <div id="edgecase-lab-panel" className="bg-white border border-[#E8E4D9] rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#606C38] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#606C38]"></span>
        </span>
        <h3 className="text-base font-display font-semibold text-[#606C38]">POS Edge-Case Test Lab</h3>
      </div>
      <p className="text-xs text-stone-600 mb-4 leading-relaxed">
        Quick-test the system's compliance with the 8 critical requirements. Clicking any button will instantly populate the form and trigger the specific inline validation.
      </p>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {cases.map((c) => (
          <div
            key={c.id}
            id={`lab-case-${c.id}`}
            className={`p-3 rounded-lg border text-left transition-all ${
              activeCase === c.id
                ? 'bg-[#F4F3ED] border-[#8C8375] shadow-sm'
                : 'bg-[#FAF9F6] border-[#E8E4D9] hover:border-[#D0C9BC]'
            }`}
          >
            <div className="flex justify-between items-start gap-2 mb-1">
              <span className="text-[10px] font-mono font-semibold text-[#8C8375]">
                CASE #{c.id}
              </span>
              <button
                id={`btn-trigger-case-${c.id}`}
                onClick={() => onTrigger(c.id)}
                className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-[#606C38] hover:bg-[#4F592E] active:bg-[#3D4523] text-white transition shadow-sm cursor-pointer"
              >
                Trigger
              </button>
            </div>
            <h4 className="text-xs font-semibold text-[#3D332A] mb-1 font-display">{c.title}</h4>
            <p className="text-[11px] text-[#61574C] leading-normal">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[#E8E4D9] flex justify-between items-center text-[10px] text-[#8C8375] font-mono">
        <span>SLICEMATIC tablet POS v1.0</span>
        <span className="text-[#606C38] font-semibold">ALL EDGE CASES SHIELDED</span>
      </div>
    </div>
  );
};
