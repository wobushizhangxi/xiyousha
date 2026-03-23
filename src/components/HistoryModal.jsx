import React from 'react';
import { ScrollText, X } from 'lucide-react';

export default function HistoryModal({ logs, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-stone-50 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[70vh] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b flex justify-between items-center bg-white">
                    <h3 className="text-xl font-bold flex items-center gap-2"><ScrollText /> 观战笔记</h3>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full"><X /></button>
                </div>
                <div className="overflow-y-auto p-6 space-y-2 font-mono text-sm bg-stone-50">
                    {logs.map((log, i) => (
                        <div key={i} className={`pb-2 border-b border-stone-200/50 ${log.includes('===') ? 'text-black font-bold mt-4' : 'text-stone-600'}`}>
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
