import { createStore, del, get, set } from 'idb-keyval';

const folderHandleStore = createStore('fitpower-photo-folder', 'handles');
const HANDLE_KEY = 'directory';

export type FolderPermission = 'granted' | 'denied' | 'prompt';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Must be called from within a user gesture (a click handler). */
export async function pickPhotoFolder(): Promise<FileSystemDirectoryHandle> {
  const handle = await window.showDirectoryPicker({ id: 'fitpower-photos', mode: 'readwrite' });
  await set(HANDLE_KEY, handle, folderHandleStore);
  return handle;
}

export async function loadPhotoFolderHandle(): Promise<FileSystemDirectoryHandle | undefined> {
  return get<FileSystemDirectoryHandle>(HANDLE_KEY, folderHandleStore);
}

export async function clearPhotoFolderHandle(): Promise<void> {
  await del(HANDLE_KEY, folderHandleStore);
}

export function checkPermission(handle: FileSystemDirectoryHandle): Promise<FolderPermission> {
  return handle.queryPermission({ mode: 'readwrite' });
}

/** Must be called from within a user gesture (a click handler) — re-granting after a
 * browser restart or revoked permission cannot happen silently. */
export function requestPermission(handle: FileSystemDirectoryHandle): Promise<FolderPermission> {
  return handle.requestPermission({ mode: 'readwrite' });
}

export async function writeFileToFolder(
  handle: FileSystemDirectoryHandle,
  filename: string,
  data: Blob,
): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp)$/i;

export interface FolderImageEntry {
  name: string;
  file: File;
}

export async function listImagesInFolder(
  handle: FileSystemDirectoryHandle,
): Promise<FolderImageEntry[]> {
  const entries: FolderImageEntry[] = [];
  for await (const [name, entryHandle] of handle.entries()) {
    if (entryHandle.kind !== 'file' || !IMAGE_EXTENSIONS.test(name)) continue;
    const file = await (entryHandle as FileSystemFileHandle).getFile();
    entries.push({ name, file });
  }
  return entries;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(header)?.[1] ?? 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
