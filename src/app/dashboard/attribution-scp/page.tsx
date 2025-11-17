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
  Search,
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

const scpSchema = z.object({
  partenaire_id: z.string(),
  invariants_id: z.string().min(1, 'Invariant is required.'),
  sanction: z.string().min(1, 'Sanction is required.'),
  type: z.string().min(1, 'Type is required.'),
  value: z.coerce.number().min(0, 'Value must be a positive number.'),
});

type ScpFormValues = z.infer<typeof scpSchema>;
type Partenaire = { id: string; nom: string; actif: boolean };
type Invariant = { id: string; titre: string };
type Scp = ScpFormValues & {
  id: string;
  invariantTitre?: string;
};

function ScpForm({
  scp,
  onFinished,
  partenaireId,
  invariants,
}: {
  scp?: Scp;
  onFinished: () => void;
  partenaireId: string;
  invariants: Invariant[] | null;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const scpCollection = useMemoFirebase(() => collection(firestore, 'scp'), [firestore]);

  const form = useForm<ScpFormValues>({
    resolver: zodResolver(scpSchema),
    defaultValues: scp || {
      partenaire_id: partenaireId,
      invariants_id: '',
      sanction: '',
      type: 'Alerte',
      value: 1,
    },
  });

  const onSubmit = async (data: ScpFormValues) => {
    setIsLoading(true);
    try {
      if (scp) {
        const docRef = doc(scpCollection, scp.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Sanction mise à jour.' });
      } else {
        addDocumentNonBlocking(scpCollection, data);
        toast({ title: 'Succès', description: 'Sanction ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving sanction: ', error);
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
          name="invariants_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invariant</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
        <FormField
          control={form.control}
          name="sanction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sanction</FormLabel>
              <FormControl>
                <Input placeholder="Avertissement écrit" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Alerte">Alerte</SelectItem>
                    <SelectItem value="Alarme">Alarme</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valeur (points)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {scp ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ScpActions({ scp, invariants }: { scp: Scp; invariants: Invariant[] | null }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'scp', scp.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Sanction supprimée.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la sanction</DialogTitle>
          </DialogHeader>
          <ScpForm
            scp={scp}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaireId={scp.partenaire_id}
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
              Cette action est irréversible. La sanction sera définitivement
              supprimée.
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


export default function AttributionScpPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'),[firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const scpQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'scp'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);
  const { data: scpData, isLoading: isLoadingScp } = useCollection<Scp>(scpQuery);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);
  
  const isLoading = isLoadingPartenaires || isLoadingScp || isLoadingInvariants;
  
  const enrichedScpData = useMemo(() => {
    if (!scpData || !invariants) return [];
    const invariantMap = new Map(invariants.map(i => [i.id, i.titre]));
    return scpData.map(s => ({
        ...s,
        invariantTitre: invariantMap.get(s.invariants_id) || 'Invariant inconnu'
    }))
  }, [scpData, invariants]);

  const filteredScp = useMemo(() => {
    return enrichedScpData
    .filter(s => 
        s.sanction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.invariantTitre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a,b) => a.invariantTitre.localeCompare(b.invariantTitre));
  }, [enrichedScpData, searchTerm]);

  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentScp = filteredScp?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredScp
    ? Math.ceil(filteredScp.length / itemsPerPage)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Attribution des Sanctions (SCP)</h2>
        <div className="flex items-center space-x-2">
           <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Sanction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Sanction</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle sanction pour un invariant.
                </DialogDescription>
              </DialogHeader>
              {activePartner && (
                 <ScpForm
                    onFinished={() => setIsCreateDialogOpen(false)}
                    partenaireId={activePartner.id}
                    invariants={invariants}
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
                placeholder="Filtrer par sanction, invariant, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
                />
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
                Veuillez activer un partenaire pour gérer les sanctions.
            </p>
        </div>
      ) : filteredScp.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucune sanction trouvée</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? 'Aucune sanction ne correspond à votre recherche.'
              : 'Commencez par ajouter une sanction.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle Sanction
          </Button>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invariant</TableHead>
                <TableHead>Sanction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentScp.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.invariantTitre}</TableCell>
                  <TableCell>{s.sanction}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell className="font-bold">{s.value}</TableCell>
                  <TableCell className="text-right">
                    <ScpActions scp={s} invariants={invariants} />
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
