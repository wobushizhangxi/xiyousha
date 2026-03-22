import React from 'react';
import { Heart } from 'lucide-react';
import { PLAYER_CHARACTERS, ENEMY_CHARACTERS } from '../config/gameConfig';

export default function GameMenu({ gameState, setGameState, setSelectedPlayerDef, initGame }) {
    const isSelectPlayer = gameState === 'MENU_PLAYER';
    const title = isSelectPlayer ? '选择你的化身' : '选择挑战的妖王';
    const options = isSelectPlayer ? PLAYER_CHARACTERS : ENEMY_CHARACTERS;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-white p-4">
            <h1 className="text-5xl font-black mb-4 text-yellow-500 tracking-widest">西游杀</h1>
            <h2 className="text-2xl font-bold mb-10 text-stone-300">{title}</h2>

            <div className="flex gap-6 max-w-5xl flex-wrap justify-center">
                {options.map(char => (
                    <button
                        key={char.id}
                        onClick={() => {
                            if (isSelectPlayer) {
                                setSelectedPlayerDef(char);
                                setGameState('MENU_ENEMY');
                            } else {
                                initGame(char);
                            }
                        }}
                        className="group flex flex-col items-center w-64 p-6 bg-stone-800 border-4 border-stone-700 rounded-3xl hover:border-yellow-500 hover:bg-stone-800/80 transition-all shadow-xl hover:-translate-y-2"
                    >
                        <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">{char.avatar}</div>
                        <div className="font-bold text-2xl mb-1">{char.name}</div>
                        <div className="text-stone-400 text-sm mb-4 font-mono flex items-center gap-1">
                            <Heart size={14} className="text-red-500" fill="currentColor"/> 体力上限: {char.maxHp}
                        </div>
                        <div className="w-full bg-stone-900/50 p-3 rounded-xl border border-stone-700 text-left">
                            <div className="text-yellow-500 text-sm font-black mb-1">{char.skillName}</div>
                            <div className="text-xs text-stone-300 leading-snug">{char.skillDesc}</div>
                        </div>
                    </button>
                ))}
            </div>

            {!isSelectPlayer && (
                <button onClick={() => setGameState('MENU_PLAYER')} className="mt-12 text-stone-400 hover:text-white underline">
                    返回重选化身
                </button>
            )}
        </div>
    );
}