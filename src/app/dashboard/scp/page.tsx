'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { collection, query, where } from 'firebase/firestore';
import { Loader2, Search, User, AlertCircle, TrendingDown, Gavel, Printer } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useYearFilter } from '@/context/year-filter-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Partenaire = { id: string; nom: string; actif: boolean };
type Invariant = { id: string; titre: string };
type Infraction = { id: string; partenaire_id: string; date: string; conducteur_id?: string; type_infraction: string; invariant_id?: string };
type Conducteur = { id: string; nom: string; prenom: string; partenaire_id: string; };
type Scp = { id: string; partenaire_id: string; invariants_id: string; sanction: string; type: string; value: number };

type InfractionDetail = {
    id: string;
    date: string;
    invariantTitre: string;
    type: string;
    pointsPerdus: number;
    sanction: string;
};

export default function ScpPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | 'all'>('all');
  const { selectedYear } = useYearFilter();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const scpQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'scp'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: scpData, isLoading: isLoadingScp } = useCollection<Scp>(scpQuery);

  const infractionsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'infractions'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: infractions, isLoading: isLoadingInfractions } = useCollection<Infraction>(infractionsQuery);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);
  
  const filteredConducteurs = useMemo(() => {
    if (!conducteurs) return [];
    if (!activePartner) return conducteurs; // Show all if "Tous les partenaires" is active
    return conducteurs.filter(c => c.partenaire_id === activePartner.id);
  }, [conducteurs, activePartner]);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);

  const isLoading = isLoadingPartenaires || isLoadingScp || isLoadingInfractions || isLoadingConducteurs || isLoadingInvariants;

  const infractionDetails = useMemo(() => {
    if (isLoading || !infractions || !scpData || !invariants || selectedDriverId === 'all') {
      return [];
    }

    const scpMap = new Map(scpData.map(rule => [`${rule.invariants_id}-${rule.type}`.toLowerCase(), rule]));
    const invariantMap = new Map(invariants.map(inv => [inv.id, inv.titre]));

    return infractions
      .filter(inf => {
        if (inf.conducteur_id !== selectedDriverId) {
            return false;
        }
        if (selectedYear === 'all') return true;
        const dateStr = String(inf.date);
        if (!dateStr) return false;
        try {
            const dateObj = new Date(dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr);
            return !isNaN(dateObj.getTime()) && dateObj.getFullYear().toString() === selectedYear;
        } catch { return dateStr.includes(selectedYear); }
      })
      .map(inf => {
        const ruleKey = `${inf.invariant_id}-${inf.type_infraction}`.toLowerCase();
        const rule = scpMap.get(ruleKey);
        
        return {
          id: inf.id,
          date: inf.date,
          invariantTitre: invariantMap.get(inf.invariant_id || '') || 'Invariant Inconnu',
          type: inf.type_infraction,
          pointsPerdus: rule?.value || 0,
          sanction: rule?.sanction || 'Aucune règle SCP correspondante',
        };
      })
      .filter(detail => 
          detail.invariantTitre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          detail.sanction.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [isLoading, infractions, scpData, invariants, selectedYear, searchTerm, selectedDriverId]);

  const { totalPointsPerdus, soldePoints, totalInfractions } = useMemo(() => {
    if (selectedDriverId === 'all' || infractionDetails.length === 0) {
        return { totalPointsPerdus: 0, soldePoints: 12, totalInfractions: 0 };
    }
    const points = infractionDetails.reduce((acc, curr) => acc + curr.pointsPerdus, 0);
    const capitalPoints = 12;
    const solde = capitalPoints - points;
    
    return {
      totalPointsPerdus: points,
      soldePoints: solde,
      totalInfractions: infractionDetails.length,
    };
  }, [infractionDetails, selectedDriverId]);

  const soldePointsColorClass = useMemo(() => {
    if (selectedDriverId === 'all') return '';
    if (soldePoints >= 11) return 'bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800';
    if (soldePoints >= 6) return 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-100 dark:bg-red-900/50 border-red-200 dark:border-red-800';
  }, [soldePoints, selectedDriverId]);

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="flex flex-col h-full">
      <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-area-scp, #printable-area-scp * {
                visibility: visible;
              }
              #printable-area-scp {
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
    <div id="printable-area-scp">
      <div className="flex items-center justify-between space-y-2 mb-4 no-print">
        <h2 className="text-3xl font-bold tracking-tight">Détail des Sanctions par Chauffeur</h2>
        <Button asChild>
            <Link href="/dashboard/attribution-scp">
                <Gavel className="mr-2 h-4 w-4" />
                Gérer l'attribution des SCP
            </Link>
        </Button>
      </div>

       <div className="grid gap-4 md:grid-cols-3 mb-4">
        <Card className={cn('transition-colors', soldePointsColorClass)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde de Points Restants</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedDriverId !== 'all' ? `${soldePoints} / 12` : '- / -'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Perdus</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedDriverId !== 'all' ? totalPointsPerdus : '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Infractions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedDriverId !== 'all' ? totalInfractions : '-'}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par invariant ou sanction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
              disabled={selectedDriverId === 'all'}
            />
          </div>
          <Select onValueChange={(value) => setSelectedDriverId(value)} value={selectedDriverId}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filtrer par conducteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sélectionner un conducteur</SelectItem>
              {filteredConducteurs?.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.prenom} {driver.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           <Button onClick={handlePrint} variant="outline" disabled={selectedDriverId === 'all' || infractionDetails.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
            </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !activePartner ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center no-print">
            <h3 className="text-xl font-semibold">Aucun partenaire actif</h3>
            <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                Veuillez activer un partenaire pour voir les règles de sanction.
            </p>
        </div>
      ) : selectedDriverId === 'all' ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center no-print">
          <h3 className="text-xl font-semibold">Veuillez sélectionner un conducteur</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            Choisissez un conducteur dans le menu déroulant pour voir le détail de ses infractions.
          </p>
        </div>
      ) : infractionDetails.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucune infraction trouvée</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? 'Aucun résultat ne correspond à vos filtres.'
              : 'Ce conducteur n\'a aucune infraction enregistrée pour la période sélectionnée.'}
          </p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invariant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sanction</TableHead>
                <TableHead className="text-right">Points Perdus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {infractionDetails.map((detail) => (
                <TableRow key={detail.id}>
                  <TableCell>{formatDate(detail.date)}</TableCell>
                  <TableCell className="font-medium">{detail.invariantTitre}</TableCell>
                  <TableCell>
                    <Badge variant={detail.type === 'Alarme' ? 'destructive' : 'secondary'}>
                      {detail.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{detail.sanction}</TableCell>
                  <TableCell className="text-right font-bold text-destructive">{detail.pointsPerdus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </div>
    </div>
  );
}
