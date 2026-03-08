"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Task } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ClipboardList, BookOpen, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterType = "all" | "exam" | "chore";

interface TaskListProps {
  initialTasks: Task[];
  familyId: string;
}

export default function TaskList({ initialTasks, familyId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<FilterType>("all");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState<"exam" | "chore">("chore");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const filteredTasks = tasks.filter((t) => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const pendingTasks = filteredTasks.filter((t) => t.status === "todo");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

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
    const diff =
      new Date(dateStr).getTime() - new Date(today).getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `לפני ${Math.abs(days)} ימים`;
    if (days === 0) return "היום";
    if (days === 1) return "מחר";
    return `בעוד ${days} ימים`;
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const optimistic: Task = {
      id: `temp-${Date.now()}`,
      family_id: familyId,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      status: "todo",
      type,
      created_at: new Date().toISOString(),
    };

    setTasks((prev) => [optimistic, ...prev]);
    setTitle("");
    setDescription("");
    setDueDate("");
    setShowForm(false);

    startTransition(async () => {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          family_id: familyId,
          title: optimistic.title,
          description: optimistic.description,
          due_date: optimistic.due_date,
          status: "todo",
          type,
        })
        .select()
        .single();

      if (!error && data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === optimistic.id ? data : t))
        );
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== optimistic.id));
      }
    });
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "todo" ? "done" : "todo";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    startTransition(async () => {
      await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);
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
          {task.due_date && (
            <p className={cn("text-xs mt-1", isDone ? "text-gray-400" : "text-gray-500")}>
              {formatDate(task.due_date)}
              {!isDone && (
                <span className="mr-2 text-gray-400">({daysUntil(task.due_date)})</span>
              )}
            </p>
          )}
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
            className="text-gray-300 hover:text-red-500 transition-colors p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
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

      {/* Add Task Button */}
      <Button
        onClick={() => setShowForm(!showForm)}
        variant={showForm ? "outline" : "default"}
        className="w-full"
      >
        <Plus className="h-4 w-4 ml-1" />
        {showForm ? "בטל" : "הוסף משימה"}
      </Button>

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
                  placeholder="לדוגמה: בחינה במתמטיקה"
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
                  <div className="grid grid-cols-2 gap-1">
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
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                <Plus className="h-4 w-4 ml-1" />
                הוסף משימה
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
