'use client';

import React from 'react';
import { DISCOVERY_CATALOG, ROOM_ANCHORS } from '@/lib/catalog';
import { PlacedObjectState } from '@/lib/types';
import {
  Laptop,
  Gamepad2,
  Package,
  Tv,
  Cpu,
  Coffee,
  CheckCircle2,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

interface AccessibleRoomListProps {
  placedObjects: PlacedObjectState[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string) => void;
  onPlaceObjectToSlot?: (objectId: string, slotIndex: number) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Laptop,
  Gamepad2,
  Package,
  Tv,
  Cpu,
  Coffee,
};

export default function AccessibleRoomList({
  placedObjects,
  selectedObjectId,
  onSelectObject,
}: AccessibleRoomListProps) {
  const placedMap = new Map(placedObjects.map((p) => [p.slotIndex, p.objectId]));

  return (
    <div
      role="region"
      aria-label="Room Anchors and Placed Objects List"
      className="w-full bg-paper/95 p-5 rounded-2xl border border-edge-hairline shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between pb-2 border-b border-edge-hairline">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-day-blue" />
          Room Anchors & Placed Items
        </h2>
        <span className="text-xs text-slate">
          {placedObjects.length} / 6 slots occupied
        </span>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ROOM_ANCHORS.map((anchor) => {
          const objectId = placedMap.get(anchor.slotIndex);
          const catalogObj = objectId
            ? DISCOVERY_CATALOG.find((c) => c.id === objectId)
            : null;
          const isSelected = Boolean(objectId && objectId === selectedObjectId);
          const IconComp = catalogObj ? ICON_MAP[catalogObj.iconName] || Sparkles : null;

          return (
            <li key={anchor.slotIndex}>
              {catalogObj ? (
                <button
                  type="button"
                  onClick={() => onSelectObject(catalogObj.id)}
                  aria-pressed={isSelected}
                  className={`w-full min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-day-blue/10 border-day-blue ring-2 ring-day-blue/20'
                      : 'bg-porcelain border-edge-hairline hover:bg-porcelain/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-ink shadow-xs"
                      style={{ backgroundColor: catalogObj.color }}
                    >
                      {IconComp && <IconComp className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {catalogObj.label}
                      </div>
                      <div className="text-xs text-slate">{anchor.label}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-day-blue">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>View</span>
                  </div>
                </button>
              ) : (
                <div className="w-full min-h-[48px] p-3 rounded-xl border border-dashed border-edge-hairline bg-porcelain/50 flex items-center justify-between text-slate">
                  <div>
                    <div className="text-sm font-medium text-slate">Empty Anchor</div>
                    <div className="text-xs text-slate/70">{anchor.label}</div>
                  </div>
                  <span className="text-xs italic">Available</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
