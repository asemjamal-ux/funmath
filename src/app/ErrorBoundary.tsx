import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePath, useT } from './hooks';
import { Button } from '../components/Button';
import { Mascot } from '../components/Mascot';

function FriendlyError({ onReset }: { onReset: () => void }) {
  const t = useT();
  const path = usePath();
  const navigate = useNavigate();
  return (
    <main className="center-page" id="main">
      <Mascot expression="calm" size={140} />
      <h1>{t('error.title')}</h1>
      <p>{t('error.body')}</p>
      <Button leadingIcon="home" onClick={() => { onReset(); navigate(path('/home')); }}>{t('common.backToOasis')}</Button>
    </main>
  );
}

/** Friendly Fanak screen instead of a stack trace (agent-instructions §6.1). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // No payload beyond the error itself; never log profile data.
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <FriendlyError onReset={() => this.setState({ failed: false })} />;
    return this.props.children;
  }
}
