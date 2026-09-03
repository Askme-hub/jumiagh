import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of Service – Kivora Ghana" },
      { name: "description", content: "The rules for buying, selling and using the Kivora Ghana marketplace." },
      { property: "og:title", content: "Terms of Service – Kivora Ghana" },
      { property: "og:description", content: "The rules for buying, selling and using Kivora Ghana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Terms() {
  return (
    <InfoPage title="Terms of Service" intro="Last updated: September 2026. By using Kivora you agree to these terms.">
      <InfoSection heading="1. Who we are">
        <p>Kivora is an online marketplace based in Accra, Ghana that connects buyers with independent sellers.</p>
      </InfoSection>
      <InfoSection heading="2. Your account">
        <p>You must give accurate details and keep your password secure. You are responsible for activity on your account.</p>
        <p>Accounts used for fraud, spam or illegal goods may be suspended without notice.</p>
      </InfoSection>
      <InfoSection heading="3. Buying">
        <p>Prices are shown in Ghana Cedis (GH₵) and include the seller's listed price. Delivery fees are shown before you pay.</p>
        <p>An order is confirmed only after payment succeeds, or after a Pay on Delivery order is accepted by the seller.</p>
      </InfoSection>
      <InfoSection heading="4. Selling">
        <p>Sellers must own the right to sell their items, describe them honestly, keep stock accurate and dispatch on time.</p>
        <p>Kivora charges a commission on each sale according to your subscription tier (Free, Starter or Premium).</p>
      </InfoSection>
      <InfoSection heading="5. Prohibited items">
        <p>Weapons, illegal drugs, counterfeit goods, stolen property and adult content may not be listed.</p>
      </InfoSection>
      <InfoSection heading="6. Payments and payouts">
        <p>Payments are processed by Paystack. Seller earnings are held in the Kivora wallet and paid out on approved withdrawal requests.</p>
      </InfoSection>
      <InfoSection heading="7. Liability">
        <p>Kivora is a platform, not the seller of record. We help resolve disputes but are not liable for indirect losses.</p>
      </InfoSection>
      <InfoSection heading="8. Changes">
        <p>We may update these terms. Continued use of Kivora after an update means you accept the new terms.</p>
      </InfoSection>
      <InfoSection heading="9. Contact">
        <p>Questions? Email support@kivora.gh or call 025 757 3471.</p>
      </InfoSection>
    </InfoPage>
  );
}
