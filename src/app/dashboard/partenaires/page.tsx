'use client';

import {
  deleteDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, writeBatch } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Search,
  CheckCircle,
  Briefcase,
} from 'lucide-react';
import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const partenaireSchema = z.object({
  nom: z.string().min(1, { message: 'Le nom est requis.' }),
  actif: z.boolean().default(false),
});

type PartenaireFormValues = z.infer<typeof partenaireSchema>;
type Partenaire = PartenaireFormValues & { id: string };

function PartenaireForm({
  partenaire,
  onFinished,
  partenaires,
}: {
  partenaire?: Partenaire;
  onFinished: () => void;
  partenaires: Partenaire[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const partenairesCollection = collection(firestore, 'partenaires');

  const form = useForm<PartenaireFormValues>({
    resolver: zodResolver(partenaireSchema),
    defaultValues: partenaire || {
      nom: '',
      actif: false,
    },
  });

  const onSubmit = async (data: PartenaireFormValues) => {
    setIsLoading(true);
    try {
      const batch = writeBatch(firestore);

      if (data.actif && partenaires) {
        partenaires.forEach((p) => {
          if (p.id !== partenaire?.id && p.actif) {
            const partnerDocRef = doc(firestore, 'partenaires', p.id);
            batch.update(partnerDocRef, { actif: false });
          }
        });
      }

      if (partenaire) {
        const docRef = doc(partenairesCollection, partenaire.id);
        batch.update(docRef, { nom: data.nom });
        toast({ title: 'Succès', description: 'Partenaire mis à jour.' });
      } else {
        const docRef = doc(partenairesCollection);
        batch.set(docRef, { ...data, actif: false });
        toast({ title: 'Succès', description: 'Partenaire ajouté.' });
      }

      await batch.commit();
      onFinished();
    } catch (error) {
      console.error('Error updating partners: ', error);
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
              <FormLabel>Nom du partenaire</FormLabel>
              <FormControl>
                <Input placeholder="Nom du partenaire" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {partenaire ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PartenaireActions({
  partenaire,
  partenaires,
}: {
  partenaire: Partenaire;
  partenaires: Partenaire[] | null;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'partenaires', partenaire.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Partenaire supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  const handleActivate = async () => {
    if (partenaire.actif) return;
    setIsActivating(true);
    const batch = writeBatch(firestore);

    partenaires?.forEach((p) => {
      if (p.id !== partenaire.id && p.actif) {
        const otherPartnerRef = doc(firestore, 'partenaires', p.id);
        batch.update(otherPartnerRef, { actif: false });
      }
    });

    const currentPartnerRef = doc(firestore, 'partenaires', partenaire.id);
    batch.update(currentPartnerRef, { actif: true });

    try {
      await batch.commit();
      toast({
        title: 'Succès',
        description: `${partenaire.nom} est maintenant le partenaire actif.`,
      });
    } catch (error) {
      console.error('Error activating partner: ', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'activer le partenaire.",
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le partenaire</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du partenaire.
            </DialogDescription>
          </DialogHeader>
          <PartenaireForm
            partenaire={partenaire}
            onFinished={() => setIsEditDialogOpen(false)}
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
              Cette action est irréversible. Le partenaire sera définitivement
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
                onClick={handleActivate}
                disabled={partenaire.actif || isActivating}
              >
                {isActivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Activer</p>
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

function PartenaireCard({
  partenaire,
  partenaires,
}: {
  partenaire: Partenaire;
  partenaires: Partenaire[] | null;
}) {
  return (
    <Card className="rounded-xl flex flex-col">
      <CardContent className="p-4 flex-grow">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-2xl font-bold truncate">{partenaire.nom}</div>
            <div className="text-sm text-muted-foreground">
              <span
                className={cn(
                  partenaire.actif
                    ? 'text-green-600 font-semibold'
                    : 'text-destructive'
                )}
              >
                {partenaire.actif ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <PartenaireActions partenaire={partenaire} partenaires={partenaires} />
      </CardFooter>
    </Card>
  );
}

export default function PartenairesPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const partenairesQuery = useMemoFirebase(
    () => collection(firestore, 'partenaires'),
    [firestore]
  );

  const { data: partenaires, isLoading } =
    useCollection<Partenaire>(partenairesQuery);

  const filteredPartenaires = partenaires?.filter((partenaire) =>
    partenaire.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lastItemIndex = currentPage * ITEMS_PER_PAGE;
  const firstItemIndex = lastItemIndex - ITEMS_PER_PAGE;
  const currentPartenaires = filteredPartenaires?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredPartenaires
    ? Math.ceil(filteredPartenaires.length / ITEMS_PER_PAGE)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Partenaires</h2>
        <div className="flex items-center space-x-2">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Partenaire
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Partenaire</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouveau partenaire à votre liste.
                </DialogDescription>
              </DialogHeader>
              <PartenaireForm
                onFinished={() => setIsCreateDialogOpen(false)}
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
      ) : !filteredPartenaires || filteredPartenaires.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun partenaire trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucun partenaire ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre premier partenaire pour le voir apparaître ici.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau Partenaire
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPartenaires.map((partenaire) => (
            <PartenaireCard
              key={partenaire.id}
              partenaire={partenaire}
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
                  <Briefcase className="h-4 w-4 inline-block" />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPartenaires?.map((partenaire) => (
                <TableRow key={partenaire.id}>
                  <TableCell>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Briefcase className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{partenaire.nom}</TableCell>
                  <TableCell>
                    <Badge
                      variant={partenaire.actif ? 'default' : 'destructive'}
                      className={cn(partenaire.actif && 'bg-green-600')}
                    >
                      {partenaire.actif ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PartenaireActions
                      partenaire={partenaire}
                      partenaires={partenaires}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-2 py-4 pr-4">
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
        </Card>
      )}
    </div>
  );
}
