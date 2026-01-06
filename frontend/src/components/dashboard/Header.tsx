import React from "react";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import HeaderNotifications from "./HeaderNotifications";
import UserMenu from "./UserMenu";

const Header = () => {
  return (
    <header className="flex justify-between items-center p-4 border-b border-topbar-border bg-topbar sticky top-0 z-10 shadow-sm">
      <div className="flex items-center">
        <SidebarTrigger className="mr-4">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
      </div>
      <div className="flex items-center space-x-2">
        <ThemeToggle />
        <HeaderNotifications />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;