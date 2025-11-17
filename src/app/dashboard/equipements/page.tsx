'use client';

import {
  deleteDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Cpu,
  Check,
  X,
  Search,
  LayoutGrid,
  List,
  Truck,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import { useYearFilter } from '@/context/year-filter-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const equipementSchema = z.object({
  partenaire_id: z.string(),
  date: z.string().min(1, 'La date est requise.'),
  vehicule_id: z.string().min(1, 'Le véhicule est requis.'),
  balise: z.boolean().default(false),
  camera: z.boolean().default(false),
  detecteur_de_fatigue: z.boolean().default(false),
});

type EquipementFormValues = z.infer<typeof equipementSchema>;
type Partenaire = { id: string; nom: string; actif: boolean };
type Vehicule = { id: string; nom: string; immatriculation: string };
type Equipement = EquipementFormValues & {
  id: string;
  vehiculeNom?: string;
  vehiculeImmatriculation?: string;
};

function EquipementForm({
  equipement,
  onFinished,
  partenaireId,
  vehicules,
}: {
  equipement?: Equipement;
  onFinished: () => void;
  partenaireId: string;
  vehicules: Vehicule[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const equipementsCollection = useMemoFirebase(() => collection(firestore, 'equipements'), [firestore]);

  const form = useForm<EquipementFormValues>({
    resolver: zodResolver(equipementSchema),
    defaultValues: equipement || {
      partenaire_id: partenaireId,
      date: new Date().toISOString().split('T')[0],
      vehicule_id: '',
      balise: false,
      camera: false,
      detecteur_de_fatigue: false,
    },
  });
  
  useEffect(() => {
    form.reset(equipement || {
        partenaire_id: partenaireId,
        date: new Date().toISOString().split('T')[0],
        vehicule_id: '',
        balise: false,
        camera: false,
        detecteur_de_fatigue: false,
      });
  }, [equipement, partenaireId, form])

  const onSubmit = async (data: EquipementFormValues) => {
    setIsLoading(true);
    try {
      if (equipement) {
        const docRef = doc(equipementsCollection, equipement.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Équipement mis à jour.' });
      } else {
        addDocumentNonBlocking(equipementsCollection, data);
        toast({ title: 'Succès', description: 'Équipement ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving equipement: ', error);
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
        <div className="grid grid-cols-2 gap-4">
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
            name="vehicule_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Véhicule</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicules?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nom} ({v.immatriculation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
            <FormField
                control={form.control}
                name="balise"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Balise</FormLabel>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="camera"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Caméra</FormLabel>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="detecteur_de_fatigue"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Détecteur Fatigue</FormLabel>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {equipement ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function EquipementActions({ equipement, vehicules, partenaireId }: { equipement: Equipement, vehicules: Vehicule[] | null, partenaireId: string }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'equipements', equipement.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Équipement supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'équipement</DialogTitle>
          </DialogHeader>
          <EquipementForm
            equipement={equipement}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaireId={partenaireId}
            vehicules={vehicules}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'équipement sera définitivement
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

      <TooltipProvider>
        <div className="flex items-center justify-end gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Modifier</p>
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Supprimer</p>
                </TooltipContent>
            </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}

function EquipementCard({ equipement }: { equipement: Equipement }) {
    return (
      <Card className="rounded-xl flex flex-col">
        <CardHeader>
          <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Truck className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                  <CardTitle className="text-xl font-bold truncate">{equipement.vehiculeNom}</CardTitle>
                  <p className="text-sm text-muted-foreground">{equipement.vehiculeImmatriculation}</p>
              </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
            <p><strong>Date:</strong> {formatDate(equipement.date)}</p>
            <div className="flex flex-col gap-1 mt-2">
                <div className="flex items-center gap-2">
                    {equipement.balise ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                    <span>Balise</span>
                </div>
                <div className="flex items-center gap-2">
                    {equipement.camera ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                    <span>Caméra</span>
                </div>
                <div className="flex items-center gap-2">
                    {equipement.detecteur_de_fatigue ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-500" />}
                    <span>Détecteur de fatigue</span>
                </div>
            </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <EquipementActions 
            equipement={equipement}
            vehicules={[]}
            partenaireId={equipement.partenaire_id}
        />
        </CardFooter>
      </Card>
    );
  }

export default function EquipementsPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { selectedYear } = useYearFilter();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const equipementsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'equipements'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: equipements, isLoading: isLoadingEquipements } = useCollection<Equipement>(equipementsQuery);

  const vehiculesQuery = useMemoFirebase(() => collection(firestore, 'vehicules'), [firestore]);
  const { data: vehicules, isLoading: isLoadingVehicules } = useCollection<Vehicule>(vehiculesQuery);
  
  const isLoading = isLoadingEquipements || isLoadingPartenaires || isLoadingVehicules;

  const enrichedEquipements = useMemo(() => {
    if (!equipements || !vehicules) return [];

    const vehiculeMap = new Map(vehicules.map(v => [v.id, v]));

    return equipements.map((e) => ({
      ...e,
      vehiculeNom: vehiculeMap.get(e.vehicule_id)?.nom || 'N/A',
      vehiculeImmatriculation: vehiculeMap.get(e.vehicule_id)?.immatriculation || 'N/A',
    }));
  }, [equipements, vehicules]);

  const filteredEquipements = useMemo(() => {
    return enrichedEquipements
    .filter(e => {
        if (selectedYear === 'all') return true;
        const dateStr = String(e.date);
        if (!dateStr) return false;
        try {
            const dateObj = new Date(dateStr);
            return !isNaN(dateObj.getTime()) && dateObj.getFullYear().toString() === selectedYear;
        } catch {
            return dateStr.includes(selectedYear);
        }
    })
    .filter(e => 
        e.vehiculeNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.vehiculeImmatriculation.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [enrichedEquipements, searchTerm, selectedYear]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentEquipements = filteredEquipements?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredEquipements
    ? Math.ceil(filteredEquipements.length / itemsPerPage)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Équipements</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel Équipement</DialogTitle>
                <DialogDescription>
                  Ajoutez un enregistrement d'équipement pour un véhicule.
                </DialogDescription>
              </DialogHeader>
              {activePartner && 
                <EquipementForm
                    onFinished={() => setIsCreateDialogOpen(false)}
                    partenaireId={activePartner.id}
                    vehicules={vehicules}
                />
              }
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto sm:flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Filtrer par véhicule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
                />
            </div>
            <div className="flex items-center gap-2">
                <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button
                        variant={view === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setView('grid')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Vue Grille</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <Button
                        variant={view === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={() => setView('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Vue Liste</p>
                    </TooltipContent>
                </Tooltip>
                </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !activePartner ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
            <h3 className="text-xl font-semibold">Aucun partenaire actif</h3>
            <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                Veuillez activer un partenaire pour gérer les équipements.
            </p>
        </div>
      ) : filteredEquipements.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun équipement trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? 'Aucun équipement ne correspond à votre recherche.'
              : 'Commencez par ajouter un enregistrement d\'équipement.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEquipements.map((equipement) => (
                <EquipementCard key={equipement.id} equipement={equipement} />
            ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Véhicule</TableHead>
                <TableHead>Immatriculation</TableHead>
                <TableHead className="text-center">Balise</TableHead>
                <TableHead className="text-center">Caméra</TableHead>
                <TableHead className="text-center">Détecteur Fatigue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentEquipements.map((equipement) => (
                <TableRow key={equipement.id}>
                  <TableCell>{formatDate(equipement.date)}</TableCell>
                  <TableCell className="font-medium">{equipement.vehiculeNom}</TableCell>
                  <TableCell>{equipement.vehiculeImmatriculation}</TableCell>
                  <TableCell className="text-center">
                    {equipement.balise ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {equipement.camera ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {equipement.detecteur_de_fatigue ? <Check className="h-5 w-5 text-green-500 mx-auto" /> : <X className="h-5 w-5 text-red-500 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <EquipementActions 
                        equipement={equipement}
                        vehicules={vehicules}
                        partenaireId={activePartner!.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <div className="flex items-center space-x-2">
                <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                >
                Suivant
                </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
