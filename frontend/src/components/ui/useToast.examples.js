/**
 * useToast Hook - Usage Examples
 * 
 * The useToast hook provides a simple way to show ephemeral toast notifications
 * throughout your application.
 */

import { useToast } from './useToast';

// Example 1: Basic usage in a component
function MyComponent() {
  const { showToast } = useToast();

  const handleSuccess = () => {
    showToast('Operation completed successfully!', 'success', 3000);
  };

  const handleError = () => {
    showToast('An error occurred!', 'error', 4000);
  };

  const handleWarning = () => {
    showToast('Warning: Please check your input', 'warning', 3500);
  };

  const handleInfo = () => {
    showToast('Here is some information', 'info', 3000);
  };

  return (
    <div>
      <button onClick={handleSuccess}>Show Success</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleWarning}>Show Warning</button>
      <button onClick={handleInfo}>Show Info</button>
    </div>
  );
}

// Example 2: Using with async operations
async function submitForm(data) {
  const { showToast } = useToast();

  try {
    // Simulate API call
    await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    showToast('Form submitted successfully!', 'success');
  } catch (error) {
    showToast('Failed to submit form', 'error');
  }
}

// Example 3: Manual dismiss
function AdvancedComponent() {
  const { showToast, dismissToast, clearAllToasts } = useToast();

  const showPersistentToast = () => {
    // Pass 0 or negative timeout to prevent auto-dismiss
    const toastId = showToast('This toast stays until dismissed', 'info', 0);
    
    // Manually dismiss after some action
    setTimeout(() => {
      dismissToast(toastId);
    }, 5000);
  };

  const clearAll = () => {
    clearAllToasts();
  };

  return (
    <div>
      <button onClick={showPersistentToast}>Show Persistent Toast</button>
      <button onClick={clearAll}>Clear All Toasts</button>
    </div>
  );
}

// Example 4: Toast types
// - 'success': Green background, checkmark icon
// - 'error': Red background, X icon
// - 'warning': Yellow background, warning icon
// - 'info': Blue background, info icon (default)

// Example 5: Toast parameters
// showToast(message, type, timeout)
// - message: String - The text to display
// - type: 'success' | 'error' | 'warning' | 'info' (default: 'info')
// - timeout: Number in milliseconds (default: 3000, use 0 for no auto-dismiss)

export { MyComponent, AdvancedComponent };
