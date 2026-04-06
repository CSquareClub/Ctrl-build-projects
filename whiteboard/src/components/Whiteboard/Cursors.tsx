"use client";

import { useOthers } from "../../liveblocks.config";

export default function Cursors() {
  const others = useOthers();

  return (
    <>
      {others.map(({ connectionId, presence }) => {
        if (!presence.cursor) {
          return null;
        }

        const { x, y } = presence.cursor;

        return (
          <div
            key={connectionId}
            className="absolute top-0 left-0 pointer-events-none z-50 flex items-center justify-center bg-blue-500 rounded-full w-8 h-8 text-white text-xs font-bold border-2 border-white shadow-md shadow-blue-500/20"
            style={{
              transform: `translate(${x}px, ${y}px)`,
              transition: "transform 0.1s linear"
            }}
          >
            {connectionId % 100}
          </div>
        );
      })}
    </>
  );
}
