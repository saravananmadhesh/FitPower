import { createStore, del, set, values } from 'idb-keyval';
import { formatISO } from '@/domain/dates';
import type { Photo } from '@/types';
import type { PhotoRepository } from './Repository';

const store = createStore('fitpower-photos', 'photos');

const MAX_DIMENSION = 1000;
const JPEG_QUALITY = 0.82;

function downscaleToJpegDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height >= width && height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function photoName(date: string, sameDateCount: number): string {
  return `progress_${date}${sameDateCount ? `_${sameDateCount + 1}` : ''}.jpg`;
}

// Date.now() alone can collide when adding several photos in a tight loop
// (e.g. importing a folder full of images) — pair it with a rolling counter.
let idSequence = 0;
function nextPhotoId(): number {
  idSequence = (idSequence + 1) % 1000;
  return Date.now() * 1000 + idSequence;
}

export const photosIdb: PhotoRepository = {
  async list() {
    const all = (await values(store)) as Photo[];
    return all.sort((a, b) => a.ts - b.ts);
  },

  async add(date, file) {
    const data = await downscaleToJpegDataUrl(file);
    const existing = (await values(store)) as Photo[];
    const sameDateCount = existing.filter((p) => p.date === date).length;
    const photo: Photo = {
      id: nextPhotoId(),
      date,
      name: photoName(date, sameDateCount),
      data,
      ts: Date.now(),
    };
    await set(photo.id, photo, store);
    return photo;
  },

  async addFromFile(name, file) {
    const data = await downscaleToJpegDataUrl(file);
    const ts = file.lastModified || Date.now();
    const photo: Photo = {
      id: nextPhotoId(),
      date: formatISO(new Date(ts)),
      name,
      data,
      ts,
    };
    await set(photo.id, photo, store);
    return photo;
  },

  async remove(id) {
    await del(id, store);
  },
};
