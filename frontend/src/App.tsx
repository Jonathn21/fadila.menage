import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Verification from "./pages/Verification";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Security from "./pages/Security";
import Settings from "./pages/Settings";
import InternshipDetails from "./pages/internships/InternshipDetails";
import OngoingInternshipDetails from "./pages/StudentDetails";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import NotificationDetails from "./pages/NotificationDetails";
import Users from "./pages/Users";
import UserDetails from "./pages/UserDetails";
import UserPermissions from "./pages/UserPermissions";
import ProtectedRoute from "./components/ProtectedRoute";

import InternshipsPage from "./pages/internships/InternshipsPage";
// === Demande d'attestation : désactivée ===
// import DemandesAttestationUnified from "./pages/Attestations/Demandesattestationunified";
// import AttestationDetails from "./pages/Attestations/AttestationDetails";


import StudentsPage from "./pages/StudentsPage";

import ArchivedInternships from "./pages/internships/ArchivedInternships";
import ProcessInternship from "./pages/ProcessInternship";
import PublicInternshipApplication from "./pages/PublicInternshipApplication";
import TrackApplication from "./pages/TrackApplication";
// === Demande d'attestation : désactivée ===
// import PublicAttestationRequest from "./pages/PublicAttestationRequest";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/connexion" element={<Index />}/>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token"  element={<ResetPassword />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/accueil" element={<Dashboard />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/securite" element={<Security />} />
            <Route path="/parametres" element={<Settings />} />
            
            <Route path="/demandes" element={<InternshipsPage />} /> 
            <Route path="/demandes/toutes" element={<InternshipsPage />} /> 
            <Route path="/demandes/en-attente" element={<InternshipsPage />} /> 
            <Route path="/demandes/en-traitement" element={<InternshipsPage />} /> 
            <Route path="/demandes/en-acceptation" element={<InternshipsPage />} /> 
            <Route path="/demandes/acceptees" element={<InternshipsPage />} /> 
            <Route path="/demandes/rejetees" element={<InternshipsPage />} /> 
            
            {/* Routes restantes */}
            <Route path="/demandes/archivees" element={<ArchivedInternships />} />
            <Route path="/demandes/:id" element={<InternshipDetails />} />
            
            <Route path="/stages/prochains" element={<StudentsPage />} /> 
            <Route path="/stages/en-cours" element={<StudentsPage />} /> 
            <Route path="/stages/termines" element={<StudentsPage />} /> 
            <Route path="/stagiaires/:id" element={<OngoingInternshipDetails />} />
            
            {/* === Demande d'attestation : désactivée === */}
            {/* <Route path="/attestations/toutes" element={<DemandesAttestationUnified />} /> */}
            {/* <Route path="/attestations/en-attente" element={<DemandesAttestationUnified />} /> */}
            {/* <Route path="/attestations/approuvees" element={<DemandesAttestationUnified />} /> */}
            {/* <Route path="/attestations/refusees" element={<DemandesAttestationUnified />} /> */}
            {/* <Route path="/attestations/traitees" element={<DemandesAttestationUnified />} /> */}
            {/* <Route path="/attestations/:id" element={<AttestationDetails />} /> */}

            <Route path="/acceptation/:id" element={<ProcessInternship />}/>
            <Route path="/statistiques" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notifications/:id" element={<NotificationDetails />}/>
            <Route
              path="/utilisateurs"
              element={
                <ProtectedRoute permission="users.view">
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/utilisateurs/:userId"
              element={
                <ProtectedRoute permission="users.view">
                  <UserDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/permissions"
              element={
                <ProtectedRoute permission="permissions.manage">
                  <UserPermissions />
                </ProtectedRoute>
              }
            />
            
            {/* Public routes */}
            <Route path="/" element={<PublicInternshipApplication />} />
            <Route path="/suivi-demande" element={<TrackApplication />} />
            {/* === Demande d'attestation : désactivée === */}
            {/* <Route path="/demande-attestation" element={<PublicAttestationRequest />} /> */}
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
