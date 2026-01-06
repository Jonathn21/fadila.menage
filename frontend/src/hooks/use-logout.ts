import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/lib/apiClient"; // ton axios instance déjà configurée

export const useLogout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
  try {
    await apiClient.post("/logout/");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("sessionKey");

    toast({ title: "Déconnecté", description: "Vous avez été déconnecté." });
    navigate("/");
  } catch {
    toast({ title: "Erreur", description: "Impossible de se déconnecter.", variant: "destructive" });
  }
};


  return { handleLogout };
};
