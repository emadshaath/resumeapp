import { redirect } from "next/navigation";

// /dashboard/pdf used to host a standalone PDF Studio with its own 3-pane
// layout. All of its controls (fonts, layout, color, spacing, page template,
// public-download toggle) now live inside the right rail of /dashboard/sections
// alongside the block canvas, so the separate page is dead weight.
//
// Kept as a server-side redirect so old bookmarks, deep links, and the
// occasional external mention land on the builder without a 404.
export default function PdfStudioPage() {
  redirect("/dashboard/sections");
}
