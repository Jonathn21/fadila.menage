import { LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/use-logout";
import { useNavigate } from "react-router-dom";

const UserMenu = () => {
  const navigate = useNavigate();
  const { handleLogout } = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="rounded-full h-10 w-10 md:h-12 md:w-12 bg-gray-100"
          aria-label="Menu utilisateur"
        >
          <UserCircle className="h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 sm:w-56 md:w-64"
        sideOffset={10}
      >
        <DropdownMenuLabel className="text-sm md:text-base">
          Mon compte
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => navigate("/profile")}
          className="text-sm md:text-base cursor-pointer py-2 md:py-3"
        >
          <UserCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-sm md:text-base cursor-pointer py-2 md:py-3 text-red-600 focus:text-red-700 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;