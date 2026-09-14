import Header from "./Header";
import Footer from "./Footer";
import ScrollReveal from "./ScrollReveal";
import type { Lang, Translator } from "@/lib/translations";
import type { User } from "@/lib/types";

type Props = {
  lang: Lang;
  user: User | null;
  t: Translator;
  children: React.ReactNode;
};

// The Next.js equivalent of app/templates/base.html -- every page renders
// its content inside this instead of a shared root layout, because a page
// needs its own searchParams (for ?lang=) to compute lang/user correctly,
// and root layouts don't receive searchParams in the App Router.
export default function PageShell({ lang, user, t, children }: Props) {
  return (
    <>
      <Header lang={lang} user={user} t={t} />
      <ScrollReveal />
      {children}
      <Footer lang={lang} t={t} />
    </>
  );
}
