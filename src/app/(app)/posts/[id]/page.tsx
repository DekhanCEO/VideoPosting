import type { Metadata } from "next";
import { PostDetail } from "@/components/posts/post-detail";

export const metadata: Metadata = { title: "Suivi de publication" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostDetail id={id} />;
}
