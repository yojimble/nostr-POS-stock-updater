import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNostrLogin } from '@nostrify/react/login';
import { Boxes, ShoppingCart, Calculator } from 'lucide-react';

import { cn } from '@/lib/utils';

const tabs = [
  { to: '/', label: 'Inventory', icon: Boxes },
  { to: '/pos', label: 'POS', icon: ShoppingCart },
  { to: '/calculator', label: 'Calculator', icon: Calculator },
];

export function NavTabs() {
  const { pathname } = useLocation();
  const { logins } = useNostrLogin();

  return (
    <div className={cn('w-full max-w-3xl mx-auto px-4', logins.length === 0 ? 'pt-10' : 'pt-4')}>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-1 rounded-md bg-muted p-1">
        {tabs.map(({ to, label, icon: Icon }, i) => {
          const active = pathname === to;
          return (
            <Fragment key={to}>
              {i > 0 && <div className="w-px self-stretch bg-border" aria-hidden />}
              <Link
                to={to}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-sm px-2 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
