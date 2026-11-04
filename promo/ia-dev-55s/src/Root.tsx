import React from "react";
import { Composition } from "remotion";
import { DURATION, FPS } from "./data";
import { Thumbnail } from "./Thumbnail";
import { Video } from "./Video";

export const Root: React.FC = () => (
  <>
    <Composition id="IaDev55" component={Video} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ showSafe: false, audit: false }} />
    {/* même vidéo avec les zones de sécurité surlignées (contrôle) */}
    <Composition id="IaDev55Safe" component={Video} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ showSafe: true, audit: false }} />
    {/* mode contrôle : mesure des textes (scripts/audit.mjs) */}
    <Composition id="IaDev55Audit" component={Video} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={{ showSafe: false, audit: true }} />
    <Composition id="Thumbnail" component={Thumbnail} durationInFrames={1} fps={FPS} width={1080} height={1920} />
  </>
);
