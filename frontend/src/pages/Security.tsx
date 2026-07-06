
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import SecuritySettings from "@/components/SecuritySettings";

const Security = () => {
  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-0">
        <div className="relative overflow-hidden rounded-xl border border-border/80 surface-brushed shadow-card px-4 py-4 sm:px-6 sm:py-5 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Paramètres de sécurité</h1>
        </div>
        <SecuritySettings />
      </div>
    </DashboardLayout>
  );
};

export default Security;
