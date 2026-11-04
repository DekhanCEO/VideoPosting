import { Config } from "@remotion/cli/config";

// Export : MP4 H.264 1080x1920, AAC 192 kb/s (cf. README).
Config.setVideoImageFormat("png");
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setAudioBitrate("192k");
Config.setOverwriteOutput(true);

// Navigateur local si fourni (environnements sans accès à remotion.media) : REMOTION_BROWSER=/chemin/vers/chrome
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
