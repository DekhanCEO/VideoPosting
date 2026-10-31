import { Config } from "@remotion/cli/config";

// Rendu de qualité « master » : images intermédiaires PNG (couleurs en plage standard), H.264 à CRF bas.
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(14);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
