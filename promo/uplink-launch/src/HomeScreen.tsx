import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { APP_NAME, CHART, MAIN_NUMBER, ROWS, T } from "./config";
import { useTheme, useUser } from "./theme";
import { ArrowUp, Bars, Calendar, Home, PlayGlyph, Plus, StatusIcons, User } from "./icons";
import { Rise } from "./Rise";
import { Num } from "./Num";
import { SCREEN_H, SCREEN_W } from "./Phone";

const PAD = 22;
const CHART_W = SCREEN_W - PAD * 2 - 36;
const CHART_H = 132;

/** Courbe lissée (Catmull-Rom → Bézier) passant par les points du graphique. */
function chartPaths() {
  const min = Math.min(...CHART);
  const max = Math.max(...CHART);
  const pts = CHART.map((v, i) => [(i / (CHART.length - 1)) * CHART_W, CHART_H - 10 - ((v - min) / (max - min)) * (CHART_H - 26)]);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  return { line: d, area: `${d} L ${CHART_W} ${CHART_H} L 0 ${CHART_H} Z`, end: pts[pts.length - 1] };
}
const PATHS = chartPaths();

export const HomeScreen: React.FC = () => {
  const t = useTheme();
  const user = useUser();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const count = interpolate(frame, [T.countStart, T.countEnd], [MAIN_NUMBER.from, MAIN_NUMBER.to], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const draw = interpolate(frame, [T.chartStart, T.chartEnd], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.2, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dot = spring({ frame: frame - T.chartEnd + 4, fps, config: { damping: 9, stiffness: 240, mass: 0.5 } });

  return (
    <div style={{ position: "absolute", inset: 0, width: SCREEN_W, height: SCREEN_H, background: t.bg, color: t.ink, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      {/* Barre d'état */}
      <div style={{ position: "absolute", top: 26, left: 40, right: 34, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>9:41</span>
        <StatusIcons color={t.ink} />
      </div>

      {/* En-tête */}
      <Rise start={T.screenStart} style={{ position: "absolute", top: 76, left: PAD, right: PAD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <PlayGlyph size={17} color="#fff" />
          </div>
          <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.6 }}>{APP_NAME}</span>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 19, background: t.ink, color: t.dark ? "#0B0B12" : "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{user.initials}</div>
      </Rise>
      <Rise start={T.screenStart + 3} style={{ position: "absolute", top: 134, left: PAD }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.muted }}>Vendredi 31 octobre</div>
        <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: -0.8, marginTop: 2 }}>Bonsoir, {user.name}</div>
      </Rise>

      {/* Carte principale : le chiffre et le graphique */}
      <Rise start={T.screenStart + 5} distance={44} style={{ position: "absolute", top: 214, left: PAD, right: PAD }}>
        <div style={{ background: t.card, borderRadius: 26, padding: "20px 18px 14px", boxShadow: `0 1px 0 ${t.hairline}, 0 12px 28px -18px rgba(14,15,20,0.28)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: t.muted }}>{MAIN_NUMBER.label}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.muted, border: `1px solid ${t.hairline}`, borderRadius: 10, padding: "4px 9px" }}>28 j</span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.08, marginTop: 6 }}>
            <Num value={Math.round(count)} />
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "5px 10px 5px 6px", borderRadius: 12, background: `${t.accent}14`, color: t.accent, fontSize: 13.5, fontWeight: 700 }}>
            <ArrowUp size={16} color={t.accent} /> {MAIN_NUMBER.delta}
          </div>
          <svg width={CHART_W} height={CHART_H} style={{ display: "block", marginTop: 12, overflow: "visible" }}>
            <defs>
              <linearGradient id={`area-${t.dark ? "d" : "l"}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={t.accent} stopOpacity="0.2" />
                <stop offset="1" stopColor={t.accent} stopOpacity="0" />
              </linearGradient>
              <clipPath id={`reveal-${t.dark ? "d" : "l"}`}>
                <rect x="-4" y="-10" width={draw * (CHART_W + 8)} height={CHART_H + 20} />
              </clipPath>
            </defs>
            {[0.25, 0.5, 0.75].map((g) => (
              <line key={g} x1="0" x2={CHART_W} y1={CHART_H * g} y2={CHART_H * g} stroke={t.hairline} strokeWidth="1" />
            ))}
            <path d={PATHS.area} fill={`url(#area-${t.dark ? "d" : "l"})`} clipPath={`url(#reveal-${t.dark ? "d" : "l"})`} />
            <path d={PATHS.line} fill="none" stroke={t.accent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
            <g transform={`translate(${PATHS.end[0]} ${PATHS.end[1]}) scale(${frame >= T.chartEnd - 4 ? dot : 0})`}>
              <circle r="11" fill={t.accent} opacity="0.16" />
              <circle r="5.5" fill={t.card} stroke={t.accent} strokeWidth="3" />
            </g>
          </svg>
        </div>
      </Rise>

      {/* Dernières publications */}
      <Rise start={T.rowsStart - 4} style={{ position: "absolute", top: 600, left: PAD + 2, right: PAD + 2, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4 }}>Dernières publications</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: t.muted }}>Tout voir</span>
      </Rise>
      {ROWS.map((row, i) => (
        <Rise key={row.title} start={T.rowsStart + i * T.rowsStagger} distance={46} style={{ position: "absolute", top: 640 + i * 92, left: PAD, right: PAD }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, height: 80, padding: "0 16px 0 10px", background: t.card, borderRadius: 22, boxShadow: `0 1px 0 ${t.hairline}, 0 10px 24px -20px rgba(14,15,20,0.35)` }}>
            <div style={{ width: 58, height: 58, borderRadius: 16, background: t.dark ? "linear-gradient(150deg, #2c2c3a, #1a1a24)" : `linear-gradient(150deg, #2a2d36, ${t.ink})`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <PlayGlyph size={20} color="#fff" />
              <span style={{ position: "absolute", right: 6, bottom: 6, width: 8, height: 8, borderRadius: 4, background: t.accent }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted, marginTop: 3 }}>{row.meta}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, fontFeatureSettings: '"tnum"' }}>{row.value}</div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: t.muted }}>{row.unit}</div>
            </div>
          </div>
        </Rise>
      ))}

      {/* Barre d'onglets */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 96, background: t.dark ? "rgba(22,22,31,0.94)" : "rgba(255,255,255,0.94)", borderTop: `1px solid ${t.hairline}`, display: "flex", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 14 }}>
        <Home size={26} color={t.ink} />
        <Calendar size={26} color={t.muted} />
        <div style={{ width: 52, height: 52, marginTop: -6, borderRadius: 17, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 20px -10px ${t.accent}` }}>
          <Plus size={26} color="#fff" />
        </div>
        <Bars size={26} color={t.muted} />
        <User size={26} color={t.muted} />
      </div>
      <div style={{ position: "absolute", bottom: 10, left: SCREEN_W / 2 - 68, width: 136, height: 5, borderRadius: 3, background: t.ink }} />
    </div>
  );
};
