import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users } from "lucide-react";
import CopyInviteButton from "@/components/CopyInviteButton";
import LogoutButton from "@/components/LogoutButton";
import FamilySetup from "@/components/FamilySetup";
import ChildPermissions from "@/components/ChildPermissions";
import { FamilyMember } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "*, families(family_name, invite_code, child_invite_code, children_can_add_exams, children_can_add_tasks, children_can_manage_shopping)"
    )
    .eq("id", user.id)
    .single();

  const family = profile?.families as
    | {
        family_name: string;
        invite_code: string;
        child_invite_code: string;
        children_can_add_exams: boolean;
        children_can_add_tasks: boolean;
        children_can_manage_shopping: boolean;
      }
    | null;

  // Fetch all family members if in a family
  let members: FamilyMember[] = [];
  if (profile?.family_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("family_id", profile.family_id)
      .order("role", { ascending: true })
      .order("full_name", { ascending: true });
    members = (data as FamilyMember[]) ?? [];
  }

  const isParent = profile?.role === "parent";

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
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-gray-500">אימייל</span>
            <span className="text-sm font-medium" dir="ltr">
              {user.email}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-500">תפקיד</span>
            <Badge
              variant="outline"
              className={
                isParent
                  ? "border-blue-300 text-blue-600"
                  : "border-green-300 text-green-600"
              }
            >
              {isParent ? "הורה" : "ילד"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {family ? (
        <>
          {/* Family Name */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">פרטי המשפחה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">שם המשפחה</span>
                <span className="text-sm font-medium">{family.family_name}</span>
              </div>
            </CardContent>
          </Card>

          {/* Invite Codes — parents only */}
          {isParent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">קודי הזמנה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">הזמנת הורה</p>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-sm font-mono font-bold tracking-widest bg-blue-50 text-blue-700 px-3 py-1.5 rounded flex-1 text-center"
                      dir="ltr"
                    >
                      {family.invite_code}
                    </span>
                    <CopyInviteButton inviteCode={family.invite_code} />
                  </div>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm text-gray-500">הזמנת ילד</p>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="text-sm font-mono font-bold tracking-widest bg-green-50 text-green-700 px-3 py-1.5 rounded flex-1 text-center"
                      dir="ltr"
                    >
                      {family.child_invite_code}
                    </span>
                    <CopyInviteButton inviteCode={family.child_invite_code} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Family Members List */}
          {members.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  בני המשפחה ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm font-medium">{member.full_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        member.role === "parent"
                          ? "border-blue-300 text-blue-600"
                          : "border-green-300 text-green-600"
                      }
                    >
                      {member.role === "parent" ? "הורה" : "ילד"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Child Permissions — parents only */}
          {isParent && profile?.family_id && (
            <ChildPermissions
              familyId={profile.family_id}
              initialCanAddExams={family.children_can_add_exams}
              initialCanAddTasks={family.children_can_add_tasks}
              initialCanManageShopping={family.children_can_manage_shopping}
            />
          )}
        </>
      ) : (
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
