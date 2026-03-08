"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShoppingItem } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "כללי",
  "ירקות ופירות",
  "מוצרי חלב",
  "בשר ועוף",
  "מאפים ולחם",
  "שתייה",
  "ניקיון",
  "טיפוח",
  "חטיפים וממתקים",
  "קפואים",
  "שימורים",
];

interface ShoppingListProps {
  initialItems: ShoppingItem[];
  familyId: string;
  userId: string;
}

export default function ShoppingList({
  initialItems,
  familyId,
  userId,
}: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("כללי");
  const [showBought, setShowBought] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  const pendingItems = items.filter((i) => !i.is_bought);
  const boughtItems = items.filter((i) => i.is_bought);

  // Group pending items by category
  const grouped = pendingItems.reduce<Record<string, ShoppingItem[]>>(
    (acc, item) => {
      const cat = item.category || "כללי";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {}
  );

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const optimisticItem: ShoppingItem = {
      id: `temp-${Date.now()}`,
      family_id: familyId,
      item_name: newItemName.trim(),
      category: newItemCategory,
      is_bought: false,
      added_by: userId,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [optimisticItem, ...prev]);
    setNewItemName("");

    startTransition(async () => {
      const { data, error } = await supabase
        .from("shopping_list")
        .insert({
          family_id: familyId,
          item_name: newItemName.trim(),
          category: newItemCategory,
          is_bought: false,
          added_by: userId,
        })
        .select()
        .single();

      if (!error && data) {
        setItems((prev) =>
          prev.map((i) => (i.id === optimisticItem.id ? data : i))
        );
      } else {
        setItems((prev) => prev.filter((i) => i.id !== optimisticItem.id));
      }
    });
  }

  async function toggleBought(item: ShoppingItem) {
    const newValue = !item.is_bought;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_bought: newValue } : i))
    );

    startTransition(async () => {
      await supabase
        .from("shopping_list")
        .update({ is_bought: newValue })
        .eq("id", item.id);
    });
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));

    startTransition(async () => {
      await supabase.from("shopping_list").delete().eq("id", id);
    });
  }

  async function clearBought() {
    const boughtIds = boughtItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.is_bought));

    startTransition(async () => {
      await supabase.from("shopping_list").delete().in("id", boughtIds);
    });
  }

  return (
    <div className="space-y-4">
      {/* Add Item Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">הוסף פריט לרשימה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addItem} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="itemName">שם הפריט</Label>
              <Input
                id="itemName"
                type="text"
                placeholder="לדוגמה: חלב 3%"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="category">קטגוריה</Label>
              <select
                id="category"
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              <Plus className="h-4 w-4 ml-1" />
              הוסף לרשימה
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Items grouped by category */}
      {pendingItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>רשימת הקניות ריקה</p>
            <p className="text-sm mt-1">הוסף פריטים למעלה</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {category} ({catItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                >
                  <Checkbox
                    checked={item.is_bought}
                    onCheckedChange={() => toggleBought(item)}
                    id={`item-${item.id}`}
                  />
                  <label
                    htmlFor={`item-${item.id}`}
                    className={cn(
                      "flex-1 text-sm cursor-pointer",
                      item.is_bought && "line-through text-gray-400"
                    )}
                  >
                    {item.item_name}
                  </label>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Bought Items (collapsible) */}
      {boughtItems.length > 0 && (
        <Card className="border-gray-200">
          <button
            type="button"
            onClick={() => setShowBought(!showBought)}
            className="w-full flex items-center justify-between p-4 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <span>
              נקנה ({boughtItems.length})
            </span>
            <div className="flex items-center gap-2">
              {showBought && boughtItems.length > 0 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    clearBought();
                  }}
                  className="text-red-500 hover:text-red-700 text-xs underline"
                >
                  נקה הכל
                </span>
              )}
              {showBought ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </button>
          {showBought && (
            <CardContent className="pt-0 space-y-2">
              {boughtItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                >
                  <Checkbox
                    checked={true}
                    onCheckedChange={() => toggleBought(item)}
                    id={`bought-${item.id}`}
                  />
                  <label
                    htmlFor={`bought-${item.id}`}
                    className="flex-1 text-sm line-through text-gray-400 cursor-pointer"
                  >
                    {item.item_name}
                    <span className="mr-2 text-xs text-gray-300">
                      ({item.category})
                    </span>
                  </label>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
