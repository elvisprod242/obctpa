'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import {
  Loader2,
  Edit,
  Printer,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useYearFilter } from '@/context/year-filter-context';
import { cn } from '@/lib/utils';
import { useMonthFilter } from '@/context/month-filter-context';
import { MonthFilter } from '@/components/dashboard/month-filter';
import { YearFilter } from '@/components/dashboard/year-filter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = { 
  id: string; 
  date: string; 
  invariant_id?: string; 
  distance_km?: string;
  temps_conduite?: string;
  temps_attente?: string;
  partenaire_id?: string;
};
type Objectif = { id: string; invariant_id: string; cible: number; unite: string; partenaire_id: string; frequence: string; };
type Invariant = { id: string; titre: string };
type Kpi = {
    id: string,
    partenaire_id: string;
    rapports_id: string;
    objectifs_id: string;
    resultat?: string;
    analyse_cause?: string;
    action_prise?: string;
    commentaire?: string;
}
type KpiData = {
    invariantId: string;
    invariantTitre: string;
    value: number | string;
    objectif: string;
    isExceeded: boolean;
    kpi: Kpi | undefined;
    objectifId: string | undefined;
};

const kpiSchema = z.object({
    resultat: z.string().optional(),
    analyse_cause: z.string().optional(),
    action_prise: z.string().optional(),
    commentaire: z.string().optional(),
});

type KpiFormValues = z.infer<typeof kpiSchema>;


