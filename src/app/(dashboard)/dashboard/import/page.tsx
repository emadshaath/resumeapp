import { redirect } from "next/navigation";

export default function ImportResumePage() {
  redirect("/dashboard/sections?open=import");
}
