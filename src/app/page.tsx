import { redirect } from "next/navigation";

// Middleware handles the redirect, but this is a fallback
export default function RootPage() {
  redirect("/dashboard");
}
