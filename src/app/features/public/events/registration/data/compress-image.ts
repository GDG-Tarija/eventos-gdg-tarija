export interface CompressOptions {
  maxBytes: number;
  maxDim: number;
  quality: number;
}

const DEFAULTS: CompressOptions = { maxBytes: 1.5 * 1024 * 1024, maxDim: 1600, quality: 0.8 };

/** Escala (w, h) para que el lado mayor no pase de maxDim, sin agrandar. */
export function fitWithin(w: number, h: number, maxDim: number): { width: number; height: number } {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/** Reduce fotos pesadas del comprobante; ante cualquier fallo devuelve el original para no bloquear el registro. */
export async function compressImage(file: File, opts: CompressOptions = DEFAULTS): Promise<File> {
  if (!file.type.startsWith('image/') || file.size <= opts.maxBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, opts.maxDim);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, 'image/jpeg', opts.quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
