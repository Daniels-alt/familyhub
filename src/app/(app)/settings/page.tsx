import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import CopyInviteButton from "@/components/CopyInviteButton";
import LogoutButton from "@/components/LogoutButton";
import FamilySetup from "@/components/FamilySetup";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, families(family_name, invite_code)")
    .eq("id", user.id)
    .single();

  const family = profile?.families as
    | { family_name: string; invite_code: string }
    | null;

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-6 flex items-center gap-3">
        <div className="bg-gray-100 rounded-full p-2">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">הגדרות</h1>
          <p className="text-sm text-gray-500">ניהול חשבון ומשפחה</p>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">פרטים אישיים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-gray-500">שם מלא</span>
            <span className="text-sm font-medium">{profile?.full_name}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500">אימייל</span>
            <span className="text-sm font-medium" dir="ltr">{user.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Family Info or Setup */}
      {family ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">פרטי המשפחה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-500">שם המשפחה</span>
                <span className="text-sm font-medium">{family.family_name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">קוד הזמנה</span>
                  <span
                    className="text-sm font-mono font-bold tracking-widest bg-gray-100 px-3 py-1 rounded"
                    dir="ltr"
                  >
                    {family.invite_code}
                  </span>
                </div>
                <CopyInviteButton inviteCode={family.invite_code} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 font-medium mb-1">
                איך להוסיף בני משפחה?
              </p>
              <p className="text-xs text-blue-600">
                שתף את קוד ההזמנה עם בני המשפחה. הם יוכלו להירשם ולהצטרף למשפחה
                שלכם דרך עמוד ההרשמה.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        /* ── No family yet — show inline setup form ── */
        <FamilySetup userId={user.id} />
      )}

      {/* Logout */}
      <Card className="border-red-100">
        <CardContent className="p-4">
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
