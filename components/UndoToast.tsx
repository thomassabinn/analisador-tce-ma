import React from 'react';
import type { GroupedAnalysisResultTopic } from '../types';

interface UndoToastProps {
  recentlyDeleted: { topic: GroupedAnalysisResultTopic; index: number; timeoutId: number } | null;
  onUndo: () => void;
}

const getTopicNumber = (title: string): string | null => {
  const match = title.match(/^[\d\.]+/);
  return match ? match[0] : null;
};

const UndoToast: React.FC<UndoToastProps> = ({ recentlyDeleted, onUndo }) => {
  if (!recentlyDeleted) {
    return null;
  }

  const topicNumber = getTopicNumber(recentlyDeleted.topic.titulo);
  const topicIdentifier = topicNumber ? `Tópico ${topicNumber}` : 'Tópico';

  return (
    <div className="fixed bottom-5 inset-x-0 flex justify-center z-50 pointer-events-none">
      <div className="bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl flex items-center pointer-events-auto animate-fade-in-up">
        <span className="text-sm mr-2">
            {topicIdentifier} excluído
        </span>
        <span className="text-gray-500 dark:text-gray-400 mx-2" aria-hidden="true">|</span>
        <button
            onClick={onUndo}
            className="text-sm font-bold text-indigo-400 dark:text-indigo-600 hover:underline"
        >
            Desfazer
        </button>
      </div>
    </div>
  );
};

export default UndoToast;