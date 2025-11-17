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
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
  ShieldCheck,
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
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import { useYearFilter } from '@/context/year-filter-context';
import Image from 'next/image';
import { useMonthFilter } from '@/context/month-filter-context';
import { MonthFilter } from '@/components/dashboard/month-filter';

const controleCabineSchema = z.object({
  file: z.string().min(1, 'Le chemin du fichier est requis.'),
  partenaire_id: z.string(),
  date: z.string().min(1, 'La date est requise.'),
  commentaire: z.string().min(1, 'Le commentaire est requis.'),
});

type ControleCabineFormValues = z.infer<typeof controleCabineSchema>;
type ControleCabine = ControleCabineFormValues & { id: string };
type Partenaire = { id: string; nom: string; actif: boolean };

const getEmbeddableImageUrl = (url: string) => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'www.dropbox.com' && urlObj.searchParams.has('dl')) {
            urlObj.searchParams.set('raw', '1');
            urlObj.searchParams.delete('dl');
            return urlObj.toString();
        }
    } catch (e) {
        // Not a valid URL, return original
    }
    return url;
};

function ControleCabineForm({
  controle,
  onFinished,
  partenaireId,
}: {
  controle?: ControleCabine;
  onFinished: () => void;
  partenaireId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const controlesCollection = useMemoFirebase(() => collection(firestore, 'controle_cabine'), [firestore]);

  const form = useForm<ControleCabineFormValues>({
    resolver: zodResolver(controleCabineSchema),
    defaultValues: controle || {
      file: '',
      partenaire_id: partenaireId,
      date: new Date().toISOString().split('T')[0],
      commentaire: '',
    },
  });

  useEffect(() => {
    form.reset(controle || {
      file: '',
      partenaire_id: partenaireId,
      date: new Date().toISOString().split('T')[0],
      commentaire: '',
    });
  }, [controle, partenaireId, form]);

  const onSubmit = async (data: ControleCabineFormValues) => {
    setIsLoading(true);
    try {
      if (controle) {
        const docRef = doc(controlesCollection, controle.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Contrôle mis à jour.' });
      } else {
        addDocumentNonBlocking(controlesCollection, data);
        toast({ title: 'Succès', description: 'Contrôle ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving controle: ', error);
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date du contrôle</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fichier (URL/Chemin)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="assets/controles/controle.pdf" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="commentaire"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commentaire</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cabine en bon état..."
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
            {controle ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function ControleCabineActions({ controle }: { controle: ControleCabine }) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'controle_cabine', controle.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Contrôle supprimé.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le contrôle</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du contrôle.
            </DialogDescription>
          </DialogHeader>
          <ControleCabineForm
            controle={controle}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaireId={controle.partenaire_id}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrôle sera définitivement supprimé.
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

function ControleCabineCard({ controle }: { controle: ControleCabine }) {
    const imageUrl = getEmbeddableImageUrl(controle.file);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    return (
      <>
        <Card className="w-full overflow-hidden">
            <CardContent className="p-0">
            <div className="relative aspect-video cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
                <Image
                    src={imageUrl}
                    alt={`Contrôle du ${controle.date}`}
                    fill
                    className="object-cover"
                    unoptimized
                />
            </div>
            <div className="p-4">
                <p className="text-sm font-medium">{formatDate(controle.date)}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{controle.commentaire}</p>
            </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
            <ControleCabineActions controle={controle} />
            </CardFooter>
        </Card>
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
            <DialogContent className="max-w-4xl h-auto">
                <DialogTitle className="sr-only">Image du contrôle du {formatDate(controle.date)}</DialogTitle>
                <div className="relative aspect-video">
                <Image
                    src={imageUrl}
                    alt={`Contrôle du ${controle.date}`}
                    fill
                    className="object-contain"
                    unoptimized
                />
                </div>
            </DialogContent>
        </Dialog>
      </>
    );
  }

export default function ControlesCabinePage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { selectedYear } = useYearFilter();
  const { selectedMonth, monthNames } = useMonthFilter();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const controlesQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'controle_cabine'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);

  const { data: controles, isLoading: isLoadingControles } = useCollection<ControleCabine>(controlesQuery);
  
  const filteredControles = useMemo(() => {
    return controles
    ?.filter(e => {
        if (selectedYear === 'all') return true;
        const dateStr = String(e.date);
        if (!dateStr) return false;
        try {
            const dateObj = new Date(dateStr);
            const yearMatch = !isNaN(dateObj.getTime()) && dateObj.getFullYear().toString() === selectedYear;
            const monthMatch = !isNaN(dateObj.getTime()) && (dateObj.getMonth() + 1).toString() === selectedMonth;
            return yearMatch && monthMatch;
        } catch {
            const yearMatch = dateStr.includes(selectedYear);
            const selectedMonthName = monthNames[parseInt(selectedMonth, 10) - 1];
            const monthMatch = dateStr.toLowerCase().includes(selectedMonthName.toLowerCase());
            return yearMatch && monthMatch;
        }
    })
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [controles, selectedYear, selectedMonth, monthNames]);

  const isLoading = isLoadingPartenaires || isLoadingControles;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Contrôles de Cabine</h2>
        <div className="flex items-center space-x-2">
        <MonthFilter />
        {activePartner && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouveau Contrôle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Contrôle</DialogTitle>
                <DialogDescription>
                  Ajouter une nouvelle fiche de contrôle pour le partenaire {activePartner.nom}.
                </DialogDescription>
              </DialogHeader>
              <ControleCabineForm
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
              Veuillez sélectionner un partenaire actif pour voir les contrôles de cabine.
            </p>
          </div>
        </div>
      )}

      {activePartner && !isLoading && filteredControles && filteredControles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredControles.map((controle) => (
            <ControleCabineCard key={controle.id} controle={controle} />
          ))}
        </div>
      )}

      {activePartner && !isLoading && (!filteredControles || filteredControles.length === 0) && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Aucun contrôle trouvé
            </h3>
            <p className="text-sm text-muted-foreground">
              Aucun contrôle ne correspond aux filtres sélectionnés.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nouveau Contrôle
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
