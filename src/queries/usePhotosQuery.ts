import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { photosIdb } from '@/data/photosIdb';
import { dataUrlToBlob, writeFileToFolder } from '@/data/photoFolder';
import { queryKeys } from './keys';
import type { PhotoFolderStatus } from './usePhotoFolderQuery';

export function usePhotosQuery() {
  return useQuery({
    queryKey: queryKeys.photos,
    queryFn: () => photosIdb.list(),
  });
}

function useInvalidatePhotos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.photos });
}

export function useAddPhotoMutation() {
  const invalidate = useInvalidatePhotos();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, file }: { date: string; file: Blob }) => {
      const photo = await photosIdb.add(date, file);
      const folder = queryClient.getQueryData<PhotoFolderStatus>(queryKeys.photoFolder);
      let syncedToFolder = false;
      if (folder?.handle && folder.permission === 'granted') {
        try {
          await writeFileToFolder(folder.handle, photo.name, dataUrlToBlob(photo.data));
          syncedToFolder = true;
        } catch {
          // Best-effort — the photo is already saved in IndexedDB either way.
        }
      }
      return { photo, syncedToFolder };
    },
    onSuccess: invalidate,
  });
}

export function useRemovePhotoMutation() {
  const invalidate = useInvalidatePhotos();
  return useMutation({
    mutationFn: (id: number) => photosIdb.remove(id),
    onSuccess: invalidate,
  });
}
