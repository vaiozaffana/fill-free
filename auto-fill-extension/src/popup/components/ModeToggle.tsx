import React from 'react';

export type Mode = 'dummy' | 'file';

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps): React.JSX.Element {
  return (
    <div className="mode-toggle" role="group" aria-label="Fill mode">
      <button
        type="button"
        className={mode === 'dummy' ? 'mode-btn active' : 'mode-btn'}
        aria-pressed={mode === 'dummy'}
        onClick={() => onChange('dummy')}
      >
        Dummy
      </button>
      <button
        type="button"
        className={mode === 'file' ? 'mode-btn active' : 'mode-btn'}
        aria-pressed={mode === 'file'}
        onClick={() => onChange('file')}
      >
        File
      </button>
    </div>
  );
}
