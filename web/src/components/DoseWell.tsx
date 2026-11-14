import { PillVisual } from '@shared/types';
import React from 'react';
import { PillIllustration } from './PillIllustration';

/** The light a pill throws is its own colour, not the system accent. */
function glowFrom(hex: string | undefined, alpha: number): string | undefined {
  const clean = (hex || '').replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  if (full.length !== 6) return undefined;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return undefined;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface DoseWellProps {
  visual: PillVisual;
  /** When true the compartment is empty: the light goes out and a silhouette stays. */
  taken: boolean;
  size?: 'hero' | 'sm';
  onClick?: () => void;
  /** Accessible label for the tappable variant. */
  actionLabel?: string;
}

/**
 * The compartment.
 *
 * A due pill sits in a debossed well and casts amber onto the floor of it —
 * the one light effect in the whole system. Taking the dose puts that light
 * out and leaves the pill's silhouette with its imprint still legible. The
 * emptiness is the confirmation, so nothing else has to announce it.
 */
export const DoseWell: React.FC<DoseWellProps> = ({
  visual,
  taken,
  size = 'hero',
  onClick,
  actionLabel,
}) => {
  const imprint = (visual.imprintCode || '').slice(0, 10);

  const glow = glowFrom(visual.primaryColor, size === 'hero' ? 0.42 : 0.3);

  const inner = (
    <div
      className={`well${size === 'sm' ? ' well--sm' : ''}`}
      data-taken={taken}
      style={
        glow ? ({ '--dose-glow': glow } as React.CSSProperties) : undefined
      }
      role={onClick ? undefined : 'img'}
      aria-label={
        onClick
          ? undefined
          : taken
            ? `Empty compartment, dose taken${imprint ? `, imprint ${imprint}` : ''}`
            : `${visual.shape} pill in its compartment${
                imprint ? `, imprint ${imprint}` : ''
              }`
      }
    >
      <div className="well__content">
        {taken ? (
          <div className="well__ghost">
            <span className="well__ghost-code">{imprint || '—'}</span>
          </div>
        ) : (
          <PillIllustration visual={visual} size={size === 'hero' ? 'lg' : 'sm'} />
        )}
      </div>
    </div>
  );

  if (!onClick) return inner;

  return (
    <button
      type="button"
      className="well-button"
      onClick={onClick}
      aria-label={actionLabel}
    >
      {inner}
    </button>
  );
};
