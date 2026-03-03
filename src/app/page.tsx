'use client';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { safeRedirect } from "@/lib/security/redirect-validator";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await createClient().auth.getSession();
      if (session) {
        router.push(safeRedirect('/dashboard'));
      } else {
        router.push(safeRedirect('/auth'));
      }
    };
    checkSession();
  }, [router]);

  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
};