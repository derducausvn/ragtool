import React from 'react';

const ModeSelector = ({ mode, setMode }) => {
  const modes = ['F24 QA Expert', 'General Chat'];

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {modes.map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === m
                ? 'btn-primary text-white shadow'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-[#00B4F1]'
            }`}
          >
            {m === 'General Chat' ? 'General Assistant' : 'F24 QA Expert'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModeSelector;
