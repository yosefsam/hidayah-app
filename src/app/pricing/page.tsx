import { redirect } from "next/navigation";

// Preserve old links while retiring the paid offering.
export default function RetiredPricingPage() {
  redirect("/");
}
