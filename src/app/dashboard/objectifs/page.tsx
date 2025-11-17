'use client';

import {
  deleteDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  useUser,
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
import { collection, doc } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Search,
  Target,
  LayoutGrid,
  List,
  FileText,
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
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const objectifSchema = z.object({
  partenaire_id: z.string(),
  invariant_id: z.string().min(1, "L'invariant est requis."),
  chapitre: z.string().min(1, 'Le chapitre est requis.'),
  cible: z.coerce.number().min(0, 'La cible doit être un nombre positif.'),
  unite: z.string().min(1, "L'unité est requise."),
  mode: z.string().min(1, 'Le mode est requis.'),
  frequence: z.string().min(1, 'La fréquence est requise.'),
});

type ObjectifFormValues = z.infer<typeof objectifSchema>;
type Partenaire = { id: string; nom: string; actif: boolean };
type Invariant = { id: string; titre: string };
type Objectif = ObjectifFormValues & {
  id: string;
  user_id: string;
  partenaireNom?: string;
  invariantTitre?: string;
};

function ObjectifForm({
  objectif,
  onFinished,
  partenaires,
  invariants,
  selectedInvariantId,
}: {
  objectif?: Objectif;
  onFinished: () => void;
  partenaires: Partenaire[] | null;
  invariants: Invariant[] | null;
  selectedInvariantId?: string | null;
}) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const objectifsCollection = useMemoFirebase(
    () => collection(firestore, 'objectifs'),
    [firestore]
  );
  
  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const form = useForm<ObjectifFormValues>({
    resolver: zodResolver(objectifSchema),
    defaultValues: objectif || {
      partenaire_id: activePartner?.id || '',
      invariant_id: selectedInvariantId || '',
      chapitre: '',
      cible: 0,
      unite: 'heures/max',
      mode: 'Préventif',
      frequence: 'Mensuel',
    },
  });

  useEffect(() => {
    if (activePartner && !form.getValues('partenaire_id')) {
        form.setValue('partenaire_id', activePartner.id);
    }
    if (selectedInvariantId) {
      form.setValue('invariant_id', selectedInvariantId);
    }
  }, [activePartner, selectedInvariantId, form]);

  const onSubmit = async (data: ObjectifFormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Vous devez être connecté pour créer un objectif.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const dataToSave = { ...data, user_id: user.uid };
      if (!dataToSave.partenaire_id && activePartner) {
        dataToSave.partenaire_id = activePartner.id;
      }

      if (objectif) {
        const docRef = doc(objectifsCollection, objectif.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Objectif mis à jour.' });
      } else {
        addDocumentNonBlocking(objectifsCollection, dataToSave);
        toast({ title: 'Succès', description: 'Objectif ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving objective: ', error);
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
            name="invariant_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invariant</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!!selectedInvariantId}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un invariant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="chapitre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chapitre</FormLabel>
                <FormControl>
                  <Input placeholder="Sécurité" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="cible"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cible</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="unite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unité</FormLabel>
                <FormControl>
                  <Input placeholder="heures/max" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode</FormLabel>
                 <FormControl>
                  <Input placeholder="Préventif" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fréquence</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une fréquence" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Journalier">Journalier</SelectItem>
                    <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="Mensuel">Mensuel</SelectItem>
                    <SelectItem value="Annuel">Annuel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !activePartner}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {objectif ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ObjectifActions({
  objectif,
  partenaires,
  invariants,
}: {
  objectif: Objectif;
  partenaires: Partenaire[] | null;
  invariants: Invariant[] | null;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'objectifs', objectif.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Objectif supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier l'objectif</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations de l'objectif.
            </DialogDescription>
          </DialogHeader>
          <ObjectifForm
            objectif={objectif}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaires={partenaires}
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
              Cette action est irréversible. L'objectif sera définitivement
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

function ObjectifCard({
  objectif,
  partenaires,
  invariants,
}: {
  objectif: Objectif;
  partenaires: Partenaire[] | null;
  invariants: Invariant[] | null;
}) {
  return (
    <Card className="rounded-xl flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-xl font-bold truncate">
              {objectif.invariantTitre || 'Invariant non trouvé'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{objectif.chapitre}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
        <p>
          <strong>Cible:</strong> {objectif.cible} {objectif.unite}
        </p>
        <p>
          <strong>Mode:</strong> {objectif.mode}
        </p>
        <p>
          <strong>Fréquence:</strong> {objectif.frequence}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <ObjectifActions
          objectif={objectif}
          partenaires={partenaires}
          invariants={invariants}
        />
      </CardFooter>
    </Card>
  );
}

export default function ObjectifsPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvariantId, setSelectedInvariantId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;

  const objectifsQuery = useMemoFirebase(
    () => collection(firestore, 'objectifs'),
    [firestore]
  );
  const { data: objectifs, isLoading: isLoadingObjectifs } =
    useCollection<Objectif>(objectifsQuery);

  const partenairesQuery = useMemoFirebase(
    () => collection(firestore, 'partenaires'),
    [firestore]
  );
  const { data: partenaires, isLoading: isLoadingPartenaires } =
    useCollection<Partenaire>(partenairesQuery);

  const invariantsQuery = useMemoFirebase(
    () => collection(firestore, 'invariants'),
    [firestore]
  );
  const { data: invariants, isLoading: isLoadingInvariants } =
    useCollection<Invariant>(invariantsQuery);

  const isLoading =
    isLoadingObjectifs || isLoadingPartenaires || isLoadingInvariants;

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const enrichedObjectifs = useMemo(() => {
    const partnerMap = new Map(partenaires?.map((p) => [p.id, p.nom]));
    const invariantMap = new Map(invariants?.map((i) => [i.id, i.titre]));

    return objectifs
    ?.filter(o => !activePartner || o.partenaire_id === activePartner.id)
    .map((o) => ({
      ...o,
      partenaireNom: partnerMap.get(o.partenaire_id) || 'N/A',
      invariantTitre: invariantMap.get(o.invariant_id) || 'N/A',
    }));
  }, [objectifs, partenaires, invariants, activePartner]);

  const filteredObjectifs = enrichedObjectifs?.filter(
    (o) =>
      (!selectedInvariantId || o.invariant_id === selectedInvariantId) &&
      (o.chapitre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.invariantTitre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const lastItemIndex = currentPage * ITEMS_PER_PAGE;
  const firstItemIndex = lastItemIndex - ITEMS_PER_PAGE;
  const currentObjectifs = filteredObjectifs?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredObjectifs
    ? Math.ceil(filteredObjectifs.length / ITEMS_PER_PAGE)
    : 0;

  const selectedInvariant = useMemo(() => {
    if (!selectedInvariantId) return null;
    return invariants?.find(inv => inv.id === selectedInvariantId);
  }, [selectedInvariantId, invariants]);

  return (
    <div className="grid md:grid-cols-3 gap-6 h-full">
      {/* Left Column: Invariants List */}
      <div className="md:col-span-1 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Invariants</CardTitle>
            <CardDescription>Sélectionnez un invariant pour voir les objectifs associés.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingInvariants ? (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
            <ScrollArea className="h-[60vh]">
              <div className="flex flex-col gap-2 pr-4">
                {invariants?.map((invariant) => (
                  <Button
                    key={invariant.id}
                    variant="ghost"
                    onClick={() => setSelectedInvariantId(invariant.id)}
                    className={cn(
                      'w-full justify-start text-left',
                      selectedInvariantId === invariant.id && 'bg-muted font-semibold'
                    )}
                  >
                    <FileText className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{invariant.titre}</span>
                  </Button>
                ))}
                {invariants?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun invariant trouvé.
                  </p>
                )}
              </div>
            </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Objectives */}
      <div className="md:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {selectedInvariant ? `Objectifs pour "${selectedInvariant.titre}"` : 'Objectifs'}
            </h2>
            <p className="text-muted-foreground">
              {selectedInvariant
                ? 'Gérez les objectifs pour l\'invariant sélectionné.'
                : 'Sélectionnez un invariant pour commencer.'}
            </p>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button disabled={!activePartner || !selectedInvariantId}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvel Objectif
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Nouvel Objectif</DialogTitle>
                <DialogDescription>
                  Ajoutez un nouvel objectif pour l'invariant <span className="font-semibold">{selectedInvariant?.titre}</span>.
                </DialogDescription>
              </DialogHeader>
              <ObjectifForm
                onFinished={() => setIsCreateDialogOpen(false)}
                partenaires={partenaires}
                invariants={invariants}
                selectedInvariantId={selectedInvariantId}
              />
            </DialogContent>
          </Dialog>
        </div>
        
        {!selectedInvariantId ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                Aucun invariant sélectionné
              </h3>
              <p className="text-sm text-muted-foreground">
                Choisissez un invariant dans la liste de gauche pour voir ses objectifs.
              </p>
            </div>
          </div>
        ) : (
        <>
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:w-auto sm:flex-grow">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Filtrer par chapitre..."
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
            ) : !filteredObjectifs || filteredObjectifs.length === 0 ? (
                <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
                <h3 className="text-xl font-semibold">Aucun objectif trouvé</h3>
                <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
                    {searchTerm
                    ? `Aucun objectif ne correspond à votre recherche "${searchTerm}".`
                    : `Aucun objectif pour cet invariant. Commencez par en ajouter un.`}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner || !selectedInvariantId}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouvel Objectif
                </Button>
                </div>
            ) : view === 'grid' ? (
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                {filteredObjectifs.map((objectif) => (
                    <ObjectifCard
                    key={objectif.id}
                    objectif={objectif}
                    partenaires={partenaires}
                    invariants={invariants}
                    />
                ))}
                </div>
            ) : (
                <Card>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Chapitre</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Fréquence</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {currentObjectifs?.map((objectif) => (
                        <TableRow key={objectif.id}>
                        <TableCell className="font-medium">
                            {objectif.chapitre}
                        </TableCell>
                        <TableCell>
                            {objectif.cible} {objectif.unite}
                        </TableCell>
                        <TableCell>{objectif.mode}</TableCell>
                        <TableCell>{objectif.frequence}</TableCell>
                        <TableCell className="text-right">
                            <ObjectifActions
                            objectif={objectif}
                            partenaires={partenaires}
                            invariants={invariants}
                            />
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                {totalPages > 1 && (
                    <div className="flex items-center justify-end space-x-2 py-4 pr-4">
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
                )}
                </Card>
            )}
            </>
        )}
      </div>
    </div>
  );
}
