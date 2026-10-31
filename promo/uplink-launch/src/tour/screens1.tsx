import React from "react";
import { Easing, useCurrentFrame } from "remotion";
import { BRAND_NAMES, BrandLogo, type Brand } from "../brands";
import { Check } from "../icons";
import { Num } from "../Num";
import { useTheme, useUser } from "../theme";
import { AppScreen, Badge, Bar, BrandTile, Card, CheckBadge, Label, Segmented, SettingRow, Thumb, Toggle, Typed, prog, usePop } from "./kit";

const PLATFORMS: Brand[] = ["tiktok", "youtube", "instagram"];

/* ------------------------------------------------------------------ */
/* 02 · Comptes                                                        */
/* ------------------------------------------------------------------ */
export const AccountsScreen: React.FC = () => {
  const t = useTheme();
  const user = useUser();
  const frame = useCurrentFrame();
  const stats = prog(frame, 40, 78, Easing.bezier(0.16, 1, 0.3, 1));
  return (
    <AppScreen title="Comptes" tab={4}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PLATFORMS.map((p, i) => {
          const s = 10 + i * 6;
          const linked = usePop(s + 14, { damping: 11, stiffness: 240, mass: 0.5 });
          return (
            <Card key={p} start={s} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px" }}>
              <BrandTile brand={p} size={46} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{BRAND_NAMES[p]}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.muted, marginTop: 2 }}>
                  {p === "youtube" ? "@" : p === "tiktok" ? "@" : ""}
                  {user.handle} · {p === "youtube" ? "chaîne" : p === "tiktok" ? "créateur" : "compte pro"}
                </div>
              </div>
              <CheckBadge label="Connecté" scale={linked} />
            </Card>
          );
        })}
        <Card start={34} style={{ padding: "14px 14px 12px", marginTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BrandTile brand="twitch" size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Chaîne Twitch</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.muted, marginTop: 2 }}>{user.handle} · Affiliée</div>
            </div>
            <Badge>Revenus estimés</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { l: "Abonnés", v: 10183 },
              { l: "Abonnements", v: 193 },
              { l: "Bits ce mois-ci", v: 22519 },
              { l: "Revenu mensuel", v: 772, suffix: " €" },
            ].map((s) => (
              <div key={s.l} style={{ background: t.dark ? "#1d1d28" : "#F4F5F8", borderRadius: 14, padding: "9px 11px" }}>
                <Label style={{ fontSize: 12 }}>{s.l}</Label>
                <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, marginTop: 2, display: "flex" }}>
                  <Num value={Math.round(s.v * stats)} />
                  {s.suffix}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card start={46} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: `${t.accent}1A`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={16} color={t.accent} stroke={3} />
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Accès renouvelés automatiquement</div>
        </Card>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 03 · Créer                                                          */
