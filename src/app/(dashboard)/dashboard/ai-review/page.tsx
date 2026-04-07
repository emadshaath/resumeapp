import { redirect } from "next/navigation";

export default function AIReviewPage() {
  redirect("/dashboard/sections?open=review");
}
