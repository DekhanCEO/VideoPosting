import timelineJson from "./data/timeline.json";
import { computeCues, sceneOf, type SceneId, type Timeline } from "./cues";

export const TL = timelineJson as Timeline;
export const CUES = computeCues(TL);
export const FPS = TL.fps;
export const DURATION = TL.durationInFrames;
export const scene = (id: SceneId) => sceneOf(TL, id);

/** Ouverture de la bouche (0..1) à l'image absolue f, issue de l'amplitude de la voix. */
export const mouthAt = (f: number) => TL.mouth[Math.max(0, Math.min(TL.mouth.length - 1, Math.round(f)))] ?? 0;
