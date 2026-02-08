//this hook nade to (insert, update, delete) in supabase -> used in client side components only.

import { createClient } from "@/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const supabase = createClient();

export function useClientMutate(
  table: string,
  action: "insert" | "update" | "delete"
) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { id: number; [key: string]: unknown }, { currentData: unknown }>({
    mutationFn: async (payload: { id: number; [key: string]: unknown }) => {
      let response: { data: unknown; error: { message: string } | null };

      if (action === "insert") {
        response = await supabase.from(table).insert(payload);
      } else if (action === "update") {
        response = await supabase
          .from(table)
          .update(payload)
          .match({ id: payload.id });
      } else {
        response = await supabase
          .from(table)
          .delete()
          .match({ id: payload.id });
      }

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table], exact: false });
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: [table] });
      const currentData = queryClient.getQueryData([table]);
      queryClient.setQueryData([table], (dataBeforeMutate: unknown[]) => [
        ...dataBeforeMutate,
        { ...newData, id: Date.now() },
      ]);

      return { currentData };
    },

    onError: (error, newData, context) => {
      queryClient.setQueryData([table], context?.currentData);
    },
  });
}
