import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPage, InfoSection } from "@/components/InfoPage";

export const Route = createFileRoute("/help")({
  component: HelpCenter,
  head: () => ({
    meta: [
      { title: "Help Center – Kivora Ghana" },
      { name: "description", content: "Get help with orders, delivery, payments, returns and selling on Kivora Ghana." },
      { property: "og:title", content: "Help Center – Kivora Ghana" },
      { property: "og:description", content: "Answers about orders, delivery, payments, returns and selling on Kivora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function HelpCenter() {
  return (
    <InfoPage
      title="Help Center"
      intro="Everything you need to know about shopping and selling on Kivora Ghana."
    >
      <InfoSection heading="Orders & tracking">
        <p>Every order gets a status you can follow: Pending, Confirmed, Shipped, Delivered or Cancelled.</p>
        <p>
          Open <Link to="/orders" className="text-primary font-semibold">Track Order</Link> to see live progress,
          delivery method and the seller handling your parcel.
        </p>
      </InfoSection>

      <InfoSection heading="Payments">
        <p>We accept Mobile Money and cards through Paystack, plus Pay on Delivery where the seller offers it.</p>
        <p>If a payment is cancelled, your cart stays exactly as it was so you can retry.</p>
      </InfoSection>

      <InfoSection heading="Delivery">
        <p>Choose door delivery (fee set by the seller) or free pickup at a seller pickup station at checkout.</p>
        <p>You receive an SMS and an inbox message at each stage of your order.</p>
      </InfoSection>

      <InfoSection heading="Returns & refunds">
        <p>
          Items can be returned within 7 days if faulty or not as described. See the{" "}
          <Link to="/returns" className="text-primary font-semibold">Return Policy</Link>.
        </p>
      </InfoSection>

      <InfoSection heading="Your account">
        <p>
          Update your name, photo, password and delivery addresses in{" "}
          <Link to="/settings" className="text-primary font-semibold">Account Settings</Link>.
        </p>
      </InfoSection>

      <InfoSection heading="Selling on Kivora">
        <p>
          Register a shop from <Link to="/seller" className="text-primary font-semibold">Sell on Kivora</Link>, list
          products, set delivery options and get paid to your payout account.
        </p>
      </InfoSection>

      <InfoSection heading="Still need us?">
        <p>Call 025 757 3471 or 055 247 4242.</p>
        <p>Email support@kivora.gh — we reply within one working day.</p>
      </InfoSection>
    </InfoPage>
  );
}
