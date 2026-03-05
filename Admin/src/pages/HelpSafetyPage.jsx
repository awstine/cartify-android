import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

const POLICY_CARDS = [
  {
    title: "Returns & Refunds",
    description: "Delivered orders can be submitted for return/refund review from My Orders.",
  },
  {
    title: "Buyer Protection",
    description: "Disputes are reviewed by support/admin teams to resolve payment and delivery issues.",
  },
  {
    title: "Marketplace Safety",
    description: "Merchants are verified and monitored for policy compliance and fulfillment quality.",
  },
];

export const HelpSafetyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-heading text-2xl font-bold text-slate-900">Help & Safety</h1>
      <p className="mt-1 text-sm text-slate-600">Support actions, trust policies, and refund guidance.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {POLICY_CARDS.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={() => navigate("/my-orders")}>Open My Orders</Button>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to Shop
        </Button>
      </div>
    </div>
  );
};
