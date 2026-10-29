import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageAsset } from '../../types';
import * as content from '../../services/contentService';
import { assetUrl, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../../components/Modal';
import { Field, PageHeader, Toggle } from '../ui';

const TYPES = ['facility', 'gallery', 'banner', 'hero', 'logo', 'favicon', 'qr'] as const;

export function Images() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [type, setType] = useState<(typeof TYPES)[number]>('facility');
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [meta, setMeta] = useState({ alt_text: '', is_illustrative: false, source: '', license: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ImageAsset | null>(null);
  const load = useCallback(() => { content.listImages(type).then(setImages).catch(() => {}); }, [type]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | null) {
    if (f && f.size > 5 * 1024 * 1024) { notify(t('errors.file_too_large'), 'error'); return; }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }
  async function upload() {
    if (!file) return;
    try {
      await content.uploadImage(file, { entity_type: type, ...meta });
      notify(t('admin.images.uploaded'), 'success');
      pick(null); setMeta({ alt_text: '', is_illustrative: false, source: '', license: '' }); load();
    } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function remove() {
    try { await content.deleteImage(deleting!.id); setDeleting(null); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title={t('admin.nav.images')} subtitle={t('admin.images.subtitle')} />
      <div className="flex flex-wrap gap-2 mb-6">{TYPES.map((k) => <button key={k} className={`chip ${type === k ? 'chip-on' : 'chip-off'}`} onClick={() => setType(k)}>{t(`admin.images.types.${k}`)}</button>)}</div>
      <section className="card p-5 mb-6 grid md:grid-cols-[200px_1fr] gap-5">
        <div className="aspect-square rounded-xl bg-almond overflow-hidden flex items-center justify-center text-xs text-charcoal/50">
          {preview ? <img src={preview} alt={t('admin.images.preview')} className="w-full h-full object-cover" /> : t('admin.images.preview')}
        </div>
        <div className="grid gap-3">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-charcoal/50">{t('admin.images.rules')}</p>
          <Field label={t('admin.images.alt')}><input className="input" value={meta.alt_text} onChange={(e) => setMeta({ ...meta, alt_text: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('admin.images.source')}><input className="input" value={meta.source} onChange={(e) => setMeta({ ...meta, source: e.target.value })} /></Field>
            <Field label={t('admin.images.license')}><input className="input" value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value })} /></Field>
          </div>
          <Toggle checked={meta.is_illustrative} onChange={(v) => setMeta({ ...meta, is_illustrative: v })} label={t('admin.images.illustrative')} />
          <button className="btn-primary w-fit" disabled={!file} onClick={upload}>{t('admin.images.upload')}</button>
        </div>
      </section>
      {['logo', 'favicon', 'hero', 'qr'].includes(type) && <p className="text-sm text-charcoal/60 mb-4">{t('admin.images.useInSettings')}</p>}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <li key={img.id} className="card overflow-hidden">
            <img src={assetUrl(img.url)} alt={img.alt_text || ''} className="w-full aspect-square object-cover" loading="lazy" />
            <div className="p-3 text-xs space-y-1">
              {img.is_illustrative && <span className="badge bg-gold/15 text-gold-dark">{t('home.illustrativeShort')}</span>}
              <p className="truncate text-charcoal/60">{img.width}×{img.height} {img.license && `· ${img.license}`}</p>
              <div className="flex gap-2">
                <button className="underline" onClick={() => { navigator.clipboard?.writeText(img.url); notify(t('admin.images.copied'), 'success'); }}>{t('admin.images.copyUrl')}</button>
                <button className="underline text-rose ml-auto" onClick={() => setDeleting(img)}>{t('common.delete')}</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmModal open={!!deleting} danger title={t('admin.images.deleteTitle')} description={t('admin.images.deleteText')} onConfirm={remove} onCancel={() => setDeleting(null)} />
    </div>
  );
}
