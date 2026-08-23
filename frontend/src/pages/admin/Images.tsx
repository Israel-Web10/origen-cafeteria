import { useEffect, useRef, useState } from 'react';
import * as uploadService from '../../services/uploadService';
import type { UploadedImage } from '../../services/uploadService';
import { resolveImageUrl } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { ConfirmModal } from '../../components/Modal';
import { PageLoading } from '../../components/Loading';

const SECTIONS: { type: 'logo' | 'banner' | 'gallery'; label: string; help: string }[] = [
  { type: 'logo', label: 'Logo', help: 'Logo principal de ORIGEN, usado en el sitio.' },
  { type: 'banner', label: 'Banners', help: 'Imágenes destacadas para la página de inicio.' },
  { type: 'gallery', label: 'Galería de la cafetería', help: 'Fotografías del local, ambiente y equipo.' },
];

export function AdminImages() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UploadedImage | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { notify } = useToast();

  function load() {
    setLoading(true);
    uploadService.listImages().then(setImages).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleUpload(type: string, file: File) {
    setUploadingType(type);
    try {
      await uploadService.uploadImage(file, { entity_type: type });
      notify('Imagen subida correctamente.', 'success');
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo subir la imagen.', 'error');
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await uploadService.deleteImage(deleteTarget.id);
      notify('Imagen eliminada.', 'success');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      notify(err.message || 'No se pudo eliminar la imagen.', 'error');
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div>
      <h1 className="text-3xl mb-2">Imágenes</h1>
      <p className="text-charcoal/60 mb-8">
        Administra el logo, banners y fotos de la cafetería sin tocar código. Las imágenes de productos
        se suben directamente desde cada producto en la sección de Productos, y el código QR de pago se
        administra desde Configuración → Métodos de pago.
      </p>

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const sectionImages = images.filter((img) => img.entity_type === section.type);
          return (
            <div key={section.type}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display text-xl">{section.label}</h2>
                <div>
                  <input
                    ref={(el) => (fileRefs.current[section.type] = el)}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(section.type, e.target.files[0])}
                  />
                  <button
                    className="btn-outline !py-2 text-xs"
                    disabled={uploadingType === section.type}
                    onClick={() => fileRefs.current[section.type]?.click()}
                  >
                    {uploadingType === section.type ? 'Subiendo...' : '+ Subir imagen'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-charcoal/40 mb-4">{section.help}</p>

              {sectionImages.length === 0 ? (
                <p className="text-sm text-charcoal/40 italic">Sin imágenes todavía.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {sectionImages.map((img) => (
                    <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden bg-almond border border-espresso/10">
                      <img src={resolveImageUrl(img.url)} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setDeleteTarget(img)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-espresso/70 text-cream text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Eliminar imagen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar imagen"
        description="Esta imagen se eliminará permanentemente."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
