"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";

interface RemoveMemberButtonProps {
  memberId: string;
  memberName: string;
}

export default function RemoveMemberButton({ memberId, memberName }: RemoveMemberButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const supabase = createClient();

  function handleRemove() {
    if (!confirm(`האם להסיר את ${memberName} מהמשפחה?`)) return;

    startTransition(async () => {
      await supabase
        .from("profiles")
        .update({ family_id: null, role: "parent" })
        .eq("id", memberId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40 p-0.5"
      title={`הסר את ${memberName} מהמשפחה`}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
