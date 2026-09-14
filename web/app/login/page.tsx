import PageShell from "@/components/PageShell";
import LoginForm from "@/components/LoginForm";
import { getPageContext } from "@/lib/session";

type SP = { lang?: string; next?: string };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);
  const next = sp.next || "/";

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="auth-wrap">
          <div className="auth-card">
            <h1 className="hfont">{t.login}</h1>
            <p className="sub2">{lang === "de" ? "Willkommen zurück bei Garaly." : "Welcome back to Garaly."}</p>

            <LoginForm lang={lang} next={next} />

            <div className="auth-switch">
              {lang === "de" ? "Noch kein Konto?" : "Don't have an account?"}{" "}
              <a href={`/register?lang=${lang}`}>{lang === "de" ? "Registrieren" : "Sign up"}</a>
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
