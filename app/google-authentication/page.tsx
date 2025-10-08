"use client";
import React, { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import AdminLayout from "@/app/components/AdminLayout";
import Authorization from "@/app/components/admin/Authorization";

export default function GoogleAuthenticationPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (!user) return null;

  return (
    <AdminLayout
      activeTab="authorization"
      onTabChange={(tab) => {
        if (tab === "authorization") {
          router.push("/google-authentication");
        } else {
          router.push(`/admin?tab=${tab}`);
        }
      }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <Authorization />
        </div>
      </div>
    </AdminLayout>
  );
}
