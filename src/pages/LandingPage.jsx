import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock3,
  Headset,
  MapPin,
  Menu,
  X
} from 'lucide-react';
import { NestnnLogo } from '../components/ui/NestnnLogo';

const HERO_IMG =
  'https://images.unsplash.com/photo-1611892440504-42a792e38f93?auto=format&fit=crop&w=2400&q=80';

const modules = [
  {
    title: 'Front Desk',
    description:
      'Reservations, arrivals, and guest records stay aligned so every check-in feels composed.',
    image:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80',
    cta: 'Explore Front Desk',
    to: '/register'
  },
  {
    title: 'Rooms & Housekeeping',
    description:
      'Room readiness and housekeeping progress in one view—so teams always know what is next.',
    image:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80',
    cta: 'See Room Ops',
    to: '/register'
  },
  {
    title: 'Restaurant & Inventory',
    description:
      'Connect restaurant service with recipes, stock, and costs without leaving Nestnn.',
    image:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
    cta: 'View F&B Tools',
    to: '/register'
  }
];

const infoItems = [
  {
    icon: Clock3,
    title: 'Check-in / Out',
    lines: ['Flexible property hours', 'Configured per hotel']
  },
  {
    icon: MapPin,
    title: 'One Workspace',
    lines: ['Front desk to kitchen', 'Teams stay in sync']
  },
  {
    icon: Headset,
    title: 'Always Supported',
    lines: ['Guided onboarding', 'help@nestnn.com']
  }
];

