import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type ToastProps = {
  message?: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-white text-white",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`fixed bottom-5 right-5 px-4 py-2 rounded-lg shadow-md flex items-center gap-3 ${typeStyles[type]}`}
      >
        <span>{message}</span>
        <button onClick={onClose} className="ml-auto text-white">
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;
