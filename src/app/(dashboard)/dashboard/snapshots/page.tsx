import { redirect } from "next/navigation";

export default function SnapshotsPage() {
  redirect("/dashboard/sections?open=history");
}
