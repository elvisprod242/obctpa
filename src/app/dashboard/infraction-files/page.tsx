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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc, query, where } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  File as FileIcon,
  Maximize,
  Minimize,
  Video,
  Download,
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
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const fileSchema = z.object({
  file: z.string().min(1, 'Le fichier est requis.'),
  description: z.string().min(1, 'La description est requise.'),
  infraction_id: z.string(),
});

type FileFormValues = z.infer<typeof fileSchema>;
type InfractionFile = FileFormValues & { id: string };

function FileForm({
  file,
  onFinished,
  infractionId,
}: {
  file?: InfractionFile;
  onFinished: () => void;
  infractionId: string;
}) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const filesCollection = useMemoFirebase(() => collection(firestore, 'infractionFiles'), [firestore]);

  const form = useForm<FileFormValues>({
    resolver: zodResolver(fileSchema),
    defaultValues: file || {
      file: '',
      description: '',
      infraction_id: infractionId,
    },
  });
  
  useEffect(() => {
    form.reset(file || {
      file: '',
      description: '',
      infraction_id: infractionId,
    })
  }, [file, infractionId, form])

  const onSubmit = async (data: FileFormValues) => {
    setIsLoading(true);
    try {
      if (file) {
        const docRef = doc(filesCollection, file.id);
        updateDocumentNonBlocking(docRef, data);
        toast({ title: 'Succès', description: 'Fichier mis à jour.' });
      } else {
        addDocumentNonBlocking(filesCollection, data);
        toast({ title: 'Succès', description: 'Fichier ajouté.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving file: ', error);
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
                <Input type="text" placeholder="assets/file/justificatif.pdf" {...field} />
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
                  placeholder="Justificatif de l'infraction..."
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
            {file ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function FileViewer({ file }: { file: InfractionFile }) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const getEmbeddableUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'www.dropbox.com' && urlObj.searchParams.has('dl')) {
                urlObj.searchParams.set('raw', '1');
                urlObj.searchParams.delete('dl');
                return urlObj.toString();
            }
        } catch (e) {
            // Not a valid URL
        }
        return url;
    };
    
    const embedUrl = getEmbeddableUrl(file.file);
    const fileExtension = useMemo(() => {
      try {
        const url = new URL(embedUrl);
        // Remove query parameters to get clean path
        const pathname = url.pathname;
        const extension = pathname.split('.').pop()?.toLowerCase();
        return extension;
      } catch (e) {
        // Fallback for relative paths or invalid URLs
        return embedUrl.split('.').pop()?.toLowerCase();
      }
    }, [embedUrl]);

    const isPdf = fileExtension === 'pdf';
    const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(fileExtension || '');
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');

    const handleFullscreen = () => {
        if (!viewerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            viewerRef.current.requestFullscreen();
        }
    };
    
    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const renderContent = () => {
      if (isPdf) {
          return <embed src={embedUrl} type="application/pdf" width="100%" height="100%" />;
      }
      if (isVideo) {
          return <video src={embedUrl} controls width="100%" height="100%" />;
      }
      if (isImage) {
          return (
            <>
              <Image 
                src={embedUrl} 
                alt={file.description} 
                fill 
                className="object-contain cursor-pointer" 
                onClick={() => setIsImageModalOpen(true)}
                unoptimized
              />
              <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
                  <DialogContent className="max-w-4xl h-auto">
                      <DialogTitle className="sr-only">Image: {file.description}</DialogTitle>
                      <div className="relative aspect-video">
                          <Image
                              src={embedUrl}
                              alt={file.description}
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
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground p-8 text-center">
            <FileIcon className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Aperçu non disponible</h3>
            <p className="mb-4">Le type de fichier n'est pas supporté pour un affichage direct.</p>
            <Button asChild>
                <a href={embedUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger le fichier
                </a>
            </Button>
        </div>
      );
  };


    return (
        <Card className="h-full w-full" ref={viewerRef}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="truncate">{file.description}</CardTitle>
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
                    {renderContent()}
                 </div>
            </CardContent>
        </Card>
    );
}

function FileListItem({
    file,
    isSelected,
    onSelect,
    onDelete,
    onEdit
}: {
    file: InfractionFile,
    isSelected: boolean,
    onSelect: () => void,
    onDelete: () => void,
    onEdit: () => void,
}) {
    const fileType = file.file.split('.').pop()?.toLowerCase();
    const isVideo = ['mp4', 'webm', 'mov'].includes(fileType || '');
    const Icon = isVideo ? Video : FileIcon;

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
                            <Icon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{file.description}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{file.description}</p>
                        <p className="text-xs text-muted-foreground">{file.file}</p>
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


function InfractionFilesPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const infractionId = searchParams.get('infractionId');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<InfractionFile | null>(null);
  const [editingFile, setEditingFile] = useState<InfractionFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<InfractionFile | null>(null);
  const { toast } = useToast();

  const filesQuery = useMemoFirebase(() => {
    if (!infractionId) return null;
    return query(collection(firestore, 'infractionFiles'), where('infraction_id', '==', infractionId));
  }, [firestore, infractionId]);

  const { data: files, isLoading } = useCollection<InfractionFile>(filesQuery);

  useEffect(() => {
    if (!isLoading && files && files.length > 0 && !selectedFile) {
        setSelectedFile(files[0]);
    }
    if (!isLoading && (!files || files.length === 0)) {
        setSelectedFile(null);
    }
  }, [isLoading, files, selectedFile]);


  const handleDelete = () => {
    if (!deletingFile) return;
    const docRef = doc(firestore, 'infractionFiles', deletingFile.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Succès", description: "Fichier supprimé." });
    if (selectedFile?.id === deletingFile.id) {
      setSelectedFile(null);
    }
    setDeletingFile(null);
  };

  const handleEdit = (file: InfractionFile) => {
    setEditingFile(file);
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fichiers de l'infraction</h2>
        {infractionId && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nouveau Fichier
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nouveau Fichier</DialogTitle>
                        <DialogDescription>
                            Ajouter un nouveau fichier pour l'infraction.
                        </DialogDescription>
                    </DialogHeader>
                    <FileForm
                        onFinished={() => setIsCreateDialogOpen(false)}
                        infractionId={infractionId}
                    />
                </DialogContent>
            </Dialog>
        )}
      </div>

      <Dialog open={!!editingFile} onOpenChange={(open) => !open && setEditingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le fichier</DialogTitle>
          </DialogHeader>
          {editingFile && (
            <FileForm
              file={editingFile}
              onFinished={() => setEditingFile(null)}
              infractionId={infractionId!}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingFile} onOpenChange={(open) => !open && setDeletingFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fichier sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingFile(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isLoading && (
        <div className="flex flex-1 justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      
      {!infractionId && !isLoading && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">
                    Aucune infraction sélectionnée
                </h3>
                <p className="text-sm text-muted-foreground">
                    Retournez à la <Link href="/dashboard/infractions" className="text-primary hover:underline">liste des infractions</Link> pour en sélectionner une.
                </p>
            </div>
        </div>
      )}

      {infractionId && !isLoading && (
        <div className="grid md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Liste des Fichiers</CardTitle>
                <CardDescription>Sélectionnez un fichier pour le visualiser.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="flex flex-col gap-1 pr-1">
                    {files?.map((file) => (
                      <FileListItem
                        key={file.id}
                        file={file}
                        isSelected={selectedFile?.id === file.id}
                        onSelect={() => setSelectedFile(file)}
                        onEdit={() => handleEdit(file)}
                        onDelete={() => setDeletingFile(file)}
                      />
                    ))}
                    {files?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun fichier trouvé pour cette infraction.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-2 flex flex-col">
            {selectedFile ? (
                <FileViewer file={selectedFile} />
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
                    <div className="flex flex-col items-center gap-1 text-center">
                    <h3 className="text-2xl font-bold tracking-tight">
                        {files && files.length > 0 ? 'Aucun fichier sélectionné' : 'Aucun fichier'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {files && files.length > 0 ? 'Choisissez un fichier dans la liste de gauche pour le visualiser.' : 'Commencez par ajouter un fichier.'}
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

export default function InfractionFilesPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <InfractionFilesPageContent />
    </Suspense>
  )
}
