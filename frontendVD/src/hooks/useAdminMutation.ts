/**
 * useAdminMutation — Wrapper around useMutation with toast integration.
 * Automatically shows success/error toasts and handles invalidation.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastStore } from "../stores/toastStore";

interface UseAdminMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  invalidateKeys?: string[][];
  successMessage?: string;
  errorMessage?: string;
}

export function useAdminMutation<TData = unknown, TVariables = unknown>({
  mutationFn,
  onSuccess,
  invalidateKeys,
  successMessage = "Operación completada exitosamente.",
  errorMessage = "Error al realizar la operación.",
}: UseAdminMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      addToast(successMessage, "success");
      onSuccess?.(data, variables);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        errorMessage;
      addToast(msg, "error");
    },
  });
}