export const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    const t = window.setTimeout(() => setReady(true), 40);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#14110f] font-landing text-[#f3ebe0] antialiased">
      {/* ── Nav over hero ── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled || menuOpen ? 'bg-[#14110f]/95 backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[78px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="flex items-center gap-3" aria-label="Nestnn home">
            <NestnnLogo size="md" className="!h-11 !w-[66px] brightness-110" />
            <span className="hidden border-l border-white/20 pl-3 sm:block">
              <span className="block font-display text-xl leading-none tracking-[0.04em] text-[#e8d5a8]">
                Nestnn
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.28em] text-white/55">
                Hotel Platform
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary">
            {[
              ['#home', 'Home'],
              ['#features', 'Features'],
              ['#discover', 'Platform'],
              ['#contact', 'Contact']
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[12px] font-medium uppercase tracking-[0.18em] text-white/75 transition hover:text-[#e8d5a8]"
              >
                {label}
              </a>
            ))}
            <Link
              to="/register"
              className="bg-[#c5a059] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1a1510] transition hover:bg-[#d4b36e]"
            >
              Get Started
            </Link>
          </nav>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center text-[#e8d5a8] md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-[#14110f] px-5 py-5 md:hidden">
            <div className="flex flex-col gap-4">
              {[
                ['#home', 'Home'],
                ['#features', 'Features'],
                ['#discover', 'Platform'],
                ['#contact', 'Contact']
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm uppercase tracking-[0.16em] text-white/80"
                >
                  {label}
                </a>
              ))}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm uppercase tracking-[0.16em] text-[#e8d5a8]"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="bg-[#c5a059] px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#1a1510]"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero (full-bleed) ── */}
      <section id="home" className="relative isolate min-h-[100svh]">
        <img
          src={HERO_IMG}
          alt="Luxury hotel suite with warm ambient lighting"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,10,8,0.55)_0%,rgba(12,10,8,0.35)_42%,rgba(12,10,8,0.78)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,rgba(197,160,89,0.12),transparent_55%)]" />

        <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-[7.5rem] pt-28 sm:px-8 sm:pb-36 lg:px-12 lg:pb-40">
          <div
            className={`max-w-3xl transition duration-700 ${
              ready ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <p className="mb-4 font-display text-2xl italic tracking-wide text-[#e8d5a8] sm:text-3xl">
              Nestnn
            </p>
            <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.02em] text-[#e8d5a8]">
              Experience Five-Star
              <span className="block">Operations</span>
            </h1>
            <p
              className={`mt-5 max-w-xl text-sm leading-7 text-white/80 sm:text-base transition delay-150 duration-700 ${
                ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              Unmatched clarity and elegance—front desk, rooms, restaurant, and payroll in one refined workspace.
            </p>
            <div
              className={`mt-8 flex flex-wrap gap-3 transition delay-300 duration-700 ${
                ready ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
              }`}
            >
              <Link
                to="/register"
                className="inline-flex min-h-12 items-center justify-center bg-[#c5a059] px-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1510] transition hover:bg-[#d4b36e]"
              >
                Book Your Demo
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-12 items-center justify-center border border-white/35 px-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 transition hover:border-[#c5a059] hover:text-[#e8d5a8]"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Hero info strip */}
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-[#0f0d0b]/72 backdrop-blur-md">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-5 sm:grid-cols-3 sm:gap-0 sm:px-8 sm:py-6 lg:px-12">
            {infoItems.map(({ icon: Icon, title, lines }, idx) => (
              <div
                key={title}
                className={`flex items-start gap-4 sm:px-6 ${
                  idx > 0 ? 'sm:border-l sm:border-white/10' : 'sm:pl-0'
                }`}
              >
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center border border-[#c5a059]/40 text-[#c5a059]">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8d5a8]">
                    {title}
                  </p>
                  {lines.map((line) => (
                    <p key={line} className="mt-1 text-xs leading-5 text-white/65 sm:text-sm">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three feature columns ── */}
      <section
        id="features"
        className="relative scroll-mt-20 overflow-hidden bg-[#1a1612] px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#c5a059_1px,transparent_0)] [background-size:28px_28px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-3 lg:gap-10">
          {modules.map((mod) => (
            <article key={mod.title} className="group flex flex-col">
              <h3 className="font-display text-3xl font-semibold tracking-wide text-[#f0e6d4] sm:text-[2rem]">
                {mod.title}
              </h3>
              <p className="mt-4 max-w-sm text-sm leading-7 text-white/55">
                {mod.description}
              </p>
              <div className="mt-8 overflow-hidden">
                <img
                  src={mod.image}
                  alt={mod.title}
                  className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <h4 className="mt-7 font-display text-2xl text-[#f0e6d4]">{mod.title}</h4>
              <p className="mt-3 text-sm leading-6 text-white/50">{mod.description}</p>
              <Link
                to={mod.to}
                className="mt-6 inline-flex w-fit items-center justify-center bg-[#c5a059] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1510] transition hover:bg-[#d4b36e]"
              >
                {mod.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── Discover split ── */}
      <section
        id="discover"
        className="scroll-mt-20 border-t border-white/5 bg-[#14110f] px-5 py-20 sm:px-8 sm:py-28 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-wide text-white sm:text-5xl">
              Discover{' '}
              <span className="italic text-[#c5a059]">Refined</span>
              <span className="block">Hospitality Software</span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-7 text-white/60 sm:text-[15px]">
              Nestnn brings the quiet confidence of a well-run property into every department—
              reservations, rooms, dining, staff payroll, and reporting—without the clutter of
              disconnected tools.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/60 sm:text-[15px]">
              Configure once, operate daily, and give every team a clear view of what matters for
              the guest in front of them.
            </p>
            <Link
              to="/register"
              className="mt-9 inline-flex min-h-12 items-center justify-center border border-white/30 px-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-[#c5a059] hover:text-[#e8d5a8]"
            >
              See All Modules
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80"
              alt="Luxury hotel bathroom"
              className="aspect-[3/4] w-full object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=900&q=80"
              alt="Resort balcony with ocean view"
              className="mt-8 aspect-[3/4] w-full object-cover sm:mt-12"
            />
          </div>
        </div>
      </section>

      {/* ── Leadership ── */}
      <section className="border-t border-white/5 bg-[#1a1612] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c5a059]">
            Leadership
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-[#f0e6d4] sm:text-5xl">
            The people behind Nestnn
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:max-w-4xl">
            {[
              { name: 'Ranjith Kumar Raja', image: '/ranjith-kumar-raja.jpg' },
              { name: 'S Thenmozhi', image: '/s-thenmozhi.jpg' }
            ].map(({ name, image }) => (
              <article key={name}>
                <img
                  src={image}
                  alt={name}
                  className="aspect-[4/5] w-full object-cover object-[center_28%]"
                />
                <h3 className="mt-5 font-display text-2xl text-[#e8d5a8]">{name}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section
        id="contact"
        className="scroll-mt-20 border-t border-white/5 bg-[#14110f] px-5 py-20 sm:px-8 sm:py-24 lg:px-12"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <h2 className="font-display text-4xl font-semibold text-[#e8d5a8] sm:text-5xl">
              Ready for a calmer property day?
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/60 sm:text-base">
              Register your hotel, choose your modules, and bring Nestnn into the heart of your operation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/register"
              className="inline-flex min-h-12 items-center bg-[#c5a059] px-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a1510] transition hover:bg-[#d4b36e]"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 items-center border border-white/30 px-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-[#c5a059]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0f0d0b]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-3">
            <NestnnLogo size="sm" className="!h-9 !w-[54px] brightness-110" />
            <span className="text-xs text-white/45">Thoughtful hotel management.</span>
          </div>
          <div className="flex gap-6 text-[11px] font-medium uppercase tracking-[0.16em] text-white/50">
            <Link to="/login" className="hover:text-[#e8d5a8]">Sign in</Link>
            <Link to="/register" className="hover:text-[#e8d5a8]">Register</Link>
          </div>
          <p className="text-[10px] text-white/35">© {new Date().getFullYear()} Nestnn</p>
        </div>
      </footer>
    </main>
  );
};
