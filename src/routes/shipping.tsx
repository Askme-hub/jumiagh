import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/shipping")({
  component: Shipping,
  head: () => ({
    meta: [
      { title: "Shipping Info – Kivora Ghana" },
      { name: "description", content: "Delivery options, fees, timelines and pickup stations for orders on Kivora Ghana." },
      { property: "og:title", content: "Shipping Info – Kivora Ghana" },
      { property: "og:description", content: "Delivery options, fees, timelines and pickup stations on Kivora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Shipping() {
  return (
    <InfoPage title="Shipping Info" intro="How your Kivora order gets to you, and what it costs.">
      <InfoSection heading="Delivery options">
        <p><strong className="text-foreground">Door delivery</strong> — the courier brings your parcel to your address. The fee is set by the seller and shown at checkout.</p>
        <p><strong className="text-foreground">Pickup station</strong> — collect free of charge from a seller pickup station near you.</p>
      </InfoSection>
      <InfoSection heading="Delivery times">
        <p>Accra &amp; Tema: 1–2 working days.</p>
        <p>Kumasi, Takoradi and other regional capitals: 2–4 working days.</p>
        <p>Other towns: 3–7 working days.</p>
      </InfoSection>
      <InfoSection heading="Delivery fees">
        <p>Fees depend on the seller and your location, and are always shown before you pay. Pickup is always free.</p>
      </InfoSection>
      <InfoSection heading="Tracking your parcel">
        <p>
          Follow every status change in <Link to="/orders" className="text-primary font-semibold">Track Order</Link>.
          We also send an SMS from KIVORA GH and a message to your inbox.
        </p>
      </InfoSection>
      <InfoSection heading="Failed deliveries">
        <p>If nobody is available, the courier retries once. After that the parcel is held at the nearest pickup station for 5 days.</p>
      </InfoSection>
    </InfoPage>
  );
}
