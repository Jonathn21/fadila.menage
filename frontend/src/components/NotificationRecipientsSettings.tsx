import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Plus, Trash2, Loader2, Inbox } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface NotificationEmail {
  id: number;
  email: string;
  actif: boolean;
  date_ajout: string | null;
  ajoute_par: string | null;
}

const NotificationRecipientsSettings: React.FC = () => {
  const [emails, setEmails] = useState<NotificationEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<NotificationEmail | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const { data } = await apiClient.get<NotificationEmail[]>("/notification-emails/");
        setEmails(data);
      } catch (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les emails de notification.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchEmails();
  }, [toast]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    try {
      const { data } = await apiClient.post<NotificationEmail>("/notification-emails/", { email });
      setEmails((prev) => [...prev, data].sort((a, b) => a.email.localeCompare(b.email)));
      setNewEmail("");
      toast({ title: "Email ajouté", description: `${email} recevra les notifications.` });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.response?.data?.detail || "Impossible d'ajouter cet email.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: NotificationEmail) => {
    const newValue = !item.actif;
    setTogglingId(item.id);
    setEmails((prev) => prev.map((e) => (e.id === item.id ? { ...e, actif: newValue } : e)));
    try {
      await apiClient.patch(`/notification-emails/${item.id}/`, { actif: newValue });
    } catch (error) {
      setEmails((prev) => prev.map((e) => (e.id === item.id ? { ...e, actif: item.actif } : e)));
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour cet email.",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/notification-emails/${toDelete.id}/`);
      setEmails((prev) => prev.filter((e) => e.id !== toDelete.id));
      toast({ title: "Email supprimé", description: `${toDelete.email} ne recevra plus les notifications.` });
      setToDelete(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer cet email.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm sm:text-base text-gray-900">
              Destinataires des nouvelles demandes
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-gray-600">
              Ces adresses reçoivent un email à chaque nouvelle demande de stage.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="adresse@exemple.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={adding}
            className="flex-1"
          />
          <Button type="submit" disabled={adding || !newEmail.trim()} className="gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ajouter
          </Button>
        </form>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
            <Inbox className="h-8 w-8 mb-2 text-gray-400" />
            <p className="text-sm">Aucune adresse configurée.</p>
            <p className="text-xs">
              Tant qu'aucune adresse n'est ajoutée, les administrateurs reçoivent les notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {emails.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors gap-3"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{item.email}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {item.actif ? "Reçoit les notifications" : "Désactivé"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {togglingId === item.id ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                  ) : (
                    <Switch
                      checked={item.actif}
                      onCheckedChange={() => handleToggle(item)}
                      className="scale-90 sm:scale-100 data-[state=checked]:bg-primary"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => setToDelete(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette adresse ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} ne recevra plus les notifications des nouvelles demandes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default NotificationRecipientsSettings;
