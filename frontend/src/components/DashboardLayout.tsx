import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import SidebarNavigation from "./SidebarNavigation";
import Header from "./dashboard/Header";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-green-800">
          <SidebarContent>
            <SidebarNavigation />
          </SidebarContent>
        </Sidebar>
        
        <SidebarInset className="flex flex-col h-full">
          <Header />
          
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto overflow-x-hidden">
            <div className="h-full w-full max-w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;