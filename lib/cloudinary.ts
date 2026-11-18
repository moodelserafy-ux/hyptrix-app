/**
 * Cloudinary CDN Helper for Hyptrix Studio Tycoon
 * Offloads all actor portraits, crew avatars, film posters, and studio asset images
 * to Cloudinary CDN with automatic WebP/AVIF compression (`f_auto,q_auto`) so
 * Supabase database/storage bandwidth is never consumed by image traffic.
 */

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'hyptrix_unsigned';

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    CLOUDINARY_CLOUD_NAME &&
      CLOUDINARY_CLOUD_NAME !== 'your-cloud-name' &&
      CLOUDINARY_CLOUD_NAME.trim().length > 1
  );
}

/**
 * Resolves either a Cloudinary `public_id` (e.g. `hyptrix/actors/actor_12`)
 * or a full Cloudinary/external URL into an optimized CDN URL with `f_auto,q_auto`.
 */
export function getOptimizedCloudinaryUrl(
  sourceOrPublicId?: string | null,
  options: {
    width?: number;
    height?: number;
    crop?: 'fill' | 'thumb' | 'scale';
    gravity?: 'face' | 'auto' | 'center';
  } = {}
): string | null {
  if (!sourceOrPublicId || !sourceOrPublicId.trim()) return null;
  const trimmed = sourceOrPublicId.trim();

  const w = options.width || 320;
  const h = options.height || 320;
  const c = options.crop || 'fill';
  const g = options.gravity || 'face';
  const transforms = `f_auto,q_auto,c_${c},g_${g},w_${w},h_${h}`;

  // If it's already a full res.cloudinary.com URL, inject optimization transforms if missing
  if (trimmed.startsWith('https://res.cloudinary.com/')) {
    if (trimmed.includes('/image/upload/') && !trimmed.includes('f_auto')) {
      return trimmed.replace('/image/upload/', `/image/upload/${transforms}/`);
    }
    return trimmed;
  }

  // If it's another full HTTPS URL, return as-is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Otherwise treat it as a Cloudinary public_id if Cloud Name is configured
  if (isCloudinaryConfigured()) {
    const cleanId = trimmed.replace(/^\/+/, '');
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transforms}/${cleanId}`;
  }

  return null;
}

/**
 * Uploads an image file directly from the browser to Cloudinary using an unsigned preset,
 * returning the optimized CDN URL without touching Supabase storage.
 */
export async function uploadImageToCloudinary(
  file: File,
  folder = 'hyptrix/actors'
): Promise<{ ok: boolean; secureUrl?: string; publicId?: string; error?: string }> {
  if (!isCloudinaryConfigured()) {
    return {
      ok: false,
      error:
        'لم يتم ضبط NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME بعد في ملف البيئة.',
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
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
    const optimizedUrl =
      getOptimizedCloudinaryUrl(data.public_id || data.secure_url) ||
      data.secure_url;

    return {
      ok: true,
      secureUrl: optimizedUrl,
      publicId: data.public_id,
    };
  } catch {
    return {
      ok: false,
      error: 'حدث خطأ في الاتصال بخدمة Cloudinary CDN.',
    };
  }
}
