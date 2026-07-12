import React from 'react';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: 'var(--error, #f87171)', fontFamily: 'monospace' }}>
          <h2>Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
