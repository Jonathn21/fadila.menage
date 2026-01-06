
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import SecuritySettings from "@/components/SecuritySettings";

const Security = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Paramètres de sécurité</h1>
        <SecuritySettings />
      </div>
    </DashboardLayout>
  );
};

export default Security;
