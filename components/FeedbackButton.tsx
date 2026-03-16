import React from 'react';
import { FeedbackIcon } from './icons';

interface FeedbackButtonProps {
    onClick: () => void;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-950 focus:ring-indigo-500 transition-all duration-300 ease-in-out transform hover:scale-110"
            aria-label="Deixar feedback"
            title="Deixar feedback"
        >
            <FeedbackIcon className="w-7 h-7" />
             <div className="absolute right-full mr-3 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none transform group-hover:-translate-x-0 -translate-x-2">
                Deixar Feedback
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-4 border-l-gray-800 dark:border-l-gray-700"></div>
            </div>
        </button>
    );
};

export default FeedbackButton;
