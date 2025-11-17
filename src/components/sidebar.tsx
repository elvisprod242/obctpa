'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Handshake, Users, Settings, Package, Bell, UserCircle, Truck, FileText, FileBarChart, Target, AlertTriangle, TrendingUp, BookText, Cpu, Clock, Timer, BedDouble, ShieldCheck, Megaphone, Gavel } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

const navLinks = [
  { href: '/dashboard', label: 'Tableau de bord', icon: Home, exact: true },
  { href: '/dashboard/partenaires', label: 'Partenaires', icon: Handshake },
  { href: '/dashboard/conducteurs', label: 'Conducteurs', icon: UserCircle },
  { href: '/dashboard/vehicules', label: 'Véhicules', icon: Truck },
  { href: '/dashboard/equipements', label: 'Équipements', icon: Cpu },
  { href: '/dashboard/invariants', label: 'Invariants', icon: FileText },
  { href: '/dashboard/rapports', label: 'Rapports', icon: FileBarChart },
  { href: '/dashboard/objectifs', label: 'Objectifs', icon: Target },
  { href: '/dashboard/infractions', label: 'Infractions', icon: AlertTriangle },
  { href: '/dashboard/scp', label: 'SCP', icon: Gavel },
  { href: '/dashboard/kpi', label: 'KPI', icon: TrendingUp },
  { href: '/dashboard/temps-travail', label: 'Temps de Travail', icon: Clock },
  { href: '/dashboard/temps-conduite', label: 'Temps de Conduite', icon: Timer },
  { href: '/dashboard/temps-repos', label: 'Temps de Repos', icon: BedDouble },
  { href: '/dashboard/procedures', label: 'Procédures', icon: BookText },
  { href: '/dashboard/controle-cabine', label: 'Contrôle Cabine', icon: ShieldCheck },
  { href: '/dashboard/planning-communication', label: 'Planning Com.', icon: Megaphone },
];

export function Sidebar() {
  const pathname = usePathname();

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };


  return (
    <div className="hidden border-r bg-background md:fixed md:inset-y-0 md:left-0 md:z-10 md:block md:w-[220px] lg:w-[280px]">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo variant="sidebar" />
          </Link>
        </div>
        <ScrollArea className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navLinks.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isLinkActive(href, exact) && 'bg-muted text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4">
        </div>
      </div>
    </div>
  );
}
