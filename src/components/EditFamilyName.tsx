"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EditFamilyNameProps {
  familyId: string;
  currentName: string;
}

export default function EditFamilyName({ familyId, currentName }: EditFamilyNameProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [saved, setSaved] = useState(currentName);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === saved) { setEditing(false); return; }

    startTransition(async () => {
      const { error } = await supabase
        .from("families")
        .update({ family_name: trimmed })
        .eq("id", familyId);

      if (!error) {
        setSaved(trimmed);
      }
      setEditing(false);
    });
  }

  function handleCancel() {
    setName(saved);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{saved}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-blue-500 transition-colors"
          title="ערוך שם משפחה"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm max-w-[180px]"
        autoFocus
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") handleCancel();
        }}
      />
      <button
        onClick={handleSave}
        disabled={isPending || !name.trim()}
        className="text-green-500 hover:text-green-700 disabled:opacity-40 transition-colors"
        title="שמור"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="text-gray-400 hover:text-red-500 transition-colors"
        title="בטל"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
