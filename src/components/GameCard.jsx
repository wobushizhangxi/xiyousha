import React from 'react';
import { Trash2 } from 'lucide-react';
import { CARD_TYPES } from '../config/gameConfig';

export default function GameCard({ card, phase, isSelected, canConfirmDiscard, onClick }) {
    const shouldDim = phase === 'PLAYER_DISCARD' && !isSelected;
    const isDimmedExtra = shouldDim && canConfirmDiscard;

    return (
        <div
            onClick={onClick}
            className={`relative flex-shrink-0 w-36 h-48 border-2 rounded-2xl p-4 transition-all duration-300 origin-bottom select-none
                ${card.bg} ${card.border} group
                ${phase === 'PLAYER_RESPONSE'
                ? (card.id === CARD_TYPES.DODGE
                    ? 'ring-4 ring-blue-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.5)] z-10 scale-105 cursor-pointer animate-pulse'
                    : 'opacity-40 grayscale-[80%] cursor-not-allowed hover:translate-y-0')
                : phase === 'PLAYER_DISCARD'
                    ? (isSelected
                        ? 'ring-4 ring-red-500 -translate-y-6 shadow-[0_20px_25px_-5px_rgba(220,38,38,0.4)] z-10 scale-105 cursor-pointer'
                        : `cursor-pointer hover:-translate-y-2 hover:opacity-100 ${isDimmedExtra ? 'opacity-30 grayscale-[50%]' : 'opacity-70'}`)
                    : (phase === 'IDLE' || phase === 'AI_TURN'
                        ? 'opacity-90 grayscale-[20%]'
                        : 'cursor-pointer shadow-md hover:-translate-y-6 hover:shadow-2xl hover:z-10')}`}
        >
            {isSelected && (
                <div className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full p-2 shadow-lg z-20 animate-in zoom-in spin-in-12">
                    <Trash2 size={18} />
                </div>
            )}
            <div className={`font-black text-lg mb-2 ${card.color}`}>{card.name}</div>
            <card.icon size={44} className={`mx-auto my-4 ${card.color}`} />
            <div className="text-[11px] text-stone-600 leading-snug font-medium bg-white/70 p-2 rounded-lg backdrop-blur-sm">{card.desc}</div>
        </div>
    );
}