"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = inviteCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? "secondary" : "outline"}
      className="w-full"
      size="sm"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 ml-2 text-green-600" />
          <span className="text-green-600">הקוד הועתק!</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 ml-2" />
          העתק קוד הזמנה
        </>
      )}
    </Button>
  );
}
