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
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            
            {/* Informations de l'entreprise */}
            <div className="space-y-6">
              <div className="text-center md:text-left">
                <span className="text-white font-bold text-2xl tracking-wide">
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
              <p>
                <a 
                  href="mailto:dg@cebnet.org" 
                  className="hover:text-primary transition-colors hover:underline"
                >
                  dg@cebnet.org
                </a>
              </p>
            </div>

            {/* Liens rapides et réseaux sociaux */}
            <div className="text-center md:text-right">
              <div className="flex flex-col md:items-end gap-6">
                
                {/* Liens rapides */}
                <nav aria-label="Liens rapides">
                  <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
                    <Link 
                      to="/carrieres" 
                      className="hover:text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
                    >
                      Carrières
                    </Link>
                    <span className="text-gray-500" aria-hidden="true">|</span>
                    <Link 
                      to="/contact" 
                      className="hover:text-primary transition-colors px-2 py-1 rounded hover:bg-white/5"
                    >
                      Contactez-nous
                    </Link>
                  </div>
                </nav>

                {/* Réseaux sociaux */}
                <div className="flex gap-3 justify-center md:justify-end">
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1877f2] to-[#0c63d4] flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/50 transition-all transform"
                    aria-label="Visitez notre page Facebook"
                  >
                    <Facebook className="w-5 h-5" fill="currentColor" />
                  </a>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-black to-gray-800 flex items-center justify-center hover:shadow-lg hover:shadow-gray-500/50 transition-all transform"
                    aria-label="Suivez-nous sur X (anciennement Twitter)"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0077b5] to-[#005582] flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/50 transition-all transform"
                    aria-label="Connectez avec nous sur LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" fill="currentColor" />
                  </a>
                </div>
              </div>
            </div>
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