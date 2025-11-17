'use client';

import * as React from 'react';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

type Partenaire = {
  id: string;
  nom: string;
  actif: boolean;
};

export function PartnerSwitcher() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const partenairesQuery = useMemoFirebase(
    () => collection(firestore, 'partenaires'),
    [firestore]
  );
  const { data: partenaires, isLoading } =
    useCollection<Partenaire>(partenairesQuery);

  const activePartner = partenaires?.find((p) => p.actif);

  const handleSelectPartner = async (partenaireId: string | null) => {
    if (!partenaires) return;
    
    setIsSwitching(true);
    const batch = writeBatch(firestore);

    // Deactivate the currently active partner if there is one
    if (activePartner) {
      const activePartnerRef = doc(firestore, 'partenaires', activePartner.id);
      batch.update(activePartnerRef, { actif: false });
    }

    // If a new partner is selected (not "All Partners"), activate it
    if (partenaireId) {
       const selectedPartner = partenaires.find((p) => p.id === partenaireId);
       if (selectedPartner) {
         const newActivePartnerRef = doc(firestore, 'partenaires', partenaireId);
         batch.update(newActivePartnerRef, { actif: true });
         toast({
            title: 'Partenaire activé',
            description: `${selectedPartner.nom} est maintenant le partenaire actif.`,
          });
       }
    } else {
        // "All Partners" was selected
        toast({
            title: 'Vue globale activée',
            description: `Aucun partenaire spécifique n'est actif.`,
          });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error('Error switching partner:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de changer de partenaire.",
      });
    } finally {
      setIsSwitching(false);
      setOpen(false);
    }
  };

  const sortedPartners = partenaires
    ? [...partenaires].sort((a, b) => a.nom.localeCompare(b.nom))
    : [];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Sélectionner un partenaire"
          className="justify-between"
          disabled={isLoading || isSwitching}
        >
          {isLoading || isSwitching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : activePartner ? (
            activePartner.nom
          ) : (
            'Tous les partenaires'
          )}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="end">
        <DropdownMenuLabel>Changer de partenaire</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => handleSelectPartner(null)}
            disabled={isSwitching}
            className="text-sm"
          >
            Tous les partenaires
            <CheckIcon
              className={cn(
                'ml-auto h-4 w-4',
                !activePartner ? 'opacity-100' : 'opacity-0'
              )}
            />
          </DropdownMenuItem>
          {sortedPartners.length === 0 && !isLoading && (
              <DropdownMenuItem disabled>Aucun partenaire trouvé.</DropdownMenuItem>
          )}
          {isLoading && (
              <DropdownMenuItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </DropdownMenuItem>
          )}
          {sortedPartners.map((partenaire) => (
            <DropdownMenuItem
              key={partenaire.id}
              onClick={() => handleSelectPartner(partenaire.id)}
              disabled={isSwitching}
              className="text-sm"
            >
              {partenaire.nom}
              <CheckIcon
                className={cn(
                  'ml-auto h-4 w-4',
                  activePartner?.id === partenaire.id
                    ? 'opacity-100'
                    : 'opacity-0'
                )}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
