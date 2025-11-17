'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  Briefcase,
  Truck,
  UserCircle,
  AlertTriangle,
  FileText,
  Clock,
  Timer,
  Loader2,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { useYearFilter } from '@/context/year-filter-context';

type Partenaire = { id: string; nom: string; actif: boolean };
type Conducteur = { id: string; nom: string; prenom: string };
type Vehicule = { id: string };
type Invariant = { id: string; titre: string };
type Infraction = {
  id: string;
  date: string;
  partenaire_id: string;
  conducteur_id?: string;
  invariant_id?: string;
  type_infraction: string;
};
type Rapport = {
  id: string;
  date: string;
  temps_conduite: string;
  duree: string;
  partenaire_id: string;
}
type Scp = { id: string; invariants_id: string; type: string; value: number };

function parseTimeStringToHours(timeString: string | undefined): number {
    if (!timeString || typeof timeString !== 'string') return 0;
    const parts = timeString.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [hours, minutes, seconds] = parts;
    return hours + minutes / 60 + seconds / 3600;
}

function Overview({
  infractions,
}: {
  infractions: Infraction[] | null;
}) {
  const { selectedYear } = useYearFilter();

  const data = useMemo(() => {
    if (!selectedYear) return [];
    const monthlyData = [
      { name: 'Jan', total: 0 },
      { name: 'Fév', total: 0 },
      { name: 'Mar', total: 0 },
      { name: 'Avr', total: 0 },
      { name: 'Mai', total: 0 },
      { name: 'Juin', total: 0 },
      { name: 'Juil', total: 0 },
      { name: 'Aoû', total: 0 },
      { name: 'Sep', total: 0 },
      { name: 'Oct', total: 0 },
      { name: 'Nov', total: 0 },
      { name: 'Déc', total: 0 },
    ];

    infractions?.forEach((infraction) => {
      try {
        const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
        if (
          !isNaN(infractionDate.getTime()) &&
          (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear)
        ) {
          const month = infractionDate.getMonth();
          monthlyData[month].total += 1;
        }
      } catch (e) {
        console.error('Invalid date format for infraction:', infraction);
      }
    });

    return monthlyData;
  }, [infractions, selectedYear]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
          allowDecimals={false}
        />
        <Bar
          dataKey="total"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MonthlyTimeChart({
  rapports,
  dataKey,
  fillColor,
}: {
  rapports: Rapport[] | null;
  dataKey: 'temps_conduite' | 'duree';
  fillColor: string;
}) {
  const { selectedYear } = useYearFilter();

  const data = useMemo(() => {
    if (!selectedYear) return [];
    const monthlyData = [
      { name: 'Jan', total: 0 }, { name: 'Fév', total: 0 },
      { name: 'Mar', total: 0 }, { name: 'Avr', total: 0 },
      { name: 'Mai', total: 0 }, { name: 'Juin', total: 0 },
      { name: 'Juil', total: 0 }, { name: 'Aoû', total: 0 },
      { name: 'Sep', total: 0 }, { name: 'Oct', total: 0 },
      { name: 'Nov', total: 0 }, { name: 'Déc', total: 0 },
    ];

    rapports?.forEach((rapport) => {
      try {
        const rapportDate = new Date(rapport.date.includes('/') ? rapport.date.split('/').reverse().join('-') : rapport.date);
        if (
          !isNaN(rapportDate.getTime()) &&
          (selectedYear === 'all' || rapportDate.getFullYear().toString() === selectedYear)
        ) {
          const month = rapportDate.getMonth();
          monthlyData[month].total += parseTimeStringToHours(rapport[dataKey]);
        }
      } catch (e) {
        console.error('Invalid date format for rapport:', rapport);
      }
    });

    return monthlyData.map(d => ({ ...d, total: Math.round(d.total) }));
  }, [rapports, selectedYear, dataKey]);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${value} heures`, 'Total']}
        />
        <Bar dataKey="total" fill={fillColor} radius={[4, 4, 0, 0]}>
            <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={12} formatter={(value: number) => value > 0 ? `${value}h` : ''} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}


function InfractionsByTypeChart({ infractions }: { infractions: Infraction[] | null }) {
  const { selectedYear } = useYearFilter();

  const data = useMemo(() => {
    if (!selectedYear) return [];
    const typeCounts = { 'Alerte': 0, 'Alarme': 0 };
    infractions?.forEach(infraction => {
      try {
        const infractionDate = new Date(infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date);
        if (
          !isNaN(infractionDate.getTime()) &&
          (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear)
        ) {
          if (infraction.type_infraction === 'Alerte' || infraction.type_infraction === 'Alarme') {
            typeCounts[infraction.type_infraction]++;
          }
        }
      } catch (e) {
        // Ignore invalid dates
      }
    });

    return [
      { name: 'Alertes', value: typeCounts.Alerte },
      { name: 'Alarmes', value: typeCounts.Alarme },
    ].filter(item => item.value > 0);
  }, [infractions, selectedYear]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))'];

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Aucune donnée pour ce graphique.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          label={({ name, value }) => `${name} (${value})`}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} infractions`, name]} />
      </PieChart>
    </ResponsiveContainer>
  );
}


