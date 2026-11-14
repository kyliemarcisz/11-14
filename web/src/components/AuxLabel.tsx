import React from 'react';

export type AuxKind = 'info' | 'safe' | 'caution' | 'critical';

/**
 * A real auxiliary label is a short directive, which is why it can carry
 * tracked uppercase type. Past roughly a sentence the same treatment turns
 * into a wall of capitals — unreadable, and worst for exactly the people this
 * app is for. Longer guidance keeps the sticker bar and drops the stamp.
 */
const STAMP_MAX = 90;

interface AuxLabelProps {
  /** The directions line, printed the way a pharmacist prints it. */
  line: string;
  /** Severity carried by the sticker bar on the left. */
  kind?: AuxKind;
  /** Provenance — e.g. "openFDA · drug_interactions". */
  source?: string;
  /** An exact sentence from the label, shown beneath the directions. */
  quote?: string;
  /** Force the voice instead of letting length decide. */
  variant?: 'stamp' | 'note';
  className?: string;
}

export const AuxLabel: React.FC<AuxLabelProps> = ({
  line,
  kind = 'info',
  source,
  quote,
  variant,
  className,
}) => {
  if (!line.trim()) return null;

  const resolved = variant ?? (line.length > STAMP_MAX ? 'note' : 'stamp');

  return (
    <div className={`aux${className ? ` ${className}` : ''}`} data-kind={kind}>
      <div className="aux__bar" />
      <div className="aux__body">
        <div className={resolved === 'stamp' ? 'aux__line' : 'aux__note'}>
          {line}
        </div>
        {quote && <div className="aux__quote">&ldquo;{quote}&rdquo;</div>}
        {source && <div className="aux__src">{source}</div>}
      </div>
    </div>
  );
};
