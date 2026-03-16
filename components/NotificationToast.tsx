import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, WarningIcon, XIcon } from './icons';

interface NotificationToastProps {
  notification: { message: string; type: 'success' | 'error' } | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        handleClose();
      }, 5000); // Auto-dismiss after 5 seconds
    } else {
      setIsVisible(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    // Allow animation to finish before calling onClose
    setTimeout(() => {
        onClose();
    }, 300);
  };
  
  const handleMouseEnter = () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }
  };

  const handleMouseLeave = () => {
    timerRef.current = window.setTimeout(() => {
        handleClose();
    }, 2000); // Give 2 more seconds after mouse leave
  };

  if (!notification) {
    return null;
  }

  const isSuccess = notification.type === 'success';
  const bgColor = isSuccess ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30';
  const borderColor = isSuccess ? 'border-green-500' : 'border-red-500';
  const iconColor = isSuccess ? 'text-green-500' : 'text-red-500';
  const textColor = isSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-700 dark:text-red-200';
  const Icon = isSuccess ? CheckCircleIcon : WarningIcon;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-lg shadow-2xl border-l-4 ${borderColor} ${bgColor} transition-all duration-300 ease-in-out ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className={`text-sm font-medium ${textColor}`}>
            {notification.message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleClose}
            className={`inline-flex rounded-md p-1.5 ${isSuccess ? 'text-green-500 hover:bg-green-100' : 'text-red-500 hover:bg-red-100'} dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isSuccess ? 'focus:ring-green-600' : 'focus:ring-red-600'}`}
          >
            <span className="sr-only">Close</span>
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
