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
  CardDescription,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, writeBatch } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Search,
  FileText,
  LayoutGrid,
  List,
  Sparkles,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const invariantSchema = z.object({
  titre: z.string().min(1, { message: 'Le titre est requis.' }),
  description: z.string().min(1, { message: 'La description est requise.' }),
});

type InvariantFormValues = z.infer<typeof invariantSchema>;
type Invariant = InvariantFormValues & { id: string };

const defaultInvariants = [
    { titre: "Kms parcourus", description: "Distance totale parcourue par le véhicule." },
    { titre: "Temps de conduite", description: "Durée totale de conduite du véhicule." },
    { titre: "Temps de repos", description: "Durée totale de repos du conducteur." },
    { titre: "Nb non-respect du temps repos journalier", description: "Nombre de fois où le repos journalier n'a pas été respecté." },
    { titre: "Nb non-respect du temps repos hebdomadaire", description: "Nombre de fois où le repos hebdomadaire n'a pas été respecté." },
    { titre: "Nb non-respect du temps de conduite journalier alarme", description: "Alarme pour non-respect du temps de conduite journalier." },
    { titre: "Nb non-respect du temps de conduite journalier alerte", description: "Alerte pour non-respect du temps de conduite journalier." },
    { titre: "Nb non-respect du temps de conduite hebdomadaire", description: "Nombre de fois où le temps de conduite hebdomadaire n'a pas été respecté." },
    { titre: "Nb non-respect du temps de travail journalier", description: "Nombre de fois où le temps de travail journalier n'a pas été respecté." },
    { titre: "Nb non-respect du temps de travail hebdomadaire", description: "Nombre de fois où le temps de travail hebdomadaire n'a pas été respecté." },
    { titre: "Accélération brusque alarme", description: "Alarme déclenchée par une accélération brusque." },
    { titre: "Freinage brusque alarme", description: "Alarme déclenchée par un freinage brusque." },
    { titre: "Tripotage caméra", description: "Détection de manipulation de la caméra." },
    { titre: "Conduite de nuit alerte", description: "Alerte pour conduite durant les heures de nuit." },
    { titre: "Conduite de nuit alarme", description: "Alarme pour conduite prolongée durant les heures de nuit." },
    { titre: "Nb Sabotage OBC", description: "Nombre de tentatives de sabotage du boîtier OBC." },
    { titre: "Nb Roue libre", description: "Nombre de détections de conduite en roue libre." },
    { titre: "Conduite continue alerte", description: "Alerte pour conduite continue sans pause." },
    { titre: "Conduite continue alarme", description: "Alarme pour conduite continue excessive sans pause." },
    { titre: "Excès des vitesses alerte", description: "Alerte pour dépassement de la limite de vitesse." },
    { titre: "Excès des vitesses alarme", description: "Alarme pour dépassement important ou prolongé de la limite de vitesse." },
    { titre: "Nb Usurpation clé OBC", description: "Nombre d'utilisations non autorisées de la clé OBC." },
    { titre: "Conduite dangereuse", description: "Comportement de conduite jugé dangereux." }
];

