import { TimeWindow } from '@shared/types';
import React from 'react';

export interface TideWindow {
  key: TimeWindow;
  label: string;
  /** Doses scheduled in this window today. */
  total: number;
  /** Doses already logged in this window today. */
  done: number;
}

interface TideStripProps {
  windows: TideWindow[];
  selected: TimeWindow;
  onSelect: (win: TimeWindow) => void;
}

/**
 * The tide strip.
 *
 * One cell per scheduled dose, grouped by window and sized to that window's
 * load — so a two-dose day and an eight-dose day look different, which a
 * percentage bar can never show. It is also the window selector, which is why
 * it replaces both the progress bar and the segmented tab row.
 *
 * Amber marks outstanding doses only in the selected window. Everywhere else
 * they stay neutral, so the accent never stops being scarce.
 */
export const TideStrip: React.FC<TideStripProps> = ({
  windows,
  selected,
  onSelect,
}) => (
  <div className="tide" role="tablist" aria-label="Time of day">
    {windows.map((win) => {
      const isSelected = win.key === selected;
      const cells = win.total > 0 ? win.total : 1;

      return (
        <button
          key={win.key}
          type="button"
          role="tab"
          aria-selected={isSelected}
          className="tide__win"
          data-selected={isSelected}
          onClick={() => onSelect(win.key)}
        >
          <span className="tide__cells">
            {Array.from({ length: cells }, (_, i) => {
              let state: 'done' | 'due' | 'empty' | 'none' = 'empty';
              if (win.total === 0) state = 'none';
              else if (i < win.done) state = 'done';
              else if (isSelected) state = 'due';

              return (
                <span
                  key={i}
                  className="tide__cell"
                  data-state={state}
                  aria-hidden="true"
                />
              );
            })}
          </span>
          <span className="tide__lbl">{win.label}</span>
          <span className="visually-hidden">
            {win.total === 0
              ? `${win.label}: nothing scheduled`
              : `${win.label}: ${win.done} of ${win.total} taken`}
          </span>
        </button>
      );
    })}
  </div>
);
