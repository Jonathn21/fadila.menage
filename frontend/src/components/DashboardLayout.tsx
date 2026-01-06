import React from "react";
import { LogOut } from "lucide-react";
import Logo from "./Logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import SidebarNavigation from "./SidebarNavigation";
import Header from "./dashboard/Header";
import { useLogout } from "@/hooks/use-logout";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { handleLogout } = useLogout();
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader>
            <div className="flex items-center p-4">
              <Logo />
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNavigation />
          </SidebarContent>
          <SidebarFooter>
            <div className="p-2">
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full justify-start py-3 text-base"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <SidebarInset className="flex flex-col h-full">
          <Header />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;