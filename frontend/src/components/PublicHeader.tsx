import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { label: "Soumettre une demande", path: "/" },
    { label: "Suivre ma demande", path: "/suivi-demande" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="w-full">
      {/* Banner - Desktop only - Doit occuper toute la largeur */}
      <div className="hidden md:block w-full bg-[#ffffff]">
        <div className="w-full"> {/* Supprimé le container ici */}
          <img
            src="/images/Baniere-ceb.png"
            alt="CEB Banner"
            className="w-full h-auto object-cover" /* h-auto au lieu de h-full */
          />
        </div>
      </div>

      {/* Mobile Header with Logo */}
      <div className="md:hidden w-full bg-white shadow-sm">
        <div className="container mx-auto px-4 h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <img
            src="/images/ceb-logo.png"
            alt="CEB Logo"
            className="h-10 w-10 object-contain"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5 text-black" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation - Desktop */}
      <nav className="hidden md:block w-full bg-white border-b shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-20">
            <div className="flex items-center justify-center space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-base font-semibold  transition-colors hover:text-primary ${
                    isActive(item.path)
                      ? "text-primary border-primary"
                      : "text-black"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden w-full bg-white shadow-sm"> {/* w-full ajouté */}
          <div className="container mx-auto px-4 py-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 text-center text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? "border-primary text-primary"
                    : "text-black hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;