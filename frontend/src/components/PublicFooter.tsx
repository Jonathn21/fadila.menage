import { Facebook, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

interface PublicFooterProps {
  className?: string;
}

const PublicFooter = ({ className = "" }: PublicFooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`w-full text-white ${className}`} role="contentinfo">
      {/* Section principale */}
      <div className="w-full bg-[#1a1a1a]">
        <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6">
            
            {/* Informations de l'entreprise */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="text-center md:text-left">
                <span className="text-white font-bold text-lg sm:text-xl md:text-2xl tracking-wide">
                  CEB
                </span>
                <p className="text-gray-400 text-sm mt-1">
                  Communauté Électrique du Bénin
                </p>
              </div>
              
              <div className="text-gray-300 text-center md:text-left">
                <h3 className="font-semibold mb-2 text-white">Direction Générale</h3>
                <address className="not-italic">
                  <p>Rue de la Kozah, B.P. 1368</p>
                  <p>Lomé, TOGO</p>
                </address>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="text-gray-300 text-center md:text-left space-y-3">
              <h3 className="font-semibold text-white mb-3">Contact</h3>
              <p>
                <span className="font-semibold">Téléphone:</span>
                <br />
                <a 
                  href="tel:+22822216132" 
                  className="hover:text-primary transition-colors hover:underline"
                >
                  +228 22 21 61 32
                </a>
                {" / "}
                <a 
                  href="tel:+22822215795" 
                  className="hover:text-primary transition-colors hover:underline"
                >
                  22 21 57 95
                </a>
              </p>
              <p>
                <span className="font-semibold">Fax:</span> +228 22 21 37 64
              </p>
              
            </div>

            {/* Liens rapides et réseaux sociaux */}
            
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="w-full bg-black">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-sm text-gray-300">
            <p>&copy; {currentYear} CEB. Tous droits réservés.</p>
            <p className="mt-1 text-xs text-gray-400">
              Conçu avec passion pour servir notre communauté
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;