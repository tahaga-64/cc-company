"use client";

type Plan = "free" | "pro";

interface Props {
  plan: Plan;
}

export default function PlanBadge({ plan }: Props) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        plan === "pro"
          ? "bg-yellow-100 text-yellow-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {plan === "pro" ? "PRO" : "無料"}
    </span>
  );
}