/* ------------------------------------------------------------------ */
export const ComposerScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const upload = prog(frame, 8, 42, Easing.bezier(0.3, 0, 0.3, 1));
  const ready = usePop(43, { damping: 11, stiffness: 240, mass: 0.5 });
  return (
    <AppScreen title="Nouvelle publication" eyebrow="Créer">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Card start={6} style={{ display: "flex", gap: 14, padding: 12 }}>
          <Thumb title="Clutch 1v4 en ranked" w={88} h={146} badge="0:14" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>clutch.mp4</div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted }}>1080×1920 · 9:16 · 6,2 Mo</div>
            <Bar value={upload} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 26 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: t.muted, display: "flex" }}>
                <Num value={Math.round(upload * 100)} /> %
              </span>
              <CheckBadge label="Vidéo prête" scale={ready} />
            </div>
          </div>
        </Card>
        <Card start={30} style={{ padding: 12 }}>
          <Label style={{ marginBottom: 8 }}>Plateformes</Label>
          <div style={{ display: "flex", gap: 8 }}>
            {PLATFORMS.map((p, i) => {
              const on = usePop(46 + i * 6, { damping: 12, stiffness: 220, mass: 0.5 });
              return (
                <div
                  key={p}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 4px",
                    borderRadius: 16,
                    border: `2px solid ${on > 0.5 ? t.accent : t.hairline}`,
                    background: on > 0.5 ? `${t.accent}0F` : "transparent",
                    position: "relative",
                  }}
                >
                  <BrandLogo brand={p} size={22} color={t.ink} />
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{BRAND_NAMES[p]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: t.muted }}>{p === "youtube" ? "Short" : p === "instagram" ? "Reel" : "Vidéo"}</span>
                  <div style={{ position: "absolute", top: 6, right: 6, width: 18, height: 18, borderRadius: 9, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${on})` }}>
                    <Check size={11} color="#fff" stroke={3.4} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card start={52} style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Label>Légende commune</Label>
            <Badge tone="neutral">Synchronisée</Badge>
          </div>
          <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, lineHeight: 1.45, minHeight: 66 }}>
            <Typed text="Clutch 1v4 en ranked 🔥 Le round qui a tout retourné." start={60} cps={30} />
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {["#valorant", "#clutch", "#fyp"].map((h, i) => (
              <span key={h} style={{ transform: `scale(${usePop(100 + i * 4)})`, display: "inline-block" }}>
                <Badge>{h}</Badge>
              </span>
            ))}
          </div>
        </Card>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 04 · Réglages par plateforme                                        */
/* ------------------------------------------------------------------ */
const TABS_AT = [0, 56, 112];

export const SettingsScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const active = prog(frame, TABS_AT[1], TABS_AT[1] + 10) + prog(frame, TABS_AT[2], TABS_AT[2] + 10);
  const W = 434;
  const on = (s: number) => prog(frame, s, s + 7);
  const ytFormat = prog(frame, 74, 84); // Auto → Short
  const igType = 0; // Reel
  const cover = prog(frame, 128, 150, Easing.inOut(Easing.cubic));
  return (
    <AppScreen title="Réglages" eyebrow="Par plateforme">
      <Segmented options={PLATFORMS.map((p) => [<BrandLogo key="l" brand={p} size={15} color={t.ink} />, BRAND_NAMES[p]])} active={active} height={44} />
      <div style={{ position: "relative", overflow: "hidden", marginTop: 12, height: 640 }}>
        <div style={{ display: "flex", width: W * 3, transform: `translateX(${-active * W}px)` }}>
          {/* TikTok */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card start={8} style={{ padding: "12px 14px" }}>
              <Label>Qui peut voir cette vidéo ?</Label>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1.5px solid ${t.hairline}`, borderRadius: 12, padding: "10px 12px", fontSize: 15, fontWeight: 700 }}>
                Tout le monde <span style={{ color: t.muted }}>▾</span>
              </div>
            </Card>
            <Card start={14} style={{ padding: "4px 14px" }}>
              <SettingRow label="Commentaires"><Toggle on={on(20)} /></SettingRow>
              <SettingRow label="Duo"><Toggle on={on(24)} /></SettingRow>
              <SettingRow label="Collage (Stitch)" last><Toggle on={on(28)} /></SettingRow>
            </Card>
            <Card start={20} style={{ padding: "12px 14px" }}>
              <Label style={{ marginBottom: 8 }}>Mode de publication</Label>
              <Segmented options={["Publier directement", "Brouillon TikTok"]} active={0} fontSize={13} />
            </Card>
            <Card start={26} style={{ padding: "4px 14px" }}>
              <SettingRow label="Contenu commercial" hint="Votre marque · contenu de marque" last><Toggle on={0} /></SettingRow>
            </Card>
          </div>
          {/* YouTube */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card start={60} style={{ padding: "12px 14px" }}>
              <Label style={{ marginBottom: 8 }}>Format</Label>
              <div style={{ display: "flex", gap: 8 }}>
                {["Auto", "Short", "Vidéo longue"].map((o, i) => {
                  const sel = i === 0 ? 1 - ytFormat : i === 1 ? ytFormat : 0;
                  return (
                    <div key={o} style={{ flex: 1, borderRadius: 14, padding: "12px 8px", textAlign: "center", fontSize: 13.5, fontWeight: 700, border: `2px solid ${sel > 0.5 ? t.accent : t.hairline}`, background: sel > 0.5 ? `${t.accent}0F` : "transparent", color: sel > 0.5 ? t.accent : t.ink }}>
                      {o}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: t.muted }}>#Shorts ajouté automatiquement · 3 min max</div>
            </Card>
            <Card start={66} style={{ padding: "4px 14px" }}>
              <SettingRow label="Visibilité" hint="Dès la mise en ligne">
                <Badge>Publique</Badge>
              </SettingRow>
              <SettingRow label="Notifier les abonnés"><Toggle on={on(88)} /></SettingRow>
              <SettingRow label="Miniature personnalisée" last><Toggle on={on(92)} /></SettingRow>
            </Card>
            <Card start={72} style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
              <Thumb title="Clutch 1v4" w={86} h={48} radius={10} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Clutch 1v4 en ranked 🔥</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted }}>Gaming · Français</div>
              </div>
            </Card>
          </div>
          {/* Instagram */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card start={116} style={{ padding: "12px 14px" }}>
              <Label style={{ marginBottom: 8 }}>Type de publication</Label>
              <Segmented options={["Reel", "Publication", "Carrousel"]} active={igType} fontSize={13} />
            </Card>
            <Card start={120} style={{ padding: "4px 14px" }}>
              <SettingRow label="Partager dans le fil"><Toggle on={on(126)} /></SettingRow>
              <SettingRow label="Collaborateurs" last>
                <Badge tone="neutral">@lea_stream</Badge>
              </SettingRow>
            </Card>
            <Card start={124} style={{ padding: "12px 14px" }}>
              <Label style={{ marginBottom: 8 }}>Couverture</Label>
              <div style={{ position: "relative", display: "flex", gap: 3, height: 64 }}>
                {Array.from({ length: 7 }, (_, i) => (
                  <Thumb key={i} title="" w={56} h={64} radius={i === 0 ? 10 : 4} glow={0.25 + i * 0.07} />
                ))}
                <div style={{ position: "absolute", top: -4, left: 8 + cover * 300, width: 52, height: 72, borderRadius: 10, border: `3px solid ${t.accent}`, boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 05 · Photos et carrousels                                           */
/* ------------------------------------------------------------------ */
export const PhotosScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const mode = prog(frame, 6, 16);
  const swap = prog(frame, 58, 74, Easing.inOut(Easing.cubic)); // réordonne les photos 2 et 3
  const titles = ["La scène", "La commu", "Le stand", "La finale"];
  const cell = 205;
  const gap = 10;
  const slotXY = (slot: number) => ({ x: (slot % 2) * (cell + gap), y: Math.floor(slot / 2) * (cell * 1.25 + gap) });
  return (
    <AppScreen title="Photos" eyebrow="Créer">
      <Segmented options={["Vidéo", "Photos"]} active={mode} />
      <div style={{ position: "relative", height: 2 * (cell * 1.25) + gap, marginTop: 12 }}>
        {titles.map((ti, i) => {
          const from = slotXY(i);
          const target = i === 1 ? slotXY(2) : i === 2 ? slotXY(1) : from;
          const x = from.x + (target.x - from.x) * swap;
          const y = from.y + (target.y - from.y) * swap;
          const lift = i === 1 ? Math.sin(swap * Math.PI) : 0;
          const p = usePop(16 + i * 5);
          const n = i === 1 ? (swap > 0.5 ? 3 : 2) : i === 2 ? (swap > 0.5 ? 2 : 3) : i + 1;
          return (
            <div key={ti} style={{ position: "absolute", left: x, top: y, transform: `scale(${p * (1 + lift * 0.06)})`, zIndex: i === 1 ? 2 : 1, filter: lift > 0.05 ? `drop-shadow(0 ${12 * lift}px ${18 * lift}px rgba(0,0,0,0.3))` : undefined }}>
              <Thumb title={ti} w={cell} h={cell * 1.25} radius={18} glow={0.3 + i * 0.12} />
              <div style={{ position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{n}</div>
              {n === 1 && <div style={{ position: "absolute", top: 8, right: 8 }}><Badge tone="solid">Couverture</Badge></div>}
              <div style={{ position: "absolute", bottom: 8, right: 8 }}><Badge tone="neutral" style={{ background: "rgba(0,0,0,0.5)", color: "#fff" }}>4:5</Badge></div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        <Card start={40} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
          <BrandTile brand="instagram" size={38} />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>Carrousel <span style={{ color: t.muted, fontWeight: 600 }}>· 4 / 10 photos</span></div>
          <CheckBadge label="Prêt" />
        </Card>
        <Card start={46} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
          <BrandTile brand="tiktok" size={38} />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>Diaporama <span style={{ color: t.muted, fontWeight: 600 }}>· 35 max · musique auto</span></div>
          <CheckBadge label="Prêt" />
        </Card>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 06 · Programmer                                                     */
/* ------------------------------------------------------------------ */
export const ScheduleScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const mode = prog(frame, 8, 18);
  const pick = usePop(30, { damping: 11, stiffness: 220, mass: 0.6 });
  const days = ["L", "M", "M", "J", "V", "S", "D"];
  const offset = 3; // 1er octobre 2026 : jeudi
  const dots: Record<number, "pub" | "prog"> = { 6: "pub", 8: "pub", 10: "pub", 13: "pub", 14: "pub", 17: "prog", 21: "prog", 24: "prog" };
  return (
    <AppScreen title="Programmer" eyebrow="Quand publier ?" tab={1}>
      <Segmented options={["Maintenant", "Programmer"]} active={mode} />
      <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
        {["Ce soir 19:00", "Demain 12:00", "Samedi 10:00"].map((s, i) => {
          const sel = i === 0 && frame >= 24;
          return (
            <span key={s} style={{ transform: `scale(${usePop(14 + i * 3)})`, display: "inline-block" }}>
              <Badge tone={sel ? "solid" : "neutral"} style={{ fontSize: 13, padding: "8px 10px" }}>{s}</Badge>
            </span>
          );
        })}
      </div>
      <Card start={12} style={{ marginTop: 10, padding: "12px 12px 10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800 }}>Octobre 2026</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: t.muted }}>‹ ›</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4, textAlign: "center" }}>
          {days.map((d, i) => (
            <div key={i} style={{ fontSize: 11.5, fontWeight: 700, color: t.muted, paddingBottom: 4 }}>{d}</div>
          ))}
          {Array.from({ length: offset }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: 31 }, (_, i) => {
            const d = i + 1;
            const sel = d === 31;
            return (
              <div key={d} style={{ position: "relative", height: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {sel && <div style={{ position: "absolute", width: 36, height: 36, borderRadius: 18, background: t.accent, transform: `scale(${pick})` }} />}
                <span style={{ position: "relative", fontSize: 14, fontWeight: 700, color: sel && pick > 0.5 ? "#fff" : d < 31 ? t.ink : t.ink }}>{d}</span>
                {dots[d] && <span style={{ position: "relative", width: 5, height: 5, borderRadius: 3, marginTop: 2, background: dots[d] === "pub" ? t.ink : t.accent, opacity: dots[d] === "pub" ? 0.35 : 1 }} />}
              </div>
            );
          })}
        </div>
      </Card>
      <Card start={36} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: `${t.accent}1A`, color: t.accent, fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>19:00</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>Ven. 31 oct. à 19:00</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted, marginTop: 2 }}>Dans 2 heures · Europe/Paris</div>
        </div>
        <CheckBadge label="Programmé" scale={usePop(44)} />
      </Card>
    </AppScreen>
  );
};
