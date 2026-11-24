import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CanvasPage from "@/components/CanvasPage";
import { isValidRoomId } from "@/lib/rooms";

type Props = { params: Promise<{ roomId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roomId } = await params;
  return { title: `${roomId} · Discourse Graph Canvas` };
}

export default async function RoomPage({ params }: Props) {
  const { roomId } = await params;
  if (!isValidRoomId(roomId)) notFound();
  return <CanvasPage roomId={roomId} />;
}
