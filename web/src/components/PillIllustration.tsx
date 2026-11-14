import { PillVisual } from '@shared/types';
import React, { useId } from 'react';

interface PillIllustrationProps {
  visual: PillVisual;
  size?: 'sm' | 'md' | 'lg';
}

function isLightColor(hexColor: string): boolean {
  const clean = (hexColor || '#FFFFFF').replace('#', '').trim();
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return true;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

export const PillIllustration: React.FC<PillIllustrationProps> = ({
  visual,
  size = 'md',
}) => {
  const clipId = useId();
  const dimensions =
    size === 'lg'
      ? { width: 152, height: 86, fontSize: 13 }
      : size === 'sm'
        ? { width: 72, height: 44, fontSize: 9 }
        : { width: 100, height: 60, fontSize: 10.5 };

  const primary = visual.primaryColor || '#F4A7B9';
  const secondary = visual.secondaryColor || primary;
  const lightPrimary = isLightColor(primary);
  const textFill = lightPrimary ? '#1A2630' : '#FFFFFF';
  const strokeColor = lightPrimary ? '#AFBAB4' : 'rgba(26, 38, 48, 0.20)';
  const imprint = (visual.imprintCode || '').slice(0, 10);

  return (
    <div
      style={{
        width: dimensions.width,
        height: dimensions.height,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      role="img"
      aria-label={`${visual.shape} pill with imprint ${imprint}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 120 72"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="60" cy="61" rx="42" ry="6" fill="rgba(26, 38, 48, 0.13)" />

        {visual.shape === 'capsule' && (
          <g>
            <defs>
              <clipPath id={clipId}>
                <rect x="12" y="16" width="96" height="38" rx="19" ry="19" />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <rect x="12" y="16" width="50" height="38" fill={primary} />
              <rect x="60" y="16" width="48" height="38" fill={secondary} />
              <line
                x1="60"
                y1="16"
                x2="60"
                y2="54"
                stroke="rgba(26, 38, 48, 0.20)"
                strokeWidth="1.5"
              />
              <rect
                x="22"
                y="21"
                width="76"
                height="7"
                rx="3.5"
                fill="rgba(255, 255, 255, 0.42)"
              />
            </g>
            <rect
              x="12"
              y="16"
              width="96"
              height="38"
              rx="19"
              ry="19"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <text
              x="60"
              y="39"
              fontSize={dimensions.fontSize}
              fontWeight="700"
              fill="#1A2630"
              textAnchor="middle"
              letterSpacing="0.5"
            >
              {imprint}
            </text>
          </g>
        )}

        {visual.shape === 'oval' && (
          <g>
            <ellipse
              cx="60"
              cy="35"
              rx="46"
              ry="21"
              fill={primary}
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <ellipse
              cx="60"
              cy="35"
              rx="40"
              ry="16"
              fill="none"
              stroke="rgba(255, 255, 255, 0.48)"
              strokeWidth="1.2"
            />
            <ellipse
              cx="56"
              cy="25"
              rx="24"
              ry="4"
              fill="rgba(255, 255, 255, 0.34)"
            />
            <text
              x="60"
              y="39"
              fontSize={dimensions.fontSize + 0.5}
              fontWeight="700"
              fill={textFill}
              textAnchor="middle"
              letterSpacing="0.6"
            >
              {imprint}
            </text>
          </g>
        )}

        {visual.shape === 'round' && (
          <g>
            <ellipse
              cx="60"
              cy="35"
              rx="25"
              ry="25"
              fill={primary}
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <ellipse
              cx="60"
              cy="35"
              rx="20.5"
              ry="20.5"
              fill="none"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="1.2"
            />
            <line
              x1="40"
              y1="35"
              x2="80"
              y2="35"
              stroke="rgba(26, 38, 48, 0.10)"
              strokeWidth="1.1"
            />
            <text
              x="60"
              y="39"
              fontSize={dimensions.fontSize}
              fontWeight="700"
              fill={textFill}
              textAnchor="middle"
            >
              {imprint}
            </text>
          </g>
        )}

        {visual.shape === 'octagon' && (
          <g>
            <polygon
              points="46,11 74,11 89,25 89,45 74,59 46,59 31,45 31,25"
              fill={primary}
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <polygon
              points="49,16 71,16 83,28 83,42 71,54 49,54 37,42 37,28"
              fill="none"
              stroke="rgba(26, 38, 48, 0.12)"
              strokeWidth="1"
            />
            <text
              x="60"
              y="39"
              fontSize={dimensions.fontSize}
              fontWeight="700"
              fill={textFill}
              textAnchor="middle"
            >
              {imprint}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
