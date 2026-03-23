import React from 'react';
import { Trash2 } from 'lucide-react';
import { CARD_TYPES, ELEMENTS } from '../config/gameConfig';

export default function GameCard({ card, phase, isSelected, canConfirmDiscard, isValidResponse, onClick }) {
    const shouldDim = phase === 'PLAYER_DISCARD' && !isSelected;
    const isDimmedExtra = shouldDim && canConfirmDiscard;

    const element = ELEMENTS[card.element];

    return (
        <div
            onClick={onClick}
            className={`relative flex-shrink-0 w-36 h-48 border-2 rounded-2xl p-4 transition-all duration-300 origin-bottom select-none
                ${card.bg} ${card.border} group
                ${phase === 'PLAYER_RESPONSE'
                ? (isValidResponse
                    ? 'ring-4 ring-blue-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.5)] z-10 scale-105 cursor-pointer animate-pulse'
                    : 'opacity-40 grayscale-[80%] cursor-not-allowed hover:translate-y-0')
                : phase === 'PLAYER_DISCARD'
                    ? (isSelected
                        ? 'ring-4 ring-red-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(220,38,38,0.4)] z-10 scale-105 cursor-pointer'
                        : `cursor-pointer hover:-translate-y-2 hover:opacity-100 ${isDimmedExtra ? 'opacity-30 grayscale-[50%]' : 'opacity-70'}`)
                    : (phase === 'IDLE' || phase === 'ENEMY_TURN' || phase === 'PLAYER_CHOOSE_TARGET'
                        ? 'opacity-80 grayscale-[20%] pointer-events-none'
                        : 'cursor-pointer shadow-md hover:-translate-y-6 hover:shadow-2xl hover:z-10')}`}
        >
            {isSelected && (
                <div className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 shadow-lg z-20 animate-in zoom-in spin-in-12">
                    <Trash2 size={18} />
                </div>
            )}

            {/* 五行属性标签 */}
            {element && (
                <div className={`absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm border ${element.bg} ${element.color} ${element.border}`}>
                    {element.name}
                </div>
            )}

            {(card.type === 'weapon' || card.type === 'armor') && (
                <div className={`absolute top-2 ${element ? 'left-8' : 'left-2'} text-[10px] font-bold bg-black/10 px-1.5 py-0.5 rounded`}>
                    {card.type === 'weapon' ? '武器' : '防具'}
                </div>
            )}

            <div className={`font-black text-lg mt-1 mb-2 text-center ${card.color}`}>{card.name}</div>
            <card.icon size={40} className={`mx-auto my-3 ${card.color}`} />
            <div className="text-[11px] text-stone-600 leading-snug font-medium bg-white/70 p-2 rounded-lg backdrop-blur-sm">{card.desc}</div>
        </div>
    );
}