
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotificationsSettings from "@/components/NotificationsSettings";
import AppearanceSettings from "@/components/AppearanceSettings";
import NotificationRecipientsSettings from "@/components/NotificationRecipientsSettings";
import { usePermissions } from "@/hooks/usePermissions";

const Settings = () => {
  const { userRole } = usePermissions();
  const isSuperUser = userRole === "Superutilisateur";

  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Paramètres</h1>

        <Tabs defaultValue="notifications">
          {isSuperUser && (
            <TabsList className="mb-4">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="recipients">Destinataires des demandes</TabsTrigger>
            </TabsList>
          )}
          <TabsContent value="notifications">
            <NotificationsSettings />
          </TabsContent>
          {isSuperUser && (
            <TabsContent value="recipients">
              <NotificationRecipientsSettings />
            </TabsContent>
          )}
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
