import { useEffect, useRef, useState } from 'react';
import type { Settings, DeliveryZone, PaymentMethod } from '../../types';
import * as settingsService from '../../services/settingsService';
import * as paymentService from '../../services/paymentService';
import * as uploadService from '../../services/uploadService';
import { resolveImageUrl } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { PageLoading } from '../../components/Loading';
import { Modal } from '../../components/Modal';

export function AdminSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState<{ id: number; name: string; cost: string; estimated_time_minutes: string; active: boolean }>({
    id: 0, name: '', cost: '', estimated_time_minutes: '30', active: true,
  });
  const { notify } = useToast();
  const logoFileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([settingsService.getSettings(), paymentService.listPaymentMethods()])
      .then(([settingsData, methodsData]) => {
        setSettings(settingsData.settings);
        setZones(settingsData.deliveryZones);
        setMethods(methodsData);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function setField(key: keyof Settings, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await settingsService.updateSettings(settings);
      setSettings(saved);
      notify('Configuración guardada.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar la configuración.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const image = await uploadService.uploadImage(file, { entity_type: 'logo', is_primary: true });
      setField('logo_url', image.url);
      notify('Logo subido. No olvides guardar la configuración.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo subir el logo.', 'error');
    } finally {
      setUploadingLogo(false);
    }
  }

  // ---- Delivery zones ----
  function openZoneCreate() {
    setZoneForm({ id: 0, name: '', cost: '', estimated_time_minutes: '30', active: true });
    setZoneModalOpen(true);
  }
  function openZoneEdit(z: DeliveryZone) {
    setZoneForm({ id: z.id, name: z.name, cost: String(z.cost), estimated_time_minutes: String(z.estimated_time_minutes), active: z.active });
    setZoneModalOpen(true);
  }
  async function handleZoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: zoneForm.name,
      cost: Number(zoneForm.cost),
      estimated_time_minutes: Number(zoneForm.estimated_time_minutes),
      active: zoneForm.active,
    };
    try {
      if (zoneForm.id) await settingsService.updateDeliveryZone(zoneForm.id, payload);
      else await settingsService.createDeliveryZone(payload);
      notify('Zona de entrega guardada.', 'success');
      setZoneModalOpen(false);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar la zona.', 'error');
    }
  }

  // ---- Payment methods ----
  async function togglePaymentMethod(m: PaymentMethod) {
    try {
      const updated = await paymentService.updatePaymentMethod(m.id, { active: !m.active });
      setMethods((prev) => prev.map((pm) => (pm.id === m.id ? updated : pm)));
    } catch (err: any) {
      notify(err.message || 'No se pudo actualizar.', 'error');
    }
  }

  async function updateQrConfig(m: PaymentMethod, field: string, value: string) {
    const updatedConfig = { ...m.config, [field]: value };
    setMethods((prev) => prev.map((pm) => (pm.id === m.id ? { ...pm, config: updatedConfig } : pm)));
  }

  async function saveQrConfig(m: PaymentMethod) {
    try {
      const updated = await paymentService.updatePaymentMethod(m.id, { config: m.config });
      setMethods((prev) => prev.map((pm) => (pm.id === m.id ? updated : pm)));
      notify('Método de pago actualizado.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo guardar.', 'error');
    }
  }

  async function handleQrImageUpload(m: PaymentMethod, file: File) {
    setUploadingQr(true);
    try {
      const image = await uploadService.uploadImage(file, { entity_type: 'qr' });
      const updated = await paymentService.updatePaymentMethod(m.id, { config: { ...m.config, qr_image: image.url } });
      setMethods((prev) => prev.map((pm) => (pm.id === m.id ? updated : pm)));
      notify('Código QR actualizado.', 'success');
    } catch (err: any) {
      notify(err.message || 'No se pudo subir el QR.', 'error');
    } finally {
      setUploadingQr(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl mb-8">Configuración</h1>

      <form onSubmit={handleSaveSettings} className="card p-6 space-y-5 mb-8">
        <h2 className="font-display text-xl">Información general</h2>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg bg-almond overflow-hidden shrink-0">
            {settings.logo_url && <img src={resolveImageUrl(settings.logo_url)} alt="Logo" className="w-full h-full object-cover" />}
          </div>
          <div>
            <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            <button type="button" className="btn-outline !py-2 text-xs" disabled={uploadingLogo} onClick={() => logoFileRef.current?.click()}>
              {uploadingLogo ? 'Subiendo...' : 'Cambiar logo'}
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Nombre de la cafetería</label>
            <input className="input" value={settings.cafe_name || ''} onChange={(e) => setField('cafe_name', e.target.value)} />
          </div>
          <div>
            <label className="label">Eslogan</label>
            <input className="input" value={settings.cafe_slogan || ''} onChange={(e) => setField('cafe_slogan', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Dirección</label>
            <input className="input" value={settings.address || ''} onChange={(e) => setField('address', e.target.value)} />
          </div>
          <div>
            <label className="label">Latitud</label>
            <input className="input" value={settings.latitude || ''} onChange={(e) => setField('latitude', e.target.value)} />
          </div>
          <div>
            <label className="label">Longitud</label>
            <input className="input" value={settings.longitude || ''} onChange={(e) => setField('longitude', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Enlace de Google Maps</label>
            <input className="input" value={settings.gmaps_link || ''} onChange={(e) => setField('gmaps_link', e.target.value)} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input className="input" value={settings.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input className="input" value={settings.whatsapp || ''} onChange={(e) => setField('whatsapp', e.target.value)} />
          </div>
          <div>
            <label className="label">Facebook</label>
            <input className="input" value={settings.social_facebook || ''} onChange={(e) => setField('social_facebook', e.target.value)} />
          </div>
          <div>
            <label className="label">Instagram</label>
            <input className="input" value={settings.social_instagram || ''} onChange={(e) => setField('social_instagram', e.target.value)} />
          </div>
          <div>
            <label className="label">Pedido mínimo delivery (Bs)</label>
            <input type="number" step="0.01" className="input" value={settings.delivery_min_order || ''} onChange={(e) => setField('delivery_min_order', e.target.value)} />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.pickup_enabled !== 'false'} onChange={(e) => setField('pickup_enabled', String(e.target.checked))} />
              Recoger en tienda
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.delivery_enabled !== 'false'} onChange={(e) => setField('delivery_enabled', String(e.target.checked))} />
              Delivery
            </label>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>

      {/* Delivery zones */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl">Zonas de delivery</h2>
          <button className="btn-outline !py-2 text-xs" onClick={openZoneCreate}>+ Nueva zona</button>
        </div>
        <div className="space-y-2">
          {zones.map((z) => (
            <div key={z.id} className="flex items-center justify-between text-sm border-b border-espresso/5 pb-2">
              <span className="font-medium text-espresso">{z.name}</span>
              <span className="text-charcoal/60">Bs {Number(z.cost).toFixed(2)} · {z.estimated_time_minutes} min</span>
              <button className="text-gold-dark hover:underline" onClick={() => openZoneEdit(z)}>Editar</button>
            </div>
          ))}
          {zones.length === 0 && <p className="text-sm text-charcoal/40">Sin zonas configuradas.</p>}
        </div>
      </div>

      {/* Payment methods */}
      <div className="card p-6">
        <h2 className="font-display text-xl mb-4">Métodos de pago</h2>
        <div className="space-y-6">
          {methods.map((m) => (
            <div key={m.id} className="border border-espresso/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-espresso">{m.name}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={m.active} onChange={() => togglePaymentMethod(m)} />
                  Activo
                </label>
              </div>

              {m.type === 'qr' && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded bg-almond overflow-hidden shrink-0">
                      {m.config?.qr_image && <img src={resolveImageUrl(m.config.qr_image)} alt="QR" className="w-full h-full object-contain" />}
                    </div>
                    <div>
                      <input ref={qrFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleQrImageUpload(m, e.target.files[0])} />
                      <button type="button" className="btn-outline !py-1.5 text-xs" disabled={uploadingQr} onClick={() => qrFileRef.current?.click()}>
                        {uploadingQr ? 'Subiendo...' : 'Cambiar QR'}
                      </button>
                    </div>
                  </div>
                  <div />
                  <div>
                    <label className="label">Entidad / Banco</label>
                    <input className="input" value={m.config?.bank || ''} onChange={(e) => updateQrConfig(m, 'bank', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Cuenta</label>
                    <input className="input" value={m.config?.account || ''} onChange={(e) => updateQrConfig(m, 'account', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Instrucciones</label>
                    <textarea className="input min-h-[60px]" value={m.config?.instructions || ''} onChange={(e) => updateQrConfig(m, 'instructions', e.target.value)} />
                  </div>
                  <button className="btn-outline !py-2 text-xs w-fit" onClick={() => saveQrConfig(m)}>Guardar cambios</button>
                </div>
              )}

              {m.type === 'cash' && (
                <div>
                  <label className="label">Instrucciones</label>
                  <textarea className="input min-h-[60px]" value={m.config?.instructions || ''} onChange={(e) => updateQrConfig(m, 'instructions', e.target.value)} />
                  <button className="btn-outline !py-2 text-xs w-fit mt-2" onClick={() => saveQrConfig(m)}>Guardar cambios</button>
                </div>
              )}

              {m.type === 'card' && (
                <p className="text-xs text-charcoal/50">
                  Estructura preparada para integrar una pasarela de pago con tarjeta real. Ver docs/API.md.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={zoneModalOpen} onClose={() => setZoneModalOpen(false)} title={zoneForm.id ? 'Editar zona' : 'Nueva zona de delivery'}>
        <form onSubmit={handleZoneSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre de la zona</label>
            <input className="input" value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Costo (Bs)</label>
              <input type="number" step="0.01" className="input" value={zoneForm.cost} onChange={(e) => setZoneForm({ ...zoneForm, cost: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tiempo estimado (min)</label>
              <input type="number" className="input" value={zoneForm.estimated_time_minutes} onChange={(e) => setZoneForm({ ...zoneForm, estimated_time_minutes: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={zoneForm.active} onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })} />
            Zona activa
          </label>
          <button type="submit" className="btn-primary w-full">Guardar zona</button>
        </form>
      </Modal>
    </div>
  );
}
