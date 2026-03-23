import React, { useState } from 'react';
import { Heart, Zap, Shield, Check } from 'lucide-react';
import { PLAYER_CHARACTERS, ENEMY_CHARACTERS } from '../config/gameConfig';

export default function GameMenu({ gameState, setGameState, setSelectedPlayerDef, initGame }) {
    const isSelectPlayer = gameState === 'MENU_PLAYER';
    const title = isSelectPlayer ? '选择你的化身' : '选择挑战的妖王 (可多选 1~3 名)';
    const options = isSelectPlayer ? PLAYER_CHARACTERS : ENEMY_CHARACTERS;
    const [selectedEnemies, setSelectedEnemies] = useState([]);

    const toggleEnemy = (char) => {
        if (selectedEnemies.find(e => e.id === char.id)) {
            setSelectedEnemies(prev => prev.filter(e => e.id !== char.id));
        } else if (selectedEnemies.length < 3) {
            setSelectedEnemies(prev => [...prev, char]);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <h1 className="text-5xl font-black mb-4 text-yellow-500 tracking-widest drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">西游杀</h1>
            <h2 className="text-2xl font-bold mb-8 text-stone-300">{title}</h2>

            <div className="flex gap-4 max-w-7xl flex-wrap justify-center mb-24">
                {options.map(char => {
                    const isSelected = !isSelectPlayer && selectedEnemies.find(e => e.id === char.id);
                    return (
                        <button
                            key={char.id}
                            onClick={() => {
                                if (isSelectPlayer) {
                                    setSelectedPlayerDef(char);
                                    setGameState('MENU_ENEMY');
                                } else {
                                    toggleEnemy(char);
                                }
                            }}
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

            {!isSelectPlayer && (
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
            )}
        </div>
    );
}