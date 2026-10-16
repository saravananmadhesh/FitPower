import { useQuery } from '@tanstack/react-query';
import { loadCatalog } from '@/domain/catalog';
import { queryKeys } from './keys';

/**
 * The bundled exercise catalog, validated on first use. Going through a query
 * gives the gallery the same loading / error + retry states as every other
 * data view — a catalog that fails validation surfaces as `isError`.
 * Only import this from lazy gallery code so the catalog stays out of the main bundle.
 */
export function useCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.catalog,
    queryFn: async () => loadCatalog(),
    staleTime: Infinity,
    retry: false,
  });
}
