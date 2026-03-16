import React from 'react';

interface LoaderProps {
  message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="flex flex-col justify-center items-center my-8 text-center">
      <div className="w-12 h-12 border-4 border-indigo-500 dark:border-indigo-400 border-t-transparent border-solid rounded-full animate-spin"></div>
      <p className="mt-4 text-indigo-600 dark:text-indigo-300 font-medium">{message}</p>
    </div>
  );
};

export default Loader;