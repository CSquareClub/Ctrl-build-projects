import CollaborativeCanvas from "@/components/Whiteboard/CollaborativeCanvas";

export default function RoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  return (
    <main className="h-full w-full">
      <CollaborativeCanvas roomId={params.roomId} />
    </main>
  );
}
