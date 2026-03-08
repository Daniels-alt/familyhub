import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/TaskList";
import { ClipboardList } from "lucide-react";

export default async function TasksPage() {
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

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", profile.family_id)
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto">
      <div className="pt-6 flex items-center gap-3">
        <div className="bg-green-100 rounded-full p-2">
          <ClipboardList className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">משימות</h1>
          <p className="text-sm text-gray-500">בחינות ומטלות משפחתיות</p>
        </div>
      </div>

      <TaskList
        initialTasks={tasks ?? []}
        familyId={profile.family_id}
      />
    </div>
  );
}
