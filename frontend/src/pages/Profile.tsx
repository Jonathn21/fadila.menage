
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProfileForm from "@/components/ProfileForm";

const Profile = () => {
  return (
    <DashboardLayout>
      <div className="w-full max-w-2xl mx-auto px-1 sm:px-0">
        <ProfileForm />
      </div>
    </DashboardLayout>
  );
};

export default Profile;
