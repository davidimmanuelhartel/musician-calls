import { notFound } from 'next/navigation';
import { dictionary, isLocale } from '@/lib/i18n';
import { currentUser, supabaseServer } from '@/lib/supabase/server';
import { CreateCallForm } from '@/components/create-call-form';
export default async function NewCall({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dictionary(locale);
  const user = await currentUser();
  let profile = null;
  if (user) {
    const db = await supabaseServer();
    profile = (
      await db.from('organizer_profiles').select('name,phone').eq('id', user.id).maybeSingle()
    ).data;
  }
  return (
    <div className="page">
      <div className="page-title">
        <p className="eyebrow">{t.findSub}</p>
        <h1>{t.newTitle}</h1>
        <p>{t.newIntro}</p>
      </div>
      <div className="form-layout">
        <CreateCallForm
          locale={locale}
          user={
            user
              ? {
                  id: user.id,
                  email: user.email || '',
                  name: profile?.name || '',
                  phone: profile?.phone || '',
                }
              : null
          }
        />
        <aside className="aside-note">
          <h3>{t.how}</h3>
          <p>{t.step1text}</p>
          <p>{t.step2text}</p>
          <p>{t.step3text}</p>
        </aside>
      </div>
    </div>
  );
}
