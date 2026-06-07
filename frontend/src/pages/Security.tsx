
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import SecuritySettings from "@/components/SecuritySettings";

const Security = () => {
  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Paramètres de sécurité</h1>
        <SecuritySettings />
      </div>
    </DashboardLayout>
  );
};

export default Security;
