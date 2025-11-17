'use client';

import {
  deleteDocumentNonBlocking,
  useCollection,
  useFirestore,
  useMemoFirebase,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, doc } from 'firebase/firestore';
import {
  Loader2,
  PlusCircle,
  Trash2,
  Edit,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  Paperclip,
  Printer,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
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
import { InfractionForm, InfractionFormValues } from '@/components/infraction-form';
import { useYearFilter } from '@/context/year-filter-context';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = { id: string; date: string; conducteur_id?: string, conducteurNomComplet?: string };
type Conducteur = { id: string; nom: string; prenom: string };
type Invariant = { id: string; titre: string };

type Infraction = InfractionFormValues & { 
    id: string;
    partenaire_id: string;
    conducteurNomComplet?: string;
    invariantTitre?: string;
};

function InfractionDetailsModal({ infraction, open, onOpenChange }: { infraction: Infraction, open: boolean, onOpenChange: (open: boolean) => void }) {
  if (!infraction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Détails de l'infraction</DialogTitle>
          <DialogDescription>
            Infraction du {formatDate(infraction.date)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Conducteur:</span>
            <span className="col-span-3">{infraction.conducteurNomComplet || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Invariant:</span>
            <span className="col-span-3">{infraction.invariantTitre || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Type:</span>
            <span className="col-span-3">
              <Badge variant={infraction.type_infraction === 'Alarme' ? 'destructive' : 'secondary'}>
                {infraction.type_infraction}
              </Badge>
            </span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Nombre:</span>
            <span className="col-span-3">{infraction.nombre}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Mesure:</span>
            <span className="col-span-3">{infraction.mesure_disciplinaire || '-'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Autres:</span>
            <span className="col-span-3">{infraction.autres_mesures_disciplinaire || '-'}</span>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Suivi:</span>
            <span className="col-span-3">{infraction.suivi ? 'Oui' : 'Non'}</span>
          </div>
          {infraction.suivi && (
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right font-semibold">Date Suivi:</span>
              <span className="col-span-3">{formatDate(infraction.date_suivi) || '-'}</span>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <span className="text-right font-semibold">Amélioration:</span>
            <span className="col-span-3">{infraction.amelioration ? 'Oui' : 'Non'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function InfractionActions({ 
    infraction,
    partenaires,
    rapports,
    conducteurs,
    invariants
}: { 
    infraction: Infraction,
    partenaires: Partenaire[] | null;
    rapports: Rapport[] | null;
    conducteurs: Conducteur[] | null;
    invariants: Invariant[] | null;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDelete = () => {
    const docRef = doc(firestore, 'infractions', infraction.id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: 'Succès', description: 'Infraction supprimée.' });
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Modifier l'infraction</DialogTitle>
          </DialogHeader>
          <InfractionForm
            infraction={infraction}
            onFinished={() => setIsEditDialogOpen(false)}
            partenaires={partenaires}
            rapports={rapports}
            conducteurs={conducteurs}
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
              Cette action est irréversible. L'infraction sera définitivement
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
                        asChild
                    >
                      <Link href={{ pathname: '/dashboard/infraction-files', query: { infractionId: infraction.id } }}>
                        <Paperclip className="h-4 w-4" />
                      </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Voir les fichiers</p>
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

function InfractionCard({ 
    infraction,
    partenaires,
    rapports,
    conducteurs,
    invariants
 }: { 
    infraction: Infraction,
    partenaires: Partenaire[] | null,
    rapports: Rapport[] | null,
    conducteurs: Conducteur[] | null,
    invariants: Invariant[] | null 
}) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <>
    <InfractionDetailsModal infraction={infraction} open={isDetailsOpen} onOpenChange={setIsDetailsOpen} />
    <Card className="rounded-xl flex flex-col cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsDetailsOpen(true)}>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <CardTitle className="text-xl font-bold truncate">{infraction.type_infraction}</CardTitle>
            <p className="text-sm text-muted-foreground">{formatDate(infraction.date)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground flex-grow">
        <p><strong>Conducteur:</strong> {infraction.conducteurNomComplet}</p>
        <p><strong>Invariant:</strong> {infraction.invariantTitre}</p>
        <div className="flex items-center gap-2">
            <strong>Suivi:</strong>
            <Badge variant={infraction.suivi ? 'default' : 'secondary'}>
                {infraction.suivi ? 'Oui' : 'Non'}
            </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0" onClick={(e) => e.stopPropagation()}>
        <InfractionActions
            infraction={infraction}
            partenaires={partenaires}
            rapports={rapports}
            conducteurs={conducteurs}
            invariants={invariants}
        />
      </CardFooter>
    </Card>
    </>
  );
}

export default function InfractionsPage() {
  const firestore = useFirestore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { selectedYear } = useYearFilter();

  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);

  const infractionsQuery = useMemoFirebase(() => collection(firestore, 'infractions'), [firestore]);
  const { data: infractions, isLoading: isLoadingInfractions } = useCollection<Infraction>(infractionsQuery);

  const partenairesQuery = useMemoFirebase(() => collection(firestore, 'partenaires'),[firestore]);
  const { data: partenaires, isLoading: isLoadingPartenaires } = useCollection<Partenaire>(partenairesQuery);

  const rapportsQuery = useMemoFirebase(() => collection(firestore, 'rapports'), [firestore]);
  const { data: rapports, isLoading: isLoadingRapports } = useCollection<Rapport>(rapportsQuery);
  
  const conducteursQuery = useMemoFirebase(() => collection(firestore, 'conducteurs'), [firestore]);
  const { data: conducteurs, isLoading: isLoadingConducteurs } = useCollection<Conducteur>(conducteursQuery);

  const invariantsQuery = useMemoFirebase(() => collection(firestore, 'invariants'), [firestore]);
  const { data: invariants, isLoading: isLoadingInvariants } = useCollection<Invariant>(invariantsQuery);

  const isLoading = isLoadingInfractions || isLoadingPartenaires || isLoadingRapports || isLoadingConducteurs || isLoadingInvariants;
  
  useEffect(() => {
    const active = partenaires?.find((p) => p.actif);
    setActivePartnerId(active ? active.id : null);
  }, [partenaires]);

  const enrichedRapports = useMemo(() => {
    if (!rapports || !conducteurs) return null;
    const driverMap = new Map(conducteurs.map((c) => [c.id, `${c.prenom} ${c.nom}`]));
    return rapports.map(r => ({
      ...r,
      conducteurNomComplet: driverMap.get(r.conducteur_id || '') || 'N/A'
    }));
  }, [rapports, conducteurs]);

  const filteredInfractions = useMemo(() => {
    if (!infractions || !conducteurs || !invariants) return [];

    const driverMap = new Map(conducteurs.map((c) => [c.id, `${c.prenom} ${c.nom}`]));
    const invariantMap = new Map(invariants.map((i) => [i.id, i.titre]));

    return infractions
      .filter(inf => {
        if (activePartnerId && inf.partenaire_id !== activePartnerId) return false;
        if (selectedYear === 'all') return true;

        const dateStr = String(inf.date);
        if (!dateStr) return false;
        
        try {
            let dateObj;
            if (dateStr.includes('/') || dateStr.includes('-')) {
                // Handles 'dd/MM/yyyy' and 'yyyy-MM-dd' by parsing them correctly
                const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
                const year = parts[2].length === 4 ? parts[2] : (parts[0].length === 4 ? parts[0] : null);
                if (!year) return dateStr.includes(selectedYear); // Fallback for ambiguous formats
                
                dateObj = dateStr.includes('/') 
                  ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
                  : new Date(dateStr);
            } else {
                dateObj = new Date(dateStr);
            }
            
            if (isNaN(dateObj.getTime())) {
                return dateStr.includes(selectedYear);
            }
            
            return dateObj.getFullYear().toString() === selectedYear;
        } catch {
            return dateStr.includes(selectedYear);
        }
      })
      .map(inf => ({
        ...inf,
        conducteurNomComplet: driverMap.get(inf.conducteur_id || '') || 'N/A',
        invariantTitre: invariantMap.get(inf.invariant_id || '') || 'N/A',
      }))
      .filter(inf =>
        inf.type_infraction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inf.conducteurNomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inf.invariantTitre.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [infractions, conducteurs, invariants, activePartnerId, selectedYear, searchTerm]);
  
  const lastItemIndex = currentPage * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentInfractions = filteredInfractions?.slice(firstItemIndex, lastItemIndex);

  const totalPages = filteredInfractions
    ? Math.ceil(filteredInfractions.length / itemsPerPage)
    : 0;

  const activePartner = useMemo(() => partenaires?.find(p => p.actif), [partenaires]);

  const handlePrint = () => {
    window.print();
  }

  return (
    <div className="flex flex-col h-full">
      <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-area-infractions, #printable-area-infractions * {
                visibility: visible;
              }
              #printable-area-infractions {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .no-print {
                  display: none;
              }
            }
          `}
      </style>
      <div className="flex items-center justify-between space-y-2 mb-4 no-print">
        <h2 className="text-3xl font-bold tracking-tight">Infractions</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={handlePrint} variant="outline" disabled={!activePartner || !filteredInfractions || filteredInfractions.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!activePartner}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nouvelle Infraction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Nouvelle Infraction</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle infraction.
                </DialogDescription>
              </DialogHeader>
              <InfractionForm
                onFinished={() => setIsCreateDialogOpen(false)}
                partenaires={partenaires}
                rapports={enrichedRapports}
                conducteurs={conducteurs}
                invariants={invariants}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    <div id="printable-area-infractions">
      <Card className="mb-4 no-print">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-auto sm:flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par type, conducteur, invariant..."
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
      ) : !filteredInfractions || filteredInfractions.length === 0 ? (
        <div className="text-center p-8 border rounded-lg flex-1 flex flex-col justify-center items-center">
          <h3 className="text-xl font-semibold">Aucune infraction trouvée</h3>
          <p className="text-muted-foreground mt-2 mb-4 max-w-sm">
            {searchTerm
              ? `Aucune infraction ne correspond à votre recherche "${searchTerm}".`
              : 'Aucune infraction enregistrée pour le moment.'}
          </p>
          <Button className="no-print" onClick={() => setIsCreateDialogOpen(true)} disabled={!activePartner}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouvelle Infraction
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInfractions.map((infraction) => (
            <InfractionCard
              key={infraction.id}
              infraction={infraction}
              partenaires={partenaires}
              rapports={enrichedRapports}
              conducteurs={conducteurs}
              invariants={invariants}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Conducteur</TableHead>
                <TableHead>Type d'infraction</TableHead>
                <TableHead>Invariant</TableHead>
                <TableHead>Suivi</TableHead>
                <TableHead className="text-right no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentInfractions?.map((infraction) => (
                <TableRow key={infraction.id}>
                  <TableCell>{formatDate(infraction.date)}</TableCell>
                  <TableCell>{infraction.conducteurNomComplet}</TableCell>
                  <TableCell className="font-medium">{infraction.type_infraction}</TableCell>
                  <TableCell>{infraction.invariantTitre}</TableCell>
                  <TableCell>
                    <Badge variant={infraction.suivi ? 'default' : 'secondary'}>
                      {infraction.suivi ? 'Oui' : 'Non'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right no-print">
                    <InfractionActions 
                        infraction={infraction}
                        partenaires={partenaires}
                        rapports={enrichedRapports}
                        conducteurs={conducteurs}
                        invariants={invariants}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-end space-x-4 py-4 pr-4 no-print">
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
    </div>
  );
}
