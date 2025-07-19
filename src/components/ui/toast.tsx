"use client";

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  onClose: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  id, 
  type, 
  title, 
  message, 
  onClose, 
  duration = 5000 
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800";
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800";
      case "info":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800";
      default:
        return "bg-background border-border";
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm animate-in slide-in-from-right-full duration-300",
        getBackgroundColor()
      )}
    >
      {getIcon()}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        {message && (
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id, onClose: removeToast }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showSuccess = React.useCallback((title: string, message?: string) => {
    addToast({ type: "success", title, message });
  }, [addToast]);

  const showError = React.useCallback((title: string, message?: string) => {
    addToast({ type: "error", title, message });
  }, [addToast]);

  const showInfo = React.useCallback((title: string, message?: string) => {
    addToast({ type: "info", title, message });
  }, [addToast]);

  return {
    toasts,
    showSuccess,
    showError,
    showInfo,
    removeToast,
  };
}; 