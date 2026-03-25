import React from "react";
import { AlertCircle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error("Error caught by ErrorBoundary:", error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            {/* Error Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle size={32} className="text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-center text-gray-600 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem persists.
            </p>

            {/* Error Details (only in development) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded border border-gray-300 max-h-40 overflow-auto">
                <p className="text-xs font-mono text-red-600 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Error Count */}
            {this.state.errorCount > 3 && (
              <p className="mt-4 text-xs text-gray-500 text-center">
                Multiple errors detected. Please refresh the page or clear your browser cache.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
