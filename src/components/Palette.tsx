import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PaletteItem, CharacterItem } from '../types/planner';
import { DEFAULT_PALETTE_ITEMS, CHARACTERS, AVAILABLE_ICONS } from '../data/defaultData';
import { ActivityIcon } from './ActivityIcon';
import { CharacterSticker } from './CharacterSticker';
import { Search, Plus, Sparkles, X, Heart } from 'lucide-react';

interface PaletteProps {
  isFull: boolean;
  selectedCharacter: string | null;
  onSelectCharacter: (charId: string | null) => void;
  onTapAddBlock: (item: PaletteItem) => void;
  customItems: PaletteItem[];
  onAddCustomItem: (item: PaletteItem) => void;
}

const CATEGORIES = [
  'All',
  'Morning',
  'School & learning',
  'Meals',
  'Play',
  'Wind-down',
  'Custom',
] as const;

export const Palette: React.FC<PaletteProps> = ({
  isFull,
  selectedCharacter,
  onSelectCharacter,
  onTapAddBlock,
  customItems,
  onAddCustomItem,
}) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'characters'>('activities');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom block creation modal state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [customCategory, setCustomCategory] = useState<PaletteItem['category']>('Custom');
  const [customIcon, setCustomIcon] = useState('Sparkles');
  const [customCheckCircle, setCustomCheckCircle] = useState(true);

  // Combine default and custom palette items
  const allItems = [...DEFAULT_PALETTE_ITEMS, ...customItems];

  const filteredItems = allItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery = item.title.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesQuery;
  });

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    const newItem: PaletteItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: customTitle.trim(),
      category: customCategory,
      defaultDuration: customDuration,
      icon: customIcon,
      hasCheckCircle: customCheckCircle,
    };

    onAddCustomItem(newItem);
    setCustomTitle('');
    setShowAddCustomModal(false);
  };

  return (
    <div className="w-80 h-full bg-white border-r-2 border-[#2D2200] flex flex-col shrink-0 select-none overflow-hidden">
      {/* Top Header / Mode Switcher */}
      <div className="p-3.5 border-b-2 border-[#2D2200] bg-[#FAF8F5]">
        <div className="flex bg-[#EFECE6] p-1 rounded-full border border-[#2D2200]/30 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
              activeTab === 'activities'
                ? 'bg-white text-[#2D2200] shadow-[2px_2px_0px_#2D2200] border border-[#2D2200]'
                : 'text-[#2D2200]/70 hover:text-[#2D2200]'
            }`}
          >
            Activities
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('characters')}
            className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all ${
              activeTab === 'characters'
                ? 'bg-white text-[#2D2200] shadow-[2px_2px_0px_#2D2200] border border-[#2D2200]'
                : 'text-[#2D2200]/70 hover:text-[#2D2200]'
            }`}
          >
            Characters
          </button>
        </div>
      </div>

      {/* ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar */}
          <div className="p-3 border-b border-[#2D2200]/15">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-[#2D2200]/50" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold bg-[#FAF8F5] border-[1.5px] border-[#2D2200]/40 rounded-full focus:outline-none focus:border-[#2D2200] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-0.5 text-[#2D2200]/50 hover:text-[#2D2200]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Categories Pill Bar */}
          <div className="px-3 py-2 border-b border-[#2D2200]/15 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#2D2200] text-white'
                    : 'bg-[#F2EFE9] text-[#2D2200]/80 hover:bg-[#E5E1D8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notice when grid is completely full */}
          {isFull && (
            <div className="mx-3 mt-2 px-3 py-1.5 bg-[#EE7B22]/15 border border-[#EE7B22] rounded-xl text-[11px] font-bold text-[#2D2200] flex items-center gap-1.5">
              <span>All schedule spaces are filled!</span>
            </div>
          )}

          {/* Activity Item List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#2D2200]/70 flex items-center justify-between px-1">
              <span>Tap to add or drag onto schedule:</span>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="text-[11px] font-extrabold text-[#2D2200] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Custom
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#2D2200]/60">
                No activities match your search.
              </div>
            ) : (
              filteredItems.map((item) => (
                <PaletteDraggableItem
                  key={item.id}
                  item={item}
                  isDisabled={isFull}
                  onTap={() => onTapAddBlock(item)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* CHARACTERS TAB */}
      {activeTab === 'characters' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="text-xs font-bold text-[#2D2200]/80 px-1">
            Choose a Sunshine Brigade buddy badge for the top corner of your schedule:
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Option to clear character badge */}
            <button
              type="button"
              onClick={() => onSelectCharacter(null)}
              className={`p-2.5 rounded-2xl border-[1.5px] flex items-center gap-3 transition-all ${
                selectedCharacter === null
                  ? 'border-[#2D2200] bg-[#FAF8F5] shadow-[2.5px_2.5px_0px_#2D2200]'
                  : 'border-[#B6B2A6] bg-white hover:border-[#2D2200]/60'
              }`}
            >
              <div className="w-12 h-12 rounded-full border border-dashed border-[#B6B2A6] flex items-center justify-center text-xs font-bold text-[#2D2200]/50">
                None
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-[#2D2200]">No sticker badge</div>
                <div className="text-[11px] text-[#2D2200]/60">Clean header with only child's name</div>
              </div>
            </button>

            {/* Character list */}
            {CHARACTERS.map((char) => {
              const isSelected = selectedCharacter === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => onSelectCharacter(char.id)}
                  className={`p-2.5 rounded-2xl border-[1.5px] flex items-center gap-3 transition-all text-left ${
                    isSelected
                      ? 'border-[#2D2200] bg-white shadow-[3px_3px_0px_#2D2200] ring-1 ring-[#2D2200]'
                      : 'border-[#B6B2A6] bg-white hover:border-[#2D2200]'
                  }`}
                >
                  <CharacterSticker characterId={char.id} size={54} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-[#2D2200]">{char.name}</span>
                      <span className="text-[10px] font-bold text-[#2D2200]/60 uppercase">
                        {char.animal}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#2D2200]/80 leading-tight mt-0.5">
                      {char.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CUSTOM BLOCK MODAL */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-[#2D2200]/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#2D2200] rounded-2xl p-5 max-w-sm w-full shadow-[5px_5px_0px_#2D2200] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#2D2200]/20">
              <h3 className="font-extrabold text-sm text-[#2D2200] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#EE7B22]" /> Add Custom Activity
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-[#2D2200]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustom} className="mt-3.5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#2D2200] mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Swimming class, Karate, Baking"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-1.5 text-xs font-semibold border-[1.5px] border-[#2D2200] rounded-xl outline-none focus:ring-1 focus:ring-[#2D2200]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D2200] mb-1">
                    Default Duration
                  </label>
                  <select
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-bold border-[1.5px] border-[#2D2200] rounded-xl outline-none bg-white"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D2200] mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as PaletteItem['category'])}
                    className="w-full px-2.5 py-1.5 text-xs font-bold border-[1.5px] border-[#2D2200] rounded-xl outline-none bg-white"
                  >
                    <option value="Custom">Custom</option>
                    <option value="Morning">Morning</option>
                    <option value="School & learning">School & learning</option>
                    <option value="Meals">Meals</option>
                    <option value="Play">Play</option>
                    <option value="Wind-down">Wind-down</option>
                  </select>
                </div>
              </div>

              {/* Icon selection */}
              <div>
                <label className="block text-[11px] font-bold text-[#2D2200] mb-1">Icon</label>
                <div className="grid grid-cols-8 gap-1 p-1.5 border border-[#B6B2A6] rounded-xl max-h-24 overflow-y-auto">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setCustomIcon(iconName)}
                      className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                        customIcon === iconName
                          ? 'bg-[#2D2200] text-white'
                          : 'hover:bg-[#FAF8F5] text-[#2D2200]'
                      }`}
                    >
                      <ActivityIcon name={iconName} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tick circle option */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={customCheckCircle}
                  onChange={(e) => setCustomCheckCircle(e.target.checked)}
                  className="rounded border-[#2D2200] text-[#2D2200] focus:ring-0"
                />
                <span className="text-xs font-bold text-[#2D2200]">
                  Include check circle on block
                </span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border border-[#B6B2A6] text-[#2D2200] hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-extrabold rounded-full bg-[#2D2200] text-white shadow-[2px_2px_0px_#2D2200] hover:scale-105 active:scale-95 transition-transform"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface PaletteDraggableItemProps {
  item: PaletteItem;
  isDisabled: boolean;
  onTap: () => void;
}

const PaletteDraggableItem: React.FC<PaletteDraggableItemProps> = ({ item, isDisabled, onTap }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette|${item.id}`,
    disabled: isDisabled,
    data: {
      paletteItem: item,
      isPaletteItem: true,
      defaultDuration: item.defaultDuration,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDisabled) onTap();
      }}
      className={`relative w-full bg-white border-2 border-[#2D2200] rounded-xl px-2.5 py-2 flex items-center justify-between select-none transition-all ${
        isDisabled
          ? 'opacity-40 cursor-not-allowed border-[#B6B2A6]'
          : 'cursor-grab active:cursor-grabbing hover:shadow-[3px_3px_0px_#2D2200] shadow-[1.5px_1.5px_0px_#2D2200]'
      } ${isDragging ? 'opacity-30' : ''}`}
      title={isDisabled ? 'Schedule is full!' : 'Click to add to first free slot, or drag onto grid'}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0 text-[#2D2200]">
          <ActivityIcon name={item.icon} size={16} strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-[#2D2200] truncate">{item.title}</div>
          <div className="text-[10px] font-semibold text-[#2D2200]/60">
            {item.defaultDuration >= 60
              ? `${item.defaultDuration / 60} hr`
              : `${item.defaultDuration} min`}
          </div>
        </div>
      </div>

      {item.hasCheckCircle && (
        <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-[#2D2200] bg-white shrink-0 ml-1" />
      )}
    </div>
  );
};
