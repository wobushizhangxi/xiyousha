import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Zap, Shield, Check } from 'lucide-react';
import { PLAYER_CHARACTERS, ENEMY_CHARACTERS } from '../config/gameConfig';

export default function GameMenu({
    gameState,
    setGameState,
    setSelectedPlayerDef,
    initGame,
    gameMode,
    setGameMode,
    levels,
    unlockedLevel,
    startLevelGame,
    saveSlots,
    resumeSavedBattle,
    clearBattleSave
}) {
    const isSelectPlayer = gameState === 'MENU_PLAYER';
    const isModeMenu = gameState === 'MENU_MODE';
    const isLevelMenu = gameState === 'MENU_LEVEL';
    const title = isSelectPlayer ? '选择你的化身' : '选择挑战的妖王 (可多选 1~3 名)';
    const options = isSelectPlayer ? PLAYER_CHARACTERS : ENEMY_CHARACTERS;
    const [selectedEnemies, setSelectedEnemies] = useState([]);
    const [selectedLevelId, setSelectedLevelId] = useState(1);
    const [wheelRotation, setWheelRotation] = useState(0);
    const [autoSpin, setAutoSpin] = useState(true);
    const wheelWrapRef = useRef(null);
    const dragStateRef = useRef({ dragging: false, lastAngle: 0 });

    const playerStep = 360 / PLAYER_CHARACTERS.length;
    const selectedPlayerIndex = useMemo(() => {
        const idx = Math.round((-wheelRotation / playerStep)) % PLAYER_CHARACTERS.length;
        return (idx + PLAYER_CHARACTERS.length) % PLAYER_CHARACTERS.length;
    }, [wheelRotation, playerStep]);
    const focusedPlayer = PLAYER_CHARACTERS[selectedPlayerIndex];

    useEffect(() => {
        if (selectedLevelId > unlockedLevel) setSelectedLevelId(unlockedLevel);
    }, [selectedLevelId, unlockedLevel]);

    useEffect(() => {
        if (!isSelectPlayer || !autoSpin) return undefined;
        let rafId = null;
        let lastTs = performance.now();

        const tick = (ts) => {
            const deltaSec = (ts - lastTs) / 1000;
            lastTs = ts;
            setWheelRotation((prev) => prev + deltaSec * 25);
            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [isSelectPlayer, autoSpin]);



    const getAngleFromPointer = (clientX, clientY) => {
        const rect = wheelWrapRef.current?.getBoundingClientRect();
        if (!rect) return 0;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        return Math.atan2(clientY - cy, clientX - cx);
    };

    const onWheelPointerDown = (e) => {
        if (!isSelectPlayer) return;
        
        if (e.target.tagName === 'BUTTON') return;
        
        setAutoSpin(false);
        dragStateRef.current = {
            dragging: true,
            lastAngle: getAngleFromPointer(e.clientX, e.clientY),
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onWheelPointerMove = (e) => {
        if (!dragStateRef.current.dragging) return;
        const nextAngle = getAngleFromPointer(e.clientX, e.clientY);
        const delta = (nextAngle - dragStateRef.current.lastAngle) * (180 / Math.PI);
        dragStateRef.current.lastAngle = nextAngle;
        setWheelRotation((prev) => prev + delta);
    };

    const onWheelPointerUp = (e) => {
        dragStateRef.current.dragging = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const toggleEnemy = (char) => {
        if (selectedEnemies.find(e => e.id === char.id)) {
            setSelectedEnemies(prev => prev.filter(e => e.id !== char.id));
        } else if (selectedEnemies.length < 3) {
            setSelectedEnemies(prev => [...prev, char]);
        }
    };

    if (isModeMenu) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <h1 className="text-5xl font-black mb-4 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">西游杀</h1>
                <h2 className="text-2xl font-bold mb-8 text-stone-300">选择游戏模式</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <button
                        onClick={() => {
                            setGameMode('classic');
                            setGameState('MENU_PLAYER');
                        }}
                        className="w-72 bg-stone-800 border-2 border-stone-600 hover:border-yellow-500 p-6 rounded-2xl text-left transition-all hover:-translate-y-1"
                    >
                        <div className="text-2xl font-black text-yellow-400 mb-2">经典模式</div>
                        <div className="text-stone-300 text-sm">自由选择 1~3 名妖王，随时开战。</div>
                    </button>
                    <button
                        onClick={() => {
                            setGameMode('level');
                            setGameState('MENU_PLAYER');
                        }}
                        className="w-72 bg-stone-800 border-2 border-stone-600 hover:border-cyan-500 p-6 rounded-2xl text-left transition-all hover:-translate-y-1"
                    >
                        <div className="text-2xl font-black text-cyan-400 mb-2">关卡模式</div>
                        <div className="text-stone-300 text-sm">按关卡推进挑战，逐关解锁更强敌人。</div>
                    </button>
                </div>
                {(saveSlots?.auto || saveSlots?.[1] || saveSlots?.[2] || saveSlots?.[3]) && (
                    <div className="mt-6 w-full max-w-3xl bg-stone-800/80 border border-stone-600 rounded-2xl p-4">
                        <div className="text-sm font-black text-emerald-300 mb-3">存档槽位</div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => resumeSavedBattle('auto')}
                                disabled={!saveSlots?.auto}
                                className={`px-4 py-2 rounded-xl font-bold ${saveSlots?.auto ? 'bg-emerald-500 text-stone-950 hover:bg-emerald-400' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}
                            >
                                继续自动存档
                            </button>
                            {([1, 2, 3]).map((slot) => (
                                <div key={`slot-${slot}`} className="flex items-center gap-1">
                                    <button
                                        onClick={() => resumeSavedBattle(slot)}
                                        disabled={!saveSlots?.[slot]}
                                        className={`px-3 py-2 rounded-xl text-sm font-bold ${saveSlots?.[slot] ? 'bg-cyan-500 text-stone-950 hover:bg-cyan-400' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}
                                    >
                                        读取槽位{slot}
                                    </button>
                                    <button
                                        onClick={() => clearBattleSave(slot)}
                                        disabled={!saveSlots?.[slot]}
                                        className={`px-2.5 py-2 rounded-xl text-xs font-bold ${saveSlots?.[slot] ? 'bg-stone-600 text-stone-100 hover:bg-stone-500' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}
                                    >
                                        清空
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isSelectPlayer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4 overflow-hidden">
                <h1 className="text-5xl font-black mb-3 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">西游杀</h1>
                <h2 className="text-xl font-bold mb-6 text-stone-300">罗盘择将（拖动罗盘或自动旋转）</h2>

                <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="order-2 lg:order-1 w-full bg-stone-800 border border-stone-600 rounded-2xl p-5 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-2xl font-black text-yellow-400">{focusedPlayer.avatar} {focusedPlayer.name}</div>
                            <div className="text-stone-300 text-sm font-mono flex items-center gap-1">
                                <Heart size={14} className="text-red-500" fill="currentColor" /> 体力上限: {focusedPlayer.maxHp}
                            </div>
                        </div>
                        <div className="text-yellow-300 text-sm font-black mb-1 flex items-center gap-1"><Zap size={14}/> {focusedPlayer.activeName}</div>
                        <div className="text-[13px] text-stone-200 leading-snug mb-3">{focusedPlayer.activeDesc}</div>
                        <div className="text-blue-300 text-sm font-black mb-1 flex items-center gap-1"><Shield size={14}/> {focusedPlayer.passiveName}</div>
                        <div className="text-[13px] text-stone-300 leading-snug">{focusedPlayer.passiveDesc}</div>

                        <button
                            onClick={() => {
                                setSelectedPlayerDef(focusedPlayer);
                                setGameState(gameMode === 'level' ? 'MENU_LEVEL' : 'MENU_ENEMY');
                            }}
                            className="mt-6 w-full bg-yellow-600 text-stone-950 px-10 py-4 rounded-full font-black text-xl shadow-[0_0_40px_rgba(234,179,8,0.4)] hover:bg-yellow-500 hover:scale-105 active:scale-95 transition-all"
                        >
                            确认化身：{focusedPlayer.name}
                        </button>
                    </div>

                    <div className="order-1 lg:order-2 relative w-[560px] h-[560px] max-w-[92vw] max-h-[68vh] justify-self-center select-none">
                        <div className="absolute inset-0 rounded-full border-8 border-yellow-600/80 shadow-[0_0_50px_rgba(234,179,8,0.2)]" />
                        <div className="absolute inset-4 rounded-full border-2 border-stone-600 bg-stone-800/60" />

                        <div className="absolute left-1/2 top-10 -translate-x-1/2 z-20 text-3xl">🔻</div>

                        <div
                            ref={wheelWrapRef}
                            className="absolute inset-8 rounded-full cursor-grab active:cursor-grabbing"
                            onPointerDown={onWheelPointerDown}
                            onPointerMove={onWheelPointerMove}
                            onPointerUp={onWheelPointerUp}
                            onPointerCancel={onWheelPointerUp}
                        >
                            {PLAYER_CHARACTERS.map((char, idx) => {
                                const angleDeg = idx * playerStep + wheelRotation - 90;
                                const angle = (angleDeg * Math.PI) / 180;
                                const radius = 210;
                                const x = Math.cos(angle) * radius;
                                const y = Math.sin(angle) * radius;
                                const isFocused = idx === selectedPlayerIndex;
                                return (
                                    <div
                                        key={char.id}
                                        className="absolute left-1/2 top-1/2"
                                        style={{ transform: `translate(${x}px, ${y}px)` }}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAutoSpin(false);
                                                setWheelRotation(-idx * playerStep);
                                            }}
                                            onDoubleClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPlayerDef(char);
                                                setGameState(gameMode === 'level' ? 'MENU_LEVEL' : 'MENU_ENEMY');
                                            }}
                                            className={`w-28 h-28 -ml-14 -mt-14 rounded-2xl border-3 flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                                            isFocused ? 'bg-yellow-400 text-stone-900 border-yellow-300 scale-110 shadow-xl shadow-yellow-500/30' : 'bg-stone-700/90 text-white border-stone-500 hover:bg-stone-600 hover:border-stone-400'
                                            }`}
                                            title="单击选中，双击确认"
                                        >
                                            <div className="text-4xl">{char.avatar}</div>
                                            <div className="text-xs font-bold mt-1">{char.name}</div>
                                            {isFocused && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-stone-900 text-xs px-3 py-1 rounded-full font-bold">双击选择</div>}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                            <button
                                onClick={() => setAutoSpin((v) => !v)}
                                className="w-32 h-32 rounded-full bg-stone-950 border-4 border-yellow-500 text-yellow-300 font-black shadow-2xl hover:scale-105 transition-transform"
                            >
                                {autoSpin ? '停止\n旋转' : '自动\n旋转'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLevelMenu) {
        const selectedLevel = levels.find(l => l.id === selectedLevelId) || levels[0];
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
                <h1 className="text-5xl font-black mb-4 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">西游杀</h1>
                <h2 className="text-2xl font-bold mb-6 text-stone-300">关卡模式 · 选择关卡</h2>
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-4">
                    {levels.map(level => {
                        const locked = level.id > unlockedLevel;
                        const active = level.id === selectedLevelId;
                        return (
                            <button
                                key={level.id}
                                disabled={locked}
                                onClick={() => setSelectedLevelId(level.id)}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    locked
                                        ? 'bg-stone-800/40 border-stone-700 text-stone-500 cursor-not-allowed'
                                        : active
                                            ? 'bg-cyan-900/40 border-cyan-400 text-white shadow-lg'
                                            : 'bg-stone-800 border-stone-600 hover:border-cyan-500'
                                }`}
                            >
                                <div className="font-black text-lg">{locked ? `第 ${level.id} 关（未解锁）` : level.name}</div>
                                <div className="text-sm mt-1">{level.desc}</div>
                            </button>
                        );
                    })}
                </div>
                <div className="w-full max-w-4xl mt-4 bg-stone-800 border border-stone-600 rounded-2xl p-4">
                    <div className="font-black text-cyan-300 text-lg mb-2">{selectedLevel?.name}</div>
                    <div className="text-stone-300 text-sm">{selectedLevel?.desc}</div>
                </div>
                <div className="mt-6 flex gap-3">
                    <button onClick={() => setGameState('MENU_PLAYER')} className="px-6 py-3 rounded-full font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-600 shadow-xl transition-all">
                        返回重选角色
                    </button>
                    <button
                        onClick={() => startLevelGame(selectedLevelId)}
                        disabled={selectedLevelId > unlockedLevel}
                        className={`px-10 py-3 rounded-full font-black text-lg shadow-xl transition-all ${
                            selectedLevelId <= unlockedLevel ? 'bg-cyan-500 text-stone-950 hover:bg-cyan-400' : 'bg-stone-700 text-stone-500 cursor-not-allowed'
                        }`}
                    >
                        开始 {selectedLevel?.name}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <h1 className="text-5xl font-black mb-4 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">西游杀</h1>
            <h2 className="text-2xl font-bold mb-8 text-stone-300">{title}</h2>

            <div className="flex gap-4 max-w-7xl flex-wrap justify-center mb-24">
                {options.map(char => {
                    const isSelected = selectedEnemies.find(e => e.id === char.id);
                    return (
                        <button
                            key={char.id}
                            onClick={() => toggleEnemy(char)}
                            className={`group flex flex-col items-center w-72 p-5 bg-stone-800 border-4 rounded-3xl transition-all shadow-xl text-left 
                                ${isSelected ? 'border-yellow-500 bg-stone-800 -translate-y-2 scale-105 shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'border-stone-700 hover:border-stone-500 hover:-translate-y-2'}`}
                        >
                            <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">{char.avatar}</div>
                            <div className="font-bold text-2xl mb-1 text-center w-full">{char.name}</div>
                            <div className="text-stone-400 text-sm mb-4 font-mono flex items-center justify-center gap-1 w-full">
                                <Heart size={14} className="text-red-500" fill="currentColor"/> 体力上限: {char.maxHp}
                            </div>
                            <div className="w-full bg-stone-900/80 p-3 rounded-xl border border-stone-700">
                                <div className="text-yellow-400 text-sm font-black mb-1 flex items-center gap-1"><Zap size={14}/> {char.activeName}</div>
                                <div className="text-[13px] text-stone-300 leading-snug mb-3">{char.activeDesc}</div>
                                <div className="text-blue-400 text-sm font-black mb-1 flex items-center gap-1"><Shield size={14}/> {char.passiveName}</div>
                                <div className="text-[13px] text-stone-300 leading-snug">{char.passiveDesc}</div>
                            </div>
                            {isSelected && <div className="absolute top-4 right-4 bg-yellow-500 text-stone-900 rounded-full p-1 shadow-lg"><Check size={20} strokeWidth={3}/></div>}
                        </button>
                    );
                })}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-900 to-transparent flex flex-col items-center pointer-events-none">
                <div className="flex gap-4 pointer-events-auto">
                    <button onClick={() => {setGameState('MENU_PLAYER'); setSelectedEnemies([]);}} className="px-6 py-4 rounded-full font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 border border-stone-600 shadow-xl transition-all">
                        返回重选
                    </button>
                    {selectedEnemies.length > 0 && (
                        <button onClick={() => initGame(selectedEnemies)} className="bg-yellow-600 text-stone-950 px-10 py-4 rounded-full font-black text-xl shadow-[0_0_40px_rgba(234,179,8,0.4)] hover:bg-yellow-500 hover:scale-105 active:scale-95 transition-all animate-bounce">
                            确认挑战 {selectedEnemies.length} 名妖王
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}