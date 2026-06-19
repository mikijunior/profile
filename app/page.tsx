import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Cloud,
  Code2,
  Database,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Monitor,
  Server,
  ShieldCheck,
  ShoppingCart
} from "lucide-react";
import DigitalTwinChat from "./components/DigitalTwinChat";

const linkedInUrl =
  "https://www.linkedin.com/in/%D1%81%D0%B5%D1%80%D0%B3%D1%96%D0%B9-%D0%B4%D1%80%D0%B0%D1%87%D1%83%D0%BA-26b134167";
const githubUrl = "https://github.com/mikijunior";

const metrics = [
  { value: "7.5+", label: "years building production systems" },
  { value: "100k+", label: "records processed daily in analytics flows" },
  { value: "5", label: "core domains: SaaS, data, commerce, media, security" },
  { value: "B2", label: "English communication level" }
];

const strengths = [
  {
    icon: Server,
    title: "Laravel platforms",
    body: "Deep Laravel ecosystem work across Eloquent, queues, events, migrations, testing, workers, and operational tooling."
  },
  {
    icon: Database,
    title: "Data-heavy systems",
    body: "Scrapers, dashboards, competitive intelligence, Elasticsearch, Redis, MySQL, PostgreSQL, and high-volume product catalogs."
  },
  {
    icon: Cloud,
    title: "Cloud operations",
    body: "AWS EC2, S3, Elastic Beanstalk, Docker, CI/CD, Sentry, queue workers, and production deployments."
  },
  {
    icon: ShieldCheck,
    title: "Technical leadership",
    body: "Code reviews, mentoring, estimation, SOLID/OOP discipline, architecture input, and reliable product communication."
  }
];

const journey = [
  {
    years: "2021 - Present",
    role: "Full Stack Developer",
    company: "GroupBWT",
    location: "Remote",
    points: [
      "Building scalable Laravel, Vue.js, Lumen, and React/Polaris systems for SaaS, commerce, analytics, and real-time device workflows.",
      "Leading monolith-to-self-hosted-SaaS migration work with billing, roles, subscriptions, heartbeat monitoring, and AI face-recognition access control.",
      "Delivered dynamic postcard campaigns, digital signage scheduling, Shopify post-order editing, and product analytics pipelines."
    ]
  },
  {
    years: "2018 - 2021",
    role: "PHP Developer",
    company: "MassMedia Group",
    location: "Khmelnytskyy, Ukraine",
    points: [
      "Shipped Laravel and Vue.js features across long-term and short-cycle projects, balancing new development with refactoring and bug fixes.",
      "Stepped into project sub-lead responsibilities, supported deployments, and kept product-owner communication clear.",
      "Raised code quality through reviews, mentoring, and practical team standards."
    ]
  },
  {
    years: "2015 - 2019",
    role: "MSc Computer Science",
    company: "Vinnytsia National Technical University",
    location: "Vinnytsia, Ukraine",
    points: [
      "Specialized in Artificial Intelligence Systems, building a strong foundation for modern backend, data, and automation work."
    ]
  }
];

const portfolio = [
  {
    icon: Monitor,
    title: "Realtime Signage Network",
    body: "Scheduling, live playback monitoring, device sync, rich media delivery, and operational visibility for billboard-connected devices.",
    tags: ["Laravel", "Vue.js", "Realtime", "Media"],
    href: "/portfolio#realtime-signage"
  },
  {
    icon: Database,
    title: "Competitive Intelligence Engine",
    body: "Daily data ingestion over 100,000+ product records with dashboards for catalog trends, market movement, and pricing insight.",
    tags: ["Scraping", "Analytics", "MySQL", "Elasticsearch"],
    href: "/portfolio#competitive-intelligence"
  },
  {
    icon: ShoppingCart,
    title: "Shopify Order Control",
    body: "Post-order editing experience for merchants using Laravel APIs and React Polaris to reduce support load after checkout.",
    tags: ["Shopify", "React", "Polaris", "Laravel"],
    href: "/portfolio#shopify-order-control"
  }
];

