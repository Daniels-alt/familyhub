import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, BookOpen, ClipboardList, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, families(family_name)")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-5xl">🏠</div>
          <h2 className="text-xl font-bold text-gray-800">ברוך הבא ל-FamilyHub!</h2>
          <p className="text-gray-500 text-sm">
            צור משפחה חדשה או הצטרף למשפחה קיימת עם קוד הזמנה.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            הגדר משפחה ←
          </Link>
        </div>
      </div>
    );
  }

  const familyId = profile.family_id;
  const familyName =
    (profile.families as { family_name: string } | null)?.family_name ?? "המשפחה";

  // Fetch missing shopping items count
  const { count: missingCount } = await supabase
    .from("shopping_list")
    .select("*", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("is_bought", false);

  // Fetch upcoming tasks (next 14 days, todo)
  const today = new Date().toISOString().split("T")[0];
  const in14Days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: upcomingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .eq("status", "todo")
    .gte("due_date", today)
    .lte("due_date", in14Days)
    .order("due_date", { ascending: true })
    .limit(5);

  // Fetch upcoming exams specifically
  const { data: upcomingExams } = await supabase
    .from("tasks")
    .select("*")
    .eq("family_id", familyId)
    .eq("type", "exam")
    .eq("status", "todo")
    .gte("due_date", today)
    .order("due_date", { ascending: true })
    .limit(3);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function daysUntil(dateStr: string) {
    const diff =
      new Date(dateStr).getTime() - new Date(today).getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "היום";
    if (days === 1) return "מחר";
    return `בעוד ${days} ימים`;
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Welcome Header */}
      <div className="pt-6">
        <h1 className="text-2xl font-bold text-gray-900">
          שלום, {profile.full_name} 👋
        </h1>
        <p className="text-gray-500 mt-1">משפחת {familyName}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/shopping">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-100">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-orange-100 rounded-full p-2 mb-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-orange-600">
                {missingCount ?? 0}
              </span>
              <span className="text-xs text-gray-500 mt-1">פריטים חסרים</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-100">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="bg-blue-100 rounded-full p-2 mb-2">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {upcomingTasks?.length ?? 0}
              </span>
              <span className="text-xs text-gray-500 mt-1">משימות קרובות</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* What's Missing Section */}
      {(missingCount ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              מה חסר לנו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              יש <span className="font-bold text-orange-600">{missingCount}</span> פריטים
              שעדיין לא נקנו.{" "}
              <Link href="/shopping" className="text-blue-600 hover:underline">
                לרשימת הקניות ←
              </Link>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Exams */}
      {upcomingExams && upcomingExams.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-500" />
              בחינות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
              >
                <div>
                  <p className="font-medium text-sm">{exam.title}</p>
                  {exam.due_date && (
                    <p className="text-xs text-gray-500">{formatDate(exam.due_date)}</p>
                  )}
                </div>
                {exam.due_date && (
                  <Badge
                    variant={
                      daysUntil(exam.due_date) === "היום" ||
                      daysUntil(exam.due_date) === "מחר"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {daysUntil(exam.due_date)}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks && upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-green-500" />
              משימות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
              >
                <div>
                  <p className="font-medium text-sm">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-gray-500">{formatDate(task.due_date)}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    task.type === "exam"
                      ? "border-blue-300 text-blue-600"
                      : "border-green-300 text-green-600"
                  }`}
                >
                  {task.type === "exam" ? "בחינה" : "מטלה"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(!upcomingTasks || upcomingTasks.length === 0) &&
        (missingCount ?? 0) === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium">הכל מסודר!</p>
              <p className="text-sm mt-1">אין משימות קרובות ורשימת הקניות ריקה.</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
