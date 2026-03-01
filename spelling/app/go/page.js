import { redirect } from "next/navigation";

export default function Go({ searchParams }) {
  const code = (searchParams?.code || "").toString().trim().toUpperCase();
  if (!code) redirect("/");
  redirect(`/c/${encodeURIComponent(code)}`);
}
