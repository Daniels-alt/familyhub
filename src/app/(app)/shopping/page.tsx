import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShoppingList from "@/components/ShoppingList";
import { ShoppingCart } from "lucide-react";

export default async function ShoppingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>אנא הצטרף למשפחה תחילה.</p>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("shopping_list")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("created_at", { ascending: false });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-6 flex items-center gap-3">
        <div className="bg-orange-100 rounded-full p-2">
          <ShoppingCart className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">רשימת קניות</h1>
          <p className="text-sm text-gray-500">ניהול קניות משפחתי</p>
        </div>
      </div>

      <ShoppingList
        initialItems={items ?? []}
        familyId={profile.family_id}
        userId={user.id}
      />
    </div>
  );
}
