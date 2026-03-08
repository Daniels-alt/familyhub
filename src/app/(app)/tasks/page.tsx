import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/TaskList";
import { ClipboardList } from "lucide-react";
import { FamilyMember } from "@/lib/types";

export default async function TasksPage() {
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

  const familyId = profile.family_id;

  // Fetch tasks, members, and permissions in parallel
  const [tasksResult, membersResult, familyResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("family_id", familyId)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("family_id", familyId)
      .order("full_name", { ascending: true }),
    supabase
      .from("families")
      .select("children_can_add_exams, children_can_add_tasks")
      .eq("id", familyId)
      .single(),
  ]);

  const members = (membersResult.data as FamilyMember[]) ?? [];
  const canAddExams = familyResult.data?.children_can_add_exams ?? true;
  const canAddTasks = familyResult.data?.children_can_add_tasks ?? true;

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
        initialTasks={tasksResult.data ?? []}
        familyId={familyId}
        familyMembers={members}
        userRole={profile.role as "parent" | "child"}
        canAddExams={canAddExams}
        canAddTasks={canAddTasks}
      />
    </div>
  );
}
