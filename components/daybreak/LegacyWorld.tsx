'use client';

import React, { useState, useEffect } from 'react';
import { DISCOVERY_CATALOG, ROOM_ANCHORS } from '@/lib/catalog';
import {
  WorldState,
  PlacedObjectState,
  DiscoveryObject,
  TradeReceipt,
  HoldingItem,
} from '@/lib/types';
import {
  loadWorldState,
  saveWorldState,
  loadUserSettings,
  saveUserSettings,
  loadReceipts,
  calculateHoldings,
  resetAllData,
  UserSettings,
  DEFAULT_SETTINGS,
} from '@/lib/storage';

import ThreeRoom from '@/components/world/ThreeRoom';
import AccessibleRoomList from '@/components/world/AccessibleRoomList';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import InterestsScreen from '@/components/screens/InterestsScreen';
import CompanySheet from '@/components/screens/CompanySheet';
import InstrumentSheet from '@/components/screens/InstrumentSheet';
import PurchaseReviewModal from '@/components/screens/PurchaseReviewModal';
import HoldingsSheet from '@/components/screens/HoldingsSheet';
import ShareModal from '@/components/screens/ShareModal';
import SettingsModal from '@/components/screens/SettingsModal';

import {
  Sparkles,
  Share2,
  Sliders,
  Coins,
  Undo2,
  Check,
  Plus,
  Eye,
  Box,
  List,
} from 'lucide-react';

