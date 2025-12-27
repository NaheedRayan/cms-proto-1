'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Settings, 
  Store as StoreIcon, 
  LogOut, 
  Package, 
  Image as ImageIcon, 
  ClipboardList,
  Layers
} from 'lucide-react';
import { Button } from './ui';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DashboardShellProps {
  children: React.ReactNode;
  settings: {
    store_name: string;
    logo_url: string | null;
    user_email: string | null;
  };
}



export function DashboardShell({ children, settings }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();


  const routes = [
    {
      href: '/overview',
      label: 'Overview',
      icon: LayoutDashboard,
      active: pathname === '/overview' || pathname === '/',
    },
    {
      href: '/billboards',
      label: 'Billboards',
      icon: ImageIcon,
      active: pathname?.startsWith('/billboards'),
    },
    {
      href: '/categories',
      label: 'Categories',
      icon: Layers,
      active: pathname?.startsWith('/categories'),
    },
    {
      href: '/products',
      label: 'Products',
      icon: Package,
      active: pathname?.startsWith('/products'),
    },
    {
      href: '/inventory',
      label: 'Inventory',
      icon: ClipboardList,
      active: pathname?.startsWith('/inventory'),
    },
    {
      href: '/orders',
      label: 'Orders',
      icon: ShoppingBag,
      active: pathname?.startsWith('/orders'),
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname?.startsWith('/settings'),
    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-muted/20 flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-2 border-b">
          <div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.store_name} className="h-full w-full object-contain p-1" />
            ) : (
              <StoreIcon className="h-4 w-4 text-primary" />
            )}
          </div>
          <span className="font-bold text-lg truncate">{settings.store_name || 'CMS'}</span>
        </div>
        
        <div className="flex-1 px-4 py-4 space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                route.active 
                  ? 'bg-secondary text-primary' 
                  : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'
              }`}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="flex h-16 items-center border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="ml-auto flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">{settings.user_email}</div>
            <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center">
              <span className="text-xs font-bold">{settings.user_email?.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
