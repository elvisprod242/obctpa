'use client';

import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { collection, writeBatch, doc } from 'firebase/firestore';
import {
  Loader2,
  Search,
  PlusCircle,
  Upload,
  File as FileIcon,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useYearFilter } from '@/context/year-filter-context';
import { InfractionForm } from '@/components/infraction-form';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDate } from '@/lib/utils';

type Rapport = {
  id: string;
  date: string;
  jour: string;
  partenaire_id: string;
  conducteur_id?: string;
  invariant_id?: string;
  heure_debut_trajet: string;
  heure_fin_trajet: string;
  temps_conduite: string;
  distance_km: string;
  conducteurNomComplet?: string;
  invariantTitre?: string;
  partenaireNom?: string;
};
type Partenaire = { id: string; nom: string; actif: boolean };
type Conducteur = { id: string; nom: string; prenom: string };
type Invariant = { id: string; titre: string };
type Infraction = { id: string; rapports_id?: string };

const rapportSchema = z.object({
  date: z.string().min(1, 'La date est requise.'),
  jour: z.string().min(1, 'Le jour est requis.'),
  partenaire_id: z.string().optional(),
  conducteur_id: z.string().optional(),
  invariant_id: z.string().optional(),
  heure_debut_trajet: z.string().min(1, "L'heure de début est requise."),
  heure_fin_trajet: z.string().min(1, "L'heure de fin est requise."),
  temps_conduite: z.string().min(1, 'Le temps de conduite est requis.'),
  temps_attente: z.string().min(1, "Le temps d'attente est requis."),
  duree: z.string().min(1, 'La durée est requise.'),
  duree_ralenti: z.string().min(1, 'La durée de ralenti est requise.'),
  distance_km: z.string().min(1, 'La distance est requise.'),
  vitesse_moy_kmh: z.string().min(1, 'La vitesse moyenne est requise.'),
  vitesse_max_kmh: z.string().min(1, 'La vitesse maximale est requise.'),
});

type RapportFormValues = z.infer<typeof rapportSchema>;

