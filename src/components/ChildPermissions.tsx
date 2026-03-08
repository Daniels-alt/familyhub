"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

interface ChildPermissionsProps {
  familyId: string;
  initialCanAddExams: boolean;
  initialCanAddTasks: boolean;
  initialCanManageShopping: boolean;
}

export default function ChildPermissions({
  familyId,
  initialCanAddExams,
  initialCanAddTasks,
  initialCanManageShopping,
}: ChildPermissionsProps) {
  const [canAddExams, setCanAddExams] = useState(initialCanAddExams);
  const [canAddTasks, setCanAddTasks] = useState(initialCanAddTasks);
  const [canManageShopping, setCanManageShopping] = useState(initialCanManageShopping);
  const [isPending, startTransition] = useTransition();

  async function update(
    exams: boolean,
    tasks: boolean,
    shopping: boolean
  ) {
    const supabase = createClient();
    startTransition(async () => {
      await supabase.rpc("update_child_permissions", {
        p_family_id: familyId,
        p_can_add_exams: exams,
        p_can_add_tasks: tasks,
        p_can_manage_shopping: shopping,
      });
    });
  }

  function toggle(
    field: "exams" | "tasks" | "shopping",
    current: boolean
  ) {
    const next = !current;
    const newExams = field === "exams" ? next : canAddExams;
    const newTasks = field === "tasks" ? next : canAddTasks;
    const newShopping = field === "shopping" ? next : canManageShopping;

    if (field === "exams") setCanAddExams(next);
    if (field === "tasks") setCanAddTasks(next);
    if (field === "shopping") setCanManageShopping(next);

    update(newExams, newTasks, newShopping);
  }

  const permissions = [
    {
      key: "exams" as const,
      label: "ילדים יכולים להוסיף בחינות",
      value: canAddExams,
    },
    {
      key: "tasks" as const,
      label: "ילדים יכולים להוסיף מטלות",
      value: canAddTasks,
    },
    {
      key: "shopping" as const,
      label: "ילדים יכולים לנהל קניות",
      value: canManageShopping,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          הרשאות ילדים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {permissions.map(({ key, label, value }) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key, value)}
            disabled={isPending}
            className="w-full flex items-center justify-between py-3 px-1 border-b last:border-0 disabled:opacity-60"
          >
            <span className="text-sm text-gray-700">{label}</span>
            <div
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                value ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  value ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
