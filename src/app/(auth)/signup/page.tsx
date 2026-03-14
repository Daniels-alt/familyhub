"use client";

import { useState } from "react";
import Link from "next/link";
import { Home, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Mode = "create" | "join";

export default function SignupPage() {
  const [mode, setMode] = useState<Mode>("create");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      setError(authError?.message || "שגיאה בהרשמה. נסה שנית.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 2. Create or join family via RPC — also sets full_name atomically (bypasses RLS)
    if (mode === "create") {
      const newFamilyId = crypto.randomUUID();
      const { error: rpcError } = await supabase.rpc("create_and_join_family", {
        p_family_id: newFamilyId,
        p_family_name: familyName.trim(),
        p_user_id: userId,
        p_full_name: fullName,
      });

      if (rpcError) {
        setError(`שגיאה ביצירת המשפחה: ${rpcError.message}`);
        setLoading(false);
        return;
      }
    } else {
      const { error: rpcError } = await supabase.rpc("join_family_by_code", {
        p_invite_code: inviteCode.trim(),
        p_user_id: userId,
        p_full_name: fullName,
      });

      if (rpcError) {
        setError(
          rpcError.message.includes("Family not found")
            ? "קוד ההזמנה לא נמצא. בדוק את הקוד ונסה שנית."
            : `שגיאה: ${rpcError.message}`
        );
        setLoading(false);
        return;
      }
    }

    // Full reload ensures server components re-fetch fresh data
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="bg-blue-100 rounded-full p-3">
              <Home className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">FamilyHub</CardTitle>
          <CardDescription className="text-base">יצירת חשבון חדש</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה (לפחות 6 תווים)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            {/* Mode selector */}
            <div className="space-y-2">
              <Label>הצטרפות למשפחה</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("create")}
                  className={`p-3 rounded-md border text-sm font-medium transition-colors ${
                    mode === "create"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  צור משפחה חדשה
                </button>
                <button
                  type="button"
                  onClick={() => setMode("join")}
                  className={`p-3 rounded-md border text-sm font-medium transition-colors ${
                    mode === "join"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  הצטרף למשפחה קיימת
                </button>
              </div>
            </div>

            {mode === "create" ? (
              <div className="space-y-2">
                <Label htmlFor="familyName">שם המשפחה (ללא המילה "משפחת")</Label>
                <Input
                  id="familyName"
                  type="text"
                  placeholder="ישראלי"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="inviteCode">קוד הזמנה</Label>
                <Input
                  id="inviteCode"
                  type="text"
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
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                "נרשם..."
              ) : (
                <>
                  <UserPlus className="h-4 w-4 ml-2" />
                  הרשמה
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            כבר יש לך חשבון?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              התחבר כאן
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
