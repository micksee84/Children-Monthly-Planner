import React from 'react';
import { CHARACTERS } from '../data/defaultData';

interface CharacterStickerProps {
  characterId: string | null;
  size?: number; // size in px, default 60
  className?: string;
  onClick?: () => void;
  showLabel?: boolean;
}

export const CharacterSticker: React.FC<CharacterStickerProps> = ({
  characterId,
  size = 64,
  className = '',
  onClick,
  showLabel = true,
}) => {
  if (!characterId) return null;

  const char = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex flex-col items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      title={`${char.name} the ${char.animal}`}
    >
      {/* Outer Sticker circle with flat ink shadow */}
      <div
        className="w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-[#2D2200] overflow-hidden"
        style={{
          backgroundColor: char.accentColor,
          boxShadow: '2.5px 2.5px 0px #2D2200',
        }}
      >
        {/* Adorable stylized SVG animal illustration */}
        <div className="flex-1 w-full flex items-center justify-center pt-1">
          {char.id === 'buddy' && (
            // Bear
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Ears */}
              <circle cx="10" cy="8" r="5" fill="#EE7B22" stroke="#2D2200" strokeWidth="1.8" />
              <circle cx="30" cy="8" r="5" fill="#EE7B22" stroke="#2D2200" strokeWidth="1.8" />
              {/* Face */}
              <circle cx="20" cy="18" r="13" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Eyes */}
              <circle cx="15" cy="16" r="1.8" fill="#2D2200" />
              <circle cx="25" cy="16" r="1.8" fill="#2D2200" />
              {/* Snout */}
              <ellipse cx="20" cy="22" rx="4" ry="3" fill="#FFFFFF" stroke="#2D2200" strokeWidth="1.2" />
              <ellipse cx="20" cy="21" rx="1.5" ry="1" fill="#2D2200" />
            </svg>
          )}

          {char.id === 'finn' && (
            // Fox
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Ears */}
              <polygon points="8,14 12,3 18,13" fill="#2D2200" stroke="#2D2200" strokeWidth="1.5" />
              <polygon points="32,14 28,3 22,13" fill="#2D2200" stroke="#2D2200" strokeWidth="1.5" />
              {/* Face */}
              <polygon points="6,12 34,12 20,29" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Eyes */}
              <circle cx="14" cy="16" r="1.6" fill="#2D2200" />
              <circle cx="26" cy="16" r="1.6" fill="#2D2200" />
              {/* Nose */}
              <circle cx="20" cy="26" r="2" fill="#2D2200" />
            </svg>
          )}

          {char.id === 'ollie' && (
            // Owl
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Body */}
              <ellipse cx="20" cy="16" rx="14" ry="13" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Big spectacles / eyes */}
              <circle cx="14" cy="14" r="5" fill="#FFFFFF" stroke="#2D2200" strokeWidth="1.5" />
              <circle cx="26" cy="14" r="5" fill="#FFFFFF" stroke="#2D2200" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="2" fill="#2D2200" />
              <circle cx="26" cy="14" r="2" fill="#2D2200" />
              {/* Beak */}
              <polygon points="18,17 22,17 20,22" fill="#EE7B22" stroke="#2D2200" strokeWidth="1.2" />
            </svg>
          )}

          {char.id === 'faye' && (
            // Frog
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Eye bumps */}
              <circle cx="12" cy="10" r="5" fill="#5BAE3C" stroke="#2D2200" strokeWidth="1.8" />
              <circle cx="28" cy="10" r="5" fill="#5BAE3C" stroke="#2D2200" strokeWidth="1.8" />
              <circle cx="12" cy="10" r="2" fill="#2D2200" />
              <circle cx="28" cy="10" r="2" fill="#2D2200" />
              {/* Head */}
              <ellipse cx="20" cy="18" rx="14" ry="11" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Big happy smile */}
              <path d="M 12 18 Q 20 25 28 18" stroke="#2D2200" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
          )}

          {char.id === 'rusty' && (
            // Raccoon
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Ears */}
              <circle cx="10" cy="8" r="4.5" fill="#B6B2A6" stroke="#2D2200" strokeWidth="1.6" />
              <circle cx="30" cy="8" r="4.5" fill="#B6B2A6" stroke="#2D2200" strokeWidth="1.6" />
              {/* Face */}
              <circle cx="20" cy="17" r="13" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Bandit mask */}
              <ellipse cx="20" cy="15" rx="11" ry="4.5" fill="#2D2200" />
              <circle cx="14" cy="15" r="1.6" fill="#FFFFFF" />
              <circle cx="26" cy="15" r="1.6" fill="#FFFFFF" />
              {/* Nose */}
              <circle cx="20" cy="22" r="1.8" fill="#2D2200" />
            </svg>
          )}

          {char.id === 'hana' && (
            // Hummingbird
            <svg viewBox="0 0 40 32" className="w-8 h-7">
              {/* Wing */}
              <path d="M 18 10 Q 10 3 8 12 Q 14 14 18 13" fill="#F49AA0" stroke="#2D2200" strokeWidth="1.5" />
              {/* Body */}
              <ellipse cx="22" cy="16" rx="9" ry="8" fill="#F2F2E2" stroke="#2D2200" strokeWidth="1.8" />
              {/* Eye */}
              <circle cx="25" cy="14" r="1.6" fill="#2D2200" />
              {/* Long beak */}
              <path d="M 28 15 L 37 17 L 28 18" fill="#EE7B22" stroke="#2D2200" strokeWidth="1.2" />
            </svg>
          )}
        </div>

        {/* Text banner with requested label */}
        {showLabel && (
          <div className="w-full bg-[#2D2200] text-[#FFFFFF] text-[7.5px] font-black uppercase tracking-tight py-0.5 px-0.5 text-center leading-none truncate">
            {char.badgeLabel}
          </div>
        )}
      </div>
    </div>
  );
};
