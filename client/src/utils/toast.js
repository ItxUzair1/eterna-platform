// Utility for toast notifications
import toast from 'react-hot-toast';

export const showSuccess = (message) => {
  toast.success(message, { duration: 4000 });
};

export const showError = (message) => {
  toast.error(message, { duration: 5000 });
};

export const showInfo = (message) => {
  toast(message, { duration: 4000 });
};

export default toast;

