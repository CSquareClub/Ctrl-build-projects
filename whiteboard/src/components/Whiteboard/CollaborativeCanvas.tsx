"use client";

import { RoomProvider } from "../../liveblocks.config";
import { ClientSideSuspense } from "@liveblocks/react";
import Editor from "./Editor";
import Cursors from "./Cursors";

interface CollaborativeCanvasProps {
  roomId: string;
}

export default function CollaborativeCanvas({ roomId }: CollaborativeCanvasProps) {
  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
      <ClientSideSuspense fallback={<div>Loading Room...</div>}>
        <Cursors />
        <Editor />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
