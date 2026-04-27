import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Keep minimal logging for production diagnostics.
    console.error('Unhandled UI error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen">
          <div className="header">
            <span className="header-title">Something went wrong</span>
          </div>
          <div className="card">
            <div className="note-text">
              The app hit an unexpected error. Refresh the page to continue.
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
