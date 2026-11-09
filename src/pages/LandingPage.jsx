import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarCheck2,
  ChartNoAxesCombined,
  Check,
  ChefHat,
  ClipboardCheck,
  ConciergeBell,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UsersRound
} from 'lucide-react';
import { NestnnLogo } from '../components/ui/NestnnLogo';

const modules = [
  {
    icon: ConciergeBell,
    title: 'Front desk, in sync',
    description: 'Keep reservations, arrivals, guest details and daily tasks connected in one workspace.'
  },
  {
    icon: BedDouble,
    title: 'Rooms that are ready',
    description: 'See room status and housekeeping progress so teams know what needs attention.'
  },
  {
    icon: ChefHat,
    title: 'Restaurant & inventory',
    description: 'Connect restaurant orders with recipes, raw materials, batches and stock movement.'
  },
  {
    icon: ChartNoAxesCombined,
    title: 'A clearer operating picture',
    description: 'Bring billing, expenses and operational reports together for informed decisions.'
  }
];

const workflow = [
  { number: '01', title: 'Welcome the guest', description: 'Manage bookings, check-ins and guest information from the front desk.' },
  { number: '02', title: 'Coordinate the stay', description: 'Keep rooms, housekeeping, restaurant and maintenance teams aligned.' },
  { number: '03', title: 'Understand the operation', description: 'Review billing, inventory and reports with a connected view of the hotel.' }
];

