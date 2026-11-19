/**
 * Cloudinary CDN Helper for Neelyo Cinema Tycoon
 *
 * Pre-compresses user-uploaded images on the client via HTML5 <canvas> into
 * 320x320 square WebP (~20-40 KB) BEFORE uploading to Cloudinary, and returns
 * the raw `secure_url` directly WITHOUT injecting transformation strings
 * (`f_auto,q_auto,g_face`) so it consumes 0 Cloudinary Transformation Credits!
 */

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hyptrix_unsigned';

const ALLOWED_IMAGE_MIMES = new Set([
  'image/webp',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const MAX_COMPRESSED_BYTES = 500 * 1024; // 500 KB strict safety ceiling

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
      CLOUDINARY_CLOUD_NAME.trim().length > 1
  );
}

/**
 * Resolves a stored image URL or Cloudinary public_id without injecting
 * paid dynamic transformation parameters.
 */
export function getOptimizedCloudinaryUrl(
  sourceOrPublicId?: string | null
): string | null {
  if (!sourceOrPublicId || !sourceOrPublicId.trim()) return null;
  const trimmed = sourceOrPublicId.trim();

  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }

  if (isCloudinaryConfigured()) {
    const cleanId = trimmed.replace(/^\/+/, '');
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${cleanId}`;
  }

  return null;
}

/**
 * Compresses any uploaded JPG/PNG/WebP image client-side into a crisp
 * 320x320 center-cropped WebP (~20-40 KB) for instant local preview and
 * zero-transformation-credit Cloudinary upload.
 */
export async function compressImageToWebp320(
  file: File,
  size = 320,
  quality = 0.82
): Promise<{
  ok: boolean;
  blob?: Blob;
  dataUrl?: string;
  sizeBytes?: number;
  error?: string;
}> {
  if (!file || !ALLOWED_IMAGE_MIMES.has(file.type.toLowerCase())) {
    return {
      ok: false,
      error: 'يرجى اختيار صورة بصيغة WebP أو JPG أو PNG فقط.',
    };
  }

  if (file.size > 12 * 1024 * 1024) {
    return {
      ok: false,
      error: 'حجم الصورة الأصلي كبير جداً (الحد الأقصى 12 ميجابايت).',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () =>
      resolve({ ok: false, error: 'تعذر قراءة ملف الصورة المختار.' });

    reader.onload = () => {
      const img = new Image();
      img.onerror = () =>
        resolve({ ok: false, error: 'ملف الصورة غير صالح أو تالف.' });

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ ok: false, error: 'تعذر تجهيز معالج الصور في المتصفح.' });
            return;
          }

          // Center-crop square focusing slightly toward upper third for portraits
          const minSide = Math.min(img.width, img.height);
          const sx = Math.max(0, Math.floor((img.width - minSide) / 2));
          const sy = Math.max(0, Math.floor((img.height - minSide) * 0.25));

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          const tryEncode = (mime: 'image/webp' | 'image/jpeg', q: number) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  if (mime === 'image/webp') {
                    tryEncode('image/jpeg', 0.82);
                    return;
                  }
                  resolve({ ok: false, error: 'تعذر ضغط الصورة قبل الحفظ.' });
                  return;
                }

                if (blob.size > MAX_COMPRESSED_BYTES && q > 0.55) {
                  tryEncode(mime, Number((q - 0.14).toFixed(2)));
                  return;
                }

                if (blob.size > MAX_COMPRESSED_BYTES) {
                  resolve({
                    ok: false,
                    error: 'حجم الصورة بعد الضغط لا يزال يتجاوز 500 كيلوبايت.',
                  });
                  return;
                }

                const dataUrl = canvas.toDataURL(mime, q);
                resolve({
                  ok: true,
                  blob,
                  dataUrl,
                  sizeBytes: blob.size,
                });
              },
              mime,
              q
            );
          };

          tryEncode('image/webp', quality);
        } catch {
          resolve({ ok: false, error: 'حدث خطأ أثناء ضغط الصورة.' });
        }
      };

      img.src = String(reader.result || '');
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an already-compressed 320x320 WebP Blob (or File, auto-compressed)
 * directly to Cloudinary using an unsigned preset and returns the raw
 * `secure_url` directly (0 Transformation Credits).
 */
export async function uploadImageToCloudinary(
  fileOrBlob: File | Blob,
  folder = 'neelyo/stars'
): Promise<{ ok: boolean; secureUrl?: string; publicId?: string; error?: string }> {
  if (!isCloudinaryConfigured()) {
    return {
      ok: false,
      error:
        'لم يتم ضبط NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME بعد في ملف البيئة.',
    };
  }

  let uploadPayload: Blob = fileOrBlob;
  if (fileOrBlob instanceof File) {
    const compressed = await compressImageToWebp320(fileOrBlob);
    if (!compressed.ok || !compressed.blob) {
      return { ok: false, error: compressed.error || 'تعذر ضغط الصورة.' };
    }
    uploadPayload = compressed.blob;
  } else if (fileOrBlob.size > MAX_COMPRESSED_BYTES) {
    return {
      ok: false,
      error: 'حجم الصورة يتجاوز الحد المسموح (500 كيلوبايت).',
    };
  }

  try {
    const formData = new FormData();
    const ext = uploadPayload.type === 'image/jpeg' ? 'jpg' : 'webp';
    formData.append('file', uploadPayload, `neelyo_${Date.now()}.${ext}`);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      return { ok: false, error: 'تعذر رفع الصورة إلى سحابة Cloudinary.' };
    }

    const data = await response.json();
    // Return raw secure_url directly WITHOUT adding transformation segments!
    const rawSecureUrl =
      typeof data.secure_url === 'string' ? data.secure_url : undefined;

    return {
      ok: Boolean(rawSecureUrl),
      secureUrl: rawSecureUrl,
      publicId: data.public_id,
    };
  } catch {
    return {
      ok: false,
      error: 'حدث خطأ في الاتصال بخدمة Cloudinary CDN.',
    };
  }
}
