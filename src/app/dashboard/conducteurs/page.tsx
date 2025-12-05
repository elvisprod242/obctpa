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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Search,
  UserCircle,
  Eye,
} from 'lucide-react';
import { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const conducteurSchema = z.object({
  nom: z.string().min(1, { message: 'Le nom est requis.' }),
  prenom: z.string().min(1, { message: 'Le prénom est requis.' }),
  numero_permis: z.string().min(1, { message: 'Le numéro de permis est requis.' }),
  categorie_permis: z.string().min(1, { message: 'La catégorie est requise.' }),
  cle_obc: z.string().min(1, { message: 'La clé OBC est requise.' }),
  lieu_travail: z.string().min(1, { message: 'Le lieu de travail est requis.' }),
  partenaire_id: z.string(),
});

type ConducteurFormValues = z.infer<typeof conducteurSchema>;
type Conducteur = ConducteurFormValues & { id: string, partenaireNom?: string };
type Partenaire = { id: string; nom: string; actif: boolean };

function ConducteurForm({
  conducteur,
  onFinished,
  activePartnerId,
  partenaires
}: {
  conducteur?: Conducteur;
  onFinished: () => void;
  activePartnerId: string | null;
  partenaires: Partenaire[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const conducteursCollection = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);

  const form = useForm<ConducteurFormValues>({
    resolver: zodResolver(conducteurSchema),
    defaultValues: conducteur || {
      nom: '',
      prenom: '',
      numero_permis: '',
      categorie_permis: '',
      cle_obc: '',
      lieu_travail: '',
      partenaire_id: activePartnerId || ''
    },
  });

  const onSubmit = async (data: ConducteurFormValues) => {
    setIsLoading(true);
    
    const dataToSave = { ...data };
    if (!dataToSave.partenaire_id && activePartnerId) {
      dataToSave.partenaire_id = activePartnerId;
    }

    try {
      if (conducteur) {
        const docRef = doc(conducteursCollection, conducteur.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Conducteur mis à jour.' });
      } else {
        addDocumentNonBlocking(conducteursCollection, dataToSave);
        toast({ title: 'Succès', description: 'Conducteur ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving driver: ', error);
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
            name="nom"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                    <Input placeholder="Dupont" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="prenom"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                    <Input placeholder="Jean" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
            control={form.control}
            name="partenaire_id"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Partenaire</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un partenaire" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {partenaires?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.nom}
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
          name="numero_permis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de permis</FormLabel>
              <FormControl>
                <Input placeholder="123456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="categorie_permis"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Catégorie</FormLabel>
                <FormControl>
                    <Input placeholder="C" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="cle_obc"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Clé OBC</FormLabel>
                <FormControl>
                    <Input placeholder="OBC001" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="lieu_travail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu de travail</FormLabel>
              <FormControl>
                <Input placeholder="Paris" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {conducteur ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ConducteurActions({ conducteur, activePartnerId, partenaires }: { conducteur: Conducteur; activePartnerId: string | null, partenaires: Partenaire[] | null; }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'conducteurs', conducteur.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Conducteur supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le conducteur</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du conducteur.
            </DialogDescription>
          </DialogHeader>
          <ConducteurForm
            conducteur={conducteur}
            onFinished={() => setIsEditDialogOpen(false)}
            activePartnerId={activePartnerId}
            partenaires={partenaires}
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
              Cette action est irréversible. Le conducteur sera définitivement
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
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/dashboard/conducteurs/${conducteur.id}`}>
                        <Eye className="h-4 w-4" />
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Détails</p>
            </TooltipContent>
          </Tooltip>
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

function ConducteurCard({ conducteur, activePartnerId, partenaires }: { conducteur: Conducteur; activePartnerId: string | null, partenaires: Partenaire[] | null; }) {
  return (
    <Card className="rounded-xl flex flex-col h-full transition-colors">
        <CardHeader>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                    <CardTitle className="text-2xl font-bold truncate">{conducteur.prenom} {conducteur.nom}</CardTitle>
                </div>
            </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
            <p><strong>Permis:</strong> {conducteur.numero_permis} ({conducteur.categorie_permis})</p>
            <p><strong>Clé OBC:</strong> {conducteur.cle_obc}</p>
            <p><strong>Lieu:</strong> {conducteur.lieu_travail}</p>
            <p><strong>Partenaire:</strong> <Badge variant="secondary">{conducteur.partenaireNom || 'Non assigné'}</Badge></p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <ConducteurActions conducteur={conducteur} activePartnerId={activePartnerId} partenaires={partenaires} />
        </CardFooter>
    </Card>
  );
}

export default function ConducteursPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [partnerFilter, setPartnerFilter] = useState('all');

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const conducteursQuery = useMemoFirebase(
    () => collection(firestore, 'conducteurs'),
    [firestore]
  );

  const { data: conducteurs, isLoading: isLoadingConducteurs } =
    useCollection<Conducteur>(conducteursQuery);

  const isLoading = isLoadingConducteurs || isLoadingPartenaires;

  const enrichedConducteurs = useMemo(() => {
    const partnerMap = new Map(partenaires?.map(p => [p.id, p.nom]));
    return conducteurs?.map(c => ({
      ...c,
      partenaireNom: partnerMap.get(c.partenaire_id) || 'Non assigné'
    }))
  }, [conducteurs, partenaires]);

  const filteredConducteurs = useMemo(() => {
    let conducteursToFilter = enrichedConducteurs;
  
    // Filter by active partner if one is selected
    if (activePartner) {
      conducteursToFilter = conducteursToFilter?.filter(c => c.partenaire_id === activePartner.id);
    } else {
      // If no active partner (i.e., "Tous les partenaires" is selected), filter by the dropdown if it's not 'all'
      if (partnerFilter !== 'all') {
        conducteursToFilter = conducteursToFilter?.filter(c => c.partenaire_id === partnerFilter);
      }
    }
  
    // Then, filter by the search term
    return conducteursToFilter?.filter((c) => 
      `${c.prenom} ${c.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [enrichedConducteurs, searchTerm, partnerFilter, activePartner]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentConducteurs = filteredConducteurs?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredConducteurs
    ? Math.ceil(filteredConducteurs.length / itemsPerPage)
    : 0;
    
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Conducteurs</h2>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Conducteur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Conducteur</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau conducteur à votre liste.
                </DialogDescription>
              </DialogHeader>
              <ConducteurForm
                  onFinished={() => setIsCreateDialogOpen(false)}
                  activePartnerId={activePartner?.id || null}
                  partenaires={partenaires}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          {!activePartner && (
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Filtrer par partenaire" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les partenaires</SelectItem>
                {partenaires?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
      ) : !filteredConducteurs || filteredConducteurs.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun conducteur trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucun conducteur ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre premier conducteur pour le voir apparaître ici.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Conducteur
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConducteurs.map((conducteur) => (
            <ConducteurCard
              key={conducteur.id}
              conducteur={conducteur}
              activePartnerId={activePartner?.id || null}
              partenaires={partenaires}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] text-center">
                  <UserCircle className="h-4 w-4 inline-block" />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Partenaire</TableHead>
                <TableHead>N° Permis</TableHead>
                <TableHead>Clé OBC</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentConducteurs?.map((conducteur) => (
                <TableRow key={conducteur.id}>
                    <TableCell>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted hover:bg-muted/80">
                            <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">
                        <Link href={`/dashboard/conducteurs/${conducteur.id}`} className="hover:underline">
                            {conducteur.prenom} {conducteur.nom}
                        </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{conducteur.partenaireNom}</Badge>
                    </TableCell>
                    <TableCell>{conducteur.numero_permis}</TableCell>
                    <TableCell>{conducteur.cle_obc}</TableCell>
                    <TableCell>{conducteur.lieu_travail}</TableCell>
                    <TableCell className="text-right">
                        <ConducteurActions
                          conducteur={conducteur}
                          activePartnerId={activePartner?.id || null}
                          partenaires={partenaires}
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
            { totalPages > 1 &&
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
            }
          </div>
        </Card>
      )}
    </div>
  );
}
