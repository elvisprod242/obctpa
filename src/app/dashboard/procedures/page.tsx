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
  BookText,
  File as FileIcon,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const procedureSchema = z.object({
  file: z.string().min(1, 'Le chemin du fichier est requis.'),
  partenaire_id: z.string(),
});

type ProcedureFormValues = z.infer<typeof procedureSchema>;
type Procedure = ProcedureFormValues & { id: string };
type Partenaire = { id: string; nom: string; actif: boolean };

function ProcedureForm({
  procedure,
  onFinished,
  partenaireId,
}: {
  procedure?: Procedure;
  onFinished: () => void;
  partenaireId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const proceduresCollection = useMemoFirebase(() => collection(firestore, 'procedures'), [firestore]);

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: procedure || {
      file: '',
      partenaire_id: partenaireId,
    },
  });

  useEffect(() => {
    form.reset(procedure || {
      file: '',
      partenaire_id: partenaireId,
    });
  }, [procedure, partenaireId, form]);

  const onSubmit = async (data: ProcedureFormValues) => {
    setIsLoading(true);
    try {
      if (procedure) {
        const docRef = doc(proceduresCollection, procedure.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Procédure mise à jour.' });
      } else {
        addDocumentNonBlocking(proceduresCollection, data);
        toast({ title: 'Succès', description: 'Procédure ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving procedure: ', error);
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
          name="file"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fichier (URL/Chemin)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="assets/procedures/procedure.pdf" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {procedure ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function PdfViewer({ procedure, partnerName }: { procedure: Procedure, partnerName?: string }) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const getEmbeddableUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'www.dropbox.com') {
            urlObj.searchParams.set('raw', '1');
            urlObj.searchParams.delete('dl');
            return urlObj.toString();
            }
        } catch (e) {
            // Not a valid URL
        }
        return url;
    };
    const embedUrl = getEmbeddableUrl(procedure.file);

    const handleFullscreen = () => {
        if (!viewerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            viewerRef.current.requestFullscreen();
        }
    };
    
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    return (
        <Card className="h-full w-full" ref={viewerRef}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="truncate">Procédure {partnerName ? `- ${partnerName}` : ''}</CardTitle>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] p-0">
                 <div className="h-full w-full border-t">
                    <embed src={embedUrl} type="application/pdf" width="100%" height="100%" />
                 </div>
            </CardContent>
        </Card>
    );
}

function ProcedureListItem({
    procedure,
    isSelected,
    onSelect,
    onDelete,
    onEdit
}: {
    procedure: Procedure,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void,
    onEdit: () => void,
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-2 rounded-lg pr-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted/50",
                isSelected && "bg-muted text-primary font-semibold"
            )}
        >
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            onClick={onSelect}
                            className={cn("w-full justify-start text-left flex-1 truncate", isSelected && "text-primary")}
                        >
                            <FileIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{procedure.file}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{procedure.file}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Modifier</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Supprimer</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}

export default function ProceduresPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [deletingProcedure, setDeletingProcedure] = useState<Procedure | null>(null);
  const { toast } = useToast();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const proceduresQuery = useMemoFirebase(() => {
    if (!activePartner) return null;
    return query(collection(firestore, 'procedures'), where('partenaire_id', '==', activePartner.id));
  }, [firestore, activePartner]);

  const { data: procedures, isLoading: isLoadingProcedures } = useCollection<Procedure>(proceduresQuery);

  const isLoading = isLoadingPartenaires || isLoadingProcedures;

  const handleDelete = () => {
    if (!deletingProcedure) return;
    const docRef = doc(firestore, 'procedures', deletingProcedure.id);
    deleteDocumentNonBlocking(docRef);
    toast({title: "Succès", description: "Procédure supprimée."})
    if(selectedProcedure?.id === deletingProcedure.id) {
        setSelectedProcedure(null);
    }
    setDeletingProcedure(null);
  };
  
  const handleEdit = (procedure: Procedure) => {
    setEditingProcedure(procedure);
  };

  useEffect(() => {
    if (!isLoadingProcedures && procedures && procedures.length > 0 && !selectedProcedure) {
        setSelectedProcedure(procedures[0]);
    }
    if (!isLoadingProcedures && (!procedures || procedures.length === 0)) {
        setSelectedProcedure(null);
    }
  }, [isLoadingProcedures, procedures, selectedProcedure]);


  return (
    <div className="flex flex-col h-full gap-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Procédures</h2>
        {activePartner && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Procédure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Procédure</DialogTitle>
                <DialogDescription>
                  Ajouter une nouvelle procédure pour le partenaire {activePartner.nom}.
                </DialogDescription>
              </DialogHeader>
              <ProcedureForm
                onFinished={() => setIsCreateDialogOpen(false)}
                partenaireId={activePartner.id}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

       <Dialog open={!!editingProcedure} onOpenChange={(open) => !open && setEditingProcedure(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Modifier la procédure</DialogTitle>
            </DialogHeader>
            {editingProcedure && activePartner && (
                <ProcedureForm
                    procedure={editingProcedure}
                    onFinished={() => setEditingProcedure(null)}
                    partenaireId={activePartner.id}
                />
            )}
        </DialogContent>
       </Dialog>

       <AlertDialog open={!!deletingProcedure} onOpenChange={(open) => !open && setDeletingProcedure(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. La procédure sera définitivement supprimée.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletingProcedure(null)}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

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
              Veuillez sélectionner un partenaire actif pour voir ses procédures.
            </p>
          </div>
        </div>
      )}
      
      {activePartner && !isLoading && (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Liste des Procédures</CardTitle>
                <CardDescription>Sélectionnez une procédure pour l'afficher.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingProcedures ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="flex flex-col gap-1 pr-1">
                    {procedures?.map((procedure) => (
                      <ProcedureListItem
                        key={procedure.id}
                        procedure={procedure}
                        isSelected={selectedProcedure?.id === procedure.id}
                        onSelect={() => setSelectedProcedure(procedure)}
                        onEdit={() => handleEdit(procedure)}
                        onDelete={() => setDeletingProcedure(procedure)}
                      />
                    ))}
                    {procedures?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune procédure trouvée.
                      </p>
                    )}
                  </div>
                </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2 flex flex-col">
            {selectedProcedure ? (
                <PdfViewer procedure={selectedProcedure} partnerName={activePartner.nom} />
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
                    <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        {procedures && procedures.length > 0 ? 'Aucune procédure sélectionnée' : 'Aucune procédure'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {procedures && procedures.length > 0 ? 'Choisissez une procédure dans la liste de gauche pour la visualiser ici.' : 'Commencez par ajouter une procédure.'}
                    </p>
                    </div>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
