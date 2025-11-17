'use client';

import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, doc } from 'firebase/firestore';
import {
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const infractionSchema = z.object({
  date: z.string().min(1, 'La date est requise.'),
  rapports_id: z.string().optional(),
  conducteur_id: z.string().optional(),
  invariant_id: z.string().optional(),
  type_infraction: z.string().min(1, "Le type d'infraction est requis."),
  nombre: z.coerce.number().min(0),
  mesure_disciplinaire: z.string().optional(),
  autres_mesures_disciplinaire: z.string().optional(),
  suivi: z.boolean().default(false),
  amelioration: z.boolean().default(false),
  date_suivi: z.string().optional(),
});

export type InfractionFormValues = z.infer<typeof infractionSchema>;

type Partenaire = { id: string; nom: string; actif: boolean };
type Rapport = {
  id: string;
  date: string;
  conducteur_id?: string;
  conducteurNomComplet?: string;
};
type Conducteur = { id: string; nom: string; prenom: string };
type Invariant = { id: string; titre: string };
type Infraction = InfractionFormValues & { id: string };

type InfractionFormProps = {
  infraction?: Infraction;
  onFinished: () => void;
  partenaires: Partenaire[] | null;
  rapports: Rapport[] | null;
  conducteurs: Conducteur[] | null;
  invariants: Invariant[] | null;
  initialValues?: Partial<InfractionFormValues>;
};

export function InfractionForm({
  infraction,
  onFinished,
  partenaires,
  rapports,
  conducteurs,
  invariants,
  initialValues,
}: InfractionFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const infractionsCollection = useMemoFirebase(
    () => collection(firestore, 'infractions'),
    [firestore]
  );

  const activePartner = useMemo(() => partenaires?.find((p) => p.actif), [
    partenaires,
  ]);

  const form = useForm<InfractionFormValues>({
    resolver: zodResolver(infractionSchema),
    defaultValues: {
      date: initialValues?.date || infraction?.date || new Date().toISOString().split('T')[0],
      rapports_id: initialValues?.rapports_id || infraction?.rapports_id || '',
      conducteur_id: initialValues?.conducteur_id || infraction?.conducteur_id || '',
      invariant_id: initialValues?.invariant_id || infraction?.invariant_id || '',
      type_infraction: infraction?.type_infraction || '',
      nombre: infraction?.nombre ?? 1,
      mesure_disciplinaire: infraction?.mesure_disciplinaire || '',
      autres_mesures_disciplinaire: infraction?.autres_mesures_disciplinaire || '',
      suivi: infraction?.suivi || false,
      amelioration: infraction?.amelioration || false,
      date_suivi: infraction?.date_suivi || '',
    },
  });

  useEffect(() => {
    const defaultValues = {
        date: new Date().toISOString().split('T')[0],
        rapports_id: '',
        conducteur_id: '',
        invariant_id: '',
        type_infraction: '',
        nombre: 1,
        mesure_disciplinaire: '',
        autres_mesures_disciplinaire: '',
        suivi: false,
        amelioration: false,
        date_suivi: '',
    };
  
    if (infraction) {
        form.reset({ ...defaultValues, ...infraction });
    } else if (initialValues) {
        form.reset({ ...defaultValues, ...initialValues });
    }
  }, [initialValues, infraction, form]);


  const onSubmit = async (data: InfractionFormValues) => {
    if (!activePartner) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Aucun partenaire actif sélectionné.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const dataToSave: any = { ...data, partenaire_id: activePartner.id };

      Object.keys(dataToSave).forEach((key) => {
        const typedKey = key as keyof typeof dataToSave;
        if (dataToSave[typedKey] === 'none') {
          dataToSave[typedKey] = '';
        }
      });

      if (infraction) {
        const docRef = doc(infractionsCollection, infraction.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({ title: 'Succès', description: 'Infraction mise à jour.' });
      } else {
        addDocumentNonBlocking(infractionsCollection, dataToSave);
        toast({ title: 'Succès', description: 'Infraction ajoutée.' });
      }
      onFinished();
    } catch (error) {
      console.error('Error saving infraction: ', error);
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
        <ScrollArea className="h-[60vh] pr-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de l'infraction</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rapports_id"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormLabel>Rapport</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedReport = rapports?.find(r => r.id === value);
                      if (selectedReport?.conducteur_id) {
                        form.setValue('conducteur_id', selectedReport.conducteur_id);
                      }
                    }}
                    value={field.value}
                    disabled={!!initialValues?.rapports_id}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rapport" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       <SelectItem value="none">Aucun</SelectItem>
                      {rapports?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          Rapport du {formatDate(r.date)} ({r.conducteurNomComplet})
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
                name="conducteur_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conducteur</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un conducteur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {conducteurs?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.prenom} {c.nom}
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
                name="invariant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invariant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un invariant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="type_infraction"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Type d'infraction</FormLabel>
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
                name="nombre"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="mesure_disciplinaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mesure disciplinaire</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Avertissement écrit..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="autres_mesures_disciplinaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autres mesures</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Formation complémentaire..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <FormField
                control={form.control}
                name="suivi"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Suivi nécessaire ?</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amelioration"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <FormLabel>Amélioration constatée ?</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_suivi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de suivi</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !activePartner}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {infraction ? 'Sauvegarder' : 'Créer'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
