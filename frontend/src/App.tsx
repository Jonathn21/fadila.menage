import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LoaderCircle } from "lucide-react";
import ProtectedRoute from "./components/ProtectedRoute";

// Page de connexion chargée immédiatement (premier écran interne)
import Index from "./pages/Index";

// Toutes les autres pages sont chargées à la demande (code splitting)
const NotFound = lazy(() => import("./pages/NotFound"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Verification = lazy(() => import("./pages/Verification"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Security = lazy(() => import("./pages/Security"));
const Settings = lazy(() => import("./pages/Settings"));
const InternshipDetails = lazy(() => import("./pages/internships/InternshipDetails"));
const OngoingInternshipDetails = lazy(() => import("./pages/StudentDetails"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationDetails = lazy(() => import("./pages/NotificationDetails"));
const Users = lazy(() => import("./pages/Users"));
const UserDetails = lazy(() => import("./pages/UserDetails"));
const UserPermissions = lazy(() => import("./pages/UserPermissions"));
const InternshipsPage = lazy(() => import("./pages/internships/InternshipsPage"));
const StudentsPage = lazy(() => import("./pages/StudentsPage"));
const ArchivedInternships = lazy(() => import("./pages/internships/ArchivedInternships"));
const ProcessInternship = lazy(() => import("./pages/ProcessInternship"));
const PublicInternshipApplication = lazy(() => import("./pages/PublicInternshipApplication"));
const TrackApplication = lazy(() => import("./pages/TrackApplication"));

// === Demande d'attestation : désactivée ===
// const DemandesAttestationUnified = lazy(() => import("./pages/Attestations/Demandesattestationunified"));
// const AttestationDetails = lazy(() => import("./pages/Attestations/AttestationDetails"));
// const PublicAttestationRequest = lazy(() => import("./pages/PublicAttestationRequest"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Chargement…</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/connexion" element={<Index />}/>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token"  element={<ResetPassword />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/accueil" element={<Dashboard />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/securite" element={<Security />} />
            <Route path="/parametres" element={<Settings />} />

            <Route path="/demandes" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/toutes" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/en-attente" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/en-traitement" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/en-acceptation" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/acceptees" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />
            <Route path="/demandes/rejetees" element={<ProtectedRoute permission="demandes.view"><InternshipsPage /></ProtectedRoute>} />

            {/* Routes restantes */}
            <Route path="/demandes/archivees" element={<ProtectedRoute permission="demandes.view"><ArchivedInternships /></ProtectedRoute>} />
            <Route path="/demandes/:id" element={<ProtectedRoute permission="demandes.view"><InternshipDetails /></ProtectedRoute>} />

            <Route path="/stages/prochains" element={<ProtectedRoute permission="stages.view"><StudentsPage /></ProtectedRoute>} />
            <Route path="/stages/en-cours" element={<ProtectedRoute permission="stages.view"><StudentsPage /></ProtectedRoute>} />
            <Route path="/stages/termines" element={<ProtectedRoute permission="stages.view"><StudentsPage /></ProtectedRoute>} />
            <Route path="/stages/clotures" element={<ProtectedRoute permission="stages.view"><StudentsPage /></ProtectedRoute>} />
            <Route path="/stagiaires/:id" element={<ProtectedRoute permission="stages.view"><OngoingInternshipDetails /></ProtectedRoute>} />

            {/* === Demande d'attestation : désactivée === */}
            {/* <Route path="/attestations/toutes" element={<DemandesAttestationUnified />} /> */}

            <Route path="/acceptation/:id" element={<ProtectedRoute permission="demandes.accept"><ProcessInternship /></ProtectedRoute>}/>
            <Route path="/statistiques" element={<ProtectedRoute permission="stats.view"><Analytics /></ProtectedRoute>} />
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
            {/* <Route path="/demande-attestation" element={<PublicAttestationRequest />} /> */}

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
