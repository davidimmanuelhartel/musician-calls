import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header, Footer } from '@/components/shell';
import { isLocale } from '@/lib/i18n';
import '../globals.css';
export const metadata: Metadata = {
  title: { default: 'Tutti — Find your next substitute', template: '%s · Tutti' },
  description: 'Last-minute substitute calls for orchestras, big bands and ensembles.',
};
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">
          {locale === 'da' ? 'Gå til indhold' : 'Skip to content'}
        </a>
        <div className="shell">
          <Header locale={locale} />
          <main id="main">{children}</main>
          <Footer locale={locale} />
        </div>
      </body>
    </html>
  );
}
