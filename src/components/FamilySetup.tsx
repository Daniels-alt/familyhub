"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Users } from "lucide-react";

type Mode = "create" | "join";

export default function FamilySetup({ userId }: { userId: string }) {
  const [mode, setMode] = useState<Mode>("create");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = createClient();

    startTransition(async () => {
      if (mode === "create") {
        const newFamilyId = crypto.randomUUID();
        const { error: rpcError } = await supabase.rpc("create_and_join_family", {
          p_family_id: newFamilyId,
          p_family_name: familyName.trim(),
          p_user_id: userId,
        });

        if (rpcError) {
          setError(`שגיאה ביצירת המשפחה: ${rpcError.message}`);
          return;
        }
      } else {
        const { error: rpcError } = await supabase.rpc("join_family_by_code", {
          p_invite_code: inviteCode.trim(),
          p_user_id: userId,
        });

        if (rpcError) {
          setError(
            rpcError.message.includes("Family not found")
              ? "קוד ההזמנה לא נמצא. בדוק את הקוד ונסה שנית."
              : `שגיאה: ${rpcError.message}`
          );
          return;
        }
      }

      // Full reload ensures server components re-fetch fresh profile data
      window.location.href = "/dashboard";
    });
  }

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4 text-blue-600" />
          הגדרת משפחה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className={`flex items-center justify-center gap-1.5 p-2.5 rounded-md border text-sm font-medium transition-colors ${
                mode === "create"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              צור משפחה
            </button>
            <button
              type="button"
              onClick={() => setMode("join")}
              className={`flex items-center justify-center gap-1.5 p-2.5 rounded-md border text-sm font-medium transition-colors ${
                mode === "join"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              הצטרף
            </button>
          </div>

          {mode === "create" ? (
            <div className="space-y-1">
              <Label htmlFor="familyNameSetup">שם המשפחה</Label>
              <Input
                id="familyNameSetup"
                placeholder="משפחת שויילי"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="inviteCodeSetup">קוד הזמנה</Label>
              <Input
                id="inviteCodeSetup"
                placeholder="הכנס קוד הזמנה"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                dir="ltr"
                className="text-center tracking-widest font-mono"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-2.5 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending
              ? "שומר..."
              : mode === "create"
              ? "צור משפחה"
              : "הצטרף למשפחה"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
