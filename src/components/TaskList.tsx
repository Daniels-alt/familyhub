"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Task, FamilyMember } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ClipboardList, BookOpen, ListTodo, User, RefreshCw, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "exam" | "chore";

const RECURRENCE_LABELS: Record<Task["recurrence"], string> = {
  none: "ללא חזרה",
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
};

interface TaskListProps {
  initialTasks: Task[];
  familyId: string;
  currentUserId: string;
  familyMembers: FamilyMember[];
  userRole: "parent" | "child";
  canAddExams: boolean;
  canAddTasks: boolean;
}

function addRecurrence(dateStr: string, recurrence: Task["recurrence"]): string {
  const d = new Date(dateStr);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

export default function TaskList({
  initialTasks,
  familyId,
  currentUserId,
  familyMembers,
  userRole,
  canAddExams,
  canAddTasks,
}: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<FilterType>("all");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<"exam" | "chore">("chore");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [recurrence, setRecurrence] = useState<Task["recurrence"]>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // Combined filter: type + member
  const filteredTasks = tasks.filter((t) => {
    const typeMatch = filter === "all" || t.type === filter;
    const memberMatch =
      filterMember === "all" ||
      t.assigned_to === filterMember ||
      t.created_by === filterMember;
    return typeMatch && memberMatch;
  });

  const pendingTasks = filteredTasks.filter((t) => t.status === "todo");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  const showExamType = userRole === "parent" || canAddExams;
  const showAddButton = userRole === "parent" || canAddTasks;

  function memberName(id: string | null) {
    if (!id) return null;
    return familyMembers.find((m) => m.id === id)?.full_name ?? null;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  function daysUntil(dateStr: string) {
    const today = new Date().toISOString().split("T")[0];
    const diff = new Date(dateStr).getTime() - new Date(today).getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `לפני ${Math.abs(days)} ימים`;
    if (days === 0) return "היום";
    if (days === 1) return "מחר";
    return `בעוד ${days} ימים`;
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `temp-${Date.now()}`,
      family_id: familyId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      status: "todo",
      type,
      assigned_to: assignedTo || null,
      created_by: currentUserId,
      recurrence,
      recurrence_end_date: recurrenceEndDate || null,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssignedTo("");
    setRecurrence("none");
    setRecurrenceEndDate("");
    setShowForm(false);

    startTransition(async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          family_id: familyId,
          title: newTask.title,
          description: newTask.description,
          due_date: newTask.due_date,
          status: "todo",
          type,
          assigned_to: newTask.assigned_to,
          created_by: currentUserId,
          recurrence: newTask.recurrence,
          recurrence_end_date: newTask.recurrence_end_date,
        })
        .select()
        .single();

      if (!error && data) {
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? data : t)));
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== newTask.id));
      }
    });
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "todo" ? "done" : "todo";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);

      // Auto-create next occurrence when completing a recurring task
      if (newStatus === "done" && task.recurrence !== "none" && task.due_date) {
        const nextDate = addRecurrence(task.due_date, task.recurrence);
        const withinEnd =
          !task.recurrence_end_date || nextDate <= task.recurrence_end_date;

        if (withinEnd) {
          const { data: next } = await supabase
            .from("tasks")
            .insert({
              family_id: task.family_id,
              title: task.title,
              description: task.description,
              due_date: nextDate,
              status: "todo",
              type: task.type,
              assigned_to: task.assigned_to,
              created_by: task.created_by,
              recurrence: task.recurrence,
              recurrence_end_date: task.recurrence_end_date,
            })
            .select()
            .single();

          if (next) {
            setTasks((prev) => [...prev, next]);
          }
        }
      }
    });
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await supabase.from("tasks").delete().eq("id", id);
    });
  }

  const filterButtons: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "הכל", icon: <ListTodo className="h-4 w-4" /> },
    { value: "exam", label: "בחינות", icon: <BookOpen className="h-4 w-4" /> },
    { value: "chore", label: "מטלות", icon: <ClipboardList className="h-4 w-4" /> },
  ];

  function TaskCard({ task }: { task: Task }) {
    const isDone = task.status === "done";
    const assignee = memberName(task.assigned_to);
    const creator = memberName(task.created_by);
    // Show "created by" only when it adds information (creator ≠ assignee or no assignee)
    const showCreator = creator && task.created_by !== task.assigned_to;

    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
          isDone ? "bg-gray-50 border-gray-100" : "bg-white border-gray-200",
          task.type === "exam" && !isDone && "border-r-4 border-r-blue-400",
          task.type === "chore" && !isDone && "border-r-4 border-r-green-400"
        )}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={() => toggleStatus(task)}
          id={`task-${task.id}`}
          className="mt-0.5"
          disabled={isPending}
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor={`task-${task.id}`}
            className={cn(
              "font-medium text-sm cursor-pointer block",
              isDone && "line-through text-gray-400"
            )}
          >
            {task.title}
          </label>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap mt-1">
            {task.due_date && (
              <p className={cn("text-xs", isDone ? "text-gray-400" : "text-gray-500")}>
                {formatDate(task.due_date)}
                {!isDone && (
                  <span className="mr-1 text-gray-400">({daysUntil(task.due_date)})</span>
                )}
              </p>
            )}
            {assignee && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <User className="h-3 w-3" />
                {assignee}
              </span>
            )}
            {task.recurrence !== "none" && (
              <span className="text-xs text-purple-500 flex items-center gap-0.5">
                <RefreshCw className="h-3 w-3" />
                {RECURRENCE_LABELS[task.recurrence]}
              </span>
            )}
            {/* "Created by" label */}
            {showCreator && (
              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                <PenLine className="h-3 w-3" />
                נוצר ע&quot;י {creator}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-xs py-0",
              task.type === "exam"
                ? "border-blue-300 text-blue-600"
                : "border-green-300 text-green-600"
            )}
          >
            {task.type === "exam" ? "בחינה" : "מטלה"}
          </Badge>
          <button
            onClick={() => deleteTask(task.id)}
            disabled={isPending}
            className="text-gray-300 hover:text-red-500 transition-colors p-1 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Type filter tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        {filterButtons.map(({ value, label, icon }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors",
              filter === value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Member filter — only shown when family has multiple members */}
      {familyMembers.length > 1 && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">כל בני המשפחה</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} ({m.role === "parent" ? "הורה" : "ילד"})
              </option>
            ))}
          </select>
          {filterMember !== "all" && (
            <button
              onClick={() => setFilterMember("all")}
              className="text-xs text-blue-500 hover:underline shrink-0"
            >
              נקה
            </button>
          )}
        </div>
      )}

      {/* Active filter summary */}
      {(filter !== "all" || filterMember !== "all") && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">מסנן:</span>
          {filter !== "all" && (
            <Badge variant="outline" className="text-xs py-0 gap-1">
              {filter === "exam" ? "בחינות" : "מטלות"}
              <button onClick={() => setFilter("all")} className="hover:text-red-500 mr-1">×</button>
            </Badge>
          )}
          {filterMember !== "all" && (
            <Badge variant="outline" className="text-xs py-0 gap-1">
              <User className="h-3 w-3" />
              {memberName(filterMember)}
              <button onClick={() => setFilterMember("all")} className="hover:text-red-500 mr-1">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Add Task Button */}
      {showAddButton && (
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          className="w-full"
          disabled={isPending}
        >
          <Plus className="h-4 w-4 ml-1" />
          {showForm ? "בטל" : "הוסף משימה"}
        </Button>
      )}

      {/* Add Task Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">משימה חדשה</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTask} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="taskTitle">כותרת</Label>
                <Input
                  id="taskTitle"
                  placeholder="לדוגמה: לשטוף כלים"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taskDesc">תיאור (אופציונלי)</Label>
                <Input
                  id="taskDesc"
                  placeholder="פרטים נוספים..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="taskDate">תאריך</Label>
                  <Input
                    id="taskDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label>סוג</Label>
                  <div className={cn("grid gap-1", showExamType ? "grid-cols-2" : "grid-cols-1")}>
                    <button
                      type="button"
                      onClick={() => setType("chore")}
                      className={cn(
                        "p-2 rounded-md border text-xs font-medium transition-colors",
                        type === "chore"
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200"
                      )}
                    >
                      מטלה
                    </button>
                    {showExamType && (
                      <button
                        type="button"
                        onClick={() => setType("exam")}
                        className={cn(
                          "p-2 rounded-md border text-xs font-medium transition-colors",
                          type === "exam"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-200"
                        )}
                      >
                        בחינה
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment */}
              {familyMembers.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor="taskAssign">שייך למי? (אופציונלי)</Label>
                  <select
                    id="taskAssign"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">לא משויך</option>
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role === "parent" ? "הורה" : "ילד"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recurrence */}
              <div className="space-y-1">
                <Label htmlFor="taskRecurrence">חזרה</Label>
                <select
                  id="taskRecurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as Task["recurrence"])}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="none">ללא חזרה</option>
                  <option value="daily">יומי</option>
                  <option value="weekly">שבועי</option>
                  <option value="monthly">חודשי</option>
                </select>
              </div>

              {recurrence !== "none" && (
                <div className="space-y-1">
                  <Label htmlFor="taskRecEnd">תאריך סיום חזרה (אופציונלי)</Label>
                  <Input
                    id="taskRecEnd"
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    dir="ltr"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isPending}>
                <Plus className="h-4 w-4 ml-1" />
                {isPending ? "שומר..." : "הוסף משימה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 px-1">
            ממתין ({pendingTasks.length})
          </p>
          {pendingTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>אין משימות ממתינות</p>
            {(filter !== "all" || filterMember !== "all") && (
              <p className="text-xs text-gray-400 mt-1">נסה לשנות את הסינון</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Done Tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400 px-1">
            הושלם ({doneTasks.length})
          </p>
          {doneTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
