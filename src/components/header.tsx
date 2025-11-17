'use client';

import { UserNav } from '@/components/dashboard/user-nav';
import { useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from './dashboard/theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './ui/sheet';
import { Button } from './ui/button';
import { Home, Menu, Package2, Handshake, Users, Settings, Package, UserCircle, Truck, FileText, FileBarChart, Target, AlertTriangle, TrendingUp, BookText, Cpu, Clock, Timer, BedDouble, ShieldCheck, Megaphone, Gavel } from 'lucide-react';
import { Logo } from './logo';
import { PartnerSwitcher } from './dashboard/partner-switcher';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { YearFilter } from './dashboard/year-filter';


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

export function Header() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
      toast({
        title: 'Déconnecté',
        description: 'Vous avez été déconnecté avec succès.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Échec de la déconnexion',
        description: 'Une erreur est survenue lors de la déconnexion.',
      });
    }
  };
  
  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };


  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
        <Sheet>
            <SheetTrigger asChild>
                <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
                >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu de navigation</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
                <nav className="grid gap-2 text-lg font-medium">
                <Link
                    href="#"
                    className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                    <Logo variant="sidebar" />
                </Link>
                {navLinks.map(({ href, label, icon: Icon, exact }) => (
                    <Link
                    key={label}
                    href={href}
                    className={cn(
                        'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground',
                        isLinkActive(href, exact) && 'bg-muted text-foreground'
                    )}
                    >
                    <Icon className="h-5 w-5" />
                    {label}
                    </Link>
                ))}
                </nav>
                <div className="mt-auto">
                </div>
            </SheetContent>
        </Sheet>


      <div className="w-full flex-1 flex items-center justify-between">
        <PartnerSwitcher />
        <div className="flex items-center gap-2">
            <YearFilter />
            <ThemeToggle />
            <UserNav user={user} onLogout={handleLogout} />
        </div>
      </div>
    </header>
  );
}
