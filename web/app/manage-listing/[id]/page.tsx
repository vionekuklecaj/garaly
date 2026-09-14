import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import ManageListingForm from "@/components/ManageListingForm";
import { getPageContext, backendGet } from "@/lib/session";
import type { Space } from "@/lib/types";

type SP = { lang?: string };

export default async function ManageListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SP>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, user, t } = await getPageContext(sp);

  if (!user) notFound();
  const space = await backendGet<Space>(`/api/spaces/${id}`);
  // get_space already only returns a non-approved listing to its own
  // owner (see routers/spaces.py) -- this is a second, explicit check so a
  // logged-in-but-different user hitting this URL directly gets a clean
  // 404 rather than a page that half-renders around a null space.
  if (!space || space.owner_id !== user.id) notFound();

  return (
    <PageShell lang={lang} user={user} t={t}>
      <main>
        <div className="container" style={{ paddingTop: 24, paddingBottom: 64 }}>
          <div className="breadcrumb">
            <a href={`/dashboard?lang=${lang}`}>{t.navDashboard}</a> / {space.title}
          </div>
          <h1 className="page-title hfont">{t.manageListingTitle}</h1>
          <ManageListingForm lang={lang} t={t} space={space} />
        </div>
      </main>
    </PageShell>
  );
}