function RapportForm({
  rapport,
  onFinished,
  partenaires,
  conducteurs,
  invariants,
}: {
  rapport?: Rapport;
  onFinished: () => void;
  partenaires: Partenaire[] | null;
  conducteurs: Conducteur[] | null;
  invariants: Invariant[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const rapportsCollection = useMemoFirebase(
    () => collection(firestore, 'rapports'),
    [firestore]
  );
  
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const form = useForm<RapportFormValues>({
    resolver: zodResolver(rapportSchema),
    defaultValues: rapport ? {
      ...rapport,
      vitesse_moy_kmh: (rapport as any).vitesse_moy_kmh || '',
      vitesse_max_kmh: (rapport as any).vitesse_max_kmh || '',
      temps_attente: (rapport as any).temps_attente || '',
      duree: (rapport as any).duree || '',
      duree_ralenti: (rapport as any).duree_ralenti || '',
    } : {
      date: '',
      jour: '',
      partenaire_id: activePartner?.id || '',
      conducteur_id: '',
      invariant_id: '',
      heure_debut_trajet: '',
      heure_fin_trajet: '',
      temps_conduite: '',
      temps_attente: '',
      duree: '',
      duree_ralenti: '',
      distance_km: '',
      vitesse_moy_kmh: '',
      vitesse_max_kmh: '',
    },
  });
  
  useEffect(() => {
    if (activePartner && !form.getValues('partenaire_id')) {
        form.setValue('partenaire_id', activePartner.id);
    }
  }, [activePartner, form]);

  const onSubmit = async (data: RapportFormValues) => {
    setIsLoading(true);
    try {
      const dataToSave = { ...data };
      if (!dataToSave.partenaire_id && activePartner) {
        dataToSave.partenaire_id = activePartner.id;
      }
      if (rapport) {
        const docRef = doc(rapportsCollection, rapport.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Rapport mis à jour.' });
      } else {
        addDocumentNonBlocking(rapportsCollection, dataToSave);
        toast({ title: 'Succès', description: 'Rapport ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving report: ', error);
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
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="jour"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jour</FormLabel>
                    <FormControl>
                      <Input placeholder="Lundi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="conducteur_id"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Conducteur</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un conducteur" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {conducteurs?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.prenom} {c.nom}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="invariant_id"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Invariant</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un invariant" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {invariants?.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                                {i.titre}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="heure_debut_trajet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de début du trajet</FormLabel>
                    <FormControl>
                      <Input type="time" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heure_fin_trajet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heure de fin du trajet</FormLabel>
                    <FormControl>
                      <Input type="time" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="temps_conduite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps de conduite (hh:mm:ss)</FormLabel>
                    <FormControl>
                      <Input placeholder="10:51:17" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="temps_attente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temps d'attente (hh:mm:ss)</FormLabel>
                    <FormControl>
                      <Input placeholder="00:14:05" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée (hh:mm:ss)</FormLabel>
                    <FormControl>
                      <Input placeholder="00:00:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="duree_ralenti"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée de ralenti (hh:mm:ss)</FormLabel>
                    <FormControl>
                      <Input placeholder="00:00:00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km)</FormLabel>
                    <FormControl>
                      <Input placeholder="11,9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vitesse_moy_kmh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vitesse moy. (km/h)</FormLabel>
                    <FormControl>
                      <Input placeholder="14,65" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="vitesse_max_kmh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vitesse max. (km/h)</FormLabel>
                    <FormControl>
                      <Input placeholder="33" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !activePartner}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {rapport ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ImportDialog({
  onFinished,
  partenaires,
}: {
  onFinished: () => void;
  partenaires: Partenaire[] | null;
}) {
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      importData(file);
    }
  };

  const importData = (file: File) => {
    const activePartner = partenaires?.find((p) => p.actif);
    if (!activePartner) {
        toast({
            variant: 'destructive',
            title: 'Aucun partenaire actif',
            description: "Veuillez activer un partenaire avant d'importer des rapports.",
        });
        return;
    }

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
        });
        
        if (json.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Erreur',
            description: 'Le fichier est vide.',
          });
          setIsImporting(false);
          return;
        }

        const batch = writeBatch(firestore);
        const rapportsCollection = collection(firestore, 'rapports');
        let reportsAdded = 0;

        json.forEach((row: any) => {
          const newDocRef = doc(rapportsCollection);
          
          const mappedRow = {
            date: String(row['Date'] || ''),
            jour: String(row['Jour'] || ''),
            partenaire_id: activePartner.id,
            conducteur_id: '',
            invariant_id: '',
            heure_debut_trajet: String(row['Première heure de début du trajet'] || ''),
            heure_fin_trajet: String(row['Heure de fin du dernier trajet'] || ''),
            temps_conduite: String(row['Temps de conduite (hh:mm:ss)'] || ''),
            temps_attente: String(row["Temps d'attente (hh:mm:ss)"] || ''),
            duree: String(row['durée (hh:mm:ss)'] || ''),
            duree_ralenti: String(row['Durée de ralenti (hh:mm:ss)'] || ''),
            distance_km: String(row['Distance (km)'] || ''),
            vitesse_moy_kmh: String(row['Vitesse moy. (km/h)'] || ''),
            vitesse_max_kmh: String(row['vitesse maximale (km/h)'] || ''),
          };
          batch.set(newDocRef, mappedRow);
          reportsAdded++;
        });

        if (reportsAdded > 0) {
            await batch.commit();
        }
        
        toast({
          title: 'Importation terminée',
          description: `${reportsAdded} rapports ont été importés avec succès.`,
        });
        onFinished();

      } catch (error) {
        console.error('Error importing data:', error);
        toast({
          variant: 'destructive',
          title: "Erreur d'importation",
          description: 'Le format du fichier est peut-être incorrect ou des données sont manquantes.',
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = (error) => {
      setIsImporting(false);
      toast({
        variant: 'destructive',
        title: 'Erreur de lecture',
        description: 'Impossible de lire le fichier.',
      });
      console.error('File reading error:', error);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Importer des rapports</DialogTitle>
        <DialogDescription>
          Sélectionnez un fichier Excel (.xlsx) pour importer des rapports en masse.
          Assurez-vous que les colonnes correspondent aux champs attendus.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 grid gap-4">
        <div className="flex items-center justify-center w-full">
            <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Cliquez pour téléverser</span> ou glissez-déposez
                </p>
                <p className="text-xs text-muted-foreground">XLSX, XLS</p>
                </div>
                <Input id="file-upload" type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} disabled={isImporting} />
            </label>
        </div>
        {isImporting && (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Importation en cours...</span>
          </div>
        )}
        {fileName && !isImporting && (
          <div className="text-sm text-center text-muted-foreground flex items-center justify-center">
            <FileIcon className="mr-2 h-4 w-4" />
            Fichier sélectionné: {fileName}
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onFinished} disabled={isImporting}>
          Annuler
        </Button>
      </DialogFooter>
    </>
  );
}

function RapportActions({
  rapport,
  partenaires,
  conducteurs,
  invariants,
  actionType = 'default'
}: {
  rapport: Rapport,
  partenaires: Partenaire[] | null;
  conducteurs: Conducteur[] | null;
  invariants: Invariant[] | null;
  actionType?: 'default' | 'createInfraction';
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInfractionDialogOpen, setIsInfractionDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'rapports', rapport.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Rapport supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  if (actionType === 'createInfraction') {
    return (
      <TooltipProvider>
        <Dialog open={isInfractionDialogOpen} onOpenChange={setIsInfractionDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Créer une infraction</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Créer une infraction</DialogTitle>
              <DialogDescription>
                Créer une nouvelle infraction basée sur ce rapport.
              </DialogDescription>
            </DialogHeader>
            <InfractionForm
                onFinished={() => setIsInfractionDialogOpen(false)}
                partenaires={partenaires}
                rapports={[rapport]} // Pass current report
                conducteurs={conducteurs}
                invariants={invariants}
                initialValues={{
                    rapports_id: rapport.id,
                    conducteur_id: rapport.conducteur_id,
                    invariant_id: rapport.invariant_id,
                    date: rapport.date
                }}
            />
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    )
  }

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier le Rapport</DialogTitle>
          </DialogHeader>
          <RapportForm
            rapport={rapport}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaires={partenaires}
            conducteurs={conducteurs}
            invariants={invariants}
          />
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le rapport sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}


function ReportsTable({ 
  reports,
  partenaires,
  conducteurs,
  invariants,
  actionType,
  selectedIds,
  onSelectionChange,
  searchTerm,
  selectedYear
 }: { 
  reports: Rapport[] | null | undefined,
  partenaires: Partenaire[] | null,
  conducteurs: Conducteur[] | null,
  invariants: Invariant[] | null,
  actionType?: 'default' | 'createInfraction',
  selectedIds: string[],
  onSelectionChange: (ids: string[]) => void,
  searchTerm: string,
  selectedYear: string
 }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentRapports = reports?.slice(firstItemIndex, lastItemIndex);
  
  const totalPages = reports ? Math.ceil(reports.length / itemsPerPage) : 0;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [reports, itemsPerPage]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true && currentRapports) {
      onSelectionChange(currentRapports.map(r => r.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(rowId => rowId !== id));
    }
  };
  
  if (!reports || reports.length === 0) {
    return (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
            <h3 className="text-xl font-semibold">Aucun rapport trouvé</h3>
            <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                {searchTerm || (selectedYear !== 'all')
                ? `Aucun rapport ne correspond à vos critères de recherche.`
                : "Aucun rapport ne correspond à cette catégorie pour le moment."}
            </p>
        </div>
    );
  }
  
  return (
    <Card>
      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead padding="checkbox" className="w-[50px]">
                  <Checkbox
                    checked={
                      currentRapports && selectedIds.length === currentRapports.length && currentRapports.length > 0
                        ? true
                        : selectedIds.length > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Sélectionner toutes les lignes"
                  />
                </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Jour</TableHead>
              <TableHead>Invariant</TableHead>
              <TableHead>Conducteur</TableHead>
              <TableHead>Début trajet</TableHead>
              <TableHead>Fin trajet</TableHead>
              <TableHead>Tps Conduite</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRapports?.map((rapport) => (
              <TableRow key={rapport.id} data-state={selectedIds.includes(rapport.id) && 'selected'}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedIds.includes(rapport.id)}
                    onCheckedChange={(checked) => handleSelectRow(rapport.id, !!checked)}
                    aria-label={`Sélectionner la ligne pour le rapport du ${rapport.date}`}
                  />
                </TableCell>
                <TableCell>{formatDate(rapport.date)}</TableCell>
                <TableCell>{rapport.jour}</TableCell>
                <TableCell>{rapport.invariantTitre}</TableCell>
                <TableCell>{rapport.conducteurNomComplet}</TableCell>
                <TableCell>{rapport.heure_debut_trajet}</TableCell>
                <TableCell>{rapport.heure_fin_trajet}</TableCell>
                <TableCell>{rapport.temps_conduite}</TableCell>
                <TableCell className="text-right">
                  <RapportActions 
                    rapport={rapport}
                    partenaires={partenaires}
                    conducteurs={conducteurs}
                    invariants={invariants}
                    actionType={actionType}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
       <div className="flex items-center justify-end space-x-4 py-4 pr-4">
        <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Lignes par page</p>
            <Select
                value={`${itemsPerPage}`}
                onValueChange={(value) => {
                setItemsPerPage(Number(value))
                setCurrentPage(1)
                }}
            >
                <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        { totalPages > 1 &&
        <div className="flex items-center space-x-2">
            <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            >
            Précédent
            </Button>
            <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages}
            </span>
            <Button
            variant="outline"
            size="sm"
            onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            >
            Suivant
            </Button>
        </div>
        }
      </div>
    </Card>
  );
}

export default function RapportsPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const { selectedYear } = useYearFilter();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const rapportsQuery = useMemoFirebase(() => collection(firestore, 'rapports'), [firestore]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);
  
  const infractionsQuery = useMemoFirebase(() => collection(firestore, 'infractions'), [firestore]);
  const { data: infractions, isLoading: isLoadingInfractions } = useCollection<Infraction>(infractionsQuery);

  const isLoading =
    isLoadingRapports ||
    isLoadingConducteurs ||
    isLoadingPartenaires ||
    isLoadingInvariants ||
    isLoadingInfractions;

  useEffect(() => {
    const active = partenaires?.find((p) => p.actif);
    setActivePartnerId(active ? active.id : null);
  }, [partenaires]);

  const enrichedRapports = useMemo(() => {
    if (!rapports || !partenaires || !conducteurs || !invariants) return [];

    const partnerMap = new Map(partenaires.map((p) => [p.id, p.nom]));
    const driverMap = new Map(
        conducteurs.map((c) => [c.id, `${c.prenom} ${c.nom}`])
    );
    const invariantMap = new Map(invariants.map((i) => [i.id, i.titre]));

    return rapports.map((r) => ({
        ...r,
        partenaireNom: partnerMap.get(r.partenaire_id) || 'N/A',
        conducteurNomComplet: driverMap.get(r.conducteur_id || '') || 'N/A',
        invariantTitre: invariantMap.get(r.invariant_id || '') || 'N/A',
    }));
  }, [rapports, partenaires, conducteurs, invariants]);


  const {rapportsNonAssignes, rapportsAssignes, rapportsSansInfraction} = useMemo(() => {
    
    let filteredReports = activePartnerId
        ? enrichedRapports.filter((r) => r.partenaire_id === activePartnerId)
        : enrichedRapports;

    // Filter by year first
    filteredReports = filteredReports.filter(r => {
      if (selectedYear === 'all') return true;
      const dateStr = String(r.date);
      if (!dateStr) return false;
      
      try {
        let dateObj;
        if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            dateObj = new Date(`${year}-${month}-${day}`);
        } else {
            dateObj = new Date(dateStr);
        }
        
        if (isNaN(dateObj.getTime())) {
            // Fallback for non-standard formats
            return dateStr.includes(selectedYear);
        }
        
        return dateObj.getFullYear().toString() === selectedYear;
      } catch {
        return dateStr.includes(selectedYear);
      }
    });
    
    // Then filter by search term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredReports = filteredReports.filter(
        (r) => {
          const dateFormatted = formatDate(r.date);
          return (
              (r.jour?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
              (r.conducteurNomComplet?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
              (r.invariantTitre?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
              (dateFormatted?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
              (String(r.date)?.toLowerCase() || '').includes(lowerCaseSearchTerm) 
          );
        }
      );
    }
   
    const sortedReports = filteredReports.sort((a, b) => {
      try {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      } catch {
        return 0;
      }
    });

    const rapportsNonAssignes = sortedReports?.filter(r => !r.conducteur_id || !r.invariant_id);
    const rapportsAssignes = sortedReports?.filter(r => !!r.conducteur_id && !!r.invariant_id);

    const infractionReportIds = new Set(infractions?.map(inf => inf.rapports_id).filter(Boolean));
    const rapportsSansInfraction = rapportsAssignes?.filter(r => r.conducteur_id && r.invariant_id && !infractionReportIds.has(r.id));
    
    return { rapportsNonAssignes, rapportsAssignes, rapportsSansInfraction };
  }, [enrichedRapports, infractions, searchTerm, selectedYear, activePartnerId]);
    
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const handleDeleteSelected = async () => {
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const docRef = doc(firestore, 'rapports', id);
      batch.delete(docRef);
    });
    try {
      await batch.commit();
      toast({ title: 'Succès', description: `${selectedIds.length} rapport(s) supprimé(s).` });
      setSelectedIds([]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'La suppression a échoué.' });
    }
    setIsDeleteConfirmOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
       <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprimera définitivement {selectedIds.length} rapport(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Rapports</h2>
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer ({selectedIds.length})
            </Button>
          )}
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!activePartner}>
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <ImportDialog
                onFinished={() => setIsImportDialogOpen(false)}
                partenaires={partenaires}
              />
            </DialogContent>
          </Dialog>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Rapport
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Nouveau Rapport</DialogTitle>
                <DialogDescription>
                  Remplissez les informations ci-dessous pour créer un nouveau
                  rapport.
                </DialogDescription>
              </DialogHeader>
              <RapportForm
                onFinished={() => setIsCreateDialogOpen(false)}
                partenaires={partenaires}
                conducteurs={conducteurs}
                invariants={invariants}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="relative w-full flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par date, jour, conducteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="non-assignes" onValueChange={() => setSelectedIds([])}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="non-assignes">Non assignés</TabsTrigger>
          <TabsTrigger value="assignes">Assignés</TabsTrigger>
          <TabsTrigger value="sans-infraction">Sans infraction</TabsTrigger>
        </TabsList>
        <TabsContent value="non-assignes" className="mt-4">
           {isLoading ? (
                <div className="flex flex-1 justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ReportsTable 
                  reports={rapportsNonAssignes}
                  partenaires={partenaires}
                  conducteurs={conducteurs}
                  invariants={invariants} 
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchTerm={searchTerm}
                  selectedYear={selectedYear}
                />
              )
            }
        </TabsContent>
        <TabsContent value="assignes" className="mt-4">
            {isLoading ? (
                <div className="flex flex-1 justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ReportsTable 
                  reports={rapportsAssignes}
                  partenaires={partenaires}
                  conducteurs={conducteurs}
                  invariants={invariants}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchTerm={searchTerm}
                  selectedYear={selectedYear}
                />
              )
            }
        </TabsContent>
        <TabsContent value="sans-infraction" className="mt-4">
            {isLoading ? (
                <div className="flex flex-1 justify-center items-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ReportsTable 
                  reports={rapportsSansInfraction}
                  partenaires={partenaires}
                  conducteurs={conducteurs}
                  invariants={invariants}
                  actionType="createInfraction"
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  searchTerm={searchTerm}
                  selectedYear={selectedYear}
                />
              )
            }
        </TabsContent>
      </Tabs>
    </div>
  );
}
