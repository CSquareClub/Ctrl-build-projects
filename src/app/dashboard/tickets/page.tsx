import { redirect } from "next/navigation";

export default function TicketsRedirectPage() {
  redirect("/dashboard/workspace/tickets");
}
