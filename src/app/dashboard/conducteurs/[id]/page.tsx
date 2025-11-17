'use client';

import { useMemo } from 'react';
import { useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowLeft, TrendingDown, Truck, User, UserCircle, GaugeCircle, Printer } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useYearFilter } from '@/context/year-filter-context';

// Type definitions
type Conducteur = { id: string; nom: string; prenom: string; numero_permis: string; categorie_permis: string; cle_obc: string; lieu_travail: string; };
type Vehicule = { id: string; nom: string; immatriculation: string; conducteur_id: string; };
type Infraction = { id: string; date: string; type_infraction: string; invariant_id: string; };
type Invariant = { id: string; titre: string; };
type Scp = { id: string; invariants_id: string; sanction: string; type: string; value: number; };
type Rapport = { id: string; date: string; distance_km: string; };

type InfractionDetail = {
    id: string;
    date: string;
    invariantTitre: string;
    type: string;
    pointsPerdus: number;
    sanction: string;
};

function InfoCard({ title, value, icon: Icon, isLoading }: { title: string; value: string | number; icon: React.ElementType; isLoading: boolean; }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConducteurDetailPage() {
    const params = useParams();
    const conducteurId = params.id as string;
    const firestore = useFirestore();
    const { selectedYear } = useYearFilter();

    const conducteurRef = useMemoFirebase(() => doc(firestore, 'conducteurs', conducteurId), [firestore, conducteurId]);
    const { data: conducteur, isLoading: isLoadingConducteur } = useDoc<Conducteur>(conducteurRef);

    const infractionsQuery = useMemoFirebase(() => query(collection(firestore, 'infractions'), where('conducteur_id', '==', conducteurId)), [firestore, conducteurId]);
    const { data: infractions, isLoading: isLoadingInfractions } = useCollection<Infraction>(infractionsQuery);

    const vehiculesQuery = useMemoFirebase(() => query(collection(firestore, 'vehicules'), where('conducteur_id', '==', conducteurId)), [firestore, conducteurId]);
    const { data: vehicules, isLoading: isLoadingVehicules } = useCollection<Vehicule>(vehiculesQuery);
    const assignedVehicle = vehicules?.[0];

    const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
    const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);
    
    const scpQuery = useMemoFirebase(() => collection(firestore, 'scp'), [firestore]);
    const { data: scpData, isLoading: isLoadingScp } = useCollection<Scp>(scpQuery);

    const rapportsQuery = useMemoFirebase(() => query(collection(firestore, 'rapports'), where('conducteur_id', '==', conducteurId)), [firestore, conducteurId]);
    const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);

    const isLoading = isLoadingConducteur || isLoadingInfractions || isLoadingVehicules || isLoadingInvariants || isLoadingScp || isLoadingRapports;

    const { infractionDetails, totalPointsPerdus } = useMemo(() => {
        if (!infractions || !scpData || !invariants || !selectedYear) {
          return { infractionDetails: [], totalPointsPerdus: 0 };
        }
    
        const scpMap = new Map(scpData.map(rule => [`${rule.invariants_id}-${rule.type}`.toLowerCase(), rule]));
        const invariantMap = new Map(invariants.map(inv => [inv.id, inv.titre]));
        
        let points = 0;
        const details = infractions.filter(inf => {
            if (selectedYear === 'all') return true;
            try {
                const infDate = new Date(inf.date.includes('/') ? inf.date.split('/').reverse().join('-') : inf.date);
                return infDate.getFullYear().toString() === selectedYear;
            } catch { return false; }
        }).map(inf => {
            const ruleKey = `${inf.invariant_id}-${inf.type_infraction}`.toLowerCase();
            const rule = scpMap.get(ruleKey);
            const pointsPerdus = rule?.value || 0;
            points += pointsPerdus;
            
            return {
              id: inf.id,
              date: inf.date,
              invariantTitre: invariantMap.get(inf.invariant_id || '') || 'Invariant Inconnu',
              type: inf.type_infraction,
              pointsPerdus: pointsPerdus,
              sanction: rule?.sanction || 'N/A',
            };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        return { infractionDetails: details, totalPointsPerdus: points };

    }, [infractions, scpData, invariants, selectedYear]);

    const totalKilometrage = useMemo(() => {
        if (!rapports || !selectedYear) return 0;
        return rapports
            .filter(rap => {
                if (selectedYear === 'all') return true;
                try {
                    const rapDate = new Date(rap.date.includes('/') ? rap.date.split('/').reverse().join('-') : rap.date);
                    return rapDate.getFullYear().toString() === selectedYear;
                } catch { return false; }
            })
            .reduce((acc, rapport) => {
                const distance = parseFloat(String(rapport.distance_km).replace(',', '.')) || 0;
                return acc + distance;
            }, 0);
    }, [rapports, selectedYear]);


    const soldePoints = 12 - totalPointsPerdus;
    
    const soldePointsColorClass = useMemo(() => {
        if (soldePoints > 8) return 'text-green-600';
        if (soldePoints > 4) return 'text-yellow-500';
        return 'text-red-600';
    }, [soldePoints]);

    const handlePrint = () => {
        window.print();
    }

    if (isLoading) {
        return (
          <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        );
    }
    
    if (!conducteur) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <UserCircle className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold">Conducteur non trouvé</h2>
                <p className="text-muted-foreground">Impossible de trouver les informations pour ce conducteur.</p>
                <Button asChild variant="outline" className="mt-4">
                    <Link href="/dashboard/conducteurs"><ArrowLeft className="mr-2" /> Retour à la liste</Link>
                </Button>
            </div>
        );
    }

  return (
    <div className="space-y-6">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-area-conducteur-detail, #printable-area-conducteur-detail * {
                visibility: visible;
              }
              #printable-area-conducteur-detail {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print {
                  display: none;
              }
            }
          `}
        </style>
       <div className="flex items-center justify-between no-print">
         <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/conducteurs"><ArrowLeft/></Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Profil de {conducteur.prenom} {conducteur.nom}</h1>
         </div>
         <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimer
         </Button>
      </div>

    <div id="printable-area-conducteur-detail">
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Solde de Points" value={`${soldePoints} / 12`} icon={User} isLoading={isLoading} />
        <InfoCard title="Points Perdus (Total)" value={totalPointsPerdus} icon={TrendingDown} isLoading={isLoading} />
        <InfoCard title="Infractions (Total)" value={infractionDetails.length} icon={AlertTriangle} isLoading={isLoading} />
        <InfoCard title="Kilométrage Total" value={`${totalKilometrage.toFixed(2)} km`} icon={GaugeCircle} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
         <Card>
            <CardHeader>
                <CardTitle>Informations Personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><strong>Nom complet:</strong> {conducteur.prenom} {conducteur.nom}</p>
                <p><strong>N° de permis:</strong> {conducteur.numero_permis} (Catégorie: {conducteur.categorie_permis})</p>
                <p><strong>Clé OBC:</strong> {conducteur.cle_obc}</p>
                <p><strong>Lieu de travail:</strong> {conducteur.lieu_travail}</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Véhicule Assigné</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                {assignedVehicle ? (
                    <>
                        <p><strong>Nom:</strong> {assignedVehicle.nom}</p>
                        <p><strong>Immatriculation:</strong> {assignedVehicle.immatriculation}</p>
                    </>
                ) : (
                    <div className="flex items-center justify-center flex-col h-full text-center text-muted-foreground">
                        <Truck className="w-10 h-10 mb-2" />
                        <p>Aucun véhicule n'est assigné à ce conducteur.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historique des Infractions ({selectedYear === 'all' ? 'Toutes' : selectedYear})</CardTitle>
          <CardDescription>Liste de toutes les infractions enregistrées pour ce conducteur pour l'année {selectedYear === 'all' ? 'sélectionnée' : selectedYear}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invariant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sanction SCP</TableHead>
                <TableHead className="text-right">Points Perdus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infractionDetails.length > 0 ? (
                infractionDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell>{formatDate(detail.date)}</TableCell>
                    <TableCell>{detail.invariantTitre}</TableCell>
                    <TableCell>
                      <Badge variant={detail.type === 'Alarme' ? 'destructive' : 'secondary'}>
                        {detail.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{detail.sanction}</TableCell>
                    <TableCell className={cn("text-right font-bold", detail.pointsPerdus > 0 && "text-destructive")}>{detail.pointsPerdus}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Ce conducteur n'a aucune infraction enregistrée pour l'année {selectedYear === 'all' ? 'sélectionnée' : selectedYear}.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
