"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bookmark,
  Camera,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Film,
  Forward,
  Heart,
  Home,
  Inbox,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Music2,
  Play,
  Plus,
  Repeat2,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  User,
  Users,
  Clapperboard,
  Bell,
  Download,
  Share2,
} from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { PlatformId, PostKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "../icons";

export interface PreviewData {
  kind?: PostKind;
  /** Publication photo : adresses des images, dans l'ordre. */
  images?: string[];
  videoSrc?: string;
  posterSrc?: string;
  name: string;
  username: string;
  avatarUrl?: string;
  caption: string;
  title: string;
  isShort: boolean;
  vertical: boolean;
  duration?: number;
  collaborators?: string[];
  audioName?: string;
  brandLabel?: string | null;
}

/** Met en valeur hashtags et mentions comme dans les applications. */
function RichText({ text, className, tagClass = "font-semibold" }: { text: string; className?: string; tagClass?: string }) {
  const parts = text.split(/((?:^|\s)[#@][\p{L}\p{N}_.]+)/u);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        /^\s?[#@]/.test(part) ? (
          <span key={i} className={tagClass}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function MiniAvatar({ src, name, size = 32, className }: { src?: string; name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-pink-500 font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function VideoLayer({ data, fit = "cover" }: { data: PreviewData; fit?: "cover" | "contain" }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => setPaused(false), [data.videoSrc]);
  if (!data.videoSrc) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-white/50">
        <Film className="size-8" />
        <span className="text-xs">Ajoutez une vidéo</span>
      </div>
    );
  }
  return (
    <>
      <video
        ref={ref}
        key={data.videoSrc}
        src={data.videoSrc}
        poster={data.posterSrc}
        muted
        autoPlay
        loop
        playsInline
        className={cn("absolute inset-0 size-full bg-black", fit === "cover" ? "object-cover" : "object-contain")}
      />
      <button
        type="button"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) {
            void v.play();
            setPaused(false);
          } else {
            v.pause();
            setPaused(true);
          }
        }}
        className="absolute inset-0 z-[1] flex items-center justify-center"
        aria-label={paused ? "Lecture" : "Pause"}
      >
        {paused && (
          <span className="flex size-14 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <Play className="size-6 translate-x-0.5" fill="currentColor" />
          </span>
        )}
      </button>
    </>
  );
}

/** Diaporama de photos (TikTok, carrousel Instagram) : flèches, points, compteur. */
function PhotoLayer({ images, fit = "cover", dark = true }: { images: string[]; fit?: "cover" | "contain"; dark?: boolean }) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex((i) => Math.min(i, Math.max(0, images.length - 1))), [images.length]);
  if (!images.length) {
    return (
      <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2", dark ? "bg-gradient-to-br from-neutral-800 via-neutral-900 to-black text-white/50" : "bg-neutral-100 text-neutral-400")}>
        <ImageIcon className="size-8" />
        <span className="text-xs">Ajoutez des photos</span>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={images[index]} src={images[index]} alt="" className={cn("size-full animate-fade-in", fit === "cover" ? "object-cover" : "object-contain")} />
      {images.length > 1 && (
        <>
          <span className="absolute top-3 right-3 z-[3] rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
            {index + 1}/{images.length}
          </span>
          {index > 0 && (
            <button type="button" aria-label="Photo précédente" onClick={() => setIndex(index - 1)} className="absolute top-1/2 left-1.5 z-[3] -translate-y-1/2 rounded-full bg-white/80 p-1 text-black shadow">
              <ChevronLeft className="size-3.5" />
            </button>
          )}
          {index < images.length - 1 && (
            <button type="button" aria-label="Photo suivante" onClick={() => setIndex(index + 1)} className="absolute top-1/2 right-1.5 z-[3] -translate-y-1/2 rounded-full bg-white/80 p-1 text-black shadow">
              <ChevronRight className="size-3.5" />
            </button>
          )}
          <div className="absolute inset-x-0 bottom-2 z-[3] flex justify-center gap-1">
            {images.slice(0, 12).map((_, i) => (
              <span key={i} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/45")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RailButton({ icon, label }: { icon: ReactNode; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] [&>svg]:size-[26px]">{icon}</span>
      {label && <span className="text-[10px] font-semibold drop-shadow">{label}</span>}
    </div>
  );
}

const shade = "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent";

/* ------------------------------------------------------------------ */

function TikTokScreen({ data }: { data: PreviewData }) {
  const photo = data.kind === "photo";
  return (
    <div className="absolute inset-0 bg-black text-white">
      {photo ? (
        <div className="absolute inset-x-0 top-0 bottom-28">
          <PhotoLayer images={data.images ?? []} fit="contain" />
        </div>
      ) : (
        <VideoLayer data={data} />
      )}
      <div className={shade} />
      <div className="pointer-events-none absolute inset-x-0 top-9 z-[2] flex items-center justify-center gap-4 text-[13px] font-semibold">
        <span className="text-white/60">Abonnements</span>
        <span className="relative">
          Pour toi
          <span className="absolute -bottom-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded bg-white" />
        </span>
        <Search className="absolute right-4 size-5" />
      </div>
      <div className="pointer-events-none absolute right-2 bottom-20 z-[2] flex flex-col items-center gap-3.5">
        <div className="relative mb-2">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={40} className="ring-2 ring-white" />
          <span className="absolute -bottom-2 left-1/2 flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#FE2C55]">
            <Plus className="size-3" strokeWidth={3} />
          </span>
        </div>
        <RailButton icon={<Heart fill="currentColor" />} label="0" />
        <RailButton icon={<MessageCircle fill="currentColor" />} label="0" />
        <RailButton icon={<Bookmark fill="currentColor" />} label="0" />
        <RailButton icon={<Forward fill="currentColor" />} label="Partager" />
        <span className="mt-1 flex size-9 animate-[spin_5s_linear_infinite] items-center justify-center rounded-full bg-gradient-to-br from-neutral-700 to-neutral-950 ring-[6px] ring-neutral-800">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={18} />
        </span>
      </div>
      <div className="pointer-events-none absolute right-16 bottom-16 left-3 z-[2] space-y-1.5">
        {data.brandLabel && <span className="inline-block rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">{data.brandLabel}</span>}
        <p className="text-[13px] font-semibold">@{data.username}</p>
        {data.caption && <RichText text={data.caption} className="line-clamp-3 text-[12px] leading-snug whitespace-pre-line" tagClass="font-bold" />}
        {photo && data.title && <p className="line-clamp-1 text-[12px] font-semibold">{data.title}</p>}
        <p className="flex items-center gap-1.5 text-[11px]">
          <Music2 className="size-3" />
          <span className="truncate">{photo ? "Musique recommandée" : `son original - ${data.name}`}</span>
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex h-12 items-center justify-around border-t border-white/10 bg-black text-[9px]">
        <span className="flex flex-col items-center"><Home className="size-5" />Accueil</span>
        <span className="flex flex-col items-center text-white/70"><Users className="size-5" />Amis</span>
        <span className="flex h-7 w-10 items-center justify-center rounded-lg bg-white text-black shadow-[-3px_0_0_#25F4EE,3px_0_0_#FE2C55]"><Plus className="size-4" strokeWidth={3} /></span>
        <span className="flex flex-col items-center text-white/70"><Inbox className="size-5" />Messages</span>
        <span className="flex flex-col items-center text-white/70"><User className="size-5" />Profil</span>
      </div>
    </div>
  );
}

function InstagramScreen({ data }: { data: PreviewData }) {
  const collab = data.collaborators?.filter(Boolean) ?? [];
  return (
    <div className="absolute inset-0 bg-black text-white">
      <VideoLayer data={data} />
      <div className={shade} />
      <div className="pointer-events-none absolute inset-x-0 top-9 z-[2] flex items-center justify-between px-4">
        <span className="text-lg font-bold">Reels</span>
        <Camera className="size-6" />
      </div>
      <div className="pointer-events-none absolute right-2.5 bottom-16 z-[2] flex flex-col items-center gap-4">
        <RailButton icon={<Heart />} label="0" />
        <RailButton icon={<MessageCircle className="-scale-x-100" />} label="0" />
        <RailButton icon={<Repeat2 />} />
        <RailButton icon={<Send />} />
        <RailButton icon={<MoreHorizontal />} />
        <span className="size-7 overflow-hidden rounded-md border-2 border-white">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={24} className="rounded-none" />
        </span>
      </div>
      <div className="pointer-events-none absolute right-14 bottom-14 left-3 z-[2] space-y-2">
        <div className="flex items-center gap-2">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={28} />
          <span className="truncate text-[13px] font-semibold">
            {data.username}
            {collab.length > 0 && <span className="font-normal"> et {collab.length === 1 ? collab[0] : `${collab.length} autres`}</span>}
          </span>
          <span className="rounded-lg border border-white/80 px-2 py-0.5 text-[11px] font-semibold">Suivre</span>
        </div>
        {data.caption && <RichText text={data.caption} className="line-clamp-2 text-[12px] leading-snug whitespace-pre-line" tagClass="font-normal text-white/80" />}
        <div className="flex items-center gap-1.5 text-[11px]">
          <Music2 className="size-3" />
          <span className="truncate">{data.audioName || `${data.username} · Audio original`}</span>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex h-11 items-center justify-around border-t border-white/10 bg-black">
        <Home className="size-5" />
        <Search className="size-5" />
        <Plus className="size-5 rounded-md border-2 border-white p-px" strokeWidth={3} />
        <Clapperboard className="size-5" />
        <MiniAvatar src={data.avatarUrl} name={data.name} size={22} />
      </div>
    </div>
  );
}

/** Publication du fil Instagram (photo ou carrousel). */
function InstagramFeedScreen({ data }: { data: PreviewData }) {
  const collab = data.collaborators?.filter(Boolean) ?? [];
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white text-neutral-900 scrollbar-thin dark:bg-black dark:text-white">
      <div className="flex h-16 items-end justify-between px-3 pb-2">
        <span className="font-[cursive] text-[20px] font-semibold tracking-tight">Instagram</span>
        <span className="flex gap-3.5">
          <Heart className="size-5" />
          <Send className="size-5" />
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 p-[2px]">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={28} className="ring-2 ring-white dark:ring-black" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
          {data.username}
          {collab.length > 0 && <span className="font-normal"> et {collab.length === 1 ? collab[0] : `${collab.length} autres`}</span>}
        </span>
        <MoreHorizontal className="size-4" />
      </div>
      <div className="relative aspect-[4/5] bg-neutral-100 dark:bg-neutral-900">
        <PhotoLayer images={data.images ?? []} dark={false} />
      </div>
      <div className="flex items-center gap-3.5 px-3 pt-2.5">
        <Heart className="size-[22px]" />
        <MessageCircle className="size-[22px] -scale-x-100" />
        <Send className="size-[22px]" />
        <Bookmark className="ml-auto size-[22px]" />
      </div>
      <div className="space-y-1 px-3 py-2 text-[12px]">
        <p className="font-semibold">0 J&apos;aime</p>
        {data.caption ? (
          <p className="line-clamp-4 whitespace-pre-line">
            <span className="font-semibold">{data.username} </span>
            <RichText text={data.caption} tagClass="text-sky-700 dark:text-sky-400" />
          </p>
        ) : (
          <p className="text-neutral-400">Votre légende apparaîtra ici.</p>
        )}
        <p className="text-[10px] text-neutral-400">À l&apos;instant</p>
      </div>
    </div>
  );
}

function YoutubeShortScreen({ data }: { data: PreviewData }) {
  return (
    <div className="absolute inset-0 bg-black text-white">
      <VideoLayer data={data} />
      <div className={shade} />
      <div className="pointer-events-none absolute inset-x-0 top-9 z-[2] flex items-center justify-end gap-4 px-4">
        <Search className="size-5" />
        <MoreVertical className="size-5" />
      </div>
      <div className="pointer-events-none absolute right-2 bottom-16 z-[2] flex flex-col items-center gap-4">
        <RailButton icon={<ThumbsUp fill="currentColor" />} label="J'aime" />
        <RailButton icon={<ThumbsDown fill="currentColor" />} label="Je n'aime pas" />
        <RailButton icon={<MessageCircle fill="currentColor" />} label="0" />
        <RailButton icon={<Forward fill="currentColor" />} label="Partager" />
        <RailButton icon={<Repeat2 />} label="Remix" />
        <span className="size-8 overflow-hidden rounded-lg">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={32} className="rounded-none" />
        </span>
      </div>
      <div className="pointer-events-none absolute right-16 bottom-14 left-3 z-[2] space-y-2">
        <div className="flex items-center gap-2">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={28} />
          <span className="truncate text-[13px] font-semibold">{data.username.startsWith("@") ? data.username : `@${data.username}`}</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">S&apos;abonner</span>
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug">{data.title || "Titre de votre Short"}</p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex h-11 items-center justify-around border-t border-white/10 bg-black text-[9px]">
        <span className="flex flex-col items-center"><Home className="size-5" />Accueil</span>
        <span className="flex flex-col items-center"><Film className="size-5" />Shorts</span>
        <Plus className="size-7 rounded-full border border-white/40 p-1" />
        <span className="flex flex-col items-center text-white/70"><Bell className="size-5" />Abonnements</span>
        <span className="flex flex-col items-center text-white/70"><User className="size-5" />Vous</span>
      </div>
    </div>
  );
}

function YoutubeWatchScreen({ data }: { data: PreviewData }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="absolute inset-0 overflow-y-auto bg-white text-neutral-900 dark:bg-[#0f0f0f] dark:text-white scrollbar-thin">
      <div className="flex h-16 items-end justify-between px-3 pb-2">
        <span className="flex items-center gap-1 text-[15px] font-bold tracking-tight">
          <PlatformLogo platform="youtube" className="size-6 text-[#FF0033]" /> YouTube
        </span>
        <span className="flex gap-3 text-neutral-600 dark:text-neutral-300">
          <Bell className="size-5" />
          <Search className="size-5" />
        </span>
      </div>
      <div className="relative aspect-video bg-black">
        <VideoLayer data={data} fit="contain" />
        {data.duration !== undefined && (
          <span className="pointer-events-none absolute right-1.5 bottom-1.5 z-[2] rounded bg-black/80 px-1 text-[10px] font-medium text-white">
            {formatDuration(data.duration)}
          </span>
        )}
      </div>
      <div className="space-y-3 px-3 py-3">
        <p className="text-[15px] leading-snug font-semibold">{data.title || "Titre de votre vidéo"}</p>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">0 vue · à l&apos;instant</p>
        <div className="flex items-center gap-2">
          <MiniAvatar src={data.avatarUrl} name={data.name} size={34} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{data.name}</span>
            <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">abonnés</span>
          </span>
          <span className="rounded-full bg-neutral-900 px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-white dark:text-black">S&apos;abonner</span>
        </div>
        <div className="flex gap-2 overflow-hidden text-[11px] font-medium">
          {[
            [<ThumbsUp key="l" className="size-3.5" />, "0"],
            [<Share2 key="s" className="size-3.5" />, "Partager"],
            [<Download key="d" className="size-3.5" />, "Télécharger"],
          ].map(([icon, label], i) => (
            <span key={i} className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 dark:bg-white/10">
              {icon}
              {label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="block w-full rounded-xl bg-neutral-100 p-2.5 text-left text-[12px] dark:bg-white/10"
        >
          <span className="font-semibold">0 vue · à l&apos;instant</span>
          <RichText
            text={data.caption || "Votre description apparaîtra ici."}
            className={cn("mt-1 block whitespace-pre-line", !expanded && "line-clamp-3")}
            tagClass="text-sky-600 dark:text-sky-400"
          />
          <span className="mt-1 block font-semibold">{expanded ? "Moins" : "...plus"}</span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto w-[270px] rounded-[44px] bg-neutral-900 p-[9px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-neutral-700 dark:ring-neutral-700/60", className)}>
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[36px] bg-black">
        {children}
        <div className="pointer-events-none absolute top-2.5 left-1/2 z-10 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-black" />
        <div className="pointer-events-none absolute top-3 left-6 z-10 text-[11px] font-semibold text-white mix-blend-difference">9:41</div>
      </div>
    </div>
  );
}

export function PlatformPreview({ platform, data }: { platform: PlatformId; data: PreviewData }) {
  const photo = data.kind === "photo";
  return (
    <PhoneFrame>
      {platform === "tiktok" && <TikTokScreen data={data} />}
      {platform === "instagram" && (photo ? <InstagramFeedScreen data={data} /> : <InstagramScreen data={data} />)}
      {platform === "youtube" &&
        (photo ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-950 px-8 text-center text-sm text-white/70">
            <PlatformLogo platform="youtube" className="size-8 text-[#FF0033]" />
            YouTube n&apos;accepte que des vidéos.
          </div>
        ) : data.isShort ? (
          <YoutubeShortScreen data={data} />
        ) : (
          <YoutubeWatchScreen data={data} />
        ))}
    </PhoneFrame>
  );
}

