/**
 * Helper utilities for the frontend
 */

/**
 * Format date to readable string
 * @param {Date | string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Get badge color class based on priority
 * @param {string} priority - Priority level
 * @returns {string} CSS class name
 */
export const getPriorityColor = (priority) => {
  const colors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white',
  };
  return colors[priority] || colors.medium;
};

/**
 * Get status badge color
 * @param {string} status - Status value
 * @returns {string} CSS class name
 */
export const getStatusColor = (status) => {
  const colors = {
    open: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
    in_progress: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || colors.open;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit time in ms
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Parse error message from response
 * @param {Error | object} error - Error object or API response
 * @returns {string} Error message
 */
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'An unexpected error occurred';
};

/**
 * Group issues by priority
 * @param {Array} issues - Array of issues
 * @returns {Object} Grouped issues
 */
export const groupByPriority = (issues) => {
  return {
    critical: issues.filter((i) => i.priority === 'critical'),
    high: issues.filter((i) => i.priority === 'high'),
    medium: issues.filter((i) => i.priority === 'medium'),
    low: issues.filter((i) => i.priority === 'low'),
  };
};

/**
 * Sort issues by priority
 * @param {Array} issues - Array of issues
 * @returns {Array} Sorted issues
 */
export const sortByPriority = (issues) => {
  const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...issues].sort(
    (a, b) => (priorityMap[a.priority] || 2) - (priorityMap[b.priority] || 2)
  );
};

/**
 * Calculate similarity percentage
 * @param {number} similarity - Similarity score (0-1)
 * @returns {number} Percentage (0-100)
 */
export const similarityToPercentage = (similarity) => {
  return Math.round(similarity * 100);
};

/**
 * Local storage helper
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage', error);
      return false;
    }
  },
};

export default {
  formatDate,
  truncateText,
  getPriorityColor,
  getStatusColor,
  isValidEmail,
  debounce,
  throttle,
  getErrorMessage,
  groupByPriority,
  sortByPriority,
  similarityToPercentage,
  storage,
};
