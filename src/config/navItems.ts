import {
  LayoutDashboard,
  Dumbbell,
  LayoutGrid,
  CalendarDays,
  TrendingUp,
  Apple,
  Images,
  ClipboardList,
  MessageCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/routes';
import { FEATURES } from './features';

export interface NavItem {
  key: string;
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** False hides the item from navigation while its feature is unfinished. */
  enabled?: boolean;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', to: ROUTES.dashboard, labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { key: 'workout', to: ROUTES.workout, labelKey: 'nav.workout', icon: Dumbbell },
  { key: 'gallery', to: ROUTES.gallery, labelKey: 'nav.gallery', icon: LayoutGrid },
  { key: 'schedule', to: ROUTES.schedule, labelKey: 'nav.schedule', icon: CalendarDays },
  { key: 'progress', to: ROUTES.progress, labelKey: 'nav.progress', icon: TrendingUp },
  { key: 'nutrition', to: ROUTES.nutrition, labelKey: 'nav.nutrition', icon: Apple },
  { key: 'photos', to: ROUTES.photos, labelKey: 'nav.photos', icon: Images },
  { key: 'plan', to: ROUTES.plan, labelKey: 'nav.plan', icon: ClipboardList },
  {
    key: 'coach',
    to: ROUTES.coach,
    labelKey: 'nav.coach',
    icon: MessageCircle,
    enabled: FEATURES.coach,
  },
  { key: 'settings', to: ROUTES.settings, labelKey: 'nav.settings', icon: Settings },
];

export const NAV_ITEMS: NavItem[] = ALL_NAV_ITEMS.filter((item) => item.enabled !== false);
