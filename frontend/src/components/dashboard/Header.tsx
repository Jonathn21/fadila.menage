import React from "react";
import { Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import HeaderNotifications from "./HeaderNotifications";
import UserMenu from "./UserMenu";

const Header = () => {
  return (
    <header className="flex justify-between items-center px-4 py-3 border-b border-topbar-border bg-topbar sticky top-0 z-50 shadow-sm h-14 sm:h-16">
      <div className="flex items-center">
        <SidebarTrigger className="mr-3 sm:mr-4">
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </SidebarTrigger>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <HeaderNotifications />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;