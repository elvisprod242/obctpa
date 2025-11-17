
'use client';

import * as React from 'react';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type UserProfile = {
  id: string;
  email: string;
  registrationDate: string;
};

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis.'),
  newPassword: z.string().min(6, 'Le nouveau mot de passe doit comporter au moins 6 caractères.'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Les nouveaux mots de passe ne correspondent pas.',
  path: ['confirmPassword'],
});

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;


export default function ProfilPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isPasswordChangeLoading, setIsPasswordChangeLoading] = React.useState(false);

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  };

  const handlePasswordChange = async (data: PasswordChangeFormValues) => {
    if (!user || !user.email) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non trouvé.' });
      return;
    }
    setIsPasswordChangeLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      
      toast({ title: 'Succès', description: 'Votre mot de passe a été modifié.' });
      passwordForm.reset();
    } catch (error: any) {
      let errorMessage = "Une erreur est survenue.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Le mot de passe actuel est incorrect.';
        passwordForm.setError('currentPassword', { type: 'manual', message: errorMessage });
      } else {
        errorMessage = "Impossible de mettre à jour le mot de passe. Veuillez réessayer.";
      }
      toast({ variant: 'destructive', title: 'Erreur', description: errorMessage });
    } finally {
      setIsPasswordChangeLoading(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div className="flex flex-col h-full gap-6">
       <h2 className="text-3xl font-bold tracking-tight">Mon Profil</h2>
      <div className="flex justify-center items-start pt-8">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            {isLoading ? (
                <Skeleton className="w-24 h-24 rounded-full mx-auto" />
            ) : (
                <Avatar className="w-24 h-24 mx-auto">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} alt={user?.email || 'User'} />
                    <AvatarFallback className="text-3xl">{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
            )}
            <CardTitle className="mt-4 text-2xl">
              {isLoading ? <Skeleton className="h-8 w-48 mx-auto" /> : user?.email}
            </CardTitle>
            {isLoading ? (
              <div className="h-5"> {/* Wrapper to avoid p > div */}
                <Skeleton className="h-4 w-64 mx-auto mt-1" />
              </div>
            ) : (
              <CardDescription>
                {`Membre depuis le ${formatDate(userProfile?.registrationDate)}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                 <CardHeader className="p-0 mb-4">
                    <CardTitle className="text-xl">Changer le mot de passe</CardTitle>
                 </CardHeader>
                 <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe actuel</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="submit" disabled={isPasswordChangeLoading} className="w-full">
                  {isPasswordChangeLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Changer le mot de passe
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