export const LandingPage = () => (
  <main className="min-h-screen overflow-hidden bg-[#fbf8f3] text-[#30231d]">
    <header className="relative z-10 border-b border-[#e9dfd2] bg-[#fbf8f3]/95">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" aria-label="Nestnn home" className="flex items-center">
          <NestnnLogo size="md" className="!h-12 !w-[74px]" />
          <span className="ml-3 hidden border-l border-[#dfd1bd] pl-3 text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] text-[#827364] sm:block">
            Hotel management
            <span className="block text-[#b17c35]">Made thoughtful</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6" aria-label="Main navigation">
          <a href="#platform" className="hidden text-sm font-medium text-[#716359] transition hover:text-[#3b241a] sm:inline">Platform</a>
          <a href="#how-it-works" className="hidden text-sm font-medium text-[#716359] transition hover:text-[#3b241a] md:inline">How it works</a>
          <Link to="/login" className="px-2 py-2 text-sm font-semibold text-[#4c392d] transition hover:text-[#a96f20]">Sign in</Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#3b241a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(59,36,26,0.16)] transition hover:bg-[#291810] sm:px-5"
          >
            Get started <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>

    <section className="relative isolate">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_25%,rgba(214,180,119,0.19),transparent_38%),linear-gradient(180deg,#fbf8f3_0%,#f6efe5_100%)]" />
      <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-12 lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e5d7c3] bg-white/70 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.19em] text-[#9b6b2e] shadow-sm sm:text-xs">
            <Sparkles className="h-4 w-4" />
            A more considered way to run a hotel
          </div>
          <h1 className="max-w-2xl text-[clamp(3.35rem,7.3vw,6.6rem)] font-light leading-[0.91] tracking-[-0.065em] text-[#38251b]">
            Hospitality,
            <span className="mt-1 block font-serif italic text-[#9a6b36]">in harmony.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#72665c] sm:text-lg sm:leading-8">
            The calm behind a memorable stay. Nestnn brings your hotel’s day-to-day operations into one connected place—from the first reservation to the final bill.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#3b241a] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(59,36,26,0.2)] transition hover:-translate-y-0.5 hover:bg-[#291810]"
            >
              Bring your hotel together <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#platform"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d9c9b3] bg-white/50 px-6 text-sm font-semibold text-[#4f3d31] transition hover:border-[#ad8955] hover:bg-white"
            >
              Explore the platform <ArrowDown className="h-4 w-4" />
            </a>
          </div>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-[#84776b]">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#a5793e]" /> One connected workspace</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-[#a5793e]" /> Built around hotel teams</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[650px] lg:ml-auto">
          <div className="absolute -right-4 -top-8 h-40 w-40 rounded-full bg-[#d7b77d]/25 blur-3xl sm:-right-8 sm:-top-10 sm:h-56 sm:w-56" />
          <div className="absolute -bottom-8 -left-6 h-44 w-44 rounded-full bg-[#876148]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[30px] border border-white/70 bg-[#e6d9c8] p-2.5 shadow-[0_32px_90px_rgba(59,36,26,0.2)] sm:rounded-[36px] sm:p-3">
            <div className="relative min-h-[390px] overflow-hidden rounded-[24px] sm:min-h-[490px] sm:rounded-[29px]">
              <img
                src="/login-landscape.jpg"
                alt="A welcoming hotel landscape at golden hour"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(37,27,21,0.02)_25%,rgba(37,27,21,0.68)_100%)]" />
              <div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-7 sm:right-7 sm:top-7">
                <span className="rounded-full border border-white/30 bg-[#2a211b]/20 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md sm:text-[10px]">
                  The Nestnn experience
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md">
                  <Building2 className="h-4 w-4" />
                </span>
              </div>
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f4d59e]">
                  <span className="h-px w-7 bg-[#e4c384]" /> Every detail, in its place
                </div>
                <p className="max-w-md font-serif text-3xl leading-tight text-white sm:text-5xl">
                  More presence for the moments that matter.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -left-2 top-[24%] hidden w-[205px] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_16px_45px_rgba(59,36,26,0.16)] backdrop-blur-xl sm:block lg:-left-12">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b7b6d]">
              <CalendarCheck2 className="h-4 w-4 text-[#a5793e]" /> Today, together
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                ['Front desk', 'Arrivals & stays'],
                ['Housekeeping', 'Room readiness'],
                ['Restaurant', 'Orders & recipes']
              ].map(([team, task]) => (
                <div key={team} className="flex items-center justify-between border-t border-[#eee6dc] pt-2.5">
                  <span className="text-xs font-semibold text-[#44342a]">{team}</span>
                  <span className="text-[10px] text-[#918477]">{task}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 right-4 hidden items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-[0_16px_45px_rgba(59,36,26,0.15)] backdrop-blur-xl sm:flex lg:right-0">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3eadb] text-[#936b3e]"><ShieldCheck className="h-5 w-5" /></span>
            <span>
              <span className="block text-xs font-bold text-[#3b2b21]">One clearer view</span>
              <span className="mt-0.5 block text-[10px] text-[#8a7b6d]">Operations, connected</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section className="border-y border-[#ece3d8] bg-white/60">
      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12">
        {[
          [LayoutDashboard, 'One workspace', 'A shared operating picture for your hotel'],
          [UsersRound, 'Connected teams', 'Keep daily handoffs clear and coordinated'],
          [ClipboardCheck, 'Thoughtful control', 'Manage the details behind great service']
        ].map(([Icon, title, description]) => (
          <div key={title} className="flex items-center gap-4 px-2 py-2 sm:justify-center sm:border-r sm:border-[#eee6dc] last:sm:border-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f4ecdf] text-[#9b713e]"><Icon className="h-5 w-5" /></span>
            <span>
              <span className="block text-sm font-bold text-[#45342a]">{title}</span>
              <span className="mt-1 block text-xs text-[#85776b]">{description}</span>
            </span>
          </div>
        ))}
      </div>
    </section>

    <section id="platform" className="scroll-mt-8 px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#a5793e] sm:text-xs">The platform</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] text-[#3d291e] sm:text-5xl">
            The whole stay, thoughtfully connected.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#786b60] sm:text-base">
            Great hospitality is a team effort. Give every team the context and tools to make each handoff feel effortless.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {modules.map(({ icon: Icon, title, description }, index) => (
            <article key={title} className="group rounded-[24px] border border-[#e9dfd2] bg-white p-6 shadow-[0_10px_30px_rgba(59,36,26,0.04)] transition duration-300 hover:-translate-y-1 hover:border-[#d3bd9c] hover:shadow-[0_22px_48px_rgba(59,36,26,0.09)]">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f5efe5] text-[#936b3e] transition group-hover:bg-[#3b241a] group-hover:text-[#f2d6a5]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-serif text-sm italic text-[#c4b39c]">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-base font-bold text-[#3b2b21]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#817469]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="how-it-works" className="scroll-mt-8 bg-[#352219] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e2bd7a] sm:text-xs">A smoother rhythm</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
            From arrival to farewell.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/65 sm:text-base">
            Nestnn helps the work behind the welcome feel more connected, so your team can focus on the guest in front of them.
          </p>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#f1d59f] transition hover:text-white">
            See what Nestnn can do <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-white/10 border-y border-white/10">
          {workflow.map((step) => (
            <div key={step.number} className="grid gap-3 py-6 sm:grid-cols-[60px_1fr] sm:gap-5 sm:py-7">
              <span className="font-serif text-lg italic text-[#d9b677]">{step.number}</span>
              <div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 max-w-lg text-sm leading-6 text-white/60">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[30px] bg-[#eee4d5] px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
        <div className="absolute -right-14 -top-24 h-72 w-72 rounded-full border border-[#d6c3a6]/60" />
        <div className="absolute -right-1 -top-12 h-52 w-52 rounded-full border border-[#d6c3a6]/60" />
        <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a6b36] sm:text-xs">A better day starts here</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.035em] text-[#3d291e] sm:text-5xl">
              Make room for better hospitality.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#786b60] sm:text-base">
              Bring your hotel’s everyday operations together with Nestnn.
            </p>
          </div>
          <Link to="/register" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-full bg-[#3b241a] px-6 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#291810]">
            Get started <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>

    <footer className="border-t border-[#e9dfd2] bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <NestnnLogo size="sm" className="!h-9 !w-[54px]" />
          <span className="text-xs text-[#817469]">Thoughtful hotel management.</span>
        </div>
        <div className="flex items-center gap-5 text-xs font-medium text-[#75685d]">
          <Link to="/login" className="transition hover:text-[#a96f20]">Sign in</Link>
          <Link to="/register" className="transition hover:text-[#a96f20]">Register your hotel</Link>
        </div>
        <p className="text-[10px] text-[#9a8d81]">© {new Date().getFullYear()} Nestnn</p>
      </div>
    </footer>
  </main>
);
