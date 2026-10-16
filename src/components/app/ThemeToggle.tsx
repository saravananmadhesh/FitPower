import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUiStore } from '@/store/useUiStore';
import { Button } from '@/components/ui/Button';

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      aria-label={t(isDark ? 'theme.switchToLight' : 'theme.switchToDark')}
      onClick={toggleTheme}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