function InvariantForm({
  invariant,
  onFinished,
}: {
  invariant?: Invariant;
  onFinished: () => void;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const invariantsCollection = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);

  const form = useForm<InvariantFormValues>({
    resolver: zodResolver(invariantSchema),
    defaultValues: invariant || {
      titre: '',
      description: '',
    },
  });

  const onSubmit = async (data: InvariantFormValues) => {
    setIsLoading(true);
    try {
      if (invariant) {
        const docRef = doc(invariantsCollection, invariant.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Invariant mis à jour.' });
      } else {
        addDocumentNonBlocking(invariantsCollection, data);
        toast({ title: 'Succès', description: 'Invariant ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving invariant: ', error);
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
          name="titre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="Respect des pauses" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Les chauffeurs doivent respecter les pauses réglementaires..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {invariant ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function InvariantActions({ invariant }: { invariant: Invariant }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'invariants', invariant.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Invariant supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'invariant</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de l'invariant.
            </DialogDescription>
          </DialogHeader>
          <InvariantForm
            invariant={invariant}
            onFinished={() => setIsEditDialogOpen(false)}
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
              Cette action est irréversible. L'invariant sera définitivement
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

function InvariantCard({ invariant }: { invariant: Invariant }) {
  return (
    <Card className="rounded-xl flex flex-col">
      <CardContent className="p-4 space-y-4 flex-grow">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted flex-shrink-0">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <h3 className="text-xl font-bold truncate">{invariant.titre}</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{invariant.description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <InvariantActions invariant={invariant} />
      </CardFooter>
    </Card>
  );
}

export default function InvariantsPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const invariantsCollection = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading } = useCollection<Invariant>(invariantsCollection);

  const filteredInvariants = invariants?.filter((c) =>
    c.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentInvariants = filteredInvariants?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredInvariants
    ? Math.ceil(filteredInvariants.length / itemsPerPage)
    : 0;

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
        const batch = writeBatch(firestore);
        defaultInvariants.forEach(inv => {
            const docRef = doc(invariantsCollection);
            batch.set(docRef, inv);
        });
        await batch.commit();
        toast({ title: "Succès", description: "La liste des invariants a été ajoutée." });
    } catch(error) {
        console.error("Error seeding invariants: ", error);
        toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ajouter la liste des invariants." });
    } finally {
        setIsSeeding(false);
    }
  }

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true && currentInvariants) {
      setSelectedIds(currentInvariants.map(inv => inv.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const handleDeleteSelected = async () => {
    const batch = writeBatch(firestore);
    selectedIds.forEach(id => {
      const docRef = doc(firestore, 'invariants', id);
      batch.delete(docRef);
    });
    try {
      await batch.commit();
      toast({ title: 'Succès', description: `${selectedIds.length} invariant(s) supprimé(s).` });
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
              Cette action est irréversible et supprimera définitivement {selectedIds.length} invariant(s).
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
        <h2 className="text-3xl font-bold tracking-tight">Invariants</h2>
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer ({selectedIds.length})
            </Button>
          )}
          {invariants && invariants.length === 0 && !isLoading && (
              <Button variant="outline" onClick={handleSeed} disabled={isSeeding}>
                  {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Remplir la liste
              </Button>
          )}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvel Invariant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvel Invariant</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle règle ou consigne.
                </DialogDescription>
              </DialogHeader>
              <InvariantForm
                onFinished={() => setIsCreateDialogOpen(false)}
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
              placeholder="Filtrer par titre ou description..."
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
      ) : !filteredInvariants || filteredInvariants.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucun invariant trouvé</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucun invariant ne correspond à votre recherche "${searchTerm}".`
              : 'Commencez par ajouter votre premier invariant ou remplissez la liste par défaut.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvel Invariant
            </Button>
            <Button variant="secondary" onClick={handleSeed} disabled={isSeeding}>
                {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Remplir la liste
            </Button>
          </div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredInvariants.map((invariant) => (
            <InvariantCard
              key={invariant.id}
              invariant={invariant}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead padding="checkbox" className="w-[50px]">
                  <Checkbox
                    checked={
                      currentInvariants && selectedIds.length === currentInvariants.length && currentInvariants.length > 0
                        ? true
                        : selectedIds.length > 0
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Sélectionner toutes les lignes"
                  />
                </TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentInvariants?.map((invariant) => (
                <TableRow key={invariant.id} data-state={selectedIds.includes(invariant.id) && 'selected'}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(invariant.id)}
                      onCheckedChange={(checked) => handleSelectRow(invariant.id, !!checked)}
                      aria-label={`Sélectionner la ligne pour ${invariant.titre}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{invariant.titre}</TableCell>
                  <TableCell><p className="line-clamp-2">{invariant.description}</p></TableCell>
                  <TableCell className="text-right">
                    <InvariantActions
                      invariant={invariant}
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

    