import { Composition } from "remotion";
import { Launch } from "./Launch";
import { Tour, TOUR_DURATION } from "./tour/Tour";
import { NOUVELLE_DA_DURATION, TikTokNouvelleDA } from "./tiktok/NouvelleDA";
import { ONETAKE_DURATION, OneTake } from "./tiktok/OneTake";
import { SIGNAL_DURATION, TikTokSignal } from "./tiktok/Signal";
import { ESSENTIEL_DURATION, TikTokEssentiel } from "./tiktok/Essentiel";
import { DURATION, FPS, HEIGHT, WIDTH } from "./config";

export const Root: React.FC = () => (
  <>
    <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Tour" component={Tour} durationInFrames={TOUR_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTok" component={TikTokNouvelleDA} durationInFrames={NOUVELLE_DA_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokPlanSequence" component={OneTake} durationInFrames={ONETAKE_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokSignal" component={TikTokSignal} durationInFrames={SIGNAL_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokEssentiel" component={TikTokEssentiel} durationInFrames={ESSENTIEL_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
