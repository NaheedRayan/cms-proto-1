
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Settings, Store as StoreIcon, LogOut, Package, Image as ImageIcon, ClipboardList } from 'lucide-react';
import { Button } from './ui';
import { getStore } from '../services/mockService';
import { Store } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  const [store, setStore] = useState<Store | null>(null);

  // Mock checking if we have a valid store, else default
  const activeStoreId = storeId || 'store-1';

  useEffect(() => {
    if (activeStoreId) {
        getStore(activeStoreId).then(setStore);
    }
  }, [activeStoreId]);

  const routes = [
    {
      href: `/${activeStoreId}`,
      label: 'Overview',
      icon: LayoutDashboard,
      active: location.pathname === `/${activeStoreId}`,
    },
    {
      href: `/${activeStoreId}/billboards`,
      label: 'Billboards',
      icon: ImageIcon,
      active: location.pathname.includes('/billboards'),
    },
    {
      href: `/${activeStoreId}/products`,
      label: 'Products',
      icon: Package,
      active: location.pathname.includes('/products'),
    },
    {
      href: `/${activeStoreId}/inventory`,
      label: 'Inventory',
      icon: ClipboardList,
      active: location.pathname.includes('/inventory'),
    },
    {
      href: `/${activeStoreId}/orders`,
      label: 'Orders',
      icon: ShoppingBag,
      active: location.pathname.includes('/orders'),
    },
    {
      href: `/${activeStoreId}/settings`,
      label: 'Settings',
      icon: Settings,
      active: location.pathname.includes('/settings'),
    },
  ];

  const handleLogout = () => {
    // In a real app, sign out from Supabase
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-muted/20 flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b">
          <div className="h-8 w-8 rounded-lg bg-white border flex items-center justify-center overflow-hidden shrink-0">
             {store?.logoUrl ? (
                 <img src={store.logoUrl} alt={store.name} className="h-full w-full object-contain p-1" />
             ) : (
                <StoreIcon className="h-4 w-4 text-primary" />
             )}
          </div>
          <span className="font-bold text-lg truncate">{store?.name || 'CMS'}</span>
        </div>
        
        <div className="flex-1 px-4 py-4 space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              to={route.href}
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
             <div className="text-sm text-muted-foreground">Admin User</div>
             <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center">
                <span className="text-xs font-bold">AD</span>
             </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
