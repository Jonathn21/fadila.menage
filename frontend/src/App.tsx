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
import Calendar from "./pages/Calendar";
import InternshipDetails from "./pages/InternshipDetails";
import OngoingInternshipDetails from "./pages/OngoingInternshipDetails";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import NotificationDetails from "./pages/NotificationDetails";
import Users from "./pages/Users";
import UserDetails from "./pages/UserDetails";
import UserPermissions from "./pages/UserPermissions";
import PendingInternships from "./pages/internships/PendingInternships";
import RejectedInternships from "./pages/internships/RejectedInternships";
import AcceptedInternships from "./pages/internships/AcceptedInternships";
import ProcessingInternships from "./pages/internships/ProcessingInternships";
import InAcceptedInternships from "./pages/internships/InAcceptedInternships";

import ArchivedInternships from "./pages/internships/ArchivedInternships";
import AllInternships from "./pages/internships/AllInternships";
import NextStudents from "./pages/students/NextStudents";
import OngoingStudents from "./pages/students/OngoingStudents";
import CompletedStudents from "./pages/students/CompletedStudents";
import ProcessInternship from "./pages/ProcessInternship";
import PublicInternshipApplication from "./pages/PublicInternshipApplication";
import TrackApplication from "./pages/TrackApplication";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />}/>
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:uid/:token"  element={<ResetPassword />} />
            <Route path="/verification" element={<Verification />} />
            <Route path="/accueil" element={<Dashboard />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/securite" element={<Security />} />
            <Route path="/parametres" element={<Settings />} />
            <Route path="/demandes/en-attente" element={<PendingInternships />} />
            <Route path="/demandes/rejetees" element={<RejectedInternships />} />
            <Route path="/demandes/acceptees" element={<AcceptedInternships />} />
            <Route path="/demandes/archivees" element={<ArchivedInternships />} />
            <Route path="/demandes/en-traitement" element={<ProcessingInternships />} />
            <Route path="/demandes/en-acceptation" element={<InAcceptedInternships />} />
            <Route path="/demandes/toutes" element={<AllInternships />} />
            <Route path="/demandes/:id" element={<InternshipDetails />} />
            <Route path="/stages/prochains" element={<NextStudents />} />
            <Route path="/stages/en-cours" element={<OngoingStudents />} />
            <Route path="/stages/termines" element={<CompletedStudents />} />
            <Route path="/stagiaires/:id" element={<OngoingInternshipDetails />} />
            <Route path="/acceptation/:id" element={<ProcessInternship />}/>
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/statistiques" element={<Analytics />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/notifications/:id" element={<NotificationDetails />}/>
            <Route path="/utilisateurs" element={<Users />} />
            <Route path="/utilisateurs/:userId" element={<UserDetails />} />
            {/* User permissions page: On la bouge en dehors de "Users" */}
            <Route path="/permissions" element={<UserPermissions />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            <Route path="/soumettre-demande" element={<PublicInternshipApplication />} />
            <Route path="/suivi-demande" element={<TrackApplication />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
