import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

const cases = [
  {
    id: "realtime-signage",
    title: "Realtime Signage Network",
    summary:
      "A web-managed content scheduling and playback platform for billboard-connected devices with live state monitoring.",
    status: "Case study draft slot"
  },
  {
    id: "competitive-intelligence",
    title: "Competitive Intelligence Engine",
    summary:
      "A large-scale product analytics workflow with daily scrapers, trend dashboards, and product catalog intelligence.",
    status: "Metrics and screenshots pending"
  },
  {
    id: "shopify-order-control",
    title: "Shopify Order Control",
    summary:
      "A post-order editing widget for Shopify merchants built with Laravel APIs and React Polaris.",
    status: "Public write-up pending"
  }
];

export default function PortfolioPage() {
  return (
    <main className="portfolioPage">
      <section className="portfolioHero">
        <Link className="backLink" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Home
        </Link>
        <p className="sectionKicker">Portfolio index</p>
        <h1>Future case studies, already framed for public release.</h1>
        <p>
          This page reserves a polished structure for deeper project write-ups
          as screenshots, permissions, and metrics become publishable.
        </p>
      </section>
      <section className="caseList" aria-label="Future case studies">
        {cases.map((item) => (
          <article className="caseItem" id={item.id} key={item.id}>
            <div>
              <p>{item.status}</p>
              <h2>{item.title}</h2>
              <span>{item.summary}</span>
            </div>
            <ArrowUpRight size={24} aria-hidden="true" />
          </article>
        ))}
      </section>
    </main>
  );
}
