import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/returns")({
  component: Returns,
  head: () => ({
    meta: [
      { title: "Return Policy – Kivora Ghana" },
      { name: "description", content: "How to return an item on Kivora Ghana: eligibility, the 7-day window, refunds and timelines." },
      { property: "og:title", content: "Return Policy – Kivora Ghana" },
      { property: "og:description", content: "Eligibility, the 7-day window, refunds and timelines for Kivora returns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Returns() {
  return (
    <InfoPage title="Return Policy" intro="Not right? You have 7 days from delivery to start a return.">
      <InfoSection heading="What can be returned">
        <p>Items that arrive damaged, faulty, incomplete, or clearly different from the listing.</p>
        <p>Unused items in original packaging with tags attached.</p>
      </InfoSection>
      <InfoSection heading="What cannot be returned">
        <p>Perishable food, personal care and hygiene items, underwear, digital items and custom-made orders.</p>
      </InfoSection>
      <InfoSection heading="How to start a return">
        <p>
          1. Open <Link to="/orders" className="text-primary font-semibold">Orders</Link> and select the order.
        </p>
        <p>2. Message the seller from your inbox with photos of the item.</p>
        <p>3. If unresolved in 48 hours, email support@kivora.gh and we will step in.</p>
      </InfoSection>
      <InfoSection heading="Refunds">
        <p>Approved refunds go back to your original payment method within 5–10 working days.</p>
        <p>Pay on Delivery orders are refunded by Mobile Money to the number on the order.</p>
      </InfoSection>
      <InfoSection heading="Return shipping">
        <p>Kivora or the seller covers return shipping when the item is faulty or wrong. Change-of-mind returns are paid by the buyer.</p>
      </InfoSection>
    </InfoPage>
  );
}
