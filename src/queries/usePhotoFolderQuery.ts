import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  checkPermission,
  clearPhotoFolderHandle,
  isFileSystemAccessSupported,
  listImagesInFolder,
  loadPhotoFolderHandle,
  pickPhotoFolder,
  requestPermission,
  type FolderPermission,
} from '@/data/photoFolder';
import { photosIdb } from '@/data/photosIdb';
import { queryKeys } from './keys';

export interface PhotoFolderStatus {
  supported: boolean;
  handle: FileSystemDirectoryHandle | null;
  name: string | null;
  permission: FolderPermission | null;
}

const UNCONNECTED: PhotoFolderStatus = {
  supported: isFileSystemAccessSupported(),
  handle: null,
  name: null,
  permission: null,
};

export function usePhotoFolderQuery() {
  return useQuery<PhotoFolderStatus>({
    queryKey: queryKeys.photoFolder,
    queryFn: async () => {
      if (!UNCONNECTED.supported) return UNCONNECTED;
      const handle = await loadPhotoFolderHandle();
      if (!handle) return UNCONNECTED;
      const permission = await checkPermission(handle);
      return { supported: true, handle, name: handle.name, permission };
    },
    staleTime: Infinity,
  });
}

function useInvalidatePhotoFolder() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.photoFolder });
}

/** Must be called directly from a click handler (user-gesture requirement). */
export function useConnectPhotoFolderMutation() {
  const invalidate = useInvalidatePhotoFolder();
  return useMutation({
    mutationFn: () => pickPhotoFolder(),
    onSuccess: invalidate,
  });
}

/** Must be called directly from a click handler (user-gesture requirement). */
export function useReconnectPhotoFolderMutation() {
  const invalidate = useInvalidatePhotoFolder();
  return useMutation({
    mutationFn: (handle: FileSystemDirectoryHandle) => requestPermission(handle),
    onSuccess: invalidate,
  });
}

export function useDisconnectPhotoFolderMutation() {
  const invalidate = useInvalidatePhotoFolder();
  return useMutation({
    mutationFn: () => clearPhotoFolderHandle(),
    onSuccess: invalidate,
  });
}

export function useImportFromFolderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (handle: FileSystemDirectoryHandle) => {
      const [entries, existing] = await Promise.all([listImagesInFolder(handle), photosIdb.list()]);
      const existingNames = new Set(existing.map((p) => p.name));
      let imported = 0;
      for (const entry of entries) {
        if (existingNames.has(entry.name)) continue;
        await photosIdb.addFromFile(entry.name, entry.file);
        imported++;
      }
      return imported;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.photos });
    },
  });
}
