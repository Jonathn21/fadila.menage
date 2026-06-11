import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient"; // ton axios instance déjà configurée

export const useLogout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
  try {
    await apiClient.post("/logout/");
    sessionStorage.removeItem("access");
    sessionStorage.removeItem("refresh");
    sessionStorage.removeItem("sessionKey");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("userRole");

    toast({ title: "Déconnecté", description: "Vous avez été déconnecté." });
    navigate("/connexion");
  } catch {
    toast({ title: "Erreur", description: "Impossible de se déconnecter.", variant: "destructive" });
  }
};


  return { handleLogout };
};
