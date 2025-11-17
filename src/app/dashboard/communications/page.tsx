'use client';

import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
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
  Video,
  File as FileIcon,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
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
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const communicationSchema = z.object({
  video: z.string().min(1, 'La vidéo est requise.'),
  canal: z.string().min(1, 'Le canal est requis.'),
  planning_communication_id: z.string(),
  partenaire_id: z.string(),
});

type CommunicationFormValues = z.infer<typeof communicationSchema>;
type Communication = CommunicationFormValues & { id: string };
type Partenaire = { id: string; nom: string; actif: boolean };


function CommunicationForm({
  communication,
  onFinished,
  planningId,
  partenaireId,
}: {
  communication?: Communication;
  onFinished: () => void;
  planningId: string;
  partenaireId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const communicationsCollection = useMemoFirebase(() => collection(firestore, 'communications'), [firestore]);

  const form = useForm<CommunicationFormValues>({
    resolver: zodResolver(communicationSchema),
    defaultValues: communication || {
      video: '',
      canal: '',
      planning_communication_id: planningId,
      partenaire_id: partenaireId,
    },
  });
  
  useEffect(() => {
    form.reset(communication || {
      video: '',
      canal: '',
      planning_communication_id: planningId,
      partenaire_id: partenaireId,
    })
  }, [communication, planningId, partenaireId, form])

  const onSubmit = async (data: CommunicationFormValues) => {
    setIsLoading(true);
    try {
      if (communication) {
        const docRef = doc(communicationsCollection, communication.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Action de communication mise à jour.' });
      } else {
        addDocumentNonBlocking(communicationsCollection, data);
        toast({ title: 'Succès', description: 'Action de communication ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving communication: ', error);
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
          name="video"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vidéo (URL)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="https://exemple.com/video.mp4" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="canal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canal de diffusion</FormLabel>
              <FormControl>
                <Input placeholder="Teams, Email, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {communication ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function VideoPlayer({ communication, partnerName }: { communication: Communication; partnerName?: string }) {
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
  const embedUrl = getEmbeddableUrl(communication.video);

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
        <CardTitle className="truncate">Vidéo - {communication.canal}</CardTitle>
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
          <video src={embedUrl} controls width="100%" height="100%" />
        </div>
      </CardContent>
    </Card>
  );
}


function CommunicationListItem({
  communication,
  isSelected,
  onSelect,
  onDelete,
  onEdit
}: {
  communication: Communication;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
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
              <Video className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{communication.canal}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{communication.canal}</p>
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


function CommunicationsPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const planningId = searchParams.get('planningId');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [deletingCommunication, setDeletingCommunication] = useState<Communication | null>(null);
  const { toast } = useToast();

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'), [firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const communicationsQuery = useMemoFirebase(() => {
    if (!planningId) return null;
    return query(collection(firestore, 'communications'), where('planning_communication_id', '==', planningId));
  }, [firestore, planningId]);

  const { data: communications, isLoading: isLoadingCommunications } = useCollection<Communication>(communicationsQuery);

  useEffect(() => {
    if (!isLoadingCommunications && communications && communications.length > 0 && !selectedCommunication) {
      setSelectedCommunication(communications[0]);
    }
    if (!isLoadingCommunications && (!communications || communications.length === 0)) {
      setSelectedCommunication(null);
    }
  }, [isLoadingCommunications, communications, selectedCommunication]);

  const handleDelete = () => {
    if (!deletingCommunication) return;
    const docRef = doc(firestore, 'communications', deletingCommunication.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Succès", description: "Action de communication supprimée." });
    if (selectedCommunication?.id === deletingCommunication.id) {
      setSelectedCommunication(null);
    }
    setDeletingCommunication(null);
  };

  const handleEdit = (communication: Communication) => {
    setEditingCommunication(communication);
  };

  const isLoading = isLoadingPartenaires || isLoadingCommunications;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-3xl font-bold tracking-tight">Actions de Communication</h2>
            {planningId ? (
                <p className="text-muted-foreground">Gérez les actions pour le planning sélectionné.</p>
            ): (
                 <p className="text-muted-foreground">
                    Veuillez retourner au planning et sélectionner une action via{' '}
                    <Link href="/dashboard/planning-communication" className="text-primary hover:underline">la page de planning</Link>.
                 </p>
            )}
        </div>
        {planningId && activePartner && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Action
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle Action de Communication</DialogTitle>
                <DialogDescription>
                  Ajouter une nouvelle action pour ce planning.
                </DialogDescription>
              </DialogHeader>
              <CommunicationForm
                onFinished={() => setIsCreateDialogOpen(false)}
                planningId={planningId}
                partenaireId={activePartner.id}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

       <Dialog open={!!editingCommunication} onOpenChange={(open) => !open && setEditingCommunication(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'action de communication</DialogTitle>
          </DialogHeader>
          {editingCommunication && activePartner && (
            <CommunicationForm
              communication={editingCommunication}
              onFinished={() => setEditingCommunication(null)}
              planningId={planningId!}
              partenaireId={activePartner.id}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCommunication} onOpenChange={(open) => !open && setDeletingCommunication(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'action sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCommunication(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!planningId && !isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl font-bold tracking-tight">
              Aucun planning sélectionné
            </h3>
            <p className="text-sm text-muted-foreground">
              Veuillez retourner au planning et sélectionner une action via{' '}
              <Link href="/dashboard/planning-communication" className="text-primary hover:underline">la page de planning</Link>.
            </p>
          </div>
        </div>
      )}

      {planningId && !isLoading && (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Liste des Actions</CardTitle>
                <CardDescription>Sélectionnez une action pour la visualiser.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-22rem)]">
                  <div className="flex flex-col gap-1 pr-1">
                    {communications?.map((com) => (
                      <CommunicationListItem
                        key={com.id}
                        communication={com}
                        isSelected={selectedCommunication?.id === com.id}
                        onSelect={() => setSelectedCommunication(com)}
                        onEdit={() => handleEdit(com)}
                        onDelete={() => setDeletingCommunication(com)}
                      />
                    ))}
                    {communications?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune action trouvée pour ce planning.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2 flex flex-col">
            {selectedCommunication ? (
              <VideoPlayer communication={selectedCommunication} partnerName={activePartner?.nom} />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
                <div className="flex flex-col items-center gap-1 text-center">
                  <h3 className="text-2xl font-bold tracking-tight">
                    {communications && communications.length > 0 ? 'Aucune action sélectionnée' : 'Aucune action'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {communications && communications.length > 0 ? 'Choisissez une action dans la liste de gauche pour la visualiser.' : 'Commencez par ajouter une action.'}
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

export default function CommunicationsPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CommunicationsPageContent />
    </Suspense>
  )
}
