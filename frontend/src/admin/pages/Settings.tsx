import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DeliveryZone, ImageAsset, PaymentMethod, Settings } from '../../types';
import * as content from '../../services/contentService';
import * as paymentService from '../../services/paymentService';
import { assetUrl, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { centsToInput, parseMoneyInput } from '../../lib/format';
import { DAYS, Hours, parseHours } from '../../lib/hours';
import { Modal } from '../../components/Modal';
import { Field, PageHeader, Tabs, Toggle } from '../ui';

type Tab = 'business' | 'hours' | 'brand' | 'orders' | 'payments' | 'privacy';
const PALETTES = ['espresso', 'cacao', 'olivo', 'noche'];

export function SettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { config, reload } = useConfig();
  const [tab, setTab] = useState<Tab>('business');
  const [draft, setDraft] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const saved = useMemo(() => config?.settings ?? {}, [config]);
  useEffect(() => { setDraft(saved); }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const changed = useMemo(() => Object.keys(draft).filter((k) => draft[k] !== saved[k]), [draft, saved]);
  const set = (k: string) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const input = (k: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className="input" value={draft[k] ?? ''} onChange={(e) => set(k)(e.target.value)} {...props} />
  );

  async function save() {
    setSaving(true);
    try {
      const payload = Object.fromEntries(changed.map((k) => [k, draft[k]]));
      await content.updateSettings(payload);
      await reload();
      notify(t('admin.settings.saved', { count: changed.length }), 'success');
    } catch (e) { notify(errorMessage(e), 'error'); } finally { setSaving(false); }
  }

  return (
    <div className="max-w-5xl pb-24">
      <PageHeader title={t('admin.nav.settings')} subtitle={t('admin.settings.subtitle')} />
      <Tabs value={tab} onChange={setTab} tabs={(['business', 'hours', 'brand', 'orders', 'payments', 'privacy'] as Tab[]).map((id) => ({ id, label: t(`admin.settings.tabs.${id}`) }))} />

      {tab === 'business' && (
        <div className="card p-6 grid sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.businessName')}>{input('business_name', { maxLength: 80 })}</Field>
          <Field label={t('admin.settings.slogan')}>{input('slogan', { maxLength: 160 })}</Field>
          <Field label={t('admin.settings.legalName')}>{input('legal_name')}</Field>
          <Field label={t('admin.settings.taxId')}>{input('tax_id')}</Field>
          <Field label={t('admin.settings.address')}>{input('address')}</Field>
          <Field label={t('admin.settings.city')}>{input('city')}</Field>
          <Field label={t('admin.settings.lat')} hint={t('admin.settings.latHint')}>{input('latitude', { inputMode: 'decimal' })}</Field>
          <Field label={t('admin.settings.lng')}>{input('longitude', { inputMode: 'decimal' })}</Field>
          <Field label={t('admin.settings.maps')} hint="https://…">{input('gmaps_link')}</Field>
          <Field label={t('checkout.phone')}>{input('phone')}</Field>
          <Field label="WhatsApp">{input('whatsapp')}</Field>
          <Field label="Email">{input('email', { type: 'email' })}</Field>
          <Field label="Instagram" hint="https://…">{input('social_instagram')}</Field>
          <Field label="Facebook" hint="https://…">{input('social_facebook')}</Field>
          <Field label="TikTok" hint="https://…">{input('social_tiktok')}</Field>
          <Field label={t('admin.settings.timezone')}>{input('timezone')}</Field>
        </div>
      )}

      {tab === 'hours' && <HoursEditor value={draft.opening_hours} onChange={set('opening_hours')} />}

      {tab === 'brand' && <BrandEditor draft={draft} set={set} />}

      {tab === 'orders' && (
        <div className="space-y-6">
          <div className="card p-6 grid sm:grid-cols-2 gap-4">
            <Toggle checked={draft.pickup_enabled === 'true'} onChange={(v) => set('pickup_enabled')(String(v))} label={t('checkout.pickup')} />
            <Toggle checked={draft.delivery_enabled === 'true'} onChange={(v) => set('delivery_enabled')(String(v))} label={t('checkout.deliveryOpt')} />
            <Field label={t('admin.settings.minOrder')} hint={t('admin.settings.minOrderHint')}>
              <input className="input" inputMode="decimal" value={centsToInput(Number(draft.delivery_min_order_cents || 0))}
                onChange={(e) => { const c = parseMoneyInput(e.target.value || '0'); if (c !== null) set('delivery_min_order_cents')(String(c)); }} />
            </Field>
            <Toggle checked={draft.prices_include_tax === 'true'} onChange={(v) => set('prices_include_tax')(String(v))} label={t('admin.settings.pricesIncludeTax')} />
          </div>
          <Zones zones={config?.deliveryZones || []} onChanged={reload} />
        </div>
      )}

      {tab === 'payments' && <PaymentMethods />}

      {tab === 'privacy' && (
        <div className="card p-6 grid sm:grid-cols-2 gap-4">
          <Field label={t('admin.settings.policyVersion')} hint={t('admin.settings.policyVersionHint')}>{input('policy_version')}</Field>
          <Field label={t('admin.settings.retention')} hint={t('admin.settings.retentionHint')}>{input('data_retention_months', { inputMode: 'numeric' })}</Field>
          <Toggle checked={draft.low_stock_alerts_enabled === 'true'} onChange={(v) => set('low_stock_alerts_enabled')(String(v))} label={t('admin.settings.lowStockAlerts')} />
        </div>
      )}

      {changed.length > 0 && !['payments'].includes(tab) && (
        <div className="fixed bottom-4 right-4 left-4 lg:left-72 z-30 card bg-espresso text-cream p-4 flex flex-wrap items-center justify-between gap-3 shadow-lift">
          <span className="text-sm">{t('admin.settings.pending', { count: changed.length })}</span>
          <div className="flex gap-2">
            <button className="btn-glass btn-sm" onClick={() => setDraft(saved)}>{t('admin.settings.discard')}</button>
            <button className="btn-gold btn-sm" onClick={save} disabled={saving}>{saving ? t('common.saving') : t('admin.settings.publish')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function HoursEditor({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const hours: Hours = parseHours(value) || Object.fromEntries(DAYS.map((d) => [d, []])) as unknown as Hours;
  const update = (next: Hours) => onChange(JSON.stringify(next));
  return (
    <div className="card p-6 space-y-3">
      {DAYS.map((d) => (
        <div key={d} className="flex flex-wrap items-center gap-3 py-2 border-b border-espresso/5">
          <span className="w-28 font-medium">{t(`days.${d}`)}</span>
          {hours[d].length === 0 && <span className="text-sm text-charcoal/50">{t('hours.closed')}</span>}
          {hours[d].map(([a, b], i) => (
            <span key={i} className="flex items-center gap-1">
              <input type="time" className="input !w-28 !py-1.5" value={a} onChange={(e) => update({ ...hours, [d]: hours[d].map((r, j) => (j === i ? [e.target.value, r[1]] : r)) })} />–
              <input type="time" className="input !w-28 !py-1.5" value={b} onChange={(e) => update({ ...hours, [d]: hours[d].map((r, j) => (j === i ? [r[0], e.target.value] : r)) })} />
              <button className="text-rose px-1" onClick={() => update({ ...hours, [d]: hours[d].filter((_, j) => j !== i) })} aria-label={t('common.delete')}>✕</button>
            </span>
          ))}
          {hours[d].length < 3 && <button className="btn-ghost btn-sm" onClick={() => update({ ...hours, [d]: [...hours[d], ['08:00', '18:00']] })}>+ {t('admin.settings.addRange')}</button>}
        </div>
      ))}
      <p className="text-xs text-charcoal/50">{t('admin.settings.hoursHint')}</p>
    </div>
  );
}

function BrandEditor({ draft, set }: { draft: Settings; set: (k: string) => (v: string) => void }) {
  const { t } = useTranslation();
  const [images, setImages] = useState<ImageAsset[]>([]);
  useEffect(() => { Promise.all(['logo', 'favicon', 'hero', 'gallery', 'facility'].map((k) => content.listImages(k).catch(() => []))).then((r) => setImages(r.flat())); }, []);
  const choose = (key: string, types: string[]) => (
    <select className="input" value={draft[key] || ''} onChange={(e) => set(key)(e.target.value)}>
      <option value="">{t('admin.settings.none')}</option>
      {key.startsWith('hero') || key.startsWith('story') ? <>
        <option value="/media/cafe-interior-poster.webp">{t('admin.settings.defaultInterior')}</option>
        <option value="/media/cafe-fireplace-poster.webp">{t('admin.settings.defaultFireplace')}</option>
      </> : null}
      {images.filter((i) => types.includes(i.entity_type)).map((i) => <option key={i.id} value={i.url}>{i.alt_text || i.url.split('/').pop()}</option>)}
    </select>
  );
  return (
    <div className="space-y-6">
      <div className="card p-6 grid sm:grid-cols-2 gap-6">
        <Field label={t('admin.settings.logo')} hint={t('admin.settings.uploadInImages')}>{choose('logo_url', ['logo'])}</Field>
        <Field label={t('admin.settings.favicon')}>{choose('favicon_url', ['favicon', 'logo'])}</Field>
        <Field label={t('admin.settings.heroPoster')}>{choose('hero_poster_url', ['hero', 'gallery', 'facility'])}</Field>
        <Field label={t('admin.settings.heroVideo')} hint={t('admin.settings.heroVideoHint')}>
          <select className="input" value={draft.hero_video_url || ''} onChange={(e) => set('hero_video_url')(e.target.value)}>
            <option value="">{t('admin.settings.noVideo')}</option>
            <option value="/media/cafe-interior-720.mp4">{t('admin.settings.defaultInterior')}</option>
            <option value="/media/cafe-fireplace-720.mp4">{t('admin.settings.defaultFireplace')}</option>
          </select>
        </Field>
        <Toggle checked={draft.hero_is_illustrative === 'true'} onChange={(v) => set('hero_is_illustrative')(String(v))} label={t('admin.settings.heroIllustrative')} />
        <Field label={t('admin.settings.storyPoster')}>{choose('story_poster_url', ['hero', 'gallery', 'facility'])}</Field>
      </div>
      <div className="card p-6">
        <span className="label">{t('admin.settings.palette')}</span>
        <div className="flex flex-wrap gap-3">
          {PALETTES.map((p) => (
            <button key={p} onClick={() => set('brand_palette')(p)} data-palette={p} className={`rounded-xl p-3 border-2 ${draft.brand_palette === p ? 'border-gold' : 'border-transparent'}`} aria-pressed={draft.brand_palette === p}>
              <span className="flex gap-1">{['espresso', 'gold', 'cream', 'olive'].map((c) => <span key={c} className="w-6 h-6 rounded-full border border-black/10" style={{ background: `rgb(var(--c-${c}))` }} />)}</span>
              <span className="text-xs mt-1 block">{t(`admin.settings.palettes.${p}`)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-charcoal/50 mt-2">{t('admin.settings.paletteHint')}</p>
      </div>
      <div className="card p-6 grid gap-4">
        {(['es', 'en', 'fr'] as const).map((l) => (
          <div key={l} className="grid sm:grid-cols-3 gap-3">
            <Field label={`${t('admin.settings.heroTitle')} (${l.toUpperCase()})`}><input className="input" maxLength={160} value={draft[`hero_title_${l}`] || ''} onChange={(e) => set(`hero_title_${l}`)(e.target.value)} /></Field>
            <Field label={`${t('admin.settings.heroSubtitle')} (${l.toUpperCase()})`}><input className="input" maxLength={400} value={draft[`hero_subtitle_${l}`] || ''} onChange={(e) => set(`hero_subtitle_${l}`)(e.target.value)} /></Field>
            <Field label={`${t('admin.settings.announcement')} (${l.toUpperCase()})`}><input className="input" maxLength={200} value={draft[`announcement_${l}`] || ''} onChange={(e) => set(`announcement_${l}`)(e.target.value)} /></Field>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <p className="label">{t('admin.content.preview')}</p>
        <div className="relative rounded-xl overflow-hidden h-56 bg-espresso" data-palette={draft.brand_palette}>
          {draft.hero_poster_url && <img src={assetUrl(draft.hero_poster_url)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
          <div className="absolute inset-0 vignette" />
          <div className="relative p-6 text-cream">
            {draft.logo_url && <img src={assetUrl(draft.logo_url)} alt="" className="h-10 mb-3" />}
            <p className="font-display text-3xl">{draft.hero_title_es}</p>
            <p className="text-sm text-cream/80 mt-2 max-w-md">{draft.hero_subtitle_es}</p>
            <span className="btn-gold btn-sm mt-4 inline-flex">{t('home.ctaMenu')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Zones({ zones, onChanged }: { zones: DeliveryZone[]; onChanged: () => void }) {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { money } = useConfig();
  const [editing, setEditing] = useState<{ id?: number; name: string; cost: string; eta: string; active: boolean } | null>(null);
  async function save() {
    if (!editing) return;
    const cost = parseMoneyInput(editing.cost || '0');
    if (!editing.name || cost === null) return;
    try { await content.saveZone(editing.id ?? null, { name: editing.name, cost_cents: cost, estimated_time_minutes: Number(editing.eta) || 30, active: editing.active }); setEditing(null); onChanged(); }
    catch (e) { notify(errorMessage(e), 'error'); }
  }
  return (
    <section className="card p-6">
      <div className="flex justify-between mb-3"><h2 className="text-xl">{t('admin.settings.zones')}</h2><button className="btn-outline btn-sm" onClick={() => setEditing({ name: '', cost: '0', eta: '30', active: true })}>+ {t('admin.settings.newZone')}</button></div>
      <ul className="divide-y divide-espresso/10 text-sm">{zones.map((z) => (
        <li key={z.id} className={`py-2 flex justify-between items-center ${!z.active ? 'opacity-50' : ''}`}>
          <span>{z.name} · {money(z.cost_cents)} · ~{z.estimated_time_minutes} min</span>
          <button className="btn-ghost btn-sm" onClick={() => setEditing({ id: z.id, name: z.name, cost: centsToInput(z.cost_cents), eta: String(z.estimated_time_minutes), active: z.active })}>{t('common.edit')}</button>
        </li>
      ))}</ul>
      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? t('common.edit') : t('admin.settings.newZone')}>
          <div className="grid gap-3">
            <Field label={t('admin.fields.name')}><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label={t('admin.settings.zoneCost')}><input className="input" inputMode="decimal" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: e.target.value })} /></Field>
            <Field label={t('admin.settings.zoneEta')}><input type="number" className="input" value={editing.eta} onChange={(e) => setEditing({ ...editing, eta: e.target.value })} /></Field>
            <Toggle checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label={t('admin.active')} />
          </div>
          <div className="flex justify-end gap-2 mt-6"><button className="btn-ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</button><button className="btn-primary" onClick={save}>{t('common.save')}</button></div>
        </Modal>
      )}
    </section>
  );
}

function PaymentMethods() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { isAdmin } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [qrImages, setQrImages] = useState<ImageAsset[]>([]);
  const load = () => paymentService.listMethods(true).then(setMethods).catch(() => {});
  useEffect(() => { load(); content.listImages('qr').then(setQrImages).catch(() => {}); }, []);

  async function save(m: PaymentMethod, patch: Partial<PaymentMethod>) {
    try { await paymentService.saveMethod(m.id, patch); notify(t('common.saved'), 'success'); load(); } catch (e) { notify(errorMessage(e), 'error'); }
  }
  async function uploadQr(m: PaymentMethod, file: File) {
    try {
      const img = await content.uploadImage(file, { entity_type: 'qr', alt_text: 'QR de pago' });
      setQrImages((q) => [img, ...q]);
      await save(m, { config: { qr_image: img.url } });
    } catch (e) { notify(errorMessage(e), 'error'); }
  }

  return (
    <div className="space-y-4">
      {methods.map((m) => (
        <section key={m.id} className="card p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-xl">{m.name} <span className="text-xs text-charcoal/50">({t(`payment.type.${m.type}`)})</span></h2>
            <Toggle checked={m.active} onChange={(v) => save(m, { active: v })} label={m.active ? t('admin.active') : t('admin.inactive')} />
          </div>
          {m.type === 'card' && (
            <p className={`text-sm rounded-lg p-3 ${m.unavailable_reason ? 'bg-rose/10 text-rose' : 'bg-gold/10'}`}>
              {m.unavailable_reason ? t('admin.settings.cardNoProvider') : t('admin.settings.cardTestMode')}
            </p>
          )}
          {m.type === 'qr' && (
            <div className="grid sm:grid-cols-[160px_1fr] gap-4 mb-4">
              {m.config.qr_image ? <img src={assetUrl(m.config.qr_image)} alt="QR" className="w-40 h-40 object-contain bg-white rounded-lg border" /> : <div className="w-40 h-40 rounded-lg bg-almond flex items-center justify-center text-xs text-center p-2">{t('payment.qrMissing')}</div>}
              <div className="space-y-2">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && uploadQr(m, e.target.files[0])} />
                {qrImages.length > 0 && (
                  <select className="input" value={m.config.qr_image || ''} onChange={(e) => save(m, { config: { qr_image: e.target.value } })}>
                    {qrImages.map((q) => <option key={q.id} value={q.url}>{q.url.split('/').pop()}</option>)}
                  </select>
                )}
                <p className="text-xs text-charcoal/60">{t('admin.settings.qrHint')}</p>
              </div>
            </div>
          )}
          <InstructionsEditor method={m} onSave={(config, name) => save(m, { config, name })} canRename={isAdmin} />
        </section>
      ))}
    </div>
  );
}

function InstructionsEditor({ method, onSave, canRename }: { method: PaymentMethod; onSave: (c: PaymentMethod['config'], name?: string) => void; canRename: boolean }) {
  const { t } = useTranslation();
  const [c, setC] = useState(method.config);
  const [name, setName] = useState(method.name);
  return (
    <div className="grid gap-3">
      {canRename && <Field label={t('admin.fields.name')}><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
      {(['instructions', 'instructions_en', 'instructions_fr'] as const).map((k) => (
        <Field key={k} label={`${t('admin.settings.instructions')} (${k === 'instructions' ? 'ES' : k.slice(-2).toUpperCase()})`}>
          <textarea className="input" maxLength={500} value={c[k] || ''} onChange={(e) => setC({ ...c, [k]: e.target.value })} />
        </Field>
      ))}
      {method.type === 'cash' && (
        <div className="flex gap-4">
          <Toggle checked={c.cash_on_pickup ?? true} onChange={(v) => setC({ ...c, cash_on_pickup: v })} label={t('admin.settings.cashPickup')} />
          <Toggle checked={c.cash_on_delivery ?? true} onChange={(v) => setC({ ...c, cash_on_delivery: v })} label={t('admin.settings.cashDelivery')} />
        </div>
      )}
      <button className="btn-outline btn-sm w-fit" onClick={() => onSave({ instructions: c.instructions, instructions_en: c.instructions_en, instructions_fr: c.instructions_fr, cash_on_pickup: c.cash_on_pickup, cash_on_delivery: c.cash_on_delivery }, canRename ? name : undefined)}>{t('common.save')}</button>
    </div>
  );
}
