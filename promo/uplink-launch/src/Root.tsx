import { Composition } from "remotion";
import { Launch } from "./Launch";
import { Tour, TOUR_DURATION } from "./tour/Tour";
import { NOUVELLE_DA_DURATION, TikTokNouvelleDA } from "./tiktok/NouvelleDA";
import { ONETAKE_DURATION, OneTake } from "./tiktok/OneTake";
import { SIGNAL_DURATION, TikTokSignal } from "./tiktok/Signal";
import { ESSENTIEL_DURATION, TikTokEssentiel } from "./tiktok/Essentiel";
import { ELAN_DURATION, Elan } from "./elan/Elan";
import { PREMIERE_DURATION, Premiere } from "./premiere/Premiere";
import { SUSPENSE_DURATION, Suspense } from "./suspense/Suspense";
import { DURATION, FPS, HEIGHT, WIDTH } from "./config";
import { UplinkPub } from "./pub/UplinkPub";
import { DURATION as PUB_DURATION, FPS as PUB_FPS, HEIGHT as PUB_HEIGHT, WIDTH as PUB_WIDTH } from "./pub/timing";

export const Root: React.FC = () => (
  <>
    <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Tour" component={Tour} durationInFrames={TOUR_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTok" component={TikTokNouvelleDA} durationInFrames={NOUVELLE_DA_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokPlanSequence" component={OneTake} durationInFrames={ONETAKE_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokSignal" component={TikTokSignal} durationInFrames={SIGNAL_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokEssentiel" component={TikTokEssentiel} durationInFrames={ESSENTIEL_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokElan" component={Elan} durationInFrames={ELAN_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokPremiere" component={Premiere} durationInFrames={PREMIERE_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TikTokSuspense" component={Suspense} durationInFrames={SUSPENSE_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="UplinkPub" component={UplinkPub} durationInFrames={PUB_DURATION} fps={PUB_FPS} width={PUB_WIDTH} height={PUB_HEIGHT} />
  </>
);