function KpiAnalysisForm({ 
    kpi, 
    objectifId, 
    onFinished, 
    activePartnerId,
    formType
}: { 
    kpi: Kpi | undefined, 
    objectifId: string, 
    onFinished: () => void, 
    activePartnerId: string,
    formType: 'monthly' | 'yearly'
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const kpisCollection = useMemoFirebase(() => collection(firestore, 'kpis'), [firestore]);

    const form = useForm<KpiFormValues>({
        resolver: zodResolver(kpiSchema),
        defaultValues: kpi || {
            resultat: '',
            analyse_cause: '',
            action_prise: '',
            commentaire: '',
        },
    });

    const handleSubmit = async (data: KpiFormValues) => {
        if (!objectifId) {
            toast({ variant: 'destructive', title: "Erreur", description: "L'identifiant de l'objectif est manquant." });
            return;
        }

        setIsLoading(true);
        try {
            const dataToSave = {
                ...data,
                partenaire_id: activePartnerId,
                objectifs_id: objectifId,
                rapports_id: '',
            };

            if (kpi) {
                const kpiRef = doc(firestore, 'kpis', kpi.id);
                updateDocumentNonBlocking(kpiRef, dataToSave);
                toast({ title: "Succès", description: "Analyse KPI mise à jour." });
            } else {
                addDocumentNonBlocking(kpisCollection, dataToSave);
                toast({ title: "Succès", description: "Analyse KPI ajoutée." });
            }
            onFinished();
        } catch (error) {
            console.error("Error saving KPI analysis: ", error);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer l'analyse." });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Mettre à jour l'analyse KPI</DialogTitle>
                <DialogDescription>
                    {formType === 'monthly' ? "Ajoutez un commentaire pour ce mois." : "Modifiez l'analyse détaillée pour l'année."}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {formType === 'yearly' ? (
                        <>
                           <FormField
                                control={form.control}
                                name="resultat"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Résultat</FormLabel>
                                    <FormControl>
                                        <Input placeholder="OK" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="analyse_cause"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Analyse de cause</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Bonne conduite" {...field} />
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
                                        <Input placeholder="RAS" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    ) : (
                        <FormField
                            control={form.control}
                            name="commentaire"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Commentaire</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Entrez votre commentaire..." {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={onFinished}>Annuler</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sauvegarder
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

function KpiTable({ data, periodLabel, onOpenDialog, tableType }: { data: KpiData[], periodLabel: string, onOpenDialog: (kpiData: KpiData) => void, tableType: 'monthly' | 'yearly' }) {
    return (
        <Card>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>INVARIANT</TableHead>
                        <TableHead className="text-center">{periodLabel}</TableHead>
                        <TableHead className="text-center">Objectif</TableHead>
                        {tableType === 'yearly' ? (
                            <>
                                <TableHead>Résultat</TableHead>
                                <TableHead>Analyse de cause</TableHead>
                                <TableHead>Action prise</TableHead>
                            </>
                        ) : (
                            <TableHead>Commentaire</TableHead>
                        )}
                        <TableHead className="text-right no-print">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={row.invariantId}>
                            <TableCell className="font-medium">{row.invariantTitre}</TableCell>
                            <TableCell className={cn("text-center", row.isExceeded && "text-red-500 font-bold")}>
                                {row.value}
                            </TableCell>
                            <TableCell className="text-center">{row.objectif}</TableCell>
                            {tableType === 'yearly' ? (
                                <>
                                    <TableCell className="text-sm text-muted-foreground">{row.kpi?.resultat || (row.isExceeded ? 'Négatif' : 'OK')}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{row.kpi?.analyse_cause || (row.isExceeded ? 'Mauvaise conduite' : 'Bonne conduite')}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{row.kpi?.action_prise || (row.isExceeded ? 'Suspension du conducteur' : 'R.A.S')}</TableCell>
                                </>
                            ) : (
                                <TableCell className="text-sm text-muted-foreground">{row.kpi?.commentaire || '-'}</TableCell>
                            )}
                             <TableCell className="text-right no-print">
                                <DialogTrigger asChild>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => onOpenDialog(row)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{row.kpi ? "Modifier l'analyse" : "Ajouter une analyse"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </DialogTrigger>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

export default function KpiPage() {
  const firestore = useFirestore();
  const { selectedYear } = useYearFilter();
  const { selectedMonth, monthNames } = useMonthFilter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState<KpiData | null>(null);
  const [currentTab, setCurrentTab] = useState<'monthly' | 'yearly'>('monthly');

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'),[firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const rapportsQuery = useMemoFirebase(() => collection(firestore, 'rapports'), [firestore]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);
  
  const objectifsQuery = useMemoFirebase(() => collection(firestore, 'objectifs'), [firestore]);
  const { data: objectifs, isLoading: isLoadingObjectifs } = useCollection<Objectif>(objectifsQuery);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);
  
  const kpisQuery = useMemoFirebase(() => collection(firestore, 'kpis'), [firestore]);
  const { data: kpis, isLoading: isLoadingKpis } = useCollection<Kpi>(kpisQuery);

  const isLoading = isLoadingPartenaires || isLoadingRapports || isLoadingObjectifs || isLoadingInvariants || isLoadingKpis;
  
  const activePartner = useMemo(() => partenaires?.find((p) => p.actif), [partenaires]);

  const calculateKpiData = (period: 'monthly' | 'yearly'): KpiData[] => {
    if (!invariants || !objectifs || !rapports || !kpis || !activePartner) return [];

    const filteredRapports = rapports.filter(r => {
      if (!r.date || r.partenaire_id !== activePartner?.id) return false;
      const dateStr = String(r.date);
      let dateObj: Date;

      try {
          if (dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              dateObj = new Date(`${year}-${month}-${day}`);
          } else {
              dateObj = new Date(dateStr);
          }
          if (isNaN(dateObj.getTime())) return false;
      } catch {
          return false;
      }
      
      const year = dateObj.getFullYear().toString();
      const month = (dateObj.getMonth() + 1).toString();
      const matchesYear = selectedYear === 'all' || year === selectedYear;
      
      if (period === 'monthly') {
          return matchesYear && month === selectedMonth;
      } else { // yearly
          return matchesYear;
      }
    });

    const data = invariants.map(invariant => {
        const objectif = objectifs.find(o => o.invariant_id === invariant.id && o.partenaire_id === activePartner?.id);
        const kpi = kpis.find(k => k.objectifs_id === objectif?.id && k.partenaire_id === activePartner?.id);

        const relevantRapports = filteredRapports.filter(r => {
            if (invariant.titre !== 'Kms parcourus' && invariant.titre !== 'Temps de conduite' && invariant.titre !== 'Temps de repos') {
                return r.invariant_id === invariant.id;
            }
            return true;
        });

        let value: number = 0;
        if (invariant.titre === 'Kms parcourus') {
            value = relevantRapports.reduce((acc, curr) => acc + parseFloat((curr.distance_km || '0').replace(',', '.')), 0);
        } else if (invariant.titre === 'Temps de conduite' || invariant.titre === 'Temps de repos') {
            const totalSeconds = relevantRapports.reduce((acc, r) => {
                const timeToParse = invariant.titre === 'Temps de conduite' ? r.temps_conduite : r.temps_attente;
                const timeParts = timeToParse?.split(':') || [];
                if (timeParts.length === 3) {
                    return acc + parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
                }
                return acc;
            }, 0);
            value = totalSeconds / 3600; // Convert to hours
        } else {
            value = relevantRapports.length;
        }

        const objectifCible = objectif ? (objectif.frequence === 'Annuel' && period === 'yearly') ? objectif.cible : (objectif.frequence === 'Mensuel' && period === 'monthly') ? objectif.cible : (objectif.frequence === 'Mensuel' && period === 'yearly') ? objectif.cible * 12 : objectif.cible : 0;
        const isExceeded = objectif ? value > objectifCible : false;

        const displayValue = (typeof value === 'number' && (invariant.titre.includes('Kms') || invariant.titre.includes('Temps')))
            ? value.toFixed(0)
            : value;

        return {
            invariantId: invariant.id,
            invariantTitre: invariant.titre,
            value: displayValue,
            objectif: objectif ? `${objectifCible}${objectif.unite || ''}` : 'N/A',
            isExceeded,
            kpi: kpi,
            objectifId: objectif?.id,
        };
    });

    const priorityOrder = ['Kms parcourus', 'Temps de conduite', 'Temps de repos'];
    return data.sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.invariantTitre);
        const bIndex = priorityOrder.indexOf(b.invariantTitre);
        if (aIndex > -1 && bIndex > -1) return aIndex - bIndex;
        if (aIndex > -1) return -1;
        if (bIndex > -1) return 1;
        return a.invariantTitre.localeCompare(b.invariantTitre);
    });
  };

  const monthlyData = useMemo(() => calculateKpiData('monthly'), [invariants, objectifs, rapports, kpis, selectedYear, selectedMonth, activePartner]);
  const yearlyData = useMemo(() => calculateKpiData('yearly'), [invariants, objectifs, rapports, kpis, selectedYear, activePartner]);


  const handleOpenDialog = (kpiData: KpiData) => {
    if(kpiData && kpiData.objectifId) {
        setCurrentDialogData(kpiData);
        setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentDialogData(null);
  };
  
  const monthYearLabel = `${monthNames[parseInt(selectedMonth, 10) - 1]}-${selectedYear.substring(2)}`;
  const yearLabel = selectedYear;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full">
      <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-area-kpi, #printable-area-kpi * {
                visibility: visible;
              }
              #printable-area-kpi {
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <div id="printable-area-kpi">
            <div className="flex items-center justify-between space-y-2 mb-4 no-print">
                <h2 className="text-3xl font-bold tracking-tight">Indicateurs de Performance (KPI)</h2>
                <div className="flex items-center gap-2">
                    <YearFilter />
                    <Button onClick={handlePrint} variant="outline" disabled={!activePartner || (currentTab === 'monthly' && monthlyData.length === 0) || (currentTab === 'yearly' && yearlyData.length === 0)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-1 justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : !activePartner ? (
                <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center no-print">
                    <h3 className="text-xl font-semibold">Aucun partenaire actif</h3>
                    <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                        Veuillez activer un partenaire pour afficher les KPIs.
                    </p>
                </div>
            ) : (
                <Tabs defaultValue="monthly" className="w-full" onValueChange={(value) => setCurrentTab(value as 'monthly' | 'yearly')}>
                    <div className="flex justify-between items-center mb-4 no-print">
                        <TabsList>
                            <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                            <TabsTrigger value="yearly">Annuel</TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2">
                            <TabsContent value="monthly" className="mt-0">
                                <MonthFilter />
                            </TabsContent>
                        </div>
                    </div>
                    <TabsContent value="monthly">
                      {monthlyData.length > 0 ? (
                        <KpiTable data={monthlyData} periodLabel={monthYearLabel} onOpenDialog={handleOpenDialog} tableType="monthly"/>
                      ) : (
                        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
                          <h3 className="text-xl font-semibold">Aucune donnée KPI mensuelle</h3>
                          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                              Il n'y a pas de données à afficher pour la période sélectionnée.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="yearly">
                      {yearlyData.length > 0 ? (
                        <KpiTable data={yearlyData} periodLabel={yearLabel} onOpenDialog={handleOpenDialog} tableType="yearly"/>
                      ) : (
                        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
                          <h3 className="text-xl font-semibold">Aucune donnée KPI annuelle</h3>
                          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                              Il n'y a pas de données à afficher pour l'année sélectionnée.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                </Tabs>
            )}
            </div>
            
            {currentDialogData && activePartner && (
                <KpiAnalysisForm
                    kpi={currentDialogData.kpi}
                    objectifId={currentDialogData.objectifId!}
                    onFinished={handleCloseDialog}
                    activePartnerId={activePartner.id}
                    formType={currentTab}
                />
            )}
        </Dialog>
    </div>
  );
}
