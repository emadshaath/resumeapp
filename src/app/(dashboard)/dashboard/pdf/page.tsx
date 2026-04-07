import { redirect } from "next/navigation";

export default function PdfResumePage() {
  redirect("/dashboard/sections?open=pdf");
}
