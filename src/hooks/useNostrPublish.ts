import { useNostr } from "@nostrify/react";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { useAppContext } from "./useAppContext";
import { useCurrentUser } from "./useCurrentUser";
import { relaysForUserEvents } from "./useUserRelayList";

import type { NostrEvent } from "@nostrify/nostrify";

export function useNostrPublish(): UseMutationResult<NostrEvent> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (t: Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>) => {
      if (user) {
        const tags = t.tags ?? [];

        // Add the client tag if it doesn't exist
        if (!tags.some(([name]) => name === "client")) {
          tags.push(["client", "nostr-stock-updater"]);
        }

        const event = await user.signer.signEvent({
          kind: t.kind,
          content: t.content ?? "",
          tags,
          created_at: t.created_at ?? Math.floor(Date.now() / 1000),
        });

        // Configured relays plus the user's NIP-65 write relays.
        const relays = await relaysForUserEvents(queryClient, nostr, user.pubkey, config.relayUrls);
        await nostr.group(relays).event(event, { signal: AbortSignal.timeout(5000) });
        return event;
      } else {
        throw new Error("User is not logged in");
      }
    },
    onError: (error) => {
      console.error("Failed to publish event:", error);
    },
    onSuccess: (data) => {
      console.log("Event published successfully:", data);
    },
  });
}