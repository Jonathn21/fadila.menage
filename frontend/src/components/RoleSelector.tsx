import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const RoleSelector = () => {
  const { userRole, setRole, availableRoles } = usePermissions();
  const { toast } = useToast();

  const handleRoleChange = (role: string) => {
    setRole(role);
    toast({
      title: "Rôle changé",
      description: `Vous êtes maintenant un ${role}`,
    });
    // Recharger la page pour appliquer les nouvelles permissions
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="flex items-center gap-2" size="sm">
        <Shield className="h-4 w-4" />
        <span>Rôle actuel: {userRole}</span>
      </Button>
      <Select value={userRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Changer de rôle" />
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map(role => (
            <SelectItem key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default RoleSelector;