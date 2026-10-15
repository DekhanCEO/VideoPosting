import type { Metadata } from "next";
import { PostsList } from "@/components/posts/posts-list";

export const metadata: Metadata = { title: "Publications" };

export default function PostsPage() {
  return <PostsList />;
}
