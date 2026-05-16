
import React, { useState } from 'react';
import { Flashcard } from '../types';

interface FlashcardItemProps {
  card: Flashcard;
}

export const FlashcardItem: React.FC<FlashcardItemProps> = ({ card }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="relative w-full h-80 cursor-pointer perspective group"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] shadow-xl group-hover:shadow-2xl group-hover:-translate-y-1 transition-all border border-slate-100">
          <div className="absolute top-8 left-10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objective</span>
          </div>
          <p className="text-2xl text-center font-black text-slate-900 leading-tight tracking-tight">
            {card.front}
          </p>
          <div className="mt-8 px-4 py-2 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Click to reveal
          </div>
        </div>

        <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-10 bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800">
          <div className="absolute top-8 left-10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synthesis</span>
          </div>
          <p className="text-xl text-center font-bold text-sky-50 leading-relaxed">
            {card.back}
          </p>
          <div className="mt-8 px-4 py-2 bg-white/5 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Click to flip back
          </div>
        </div>
      </div>
    </div>
  );
};
