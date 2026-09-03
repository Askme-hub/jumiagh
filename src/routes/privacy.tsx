import { createFileRoute } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () => ({
    meta: [
      { title: "Privacy Policy – Kivora Ghana" },
      { name: "description", content: "How Kivora Ghana collects, uses, shares and protects your personal information." },
      { property: "og:title", content: "Privacy Policy – Kivora Ghana" },
      { property: "og:description", content: "How Kivora collects, uses and protects your personal information." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Privacy() {
  return (
    <InfoPage title="Privacy Policy" intro="Last updated: September 2026. Your data stays yours — here is exactly how we handle it.">
      <InfoSection heading="What we collect">
        <p>Account details (name, email, phone, profile photo), delivery addresses, order history, and messages you send us.</p>
        <p>Technical data such as device type and pages visited, used to keep the app fast and secure.</p>
      </InfoSection>
      <InfoSection heading="How we use it">
        <p>To process orders, arrange delivery, send order SMS and inbox updates, prevent fraud and improve Kivora.</p>
      </InfoSection>
      <InfoSection heading="Who we share it with">
        <p>Sellers receive only what they need to fulfil your order: your name, delivery address and phone number.</p>
        <p>Paystack processes payments; BulkSMSGhana delivers order SMS. We never sell your data.</p>
      </InfoSection>
      <InfoSection heading="Cookies and storage">
        <p>We use local storage for your cart, theme preference and sign-in session. No advertising trackers.</p>
      </InfoSection>
      <InfoSection heading="Your rights">
        <p>You can view and edit your details in Account Settings, or request deletion of your account by emailing support@kivora.gh.</p>
      </InfoSection>
      <InfoSection heading="Security">
        <p>Data is encrypted in transit and protected by row-level access rules so only you and authorised staff can read your records.</p>
      </InfoSection>
      <InfoSection heading="Contact">
        <p>Privacy questions: support@kivora.gh, Accra, Ghana.</p>
      </InfoSection>
    </InfoPage>
  );
}
