
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import ProfileForm from "@/components/ProfileForm";

const Profile = () => {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <ProfileForm />
      </div>
    </DashboardLayout>
  );
};

export default Profile;
