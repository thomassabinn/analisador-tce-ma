import React from 'react';

interface DownloadProgressToastProps {
  message: string;
}

const DownloadProgressToast: React.FC<DownloadProgressToastProps> = ({ message }) => {
  return (
    <div className="fixed bottom-5 right-5 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl flex items-center justify-center z-50 animate-fade-in-up">
      <div className="w-5 h-5 border-2 border-white dark:border-gray-900 border-t-transparent border-solid rounded-full animate-spin mr-3"></div>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default DownloadProgressToast;