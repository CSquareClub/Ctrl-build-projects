import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export type Presence = {
  cursor: { x: number; y: number } | null;
};

// TODO: Replace "pk_placeholder_key_here" with your actual Liveblocks public API key
const client = createClient({
  publicApiKey: "pk_dev_biqbU0E4KKsVqGdUHzBrb_7JVAsUwCLPWmRImH_YR20aq5HbieJ7hqbwTIYnCHgP",
});

export const {
  RoomProvider,
  useRoom,
  useSelf,
  useOthers,
  useMyPresence,
  useUpdateMyPresence
} = createRoomContext<Presence>(client);
