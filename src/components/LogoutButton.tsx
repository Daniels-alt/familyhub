"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      onClick={handleLogout}
      variant="destructive"
      className="w-full"
      disabled={loading}
    >
      <LogOut className="h-4 w-4 ml-2" />
      {loading ? "מתנתק..." : "התנתק מהחשבון"}
    </Button>
  );
}
