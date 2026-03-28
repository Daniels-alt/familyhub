import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NutritionModule from "@/components/NutritionModule";
import { Utensils } from "lucide-react";

export default async function NutritionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>אנא הצטרף למשפחה תחילה.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const [{ data: dishes }, { data: votes }, { data: members }] =
    await Promise.all([
      supabase
        .from("dishes")
        .select("*")
        .eq("family_id", profile.family_id)
        .order("name"),
      supabase
        .from("daily_votes")
        .select("*")
        .eq("family_id", profile.family_id)
        .eq("vote_date", today),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("family_id", profile.family_id),
    ]);

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-6 flex items-center gap-3">
        <div className="bg-green-100 rounded-full p-2">
          <Utensils className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">תזונה ומתכונים</h1>
          <p className="text-sm text-gray-500">ניהול ארוחות משפחתי</p>
        </div>
      </div>

      <NutritionModule
        initialDishes={dishes ?? []}
        initialVotes={votes ?? []}
        familyMembers={members ?? []}
        familyId={profile.family_id}
        userId={user.id}
        userRole={profile.role}
      />
    </div>
  );
}
