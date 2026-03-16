import React, { useState, useEffect, useMemo } from 'react';
import { XIcon, FaceFrownIcon, FaceMehIcon, FaceSmileIcon, FaceGrinningIcon, FaceStarStruckIcon } from './icons';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: { rating: number; text: string }) => void;
}

const ratings = [
  { value: 1, label: 'Terrível', Icon: FaceFrownIcon, color: 'text-red-500' },
  { value: 2, label: 'Ruim', Icon: FaceMehIcon, color: 'text-orange-500' },
  { value: 3, label: 'Ok', Icon: FaceSmileIcon, color: 'text-yellow-500' },
  { value: 4, label: 'Bom', Icon: FaceGrinningIcon, color: 'text-brand-500' },
  { value: 5, label: 'Incrível', Icon: FaceStarStruckIcon, color: 'text-teal-500' },
];

const MAX_CHARS = 900;

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [rating, setRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const activeRating = useMemo(() => ratings.find(r => r.value === rating), [rating]);
  
  const thumbColor = useMemo(() => {
    switch(rating) {
        case 1: return '#EF4444'; 
        case 2: return '#F97316'; 
        case 3: return '#EAB308'; 
        case 4: return '#3B82F6'; // Brand Blue
        case 5: return '#14B8A6'; 
        default: return '#3B82F6';
    }
  }, [rating]);

  useEffect(() => {
    if (isOpen) {
      setRating(4);
      setFeedbackText('');
      setIsSending(false);
    }
  }, [isOpen]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    onSubmit({ rating, text: feedbackText });
    setIsSending(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-slide-in-down overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
             <h2 id="feedback-title" className="text-lg font-bold text-gray-900">Sua opinião importa</h2>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          <div className="mb-8 text-center">
             <p className="text-sm text-gray-500 mb-4">Como você avalia sua experiência?</p>
            <div className="flex justify-center items-center space-x-4 mb-6">
              {ratings.map(({ value, Icon }) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  className={`transition-all duration-200 ${rating === value ? 'transform scale-125 drop-shadow-md' : 'grayscale opacity-40 hover:opacity-100 hover:grayscale-0'}`}
                >
                  <Icon className={`w-10 h-10 ${rating === value ? activeRating?.color : 'text-gray-400'}`} />
                </button>
              ))}
            </div>
            <div className="px-4">
                <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    style={{ '--thumb-color': thumbColor } as React.CSSProperties}
                    className="feedback-slider w-full"
                />
            </div>
             <p className={`text-center text-sm font-bold mt-3 ${activeRating?.color}`}>{activeRating?.label}</p>
          </div>
          
          <div>
            <label htmlFor="feedback-text" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Mensagem
            </label>
            <textarea
            id="feedback-text"
            rows={4}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value.slice(0, MAX_CHARS))}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all resize-none placeholder-gray-400"
            placeholder="Conte-nos o que podemos melhorar..."
            />
            <div className="text-right mt-1">
                <span className="text-[10px] text-gray-400">{feedbackText.length}/{MAX_CHARS}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSending || !feedbackText.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-transparent text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm flex items-center"
          >
            {isSending ? 'Enviando...' : 'Enviar Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;