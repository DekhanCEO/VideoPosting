import { Composition } from "remotion";
import { Launch } from "./Launch";
import { DURATION, FPS, HEIGHT, WIDTH } from "./config";

export const Root: React.FC = () => (
  <Composition id="Launch" component={Launch} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
