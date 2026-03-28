"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShoppingItem } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronUp, Package, ScanBarcode, Share2, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });

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
  const [showScanner, setShowScanner] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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

  function formatListAsText(): string {
    const date = new Date().toLocaleDateString("he-IL");
    let text = `🛒 רשימת קניות משפחתית\nתאריך: ${date}\n\n`;
    for (const [cat, catItems] of Object.entries(grouped)) {
      text += `${cat}:\n`;
      catItems.forEach((item) => {
        text += `□ ${item.item_name}\n`;
      });
      text += "\n";
    }
    if (boughtItems.length > 0) {
      text += `✅ כבר נקנה:\n`;
      boughtItems.forEach((item) => {
        text += `✓ ${item.item_name}\n`;
      });
    }
    return text.trim();
  }

  function downloadCSV() {
    const BOM = "\uFEFF"; // UTF-8 BOM so Excel reads Hebrew correctly
    const header = "שם פריט,קטגוריה,נרכש";
    const rows = items.map((item) =>
      [
        `"${item.item_name.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        item.is_bought ? "כן" : "לא",
      ].join(",")
    );
    const csv = BOM + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `רשימת-קניות-${new Date().toLocaleDateString("he-IL").replace(/\//g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const text = formatListAsText();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "רשימת קניות", text });
        return;
      } catch {
        // user cancelled or API failed — fall through to modal
      }
    }
    setShowShareModal(true);
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
      {/* Export / Share toolbar */}
      {items.length > 0 && (
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="h-4 w-4" />
            שתף
          </button>
          <button
            type="button"
            onClick={downloadCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            ייצא CSV
          </button>
        </div>
      )}

      {/* Add Item Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">הוסף פריט לרשימה</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addItem} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="itemName">שם הפריט</Label>
              <div className="flex gap-2">
                <Input
                  id="itemName"
                  type="text"
                  placeholder="לדוגמה: חלב 3%"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex items-center justify-center w-10 h-10 border rounded-md text-gray-500 hover:text-blue-600 hover:border-blue-400 transition-colors shrink-0"
                  title="סרוק ברקוד"
                >
                  <ScanBarcode className="h-5 w-5" />
                </button>
              </div>
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
      {showScanner && (
        <BarcodeScanner
          onResult={(name) => {
            setNewItemName(name);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Share fallback modal (shown on desktop or when Web Share API is unavailable) */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">שתף רשימת קניות</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(formatListAsText())}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowShareModal(false)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-green-600" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              שלח בווצאפ
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent("רשימת קניות")}&body=${encodeURIComponent(formatListAsText())}`}
              onClick={() => setShowShareModal(false)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-blue-600" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              שלח במייל
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
