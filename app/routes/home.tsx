import type { Route } from "./+types/home";
import { Simulator } from "../TBN/simulator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "TBN Simulator" },
    {
      name: "description",
      content: "Thermodynamic Binding Network Simulator",
    },
  ];
}

export default function Home() {
  return <Simulator />;
}