import React from 'react';
import { toast } from 'react-toastify';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details with more context
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Component stack:', errorInfo?.componentStack);
    console.error('Error info:', errorInfo);
    
    // Filter out common non-critical errors that shouldn't trigger the error boundary
    const errorMessage = error?.message || '';
    const isNonCriticalError = 
      errorMessage.includes('ResizeObserver') ||
      errorMessage.includes('Non-Error promise rejection') ||
      errorMessage.includes('socket.io') ||
      errorMessage.includes('WebRTC') ||
      errorMessage.includes('peer') ||
      errorMessage.includes('MediaStream');
    
    // Only show error boundary for critical errors
    if (isNonCriticalError) {
      console.warn('Non-critical error caught, not showing error boundary:', errorMessage);
      return;
    }
    
    this.setState({
      error,
      errorInfo,
    });

    // Show user-friendly error message only for critical errors
    toast.error('An unexpected error occurred. Please refresh the page and try again.', {
      autoClose: 5000,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
          }}
        >
          <h1 style={{ color: '#d32f2f', marginBottom: '20px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#666', marginBottom: '30px', maxWidth: '600px' }}>
            We're sorry, but an unexpected error occurred. Please try refreshing the page.
            If the problem persists, please contact support.
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
            }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: '30px',
                padding: '20px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                maxWidth: '800px',
                textAlign: 'left',
              }}
            >
              <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  overflow: 'auto',
                  fontSize: '12px',
                  color: '#d32f2f',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

