import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Locale, Page } from '../../types';
import * as content from '../../services/contentService';
import { errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Markdown } from '../../components/Markdown';
import { PageHeader } from '../ui';
import { formatDate } from '../../lib/format';

const SLUGS = ['history', 'facilities', 'faq', 'privacy', 'cookies', 'terms', 'refunds', 'order-conditions'] as const;
const LOCALES: Locale[] = ['es', 'en', 'fr'];

export function Content() {
  const { t, i18n } = useTranslation();
  const { notify } = useToast();
  const [slug, setSlug] = useState<(typeof SLUGS)[number]>('history');
  const [locale, setLocale] = useState<Locale>('es');
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  const load = useCallback(() => {
    content.getPageForEdit(slug, locale).then((p) => {
      setPage(p);
      setTitle(p.draft_title ?? p.title);
      setBody(p.draft_body ?? p.body);
    }).catch((e) => notify(errorMessage(e), 'error'));
  }, [slug, locale, notify]);
  useEffect(() => { load(); }, [load]);

  async function saveDraft() {
    try { await content.saveDraft(slug, locale, { title, body }); notify(t('admin.content.draftSaved'), 'success'); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function publish() {
    try { await content.saveDraft(slug, locale, { title, body }); await content.publishPage(slug, locale); notify(t('admin.content.published'), 'success'); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function discard() {
    try { await content.discardDraft(slug, locale); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }

  const hasDraft = page?.draft_body != null;
  return (
    <div className="max-w-6xl">
      <PageHeader title={t('admin.nav.content')} subtitle={t('admin.content.subtitle')} />
      <div className="flex flex-wrap gap-2 mb-3">{SLUGS.map((s) => <button key={s} className={`chip ${slug === s ? 'chip-on' : 'chip-off'}`} onClick={() => setSlug(s)}>{t(`admin.content.pages.${s}`)}</button>)}</div>
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        {LOCALES.map((l) => <button key={l} className={`chip !py-1 ${locale === l ? 'chip-on' : 'chip-off'}`} onClick={() => setLocale(l)}>{l.toUpperCase()}</button>)}
        {page && <span className="text-xs text-charcoal/60 ml-2">{page.published ? t('admin.content.version', { v: page.version, date: formatDate(page.updated_at, i18n.language) }) : t('admin.content.unpublished')} {hasDraft && <span className="badge bg-gold/15 text-gold-dark ml-1">{t('admin.content.hasDraft')}</span>}</span>}
      </div>
      {['privacy', 'cookies', 'terms', 'refunds', 'order-conditions'].includes(slug) && <p className="card p-3 mb-4 text-sm border-l-4 border-l-rose">{t('admin.content.legalWarning')}</p>}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex gap-2 lg:hidden">{(['edit', 'preview'] as const).map((v) => <button key={v} className={`chip ${view === v ? 'chip-on' : 'chip-off'}`} onClick={() => setView(v)}>{t(`admin.content.${v}`)}</button>)}</div>
          <div className={view === 'preview' ? 'hidden lg:block' : ''}>
            <label className="block mb-3"><span className="label">{t('admin.content.title')}</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
            <label className="block"><span className="label">{t('admin.content.body')}</span><textarea className="input font-mono text-xs min-h-[420px]" value={body} onChange={(e) => setBody(e.target.value)} /></label>
            <p className="text-xs text-charcoal/50 mt-2">{t('admin.content.syntax')}</p>
          </div>
        </div>
        <div className={`card p-6 max-h-[600px] overflow-y-auto ${view === 'edit' ? 'hidden lg:block' : ''}`} aria-label={t('admin.content.preview')}>
          <p className="eyebrow mb-2">{t('admin.content.preview')}</p>
          <h1 className="text-3xl mb-4">{title}</h1>
          <Markdown source={body} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-6">
        <button className="btn-outline" onClick={saveDraft}>{t('admin.content.saveDraft')}</button>
        <button className="btn-primary" onClick={publish} disabled={!title.trim()}>{t('admin.content.publish')}</button>
        {hasDraft && <button className="btn-ghost text-rose" onClick={discard}>{t('admin.content.discard')}</button>}
      </div>
    </div>
  );
}