export default function DayworldApp() {
  // Navigation & View Flow: 'welcome' | 'interests' | 'world'
  const [currentView, setCurrentView] = useState<'welcome' | 'interests' | 'world'>('welcome');
  const [isInitialized, setIsInitialized] = useState(false);

  // Core State
  const [worldState, setWorldState] = useState<WorldState>({
    id: 'world_local',
    schemaVersion: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    interests: [],
    placedObjects: [],
  });

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [receipts, setReceipts] = useState<TradeReceipt[]>([]);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);

  // Active Sheets / Modals
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeCompanySheetObj, setActiveCompanySheetObj] = useState<DiscoveryObject | null>(null);
  const [activeInstrumentSheetObj, setActiveInstrumentSheetObj] = useState<DiscoveryObject | null>(null);
  const [activeReviewObj, setActiveReviewObj] = useState<DiscoveryObject | null>(null);
  const [isHoldingsOpen, setIsHoldingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Visual mode: '3d' | 'accessible'
  const [viewMode, setViewMode] = useState<'3d' | 'accessible'>('3d');
  const [lastPlacedObjectId, setLastPlacedObjectId] = useState<string | null>(null);

  // 1. Initial Load from LocalStorage or Hash Share
  useEffect(() => {
    const loadedSettings = loadUserSettings();
    setSettings(loadedSettings);
    saveUserSettings(loadedSettings); // updates data-* root attributes

    const loadedReceipts = loadReceipts();
    setReceipts(loadedReceipts);
    setHoldings(calculateHoldings(loadedReceipts));

    // Check for incoming share link in hash
    if (typeof window !== 'undefined' && window.location.hash.includes('#share=')) {
      try {
        const hashVal = window.location.hash.split('#share=')[1];
        const decoded = JSON.parse(atob(decodeURIComponent(hashVal)));
        if (decoded && Array.isArray(decoded.objectIds)) {
          const placed: PlacedObjectState[] = decoded.objectIds.slice(0, 6).map((id: string, idx: number) => ({
            objectId: id,
            slotIndex: idx,
            placedAt: Date.now(),
          }));
          const sharedWorld: WorldState = {
            id: `shared_${Date.now()}`,
            schemaVersion: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            interests: decoded.interests || [],
            placedObjects: placed,
          };
          setWorldState(sharedWorld);
          saveWorldState(sharedWorld);
          setCurrentView('world');
          setIsInitialized(true);
          return;
        }
      } catch (err) {
        console.error('Failed to parse share hash:', err);
      }
    }

    const savedWorld = loadWorldState();
    if (savedWorld && savedWorld.placedObjects.length > 0) {
      setWorldState(savedWorld);
      setCurrentView('world');
    }
    setIsInitialized(true);
  }, []);

  // Sync World State on Update
  const updateAndSaveWorld = (newWorld: WorldState) => {
    setWorldState(newWorld);
    saveWorldState(newWorld);
  };

  // 2. Interest selection completion
  const handleCompleteInterests = (selectedInterests: string[]) => {
    // Curate starter objects based on chosen interests
    const initialObjects: PlacedObjectState[] = [];
    if (selectedInterests.includes('design') || selectedInterests.includes('tech')) {
      initialObjects.push({ objectId: 'laptop', slotIndex: 0, placedAt: Date.now() });
    }
    if (selectedInterests.includes('gaming')) {
      initialObjects.push({ objectId: 'controller', slotIndex: 1, placedAt: Date.now() });
    }
    if (selectedInterests.includes('ritual') || initialObjects.length === 0) {
      initialObjects.push({ objectId: 'mug', slotIndex: 5, placedAt: Date.now() });
    }

    const updated: WorldState = {
      ...worldState,
      interests: selectedInterests,
      placedObjects: initialObjects,
      updatedAt: Date.now(),
    };
    updateAndSaveWorld(updated);
    setCurrentView('world');
  };

  // 3. Object Tray Placement & Undo
  const handlePlaceObject = (catalogObj: DiscoveryObject) => {
    // If already placed, select it and open company sheet
    const existing = worldState.placedObjects.find((p) => p.objectId === catalogObj.id);
    if (existing) {
      setSelectedObjectId(catalogObj.id);
      setActiveCompanySheetObj(catalogObj);
      return;
    }

    // Find next available slot
    const occupiedSlots = new Set(worldState.placedObjects.map((p) => p.slotIndex));
    const nextSlot = ROOM_ANCHORS.find((a) => !occupiedSlots.has(a.slotIndex));
    if (!nextSlot) {
      alert('All 6 room anchors are occupied. Remove an item to place a new one.');
      return;
    }

    const newPlaced: PlacedObjectState = {
      objectId: catalogObj.id,
      slotIndex: nextSlot.slotIndex,
      placedAt: Date.now(),
    };

    const updated: WorldState = {
      ...worldState,
      placedObjects: [...worldState.placedObjects, newPlaced],
      updatedAt: Date.now(),
    };
    updateAndSaveWorld(updated);
    setLastPlacedObjectId(catalogObj.id);
    setSelectedObjectId(catalogObj.id);
  };

  const handleUndoPlacement = () => {
    if (!lastPlacedObjectId) return;
    const updated: WorldState = {
      ...worldState,
      placedObjects: worldState.placedObjects.filter(
        (p) => p.objectId !== lastPlacedObjectId
      ),
      updatedAt: Date.now(),
    };
    updateAndSaveWorld(updated);
    if (selectedObjectId === lastPlacedObjectId) {
      setSelectedObjectId(null);
    }
    setLastPlacedObjectId(null);
  };

  // Trade Confirmation
  const handleTradeConfirmed = (newReceipt: TradeReceipt) => {
    const updatedReceipts = [newReceipt, ...receipts];
    setReceipts(updatedReceipts);
    setHoldings(calculateHoldings(updatedReceipts));
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-porcelain flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-day-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  if (currentView === 'welcome') {
    return (
      <WelcomeScreen
        onStart={() => setCurrentView('interests')}
        onExploreFirst={() => {
          handleCompleteInterests([]);
        }}
      />
    );
  }

  if (currentView === 'interests') {
    return (
      <InterestsScreen
        onBack={() => setCurrentView('welcome')}
        onContinue={handleCompleteInterests}
        initialInterests={worldState.interests}
      />
    );
  }

  // S03: Main World Stage
  const placedMap = new Map(worldState.placedObjects.map((p) => [p.objectId, p]));

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-porcelain flex flex-col justify-between select-none">
      {/* 1. Floating Top Glass Navigation */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-auto">
        {/* Brand pill */}
        <div className="dw-glass px-3.5 py-2 flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" className="w-5 h-5 text-day-blue" fill="currentColor">
            <path d="M16 4C9.37 4 4 9.37 4 16v12h24V16c0-6.63-5.37-12-12-12zm0 4c4.42 0 8 3.58 8 8v8H8v-8c0-4.42 3.58-8 8-8z" />
            <circle cx="16" cy="18" r="4" fill="#f3bb87" />
          </svg>
          <span className="font-bold text-sm tracking-tight text-ink">daybreak</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Toggle 3D / List */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === '3d' ? 'accessible' : '3d')}
            aria-label={viewMode === '3d' ? 'Switch to Accessible List' : 'Switch to 3D Room'}
            className="dw-glass w-10 h-10 flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            {viewMode === '3d' ? <List className="w-4 h-4" /> : <Box className="w-4 h-4" />}
          </button>

          {/* Holdings with badge */}
          <button
            type="button"
            onClick={() => setIsHoldingsOpen(true)}
            aria-label="View Holdings"
            className="dw-glass px-3 py-2 flex items-center gap-1.5 text-xs font-semibold text-ink"
          >
            <Coins className="w-4 h-4 text-day-blue" />
            <span className="hidden sm:inline">Holdings</span>
            {holdings.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-day-blue text-paper text-[10px] flex items-center justify-center font-bold">
                {holdings.length}
              </span>
            )}
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            aria-label="Share your room"
            className="dw-glass w-10 h-10 flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings"
            className="dw-glass w-10 h-10 flex items-center justify-center text-slate hover:text-ink transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Room Canvas / Accessible List Area */}
      <main className="relative w-full flex-1 flex flex-col justify-center">
        {viewMode === '3d' ? (
          <ThreeRoom
            placedObjects={worldState.placedObjects}
            selectedObjectId={selectedObjectId}
            reducedMotion={settings.reduceMotion}
            onSelectObject={(id) => {
              setSelectedObjectId(id);
              const found = DISCOVERY_CATALOG.find((c) => c.id === id);
              if (found) setActiveCompanySheetObj(found);
            }}
            onContextError={() => setViewMode('accessible')}
          />
        ) : (
          <div className="w-full max-w-lg mx-auto p-4 pt-20 overflow-y-auto max-h-[70vh]">
            <AccessibleRoomList
              placedObjects={worldState.placedObjects}
              selectedObjectId={selectedObjectId}
              onSelectObject={(id) => {
                setSelectedObjectId(id);
                const found = DISCOVERY_CATALOG.find((c) => c.id === id);
                if (found) setActiveCompanySheetObj(found);
              }}
            />
          </div>
        )}
      </main>

      {/* 3. Bottom Object Tray */}
      <footer className="w-full max-w-2xl mx-auto px-4 pb-4 z-20 pointer-events-auto">
        <div className="dw-tray-glass p-3.5 flex flex-col gap-2.5">
          {/* Tray Header & Undo */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate">
              Curated Discovery Objects ({worldState.placedObjects.length}/6)
            </span>

            {lastPlacedObjectId && (
              <button
                type="button"
                onClick={handleUndoPlacement}
                className="inline-flex items-center gap-1 text-xs font-semibold text-day-blue hover:text-day-blue-pressed transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo place</span>
              </button>
            )}
          </div>

          {/* Tray Object Chips */}
          <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none">
            {DISCOVERY_CATALOG.map((item) => {
              const isPlaced = placedMap.has(item.id);
              const isSelected = selectedObjectId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePlaceObject(item)}
                  aria-pressed={isSelected}
                  className={`min-w-[76px] p-2.5 rounded-2xl flex flex-col items-center justify-between transition-all shrink-0 border select-none ${
                    isSelected
                      ? 'bg-paper border-day-blue shadow-md ring-2 ring-day-blue/20'
                      : isPlaced
                      ? 'bg-paper/90 border-edge-hairline'
                      : 'bg-porcelain/80 border-dashed border-edge-hairline hover:bg-paper'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-ink shadow-xs relative"
                    style={{ backgroundColor: item.color }}
                  >
                    <span className="font-bold text-xs">
                      {item.label.split(' ')[0][0]}
                    </span>
                    {isPlaced && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-deep-green text-paper text-[9px] flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-medium text-ink mt-1.5 text-center leading-tight truncate w-16">
                    {item.label.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </footer>

      {/* 4. Active Sheets & Modals */}
      {activeCompanySheetObj && (
        <CompanySheet
          object={activeCompanySheetObj}
          onClose={() => setActiveCompanySheetObj(null)}
          onExploreOwnership={(obj) => {
            setActiveCompanySheetObj(null);
            setActiveInstrumentSheetObj(obj);
          }}
        />
      )}

      {activeInstrumentSheetObj && (
        <InstrumentSheet
          object={activeInstrumentSheetObj}
          onClose={() => setActiveInstrumentSheetObj(null)}
          onProceedToReview={(obj) => {
            setActiveInstrumentSheetObj(null);
            setActiveReviewObj(obj);
          }}
        />
      )}

      {activeReviewObj && (
        <PurchaseReviewModal
          object={activeReviewObj}
          networkMode={settings.networkMode}
          onClose={() => setActiveReviewObj(null)}
          onTradeConfirmed={(receipt) => {
            handleTradeConfirmed(receipt);
          }}
        />
      )}

      {isHoldingsOpen && (
        <HoldingsSheet
          holdings={holdings}
          receipts={receipts}
          onClose={() => setIsHoldingsOpen(false)}
        />
      )}

      {isShareOpen && (
        <ShareModal
          worldState={worldState}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            saveUserSettings(newSettings);
          }}
          onResetData={() => {
            resetAllData();
            setWorldState({
              id: 'world_local',
              schemaVersion: 1,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              interests: [],
              placedObjects: [],
            });
            setReceipts([]);
            setHoldings([]);
            setCurrentView('welcome');
          }}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