const skills = [
  "PHP",
  "Laravel",
  "Lumen",
  "MySQL",
  "PostgreSQL",
  "Redis",
  "Elasticsearch",
  "Docker",
  "AWS",
  "REST APIs",
  "GraphQL",
  "Vue.js",
  "React",
  "Shopify",
  "Node.js",
  "Golang"
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <Image
          className="heroImage"
          src="/assets/hero-command-center.png"
          alt="Cinematic command center representing enterprise software architecture"
          fill
          priority
          sizes="100vw"
        />
        <div className="heroShade" />
        <nav className="nav" aria-label="Primary navigation">
          <a className="brandMark" href="#top" aria-label="Serhii Drachuk home">
            SD
          </a>
          <div className="navLinks">
            <a href="#about">About</a>
            <a href="#journey">Journey</a>
            <a href="#portfolio">Portfolio</a>
            <a href="#digital-twin">AI Chat</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>
        <div className="heroContent">
          <p className="eyebrow">Senior PHP / Laravel Developer</p>
          <h1>Enterprise-grade backend engineering with a sharper edge.</h1>
          <p className="heroLead">
            I build SaaS platforms, data-intensive systems, e-commerce
            integrations, and real-time products that are designed to survive
            production pressure.
          </p>
          <div className="heroActions" aria-label="Primary links">
            <a className="button primary" href="mailto:mijunior.dev@gmail.com">
              <Mail size={18} aria-hidden="true" />
              Contact
            </a>
            <a className="button ghost" href="/Serhii-Drachuk-CV.html">
              <Download size={18} aria-hidden="true" />
              CV
            </a>
            <a
              className="iconButton"
              href={linkedInUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn profile"
              title="LinkedIn"
            >
              <ExternalLink size={20} aria-hidden="true" />
            </a>
            <a
              className="iconButton"
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub profile"
              title="GitHub"
            >
              <Code2 size={20} aria-hidden="true" />
            </a>
          </div>
          <div className="signalStrip" aria-label="Professional highlights">
            <span>Zielona Gora, Poland</span>
            <span>Remote full-time</span>
            <span>Open to senior product roles</span>
          </div>
        </div>
        <div className="heroMetrics" aria-label="Career metrics">
          {metrics.map((metric) => (
            <div className="metricCard" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section split" id="about">
        <div>
          <p className="sectionKicker">About</p>
          <h2>Backend craft, product context, production discipline.</h2>
        </div>
        <div className="aboutCopy">
          <p>
            I am Serhii Drachuk, a senior PHP/Laravel developer with more than
            seven years in production software. My strongest work sits at the
            intersection of clean backend architecture, pragmatic product
            delivery, and operational reliability.
          </p>
          <p>
            I have built and maintained SaaS platforms, large-scale analytics
            pipelines, digital signage systems, Shopify extensions, and
            microservice-oriented Laravel/Lumen applications. I like teams that
            value trust, clear technical standards, and ownership over
            micromanagement.
          </p>
          <div className="contactLine">
            <span>
              <MapPin size={17} aria-hidden="true" />
              Zielona Gora, Poland
            </span>
            <span>
              <Briefcase size={17} aria-hidden="true" />
              Senior product / SaaS roles
            </span>
          </div>
        </div>
      </section>

      <section className="section strengthBand" aria-label="Core strengths">
        <div className="strengthGrid">
          {strengths.map((strength) => {
            const Icon = strength.icon;
            return (
              <article className="strengthCard" key={strength.title}>
                <div className="cardIcon">
                  <Icon size={22} aria-hidden="true" />
                </div>
                <h3>{strength.title}</h3>
                <p>{strength.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section" id="journey">
        <div className="sectionHeader">
          <p className="sectionKicker">Career journey</p>
          <h2>From Laravel delivery to architecture-level ownership.</h2>
        </div>
        <div className="timeline">
          {journey.map((item) => (
            <article className="timelineItem" key={`${item.company}-${item.years}`}>
              <div className="timelineDate">{item.years}</div>
              <div className="timelineBody">
                <div className="roleRow">
                  <div>
                    <h3>{item.role}</h3>
                    <p>
                      {item.company} <span>{item.location}</span>
                    </p>
                  </div>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </div>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section portfolioBand" id="portfolio">
        <div className="sectionHeader compact">
          <p className="sectionKicker">Portfolio</p>
          <h2>Case studies staged for a future public portfolio.</h2>
          <Link className="textLink" href="/portfolio">
            Portfolio index
            <ExternalLink size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="portfolioGrid">
          {portfolio.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="portfolioCard" href={item.href} key={item.title}>
                <div className="portfolioTop">
                  <div className="cardIcon">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <div className="tagRow">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section split skillsSection">
        <div>
          <p className="sectionKicker">Stack</p>
          <h2>A practical toolkit for reliable product systems.</h2>
        </div>
        <div className="skillWall">
          {skills.map((skill) => (
            <span key={skill}>{skill}</span>
          ))}
        </div>
      </section>

      <section className="section twinSection" id="digital-twin">
        <div className="twinIntro">
          <p className="sectionKicker">AI digital twin</p>
          <h2>Ask the version of me trained on this career profile.</h2>
          <p>
            The chat uses OpenRouter on the server side and answers from the
            same CV-backed context as this portfolio, so recruiters and clients
            can quickly pressure-test fit, stack depth, and project experience.
          </p>
        </div>
        <DigitalTwinChat />
      </section>

      <section className="section contactSection" id="contact">
        <div>
          <p className="sectionKicker">Contact</p>
          <h2>Available for senior Laravel, SaaS, and backend-heavy product work.</h2>
        </div>
        <div className="contactActions">
          <a className="button primary" href="mailto:mijunior.dev@gmail.com">
            <Mail size={18} aria-hidden="true" />
            mijunior.dev@gmail.com
          </a>
          <a className="button ghost dark" href={linkedInUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={18} aria-hidden="true" />
            LinkedIn
          </a>
        </div>
      </section>
    </main>
  );
}