function RecentInfractions({
  infractions,
  conducteurs,
}: {
  infractions: (Infraction & { conducteurNom?: string })[] | null;
  conducteurs: Conducteur[] | null;
}) {
  const enrichedInfractions = useMemo(() => {
    const driverMap = new Map(
      conducteurs?.map((c) => [c.id, `${c.prenom} ${c.nom}`])
    );
    return infractions
      ?.map((inf) => ({
        ...inf,
        conducteurNom: inf.conducteur_id
          ? driverMap.get(inf.conducteur_id)
          : 'N/A',
      }))
      .sort((a, b) => {
        try {
          const dateA = new Date(a.date.includes('/') ? a.date.split('/').reverse().join('-') : a.date).getTime();
          const dateB = new Date(b.date.includes('/') ? b.date.split('/').reverse().join('-') : b.date).getTime();
          return dateB - dateA;
        } catch {
          return 0;
        }
      })
      .slice(0, 5);
  }, [infractions, conducteurs]);

  return (
    <div className="space-y-8">
      {enrichedInfractions?.map((infraction) => (
        <div key={infraction.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarFallback>
              <AlertTriangle className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">
              {infraction.conducteurNom}
            </p>
            <p className="text-sm text-muted-foreground">
              {infraction.type_infraction}
            </p>
          </div>
          <div className="ml-auto font-medium">{formatDate(infraction.date)}</div>
        </div>
      ))}
      {(!enrichedInfractions || enrichedInfractions.length === 0) && (
        <p className="text-sm text-muted-foreground text-center">Aucune infraction récente.</p>
      )}
    </div>
  );
}

function InfractionsByInvariantChart({
    infractions,
    invariants,
  }: {
    infractions: Infraction[] | null;
    invariants: Invariant[] | null;
  }) {
    const { selectedYear } = useYearFilter();
  
    const data = useMemo(() => {
      if (!infractions || !invariants || !selectedYear) return [];
  
      const infractionCounts: { [key: string]: number } = {};
  
      infractions.forEach((infraction) => {
        try {
          const infractionDate = new Date(
            infraction.date.includes('/')
              ? infraction.date.split('/').reverse().join('-')
              : infraction.date
          );
          if (
            !isNaN(infractionDate.getTime()) &&
            (selectedYear === 'all' ||
              infractionDate.getFullYear().toString() === selectedYear)
          ) {
            if (infraction.invariant_id) {
              infractionCounts[infraction.invariant_id] =
                (infractionCounts[infraction.invariant_id] || 0) + 1;
            }
          }
        } catch (e) {
          // Ignore invalid dates
        }
      });
  
      const invariantMap = new Map(invariants.map((i) => [i.id, i.titre]));
  
      return Object.entries(infractionCounts)
        .map(([invariantId, count]) => ({
          name: invariantMap.get(invariantId) || 'Invariant inconnu',
          total: count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); // Display top 5
    }, [infractions, invariants, selectedYear]);
  
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Aucune donnée pour ce graphique.
        </div>
      );
    }
  
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${value} infractions`, 'Total']}
          />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
             <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  function PointsPerdusParConducteurChart({
    infractions,
    scpData,
    conducteurs,
  }: {
    infractions: Infraction[] | null;
    scpData: Scp[] | null;
    conducteurs: Conducteur[] | null;
  }) {
    const { selectedYear } = useYearFilter();
  
    const data = useMemo(() => {
      if (!infractions || !scpData || !conducteurs || !selectedYear) return [];
  
      const scpMap = new Map(
        scpData.map((rule) => [`${rule.invariants_id}-${rule.type}`.toLowerCase(), rule.value])
      );
  
      const pointsPerDriver: { [driverId: string]: number } = {};
  
      infractions.forEach((infraction) => {
        try {
          const infractionDate = new Date(
            infraction.date.includes('/') ? infraction.date.split('/').reverse().join('-') : infraction.date
          );
          if (
            !isNaN(infractionDate.getTime()) &&
            (selectedYear === 'all' || infractionDate.getFullYear().toString() === selectedYear)
          ) {
            if (infraction.conducteur_id) {
              const ruleKey = `${infraction.invariant_id}-${infraction.type_infraction}`.toLowerCase();
              const pointsLost = scpMap.get(ruleKey) || 0;
              pointsPerDriver[infraction.conducteur_id] = (pointsPerDriver[infraction.conducteur_id] || 0) + pointsLost;
            }
          }
        } catch (e) {
          // Ignore invalid dates
        }
      });
  
      const driverMap = new Map(conducteurs.map((d) => [d.id, `${d.prenom} ${d.nom}`]));
  
      return Object.entries(pointsPerDriver)
        .map(([driverId, totalPoints]) => ({
          name: driverMap.get(driverId) || `Conducteur ${driverId.substring(0, 5)}...`,
          total: totalPoints,
        }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total);
    }, [infractions, scpData, conducteurs, selectedYear]);
  
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Aucun point perdu pour la période.
        </div>
      );
    }
  
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))' }}
            formatter={(value) => [`${value} points`, 'Total Perdu']}
          />
          <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="total" position="top" className="fill-foreground" fontSize={12} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

export default function DashboardPage() {
  const firestore = useFirestore();
  const { selectedYear } = useYearFilter();

  const partenairesQuery = useMemoFirebase(
    () => collection(firestore, 'partenaires'),
    [firestore]
  );
  const { data: partenaires, isLoading: isLoadingPartenaires } =
    useCollection<Partenaire>(partenairesQuery);

  const conducteursQuery = useMemoFirebase(
    () => collection(firestore, 'conducteurs'),
    [firestore]
  );
  const { data: conducteurs, isLoading: isLoadingConducteurs } =
    useCollection<Conducteur>(conducteursQuery);

  const vehiculesQuery = useMemoFirebase(
    () => collection(firestore, 'vehicules'),
    [firestore]
  );
  const { data: vehicules, isLoading: isLoadingVehicules } =
    useCollection<Vehicule>(vehiculesQuery);
    
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const activePartnerQueryConditions = useMemo(() => (
    activePartner ? [where('partenaire_id', '==', activePartner.id)] : []
  ), [activePartner]);

  const infractionsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'infractions'), ...activePartnerQueryConditions);
  }, [firestore, activePartnerQueryConditions]);
  
  const { data: infractions, isLoading: isLoadingInfractions } =
    useCollection<Infraction>(infractionsQuery);

  const rapportsQuery = useMemoFirebase(() => {
    return query(collection(firestore, 'rapports'), ...activePartnerQueryConditions);
  }, [firestore, activePartnerQueryConditions]);

  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);


  const invariantsQuery = useMemoFirebase(
    () => collection(firestore, 'invariants'),
    [firestore]
  );
  const { data: invariants, isLoading: isLoadingInvariants } =
    useCollection<Invariant>(invariantsQuery);
  
  const scpQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'scp'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: scpData, isLoading: isLoadingScp } = useCollection<Scp>(scpQuery);

  const infractionsThisMonth = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return infractions?.filter(inf => {
        try {
            const infDate = new Date(inf.date.includes('/') ? inf.date.split('/').reverse().join('-') : inf.date);
            return infDate.getMonth() === currentMonth && infDate.getFullYear() === currentYear;
        } catch {
            return false;
        }
    }).length || 0;
  }, [infractions]);

  if (!selectedYear) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tableau de bord</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Partenaires
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingPartenaires ? '...' : partenaires?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              dont {partenaires?.filter(p => p.actif).length || 0} actif(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conducteurs
            </CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingConducteurs ? '...' : conducteurs?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total des conducteurs enregistrés
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Véhicules</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingVehicules ? '...' : vehicules?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total des véhicules dans la flotte
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Infractions (ce mois-ci)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingInfractions ? '...' : infractionsThisMonth}
            </div>
             <p className="text-xs text-muted-foreground">
              Total pour le mois en cours
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Temps de Travail Mensuel (h)</CardTitle>
                <CardDescription>Total des heures de travail par mois.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <MonthlyTimeChart rapports={rapports} dataKey="duree" fillColor="hsl(var(--primary))" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Temps de Conduite Mensuel (h)</CardTitle>
                <CardDescription>Total des heures de conduite par mois.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <MonthlyTimeChart rapports={rapports} dataKey="temps_conduite" fillColor="hsl(var(--accent-foreground))" />
            </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Aperçu des Infractions ({selectedYear === 'all' ? 'Toutes années' : selectedYear})</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview infractions={infractions} />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Infractions récentes</CardTitle>
            <CardDescription>
              Les 5 dernières infractions enregistrées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentInfractions infractions={infractions} conducteurs={conducteurs} />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Infractions par Invariant</CardTitle>
            <CardDescription>Top 5 des invariants les plus fréquents dans les infractions.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <InfractionsByInvariantChart infractions={infractions} invariants={invariants} />
          </CardContent>
        </Card>
         <Card className="col-span-1 lg:col-span-3">
           <CardHeader>
            <CardTitle>Infractions par Type</CardTitle>
            <CardDescription>
              Répartition des alertes et alarmes.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <InfractionsByTypeChart infractions={infractions} />
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-7">
          <CardHeader>
            <CardTitle>Points Perdus par Conducteur</CardTitle>
            <CardDescription>
                Total des points perdus pour chaque conducteur selon les règles SCP.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <PointsPerdusParConducteurChart
              infractions={infractions}
              scpData={scpData}
              conducteurs={conducteurs}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
