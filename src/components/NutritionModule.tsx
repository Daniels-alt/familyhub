"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dish, DailyVote, MealType, DietaryType, FamilyMember } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  ChefHat,
  CalendarDays,
  X,
  BookOpen,
  ThumbsUp,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "חטיף",
};

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const DIETARY_LABELS: Record<DietaryType, string> = {
  dairy: "חלבי",
  meat: "בשרי",
  pareve: "פרווה",
};

const DIETARY_COLORS: Record<DietaryType, string> = {
  dairy: "bg-blue-100 text-blue-700",
  meat: "bg-red-100 text-red-700",
  pareve: "bg-gray-100 text-gray-600",
};

interface NutritionModuleProps {
  initialDishes: Dish[];
  initialVotes: DailyVote[];
  familyMembers: FamilyMember[];
  familyId: string;
  userId: string;
  userRole: "parent" | "child";
}

export default function NutritionModule({
  initialDishes,
  initialVotes,
  familyId,
  userId,
  userRole,
}: NutritionModuleProps) {
  const [dishes, setDishes] = useState<Dish[]>(initialDishes);
  const [votes, setVotes] = useState<DailyVote[]>(initialVotes);
  const [activeTab, setActiveTab] = useState<"today" | "recipes">("today");
  const [showAddDish, setShowAddDish] = useState(false);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterMeal, setFilterMeal] = useState<MealType | "all">("all");
  const [filterDietary, setFilterDietary] = useState<DietaryType | "all">("all");

  // Add dish form state
  const [newName, setNewName] = useState("");
  const [newMealType, setNewMealType] = useState<MealType>("breakfast");
  const [newDietaryType, setNewDietaryType] = useState<DietaryType>("pareve");
  const [newRecipe, setNewRecipe] = useState("");

  // Edit dish form state
  const [editName, setEditName] = useState("");
  const [editMealType, setEditMealType] = useState<MealType>("breakfast");
  const [editDietaryType, setEditDietaryType] = useState<DietaryType>("pareve");
  const [editRecipe, setEditRecipe] = useState("");

  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  // ── Voting ──────────────────────────────────────────────────────────────────

  function getVoteCount(dishId: string): number {
    return votes.filter((v) => v.dish_id === dishId).length;
  }

  function hasVoted(dishId: string): boolean {
    return votes.some((v) => v.dish_id === dishId && v.user_id === userId);
  }

  function myVotesForMeal(meal: MealType): number {
    return votes.filter((v) => v.user_id === userId && v.meal_type === meal).length;
  }

  async function toggleVote(dish: Dish) {
    const alreadyVoted = hasVoted(dish.id);

    if (alreadyVoted) {
      // Remove vote
      const voteToRemove = votes.find(
        (v) => v.dish_id === dish.id && v.user_id === userId
      );
      if (!voteToRemove) return;
      setVotes((prev) => prev.filter((v) => v.id !== voteToRemove.id));
      startTransition(async () => {
        await supabase.from("daily_votes").delete().eq("id", voteToRemove.id);
      });
    } else {
      // Add vote — check limit
      if (myVotesForMeal(dish.meal_type) >= 3) return;

      const today = new Date().toISOString().split("T")[0];
      const optimistic: DailyVote = {
        id: `temp-${Date.now()}`,
        family_id: familyId,
        dish_id: dish.id,
        user_id: userId,
        meal_type: dish.meal_type,
        vote_date: today,
        created_at: new Date().toISOString(),
      };
      setVotes((prev) => [...prev, optimistic]);

      startTransition(async () => {
        const { data, error } = await supabase
          .from("daily_votes")
          .insert({
            family_id: familyId,
            dish_id: dish.id,
            user_id: userId,
            meal_type: dish.meal_type,
            vote_date: today,
          })
          .select()
          .single();

        if (!error && data) {
          setVotes((prev) =>
            prev.map((v) => (v.id === optimistic.id ? data : v))
          );
        } else {
          setVotes((prev) => prev.filter((v) => v.id !== optimistic.id));
        }
      });
    }
  }

  // ── Add Dish ─────────────────────────────────────────────────────────────────

  async function addDish(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    const optimistic: Dish = {
      id: `temp-${Date.now()}`,
      family_id: familyId,
      name: newName.trim(),
      meal_type: newMealType,
      dietary_type: newDietaryType,
      recipe: newRecipe.trim() || null,
      added_by: userId,
      created_at: new Date().toISOString(),
    };

    setDishes((prev) => [...prev, optimistic].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setNewRecipe("");
    setShowAddDish(false);

    startTransition(async () => {
      const { data, error } = await supabase
        .from("dishes")
        .insert({
          family_id: familyId,
          name: optimistic.name,
          meal_type: newMealType,
          dietary_type: newDietaryType,
          recipe: optimistic.recipe,
          added_by: userId,
        })
        .select()
        .single();

      if (!error && data) {
        setDishes((prev) =>
          prev.map((d) => (d.id === optimistic.id ? data : d))
        );
      } else {
        setDishes((prev) => prev.filter((d) => d.id !== optimistic.id));
      }
    });
  }

  // ── Delete Dish ──────────────────────────────────────────────────────────────

  async function deleteDish(dish: Dish) {
    const canDelete = dish.added_by === userId || userRole === "parent";
    if (!canDelete) return;
    if (!confirm(`למחוק את "${dish.name}"?`)) return;

    setDishes((prev) => prev.filter((d) => d.id !== dish.id));
    setVotes((prev) => prev.filter((v) => v.dish_id !== dish.id));
    if (selectedDish?.id === dish.id) setSelectedDish(null);

    startTransition(async () => {
      await supabase.from("dishes").delete().eq("id", dish.id);
    });
  }

  // ── Edit Dish ────────────────────────────────────────────────────────────────

  function openEdit(dish: Dish) {
    setEditName(dish.name);
    setEditMealType(dish.meal_type);
    setEditDietaryType(dish.dietary_type);
    setEditRecipe(dish.recipe ?? "");
    setIsEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDish || !editName.trim()) return;

    const updated: Dish = {
      ...selectedDish,
      name: editName.trim(),
      meal_type: editMealType,
      dietary_type: editDietaryType,
      recipe: editRecipe.trim() || null,
    };

    setDishes((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)).sort((a, b) => a.name.localeCompare(b.name))
    );
    setSelectedDish(updated);
    setIsEditing(false);

    startTransition(async () => {
      await supabase
        .from("dishes")
        .update({
          name: updated.name,
          meal_type: updated.meal_type,
          dietary_type: updated.dietary_type,
          recipe: updated.recipe,
        })
        .eq("id", updated.id);
    });
  }

  // ── Filtered dishes for recipes tab ─────────────────────────────────────────

  const filteredDishes = dishes.filter((d) => {
    if (filterMeal !== "all" && d.meal_type !== filterMeal) return false;
    if (filterDietary !== "all" && d.dietary_type !== filterDietary) return false;
    return true;
  });

  // Group filtered dishes by meal type
  const groupedRecipes = MEAL_ORDER.reduce<Record<MealType, Dish[]>>(
    (acc, meal) => {
      acc[meal] = filteredDishes.filter((d) => d.meal_type === meal);
      return acc;
    },
    { breakfast: [], lunch: [], dinner: [], snack: [] }
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("today")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "today"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          מה אוכלים היום
        </button>
        <button
          onClick={() => setActiveTab("recipes")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === "recipes"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          <BookOpen className="h-4 w-4" />
          מתכונים
        </button>
      </div>

      {/* ── TAB 1: Today ── */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {dishes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <ChefHat className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">אין מנות במאגר עדיין</p>
                <p className="text-sm mt-1">
                  עבור ל&quot;מתכונים&quot; והוסף מנות לאוסף המשפחתי
                </p>
              </CardContent>
            </Card>
          ) : (
            MEAL_ORDER.map((meal) => {
              const mealDishes = dishes.filter((d) => d.meal_type === meal);
              if (mealDishes.length === 0) return null;
              const myCount = myVotesForMeal(meal);
              return (
                <Card key={meal}>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                      <span>
                        {MEAL_EMOJIS[meal]} {MEAL_LABELS[meal]}
                      </span>
                      <span className="text-xs text-gray-400 font-normal">
                        {myCount}/3 הצבעות שלי
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {mealDishes.map((dish) => {
                      const voted = hasVoted(dish.id);
                      const count = getVoteCount(dish.id);
                      const limitReached = myCount >= 3 && !voted;
                      return (
                        <div
                          key={dish.id}
                          className="flex items-center gap-3 py-2 border-b last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-800">
                                {dish.name}
                              </span>
                              <span
                                className={cn(
                                  "text-xs px-1.5 py-0.5 rounded-full",
                                  DIETARY_COLORS[dish.dietary_type]
                                )}
                              >
                                {DIETARY_LABELS[dish.dietary_type]}
                              </span>
                            </div>
                            {count > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {count} {count === 1 ? "הצבעה" : "הצבעות"}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleVote(dish)}
                            disabled={limitReached || isPending}
                            className={cn(
                              "group flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0",
                              voted
                                ? "bg-blue-600 text-white hover:bg-red-500"
                                : limitReached
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                            )}
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span className={voted ? "group-hover:hidden" : ""}>{voted ? "הצבעתי" : "הצבע"}</span>
                            {voted && <span className="hidden group-hover:inline">בטל</span>}
                          </button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: Recipes ── */}
      {activeTab === "recipes" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="space-y-2">
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setFilterMeal("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filterMeal === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                הכל
              </button>
              {MEAL_ORDER.map((meal) => (
                <button
                  key={meal}
                  onClick={() => setFilterMeal(meal)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    filterMeal === meal
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {MEAL_EMOJIS[meal]} {MEAL_LABELS[meal]}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilterDietary("all")}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  filterDietary === "all"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                כל הסוגים
              </button>
              {(["dairy", "meat", "pareve"] as DietaryType[]).map((dt) => (
                <button
                  key={dt}
                  onClick={() => setFilterDietary(dt)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    filterDietary === dt
                      ? "bg-gray-700 text-white"
                      : cn("bg-gray-100 text-gray-600 hover:bg-gray-200")
                  )}
                >
                  {DIETARY_LABELS[dt]}
                </button>
              ))}
            </div>
          </div>

          {/* Add dish button */}
          <Button
            onClick={() => setShowAddDish(true)}
            variant="outline"
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 ml-1" />
            הוסף מנה חדשה
          </Button>

          {/* Add dish form */}
          {showAddDish && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base flex items-center justify-between">
                  מנה חדשה
                  <button onClick={() => setShowAddDish(false)}>
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addDish} className="space-y-3">
                  <div className="space-y-1">
                    <Label>שם המנה</Label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="לדוגמה: שקשוקה"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>סוג ארוחה</Label>
                      <select
                        value={newMealType}
                        onChange={(e) => setNewMealType(e.target.value as MealType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {MEAL_ORDER.map((m) => (
                          <option key={m} value={m}>
                            {MEAL_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>סוג</Label>
                      <select
                        value={newDietaryType}
                        onChange={(e) => setNewDietaryType(e.target.value as DietaryType)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="pareve">פרווה</option>
                        <option value="dairy">חלבי</option>
                        <option value="meat">בשרי</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>מתכון (אופציונלי)</Label>
                    <textarea
                      value={newRecipe}
                      onChange={(e) => setNewRecipe(e.target.value)}
                      placeholder="רשום כאן את הרכיבים והוראות ההכנה..."
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף מנה
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Dishes list grouped by meal type */}
          {filteredDishes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <ChefHat className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p>אין מנות להצגה</p>
                <p className="text-sm mt-1">הוסף מנה חדשה או שנה את הפילטרים</p>
              </CardContent>
            </Card>
          ) : (
            MEAL_ORDER.map((meal) => {
              const mealDishes = groupedRecipes[meal];
              if (mealDishes.length === 0) return null;
              return (
                <Card key={meal}>
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      {MEAL_EMOJIS[meal]} {MEAL_LABELS[meal]} ({mealDishes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {mealDishes.map((dish) => (
                      <div
                        key={dish.id}
                        className="flex items-center gap-3 py-2 border-b last:border-0"
                      >
                        <button
                          className="flex-1 text-right min-w-0"
                          onClick={() => setSelectedDish(dish)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                              {dish.name}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 rounded-full",
                                DIETARY_COLORS[dish.dietary_type]
                              )}
                            >
                              {DIETARY_LABELS[dish.dietary_type]}
                            </span>
                            {dish.recipe && (
                              <span className="text-xs text-gray-400">📋 יש מתכון</span>
                            )}
                          </div>
                        </button>
                        {(dish.added_by === userId || userRole === "parent") && (
                          <button
                            onClick={() => deleteDish(dish)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Recipe / Edit modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <p className="text-sm font-semibold text-blue-600">עריכת מנה</p>
                ) : (
                  <>
                    <h3 className="font-bold text-lg leading-tight">{selectedDish.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm text-gray-500">
                        {MEAL_EMOJIS[selectedDish.meal_type]} {MEAL_LABELS[selectedDish.meal_type]}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", DIETARY_COLORS[selectedDish.dietary_type])}>
                        {DIETARY_LABELS[selectedDish.dietary_type]}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-1">
                {!isEditing && (selectedDish.added_by === userId || userRole === "parent") && (
                  <button
                    onClick={() => openEdit(selectedDish)}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="ערוך מנה"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => { setSelectedDish(null); setIsEditing(false); }}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* View mode */}
            {!isEditing && (
              <div className="p-5">
                {selectedDish.recipe ? (
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {selectedDish.recipe}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-4">
                    אין מתכון שמור למנה זו
                  </p>
                )}
              </div>
            )}

            {/* Edit mode */}
            {isEditing && (
              <form onSubmit={saveEdit} className="p-5 space-y-3">
                <div className="space-y-1">
                  <Label>שם המנה</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>סוג ארוחה</Label>
                    <select
                      value={editMealType}
                      onChange={(e) => setEditMealType(e.target.value as MealType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {MEAL_ORDER.map((m) => (
                        <option key={m} value={m}>{MEAL_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>סוג</Label>
                    <select
                      value={editDietaryType}
                      onChange={(e) => setEditDietaryType(e.target.value as DietaryType)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="pareve">פרווה</option>
                      <option value="dairy">חלבי</option>
                      <option value="meat">בשרי</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>מתכון (אופציונלי)</Label>
                  <textarea
                    value={editRecipe}
                    onChange={(e) => setEditRecipe(e.target.value)}
                    placeholder="רשום כאן את הרכיבים והוראות ההכנה..."
                    rows={5}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    <Check className="h-4 w-4 ml-1" />
                    שמור שינויים
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
