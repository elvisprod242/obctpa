'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { collection, query, where, doc } from 'firebase/firestore';
import { Loader2, Edit, Printer } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format as formatDateFns,
  setYear,
  setMonth,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useYearFilter } from '@/context/year-filter-context';
import { useMonthFilter } from '@/context/month-filter-context';
import { MonthFilter } from '@/components/dashboard/month-filter';
import { formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = {
  id: string;
  date: string;
  jour: string;
  conducteur_id?: string;
  heure_debut_trajet: string;
  heure_fin_trajet: string;
  duree: string; // "hh:mm:ss"
};
type Conducteur = { id: string; nom: string; prenom: string };
type Objectif = { id: string; invariant_id: string; cible: number; unite: string, chapitre: string, frequence: string, partenaire_id: string };
type TempsTravail = { id: string; rapports_id: string; analyse_cause: string; action_prise: string; suivi: string };
type Invariant = { id: string; titre: string };

type EnrichedReport = Rapport & {
  objectif: string;
  tempsTravail: TempsTravail | undefined;
};

type WeeklyAnalysis = {
  weekLabel: string;
  reports: EnrichedReport[];
  subTotalSeconds: number;
};

const tempsTravailSchema = z.object({
    analyse_cause: z.string().min(1, "L'analyse est requise."),
    action_prise: z.string().min(1, "L'action est requise."),
    suivi: z.string().min(1, 'Le suivi est requis.'),
});

type TempsTravailFormValues = z.infer<typeof tempsTravailSchema>;

function TempsTravailForm({
  tempsTravail,
  rapportId,
  onFinished,
}: {
  tempsTravail?: TempsTravail;
  rapportId: string;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const tempsTravailCollection = useMemoFirebase(() => collection(firestore, 'temps_travail'), [firestore]);
  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const form = useForm<TempsTravailFormValues>({
    resolver: zodResolver(tempsTravailSchema),
    defaultValues: tempsTravail || {
      analyse_cause: '',
      action_prise: '',
      suivi: '',
    },
  });

  const onSubmit = async (data: TempsTravailFormValues) => {
    if (!activePartner) {
        toast({ variant: "destructive", title: "Erreur", description: "Aucun partenaire actif."});
        return;
    }
    setIsLoading(true);
    try {
      const dataToSave = {
        ...data,
        partenaire_id: activePartner.id,
        rapports_id: rapportId,
      };
      if (tempsTravail) {
        const docRef = doc(tempsTravailCollection, tempsTravail.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Analyse mise à jour.' });
      } else {
        addDocumentNonBlocking(tempsTravailCollection, dataToSave);
        toast({ title: 'Succès', description: 'Analyse ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="analyse_cause"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Analyse de cause</FormLabel>
              <FormControl>
                <Input placeholder="Trafic dense" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="action_prise"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action prise</FormLabel>
              <FormControl>
                <Input placeholder="Optimisation du planning" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="suivi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Suivi</FormLabel>
              <FormControl>
                <Input placeholder="Amélioration constatée" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}


function parseTimeString(time: string): number {
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':').map(Number);
  if (parts.length !== 3) return 0;
  const [hours, minutes, seconds] = parts;
  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds)) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(seconds).padStart(2, '0')}`;
}

export default function TempsTravailPage() {
  const firestore = useFirestore();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const { selectedYear } = useYearFilter();
  const { selectedMonth } = useMonthFilter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<EnrichedReport | null>(null);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find((p) => p.actif), [partenaires]);

  const rapportsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'rapports'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const objectifsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'objectifs'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: objectifs, isLoading: isLoadingObjectifs } = useCollection<Objectif>(objectifsQuery);
  
  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);

  const tempsTravailQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'temps_travail'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: tempsTravailData, isLoading: isLoadingTempsTravail } = useCollection<TempsTravail>(tempsTravailQuery);

  const isLoading = isLoadingPartenaires || isLoadingRapports || isLoadingConducteurs || isLoadingObjectifs || isLoadingInvariants || isLoadingTempsTravail;

  const driverAnalysisData = useMemo(() => {
    if (!rapports || !selectedDriverId || !objectifs || !tempsTravailData || !invariants || !activePartner) return [];

    let targetDate = new Date();
    if (selectedYear !== 'all') {
      targetDate = setYear(targetDate, parseInt(selectedYear, 10));
    }
    targetDate = setMonth(targetDate, parseInt(selectedMonth, 10) - 1);

    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const tempsTravailMap = new Map(tempsTravailData.map(tt => [tt.rapports_id, tt]));
    const tempsTravailInvariant = invariants.find(i => i.titre === 'Temps de travail journalier');
    const travailObjectif = tempsTravailInvariant 
        ? objectifs.find(o => o.invariant_id === tempsTravailInvariant.id && o.partenaire_id === activePartner.id && o.frequence === 'Journalier') 
        : undefined;

    const driverMonthlyReports = rapports
      .filter((r) => {
        if (r.conducteur_id !== selectedDriverId) return false;
        try {
          const reportDate = new Date(r.date.includes('/') ? r.date.split('/').reverse().join('-') : r.date);
          return isWithinInterval(reportDate, { start: monthStart, end: monthEnd });
        } catch { return false; }
      })
      .map(r => ({
        ...r,
        objectif: travailObjectif ? `${travailObjectif.cible} ${travailObjectif.unite}` : 'N/A',
        tempsTravail: tempsTravailMap.get(r.id),
      }));

    const weeklyData: { [weekStart: string]: WeeklyAnalysis } = {};

    for (const report of driverMonthlyReports) {
      try {
        const reportDate = new Date(report.date.includes('/') ? report.date.split('/').reverse().join('-') : report.date);
        const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 });
        const weekKey = formatDateFns(weekStart, 'yyyy-MM-dd');

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            weekLabel: `Semaine du ${formatDateFns(weekStart, 'dd MMMM', { locale: fr })} au ${formatDateFns(weekEnd, 'dd MMMM yyyy', { locale: fr })}`,
            reports: [],
            subTotalSeconds: 0,
          };
        }

        weeklyData[weekKey].reports.push(report);
        weeklyData[weekKey].subTotalSeconds += parseTimeString(report.duree);
      } catch { /* ignore invalid dates */ }
    }

    return Object.values(weeklyData).sort((a, b) => a.reports[0].date.localeCompare(b.reports[0].date));
  }, [rapports, selectedDriverId, selectedYear, selectedMonth, objectifs, tempsTravailData, invariants, activePartner]);
  
  const handleEditClick = (report: EnrichedReport) => {
    setCurrentReport(report);
    setIsFormOpen(true);
  }

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="flex flex-col h-full gap-6">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-area, #printable-area * {
              visibility: visible;
            }
            #printable-area {
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
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mettre à jour l'analyse</DialogTitle>
                <DialogDescription>
                    Modifier l'analyse pour le rapport du {currentReport ? formatDate(currentReport.date) : ''}.
                </DialogDescription>
            </DialogHeader>
            {currentReport && (
                <TempsTravailForm 
                    tempsTravail={currentReport.tempsTravail}
                    rapportId={currentReport.id}
                    onFinished={() => setIsFormOpen(false)}
                />
            )}
        </DialogContent>
      </Dialog>
      
      <Card className="no-print">
        <CardHeader>
          <CardTitle>Analyse des Temps de Travail</CardTitle>
          <CardDescription>
            Sélectionnez un chauffeur et une période pour voir le détail de son temps de travail.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {isLoadingConducteurs ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Select onValueChange={(value) => setSelectedDriverId(value)} value={selectedDriverId || ''}>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Sélectionnez un chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {conducteurs?.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.prenom} {driver.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <MonthFilter />
          </div>
           <Button onClick={handlePrint} variant="outline" disabled={!selectedDriverId || driverAnalysisData.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
            </Button>
        </CardContent>
      </Card>

    <div id="printable-area">
      {isLoading && (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!activePartner && !isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Aucun partenaire actif</h3>
            <p className="text-sm text-muted-foreground">Veuillez activer un partenaire pour commencer.</p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && !selectedDriverId && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8 no-print">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">Aucun chauffeur sélectionné</h3>
            <p className="text-sm text-muted-foreground">Veuillez sélectionner un chauffeur dans la liste.</p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && selectedDriverId && (
        <div className="space-y-6">
          {driverAnalysisData.length > 0 ? (
            driverAnalysisData.map((weekly, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base font-bold">{weekly.weekLabel}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Jour</TableHead>
                        <TableHead>Début trajet</TableHead>
                        <TableHead>Fin trajet</TableHead>
                        <TableHead>Temps de travail</TableHead>
                        <TableHead>Objectif</TableHead>
                        <TableHead>Analyse de cause</TableHead>
                        <TableHead>Action prise</TableHead>
                        <TableHead>Suivi</TableHead>
                        <TableHead className="text-right no-print">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weekly.reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{formatDate(report.date)}</TableCell>
                          <TableCell>{report.jour}</TableCell>
                          <TableCell>{report.heure_debut_trajet}</TableCell>
                          <TableCell>{report.heure_fin_trajet}</TableCell>
                          <TableCell className="font-mono">{report.duree}</TableCell>
                          <TableCell>{report.objectif}</TableCell>
                          <TableCell>{report.tempsTravail?.analyse_cause || '-'}</TableCell>
                          <TableCell>{report.tempsTravail?.action_prise || '-'}</TableCell>
                          <TableCell>{report.tempsTravail?.suivi || '-'}</TableCell>
                          <TableCell className="text-right no-print">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(report)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Modifier l'analyse</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right font-bold">Sous-total:</TableCell>
                        <TableCell className="font-mono font-bold">{formatTime(weekly.subTotalSeconds)}</TableCell>
                        <TableCell colSpan={5}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
              <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">Aucune donnée</h3>
                <p className="text-sm text-muted-foreground">Aucun rapport de travail trouvé pour ce chauffeur pour la période sélectionnée.</p>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
