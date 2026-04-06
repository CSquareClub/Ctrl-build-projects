"use client";

import { useEffect, useState } from "react";
import { Tldraw, TLStore, createTLStore, defaultShapeUtils } from "@tldraw/tldraw";
import "tldraw/tldraw.css";
import * as Y from "yjs";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { useRoom, useMyPresence } from "../../liveblocks.config";

export function useYjsStore({
  room,
}: {
  room: ReturnType<typeof useRoom>;
}) {
  const [store, setStore] = useState<TLStore | null>(null);

  useEffect(() => {
    if (!room) return;

    // Initialize Y.Doc
    const yDoc = new Y.Doc();
    
    // Bind Y.Doc to Liveblocks room
    const provider = new LiveblocksYjsProvider(room, yDoc);
    
    // Use the built-in default shapes to avoid migration ID conflicts
    const newStore = createTLStore({ 
      shapeUtils: defaultShapeUtils 
    });
    
    const yShapes = yDoc.getMap<any>("shapes");

    // Hydration: Prepopulate store with existing Y.Doc data
    const initialRecords: any[] = [];
    yShapes.forEach((record) => {
      initialRecords.push(record);
    });
    if (initialRecords.length > 0) {
      newStore.put(initialRecords);
    }
    
    // Store Listener: Push local changes to the Yjs map
    const unlisten = newStore.listen(
      (update) => {
        if (update.source !== "user") return;
        
        yDoc.transact(() => {
          Object.values(update.changes.added).forEach((record) => {
            yShapes.set(record.id, record);
          });
          Object.values(update.changes.updated).forEach(([, to]) => {
            yShapes.set(to.id, to);
          });
          Object.keys(update.changes.removed).forEach((id) => {
            yShapes.delete(id);
          });
        });
      },
      { scope: "document", source: "user" }
    );

    // Yjs Observer: Pull remote changes into the newStore
    const observer = (event: Y.YMapEvent<any>, transaction: Y.Transaction) => {
      if (transaction.local) return; // CRITICAL: Prevent infinite recursive loops

      const toPut: any[] = [];
      const toRemove: any[] = [];

      event.changes.keys.forEach((change, key) => {
        if (change.action === "add" || change.action === "update") {
          const record = yShapes.get(key);
          if (record) toPut.push(record);
        } else if (change.action === "delete") {
          toRemove.push(key);
        }
      });

      if (toPut.length > 0 || toRemove.length > 0) {
        newStore.mergeRemoteChanges(() => {
          if (toPut.length > 0) newStore.put(toPut);
          if (toRemove.length > 0) newStore.remove(toRemove);
        });
      }
    };
    
    yShapes.observe(observer);

    setStore(newStore);

    // Cleanup function destroys ydoc and provider
    return () => {
      unlisten();
      yShapes.unobserve(observer);
      provider.destroy();
      yDoc.destroy();
    };
  }, [room]);

  return store;
}

export default function Editor() {
  const room = useRoom();
  const store = useYjsStore({ room });
  const [presence, updateMyPresence] = useMyPresence();

  if (!store) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        Loading canvas...
      </div>
    );
  }

  return (
    <div 
      className="absolute inset-0"
      onPointerMove={(e) => updateMyPresence({ cursor: { x: Math.round(e.clientX), y: Math.round(e.clientY) } })}
      onPointerLeave={() => updateMyPresence({ cursor: null })}
    >
      <Tldraw store={store} />
    </div>
  );
}
