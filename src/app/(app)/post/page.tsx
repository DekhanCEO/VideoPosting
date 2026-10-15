"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PostDetail } from "@/components/posts/post-detail";

// L'identifiant est passé en paramètre (?id=) pour que la page fonctionne aussi en export statique (hébergement PHP).
function PostFromParams() {
  const id = useSearchParams().get("id");
  return id ? <PostDetail key={id} id={id} /> : null;
}

export default function PostPage() {
  return (
    <Suspense>
      <PostFromParams />
    </Suspense>
  );
}
