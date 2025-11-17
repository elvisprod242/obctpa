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
import { collection, doc, query, where } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Link as LinkIcon,
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
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { useYearFilter } from '@/context/year-filter-context';
import { useMonthFilter } from '@/context/month-filter-context';
import { MonthFilter } from '@/components/dashboard/month-filter';
import Link from 'next/link';

const planningSchema = z.object({
  partenaire_id: z.string(),
  periode: z.string().min(1, 'La période est requise.'),
  theme: z.string().min(1, 'Le thème est requis.'),
  animateur: z.string().min(1, "L'animateur est requis."),
});

type PlanningFormValues = z.infer<typeof planningSchema>;
type Planning = PlanningFormValues & { id: string };
type Partenaire = { id: string; nom: string; actif: boolean };

function PlanningForm({
  planning,
  onFinished,
  partenaireId,
}: {
  planning?: Planning;
  onFinished: () => void;
  partenaireId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const planningsCollection = useMemoFirebase(() => collection(firestore, 'planning_communications'), [firestore]);

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningSchema),
    defaultValues: planning || {
      partenaire_id: partenaireId,
      periode: '',
      theme: '',
      animateur: '',
    },
  });

  useEffect(() => {
    form.reset(planning || {
      partenaire_id: partenaireId,
      periode: '',
      theme: '',
      animateur: '',
    });
  }, [planning, partenaireId, form]);

  const onSubmit = async (data: PlanningFormValues) => {
    setIsLoading(true);
    try {
      if (planning) {
        const docRef = doc(planningsCollection, planning.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Planning mis à jour.' });
      } else {
        addDocumentNonBlocking(planningsCollection, data);
        toast({ title: 'Succès', description: 'Planning ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving planning: ', error);
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
          name="periode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Période</FormLabel>
              <FormControl>
                <Input placeholder="Janvier 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="theme"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thème</FormLabel>
              <FormControl>
                <Input placeholder="Sécurité routière" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="animateur"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Animateur</FormLabel>
              <FormControl>
                <Input placeholder="Pierre Dubois" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {planning ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PlanningActions({ planning }: { planning: Planning }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'planning_communications', planning.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Planning supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le planning</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du planning de communication.
            </DialogDescription>
          </DialogHeader>
          <PlanningForm
            planning={planning}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaireId={planning.partenaire_id}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le planning sera définitivement supprimé.
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
                      asChild
                  >
                    <Link href={{ pathname: '/dashboard/communications', query: { planningId: planning.id } }}>
                      <LinkIcon className="h-4 w-4" />
                    </Link>
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                  <p>Voir les actions</p>
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

export default function PlanningCommunicationPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { selectedYear } = useYearFilter();
  const { selectedMonth, monthNames } = useMonthFilter();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const planningsQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'planning_communications'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);

  const { data: plannings, isLoading: isLoadingPlannings } = useCollection<Planning>(planningsQuery);
  
  const filteredPlannings = useMemo(() => {
    const selectedMonthName = monthNames[parseInt(selectedMonth, 10) - 1];
    return plannings
    ?.filter(p => {
        const yearMatch = selectedYear === 'all' || p.periode.includes(selectedYear);
        const monthMatch = p.periode.toLowerCase().includes(selectedMonthName.toLowerCase());
        return yearMatch && monthMatch;
    })
    .sort((a,b) => a.periode.localeCompare(b.periode));
  }, [plannings, selectedYear, selectedMonth, monthNames]);

  const isLoading = isLoadingPartenaires || isLoadingPlannings;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Planning Communication</h2>
        <div className="flex items-center space-x-2">
            <MonthFilter />
            {activePartner && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nouveau Planning
                </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nouveau Planning</DialogTitle>
                    <DialogDescription>
                    Ajouter un nouveau planning de communication pour le partenaire {activePartner.nom}.
                    </DialogDescription>
                </DialogHeader>
                <PlanningForm
                    onFinished={() => setIsCreateDialogOpen(false)}
                    partenaireId={activePartner.id}
                />
                </DialogContent>
            </Dialog>
            )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!activePartner && !isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Aucun partenaire actif
            </h3>
            <p className="text-sm text-muted-foreground">
              Veuillez sélectionner un partenaire actif pour voir le planning.
            </p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && filteredPlannings && filteredPlannings.length > 0 && (
         <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead>
                  <TableHead>Thème</TableHead>
                  <TableHead>Animateur</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlannings.map((planning) => (
                  <TableRow key={planning.id}>
                    <TableCell className="font-medium">{planning.periode}</TableCell>
                    <TableCell>{planning.theme}</TableCell>
                    <TableCell>{planning.animateur}</TableCell>
                    <TableCell className="text-right">
                      <PlanningActions planning={planning} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </Card>
      )}

      {activePartner && !isLoading && (!filteredPlannings || filteredPlannings.length === 0) && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Aucun planning trouvé
            </h3>
            <p className="text-sm text-muted-foreground">
              Aucun planning ne correspond aux filtres sélectionnés pour ce partenaire.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau Planning
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
