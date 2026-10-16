import { Component, type ErrorInfo, type ReactNode } from 'react';
import { withTranslation, type WithTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/Button';

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryBase extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Uncaught render error', error, { componentStack: info.componentStack });
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    const { t } = this.props;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-e2">
          <h1 className="text-h1 text-text">{t('errorBoundary.title')}</h1>
          <p className="mt-2 text-body text-text-muted">{t('errorBoundary.description')}</p>
          <Button
            className="mt-6"
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
            onClick={() => window.location.reload()}
          >
            {t('errorBoundary.reload')}
          </Button>
        </div>
      </div>
    );
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
