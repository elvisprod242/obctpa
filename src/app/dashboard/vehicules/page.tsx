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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
  LayoutGrid,
  List,
  Search,
  Truck,
  UserCircle,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const vehiculeSchema = z.object({
  nom: z.string().min(1, { message: 'Le nom est requis.' }),
  immatriculation: z.string().min(1, { message: "L'immatriculation est requise." }),
  conducteur_id: z.string().optional(),
  partenaire_id: z.string(),
});

type VehiculeFormValues = z.infer<typeof vehiculeSchema>;
type Vehicule = VehiculeFormValues & { id: string };
type Conducteur = { id: string, nom: string, prenom: string };
type Partenaire = { id: string, nom: string, actif: boolean };

function VehiculeForm({
  vehicule,
  onFinished,
  activePartnerId,
}: {
  vehicule?: Vehicule;
  onFinished: () => void;
  activePartnerId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const vehiculesCollection = useMemoFirebase(() => collection(firestore, 'vehicules'), [firestore]);
  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs } = useCollection<Conducteur>(conducteursQuery);

  const form = useForm<VehiculeFormValues>({
    resolver: zodResolver(vehiculeSchema),
    defaultValues: vehicule || {
      nom: '',
      immatriculation: '',
      conducteur_id: '',
      partenaire_id: activePartnerId,
    },
  });

  useEffect(() => {
    form.reset(vehicule || {
        nom: '',
        immatriculation: '',
        conducteur_id: '',
        partenaire_id: activePartnerId,
      });
  }, [vehicule, activePartnerId, form])

  const onSubmit = async (data: VehiculeFormValues) => {
    setIsLoading(true);
    const dataToSave = {
      ...data,
      conducteur_id: data.conducteur_id === 'none' ? '' : data.conducteur_id,
      partenaire_id: activePartnerId,
    };
    try {
      if (vehicule) {
        const docRef = doc(vehiculesCollection, vehicule.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Véhicule mis à jour.' });
      } else {
        addDocumentNonBlocking(vehiculesCollection, dataToSave);
        toast({ title: 'Succès', description: 'Véhicule ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving vehicle: ', error);
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
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du véhicule</FormLabel>
              <FormControl>
                <Input placeholder="Camion benne" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="immatriculation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Immatriculation</FormLabel>
              <FormControl>
                <Input placeholder="AA-123-BB" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {vehicule ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function VehiculeActions({ vehicule, activePartnerId }: { vehicule: Vehicule; activePartnerId: string }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'vehicules', vehicule.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Véhicule supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le véhicule</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du véhicule.
            </DialogDescription>
          </DialogHeader>
          <VehiculeForm
            vehicule={vehicule}
            onFinished={() => setIsEditDialogOpen(false)}
            activePartnerId={activePartnerId}
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
              Cette action est irréversible. Le véhicule sera définitivement
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Modifier</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
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

function VehiculeCard({ vehicule, conducteurs, activePartnerId }: { vehicule: Vehicule, conducteurs: Conducteur[] | null; activePartnerId: string; }) {
  const conducteur = conducteurs?.find(c => c.id === vehicule.conducteur_id);
  return (
    <Card className="rounded-xl flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Truck className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-2xl font-bold truncate">{vehicule.nom}</CardTitle>
            <p className="text-sm text-muted-foreground">{vehicule.immatriculation}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4" />
          <span>{conducteur ? `${conducteur.prenom} ${conducteur.nom}`: 'Non assigné'}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <VehiculeActions vehicule={vehicule} activePartnerId={activePartnerId} />
      </CardFooter>
    </Card>
  );
}

export default function VehiculesPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'),[firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const vehiculesQuery = useMemoFirebase(
    () => activePartner ? query(collection(firestore, 'vehicules'), where('partenaire_id', '==', activePartner.id)) : null,
    [firestore, activePartner]
  );
  const { data: vehicules, isLoading: isLoadingVehicules } = useCollection<Vehicule>(vehiculesQuery);

  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const enrichedVehicules = useMemo(() => {
    return vehicules?.map(v => ({
      ...v,
      conducteurNom: conducteurs?.find(c => c.id === v.conducteur_id)?.nom || '',
      conducteurPrenom: conducteurs?.find(c => c.id === v.conducteur_id)?.prenom || ''
    }))
  }, [vehicules, conducteurs]);

  const filteredVehicules = enrichedVehicules?.filter((v) =>
    v.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${v.conducteurPrenom} ${v.conducteurNom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const isLoading = isLoadingPartenaires || isLoadingVehicules || isLoadingConducteurs;

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentVehicules = filteredVehicules?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredVehicules
    ? Math.ceil(filteredVehicules.length / itemsPerPage)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Véhicules</h2>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Véhicule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Véhicule</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau véhicule à votre flotte.
                </DialogDescription>
              </DialogHeader>
              {activePartner && (
                <VehiculeForm
                    onFinished={() => setIsCreateDialogOpen(false)}
                    activePartnerId={activePartner.id}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par nom, immat., conducteur..."
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
                Veuillez activer un partenaire pour gérer les véhicules.
            </p>
        </div>
      ) : !filteredVehicules || filteredVehicules.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun véhicule trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucun véhicule ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre premier véhicule pour le voir apparaître ici.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Véhicule
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredVehicules.map((vehicule) => (
            <VehiculeCard
              key={vehicule.id}
              vehicule={vehicule}
              conducteurs={conducteurs}
              activePartnerId={activePartner.id}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <Truck className="h-4 w-4 inline-block" />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Conducteur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentVehicules?.map((vehicule) => (
                <TableRow key={vehicule.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{vehicule.nom}</TableCell>
                  <TableCell>{vehicule.immatriculation}</TableCell>
                  <TableCell>{vehicule.conducteur_id ? `${vehicule.conducteurPrenom} ${vehicule.conducteurNom}` : 'Non assigné'}</TableCell>
                  <TableCell className="text-right">
                    <VehiculeActions
                      vehicule={vehicule}
                      activePartnerId={activePartner.id}
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
                    {[5, 10, 20, 30, 40, 50].map((pageSize) => (
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
    
