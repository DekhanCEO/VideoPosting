import { Composition } from "remotion";
import { Launch } from "./Launch";
import { Tour, TOUR_DURATION } from "./tour/Tour";
import { DURATION, FPS, HEIGHT, WIDTH } from "./config";

export const Root: React.FC = () => (
  <>
    <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Tour" component={Tour} durationInFrames={TOUR_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
