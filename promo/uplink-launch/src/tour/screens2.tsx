import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { BRAND_NAMES, BrandLogo, type Brand } from "../brands";
import { Check, Plus } from "../icons";
import { Num } from "../Num";
import { useTheme, useUser } from "../theme";
import { AppScreen, Badge, Bar, BrandTile, Card, CheckBadge, Label, Segmented, Thumb, prog, usePop } from "./kit";

const clampLerp = (frame: number, a: number, b: number, from: number, to: number, easing = Easing.bezier(0.3, 0, 0.3, 1)) =>
  interpolate(frame, [a, b], [from, to], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/* ------------------------------------------------------------------ */
/* 07 · Publication en direct                                          */
/* ------------------------------------------------------------------ */
export const PublishScreen: React.FC = () => {
  const t = useTheme();
  const user = useUser();
  const frame = useCurrentFrame();
  // TikTok et YouTube réussissent ; Instagram échoue puis est relancé.
  const tt = clampLerp(frame, 10, 58, 0, 1);
  const yt = clampLerp(frame, 10, 70, 0, 1);
  const igFirst = clampLerp(frame, 10, 56, 0, 0.64);
  const failed = frame >= 58 && frame < 88;
  const retryPress = usePop(80, { damping: 9, stiffness: 300, mass: 0.4 });
  const igSecond = clampLerp(frame, 88, 116, 0.64, 1);
  const ig = frame < 88 ? igFirst : igSecond;
  const done = (v: number) => v >= 0.999;
  const all = done(tt) && done(yt) && done(ig);
  const overall = (tt + yt + ig) / 3;
  const rows: { p: Brand; v: number; step: string; url: string }[] = [
    { p: "tiktok", v: tt, step: tt < 0.86 ? "Envoi vers TikTok" : "TikTok traite la vidéo", url: `@${user.handle}/video/742…` },
    { p: "youtube", v: yt, step: yt < 0.86 ? "Envoi vers YouTube" : "Finalisation du Short", url: "shorts/Vq3d…" },
    { p: "instagram", v: ig, step: failed ? "Échec : format audio refusé" : ig < 0.86 ? "Envoi vers Instagram" : "Instagram traite le Reel", url: "reel/DBk2…" },
  ];
  return (
    <AppScreen title="Clutch 1v4 en ranked" eyebrow="Publication">
      <Card start={4} style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{all ? "En ligne sur 3 plateformes" : "Publication en cours…"}</span>
          <span style={{ fontSize: 14, fontWeight: 800, display: "flex" }}>
            <Num value={Math.round(overall * 100)} /> %
          </span>
        </div>
        <Bar value={overall} height={9} />
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {rows.map((r, i) => {
          const ok = done(r.v);
          const isFail = r.p === "instagram" && failed;
          // Hook appelé à chaque image (jamais sous condition), même avant la mise en ligne.
          const okPop = usePop(r.p === "instagram" ? 117 : r.p === "tiktok" ? 59 : 71);
          return (
            <Card key={r.p} start={8 + i * 4} style={{ padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <BrandTile brand={r.p} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800 }}>{BRAND_NAMES[r.p]}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: isFail ? t.ink : t.muted, marginTop: 2 }}>{ok ? r.url : r.step}</div>
                </div>
                {ok ? (
                  <CheckBadge label="Publiée" scale={okPop} />
                ) : isFail ? (
                  <span style={{ transform: `scale(${1 - 0.12 * Math.sin(Math.min(1, retryPress) * Math.PI)})`, display: "inline-block" }}>
                    <Badge tone="solid" style={{ fontSize: 13, padding: "7px 11px" }}>↻ Relancer</Badge>
                  </span>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 800, color: t.muted, display: "flex" }}>
                    <Num value={Math.round(r.v * 100)} /> %
                  </span>
                )}
              </div>
              {!ok && (
                <div style={{ marginTop: 10 }}>
                  <Bar value={r.v} height={6} color={isFail ? t.muted : t.accent} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Card start={118} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: `${t.accent}12`, boxShadow: "none" }}>
        <div style={{ width: 30, height: 30, borderRadius: 15, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={16} color="#fff" stroke={3} />
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: t.accent }}>Bravo ! Votre vidéo est en ligne partout.</span>
      </Card>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 08 · Annonces Discord                                               */
/* ------------------------------------------------------------------ */
export const DiscordScreen: React.FC = () => {
  const t = useTheme();
  const user = useUser();
  const frame = useCurrentFrame();
  const msg = usePop(34, { damping: 16, stiffness: 140, mass: 0.8 });
  const line = (s: number) => ({ opacity: prog(frame, s, s + 6), transform: `translateY(${(1 - prog(frame, s, s + 8)) * 8}px)` });
  return (
    <AppScreen title="Annonces Discord" eyebrow="Communauté">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { n: "#annonces", d: "Un message par plateforme · liens", s: 6 },
          { n: "#vip-clips", d: "Récapitulatif · carte · @VIP", s: 12 },
        ].map((h) => (
          <Card key={h.n} start={h.s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
            <BrandTile brand="discord" size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>{h.n}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: t.muted, marginTop: 2 }}>{h.d}</div>
            </div>
            <Badge tone="neutral">Actif</Badge>
          </Card>
        ))}
      </div>
      <div style={{ marginTop: 14, transform: `translateY(${(1 - msg) * 60}px) scale(${0.94 + 0.06 * msg})`, opacity: Math.min(1, msg * 3), transformOrigin: "50% 100%" }}>
        <Label style={{ marginBottom: 8 }}>Aperçu dans le salon</Label>
        <div style={{ background: "#313338", borderRadius: 18, padding: 14, color: "#DBDEE1", fontSize: 14, lineHeight: 1.45 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: t.accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" fill="#fff" /></svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>Uplink</span>
                <span style={{ background: "#5865F2", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 4px" }}>APP</span>
                <span style={{ color: "#949BA4", fontSize: 12 }}>Aujourd'hui à 19:00</span>
              </div>
              <div style={line(44)}>🎬 <b style={{ color: "#fff" }}>Clutch 1v4 en ranked</b> est en ligne !</div>
              <div style={line(52)}>🎵 TikTok : <span style={{ color: "#00A8FC" }}>tiktok.com/@{user.handle}/video/7425…</span></div>
              <div style={line(60)}>▶️ YouTube : <span style={{ color: "#00A8FC" }}>youtube.com/shorts/Vq3dX8…</span></div>
              <div style={line(68)}>📸 Instagram : <span style={{ color: "#00A8FC" }}>instagram.com/reel/DBk2pQ…</span></div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "center", transform: `scale(${usePop(84)})` }}>
        <Badge tone="solid" style={{ fontSize: 13.5, padding: "8px 12px" }}>
          <Check size={14} color="#fff" stroke={3} /> Envoyé dans #annonces
        </Badge>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 09 · Statistiques                                                   */
/* ------------------------------------------------------------------ */
const VIEWS = [52, 61, 58, 66, 63, 72, 70, 79, 75, 88, 83, 95, 91, 104];

export const StatsScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const c = prog(frame, 10, 48, Easing.bezier(0.16, 1, 0.3, 1));
  const kpis = [
    { l: "Abonnés", v: Math.round(1711 * c) / 10, unit: " k", d: 1 },
    { l: "Vues · 28 j", v: Math.round(20 * c) / 10, unit: " M", d: 1 },
    { l: "Interactions", v: Math.round(434 * c) / 10, unit: " k", d: 1 },
    { l: "Engagement", v: Math.round(94 * c) / 10, unit: " %", d: 1 },
  ];
  const max = Math.max(...VIEWS);
  return (
    <AppScreen title="Statistiques" eyebrow="Analyser" tab={3}>
      <Segmented options={["7 j", "28 j", "90 j", "12 mois"]} active={1} height={38} fontSize={13} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        {kpis.map((k, i) => (
          <Card key={k.l} start={6 + i * 3} style={{ padding: "11px 12px" }}>
            <Label style={{ fontSize: 12 }}>{k.l}</Label>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.7, marginTop: 2, display: "flex", alignItems: "baseline" }}>
              <Num value={k.v} decimals={k.d} />
              <span style={{ fontSize: 17 }}>{k.unit}</span>
            </div>
          </Card>
        ))}
      </div>
      <Card start={18} style={{ marginTop: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14.5, fontWeight: 800 }}>Vues par jour</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["tiktok", "youtube", "instagram"] as Brand[]).map((p, i) => (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: t.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: t.accent, opacity: [1, 0.55, 0.28][i] }} />
                {BRAND_NAMES[p]}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150, marginTop: 12 }}>
          {VIEWS.map((v, i) => {
            const g = prog(frame, 24 + i * 2.2, 40 + i * 2.2, Easing.bezier(0.2, 0.9, 0.3, 1));
            const h = (v / max) * 150 * g;
            return (
              <div key={i} style={{ flex: 1, height: h, display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "28%", background: t.accent, opacity: 0.28 }} />
                <div style={{ height: "22%", background: t.accent, opacity: 0.55 }} />
                <div style={{ height: "50%", background: t.accent }} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card start={40} style={{ marginTop: 10, padding: "6px 14px" }}>
        {[
          { r: 1, ti: "Les coulisses d'un live de 12 h", v: "112,3 k" },
          { r: 2, ti: "Récap de la DreamHack", v: "98,0 k" },
          { r: 3, ti: "Clutch 1v4 en ranked", v: "77,8 k" },
        ].map((row, i) => (
          <div key={row.r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 2 ? `1px solid ${t.hairline}` : "none" }}>
            <span style={{ width: 18, fontSize: 13, fontWeight: 800, color: t.muted }}>{row.r}</span>
            <Thumb title="" w={30} h={40} radius={7} glow={0.3 + i * 0.15} />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.ti}</span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{row.v}</span>
          </div>
        ))}
      </Card>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 10 · Taux d'influence                                               */
/* ------------------------------------------------------------------ */
export const InfluenceScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const c = prog(frame, 10, 46, Easing.bezier(0.16, 1, 0.3, 1));
  const weights = ["J'aime ×1", "Commentaires ×2", "Partages ×3", "Enregistrements ×2"];
  const rows: { p: Brand; v: number; tag: string }[] = [
    { p: "tiktok", v: 13.2, tag: "Au-dessus" },
    { p: "youtube", v: 12.0, tag: "Moyenne" },
    { p: "instagram", v: 12.3, tag: "Moyenne" },
  ];
  return (
    <AppScreen title="Taux d'influence" eyebrow="Analyser" tab={3}>
      <Card start={4} style={{ padding: "16px 16px 14px" }}>
        <Label>Toutes plateformes · 28 jours</Label>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 58, fontWeight: 800, letterSpacing: -2 }}>
            <Num value={Math.round(128 * c) / 10} decimals={1} />
          </span>
          <span style={{ fontSize: 30, fontWeight: 800 }}>%</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.muted }}>actions engagées pour 100 vues</div>
        <div style={{ marginTop: 10, transform: `scale(${usePop(44)})`, transformOrigin: "0 50%", display: "inline-block" }}>
          <Badge>▲ +1,4 pt vs mois dernier</Badge>
        </div>
      </Card>
      <Card start={18} style={{ marginTop: 10, padding: "12px 14px" }}>
        <Label style={{ marginBottom: 8 }}>Formule pondérée</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {weights.map((w, i) => (
            <span key={w} style={{ transform: `scale(${usePop(24 + i * 4)})`, display: "inline-block" }}>
              <Badge tone="neutral" style={{ fontSize: 13, padding: "6px 10px", color: t.ink }}>{w}</Badge>
            </span>
          ))}
          <span style={{ transform: `scale(${usePop(42)})`, display: "inline-block" }}>
            <Badge style={{ fontSize: 13, padding: "6px 10px" }}>÷ vues</Badge>
          </span>
        </div>
      </Card>
      <Card start={36} style={{ marginTop: 10, padding: "6px 14px" }}>
        {rows.map((r, i) => {
          const g = prog(frame, 48 + i * 6, 70 + i * 6);
          return (
            <div key={r.p} style={{ padding: "10px 0", borderBottom: i < 2 ? `1px solid ${t.hairline}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BrandLogo brand={r.p} size={18} color={t.ink} />
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 800 }}>{BRAND_NAMES[r.p]}</span>
                <Badge tone={r.tag === "Au-dessus" ? "accent" : "neutral"}>{r.tag}</Badge>
                <span style={{ fontSize: 16, fontWeight: 800, width: 64, textAlign: "right", display: "flex", justifyContent: "flex-end" }}>
                  <Num value={Math.round(r.v * 10 * g) / 10} decimals={1} /> %
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <Bar value={(r.v / 16) * g} height={7} />
              </div>
            </div>
          );
        })}
      </Card>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 11 · Audience                                                       */
/* ------------------------------------------------------------------ */
export const AudienceScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const g = prog(frame, 12, 40);
  const ages = [
    ["13–17", 11],
    ["18–24", 38],
    ["25–34", 31],
    ["35–44", 13],
    ["45 +", 7],
  ] as const;
  const countries = [
    ["🇫🇷", "France", 63],
    ["🇧🇪", "Belgique", 8],
    ["🇨🇦", "Canada", 6],
    ["🇨🇭", "Suisse", 5],
  ] as const;
  return (
    <AppScreen title="Audience" eyebrow="Qui vous suit" tab={3}>
      <Card start={4} style={{ padding: "14px 14px 12px" }}>
        <Label>Genre</Label>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8, marginTop: 2, display: "flex", alignItems: "baseline", gap: 6 }}>
          <Num value={Math.round(57 * g)} /> % <span style={{ fontSize: 15, fontWeight: 700, color: t.muted }}>de femmes</span>
        </div>
        <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginTop: 10, background: t.dark ? "#22222e" : "#ECEEF3" }}>
          <div style={{ width: `${57 * g}%`, background: t.accent }} />
          <div style={{ width: `${40 * g}%`, background: t.ink, opacity: 0.8 }} />
          <div style={{ width: `${3 * g}%`, background: t.muted, opacity: 0.5 }} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 12, fontWeight: 700, color: t.muted }}>
          <span>● Femmes 57 %</span>
          <span>● Hommes 40 %</span>
          <span>● Autres 3 %</span>
        </div>
      </Card>
      <Card start={16} style={{ marginTop: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Label>Âge</Label>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Âge moyen 28 ans</span>
        </div>
        {ages.map(([a, v], i) => {
          const p = prog(frame, 24 + i * 3, 46 + i * 3);
          return (
            <div key={a} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
              <span style={{ width: 48, fontSize: 12.5, fontWeight: 700, color: t.muted }}>{a}</span>
              <div style={{ flex: 1 }}>
                <Bar value={(v / 40) * p} height={8} />
              </div>
              <span style={{ width: 38, textAlign: "right", fontSize: 13, fontWeight: 800 }}>{Math.round(v * p)} %</span>
            </div>
          );
        })}
      </Card>
      <Card start={30} style={{ marginTop: 10, padding: "12px 14px" }}>
        <Label>Pays touchés</Label>
        {countries.map(([f, n, v], i) => {
          const p = prog(frame, 38 + i * 4, 60 + i * 4);
          return (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
              <span style={{ fontSize: 17 }}>{f}</span>
              <span style={{ width: 78, fontSize: 13.5, fontWeight: 700 }}>{n}</span>
              <div style={{ flex: 1 }}>
                <Bar value={(v / 63) * p} height={8} />
              </div>
              <span style={{ width: 38, textAlign: "right", fontSize: 13, fontWeight: 800 }}>{Math.round(v * p)} %</span>
            </div>
          );
        })}
      </Card>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 12 · Revenus                                                        */
/* ------------------------------------------------------------------ */
export const RevenueScreen: React.FC = () => {
  const t = useTheme();
  const frame = useCurrentFrame();
  const c = prog(frame, 8, 50, Easing.bezier(0.16, 1, 0.3, 1));
  const goal = prog(frame, 20, 56);
  const sources: { b: Brand | null; l: string; v: number; tag: string }[] = [
    { b: null, l: "Partenariat · Sephora", v: 2930, tag: "Reçu" },
    { b: "twitch", l: "Abonnements et bits", v: 772.69, tag: "Estimé" },
    { b: "youtube", l: "Revenus publicitaires", v: 684.79, tag: "Importé" },
    { b: "tiktok", l: "Programme créateurs", v: 531.5, tag: "Estimé" },
  ];
  return (
    <AppScreen title="Revenus" eyebrow="Gagner">
      <Card start={4} style={{ padding: "14px 16px" }}>
        <Label>Revenus du mois</Label>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.6, marginTop: 2, display: "flex", alignItems: "baseline" }}>
          <Num value={Math.round(491898 * c) / 100} decimals={2} />
          <span style={{ fontSize: 30, marginLeft: 6 }}>€</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: t.muted, marginTop: 8 }}>
          <span>Objectif 2 000 €</span>
          <span style={{ color: goal >= 1 ? t.accent : t.muted }}>{goal >= 1 ? "Atteint ✓" : `${Math.round(goal * 100)} %`}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          <Bar value={goal} height={9} />
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {sources.map((s, i) => (
          <Card key={s.l} start={30 + i * 6} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px" }}>
            {s.b ? (
              <BrandTile brand={s.b} size={40} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}1A`, color: t.accent, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>★</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{s.l}</div>
              <div style={{ marginTop: 3 }}>
                <Badge tone={s.tag === "Estimé" ? "accent" : "neutral"} style={{ fontSize: 11.5, padding: "3px 7px" }}>{s.tag}</Badge>
              </div>
            </div>
            <span style={{ fontSize: 15.5, fontWeight: 800 }}>+{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(s.v)} €</span>
          </Card>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, transform: `scale(${usePop(64)})`, transformOrigin: "0 50%" }}>
        <Badge tone="neutral" style={{ fontSize: 13, padding: "8px 11px", color: t.ink }}>Export CSV</Badge>
        <Badge tone="neutral" style={{ fontSize: 13, padding: "8px 11px", color: t.ink }}>
          <Plus size={13} color={t.ink} stroke={3} /> Ajouter un revenu
        </Badge>
      </div>
    </AppScreen>
  );
};

/* ------------------------------------------------------------------ */
/* 13 · Espaces et accès (administrateur)                              */
/* ------------------------------------------------------------------ */
export const AdminScreen: React.FC = () => {
  const t = useTheme();
  const user = useUser();
  const frame = useCurrentFrame();
  const mode = prog(frame, 18, 28);
  const spaces = [
    { n: user.name, sub: "Vous · Administrateur", posts: 13, initial: user.initials },
    { n: "Lea_stream", sub: "Créatrice invitée", posts: 4, initial: "L" },
    { n: "Kevin_clips", sub: "Créateur invité", posts: 2, initial: "K" },
  ];
  const checks = ["API YouTube, TikTok et Instagram configurées", "Pages légales en ligne", "Mode démo désactivé"];
  return (
    <AppScreen title="Espaces & accès" eyebrow="Administrateur" tab={4}>
      <Card start={4} style={{ padding: "12px 14px" }}>
        <Label style={{ marginBottom: 8 }}>Qui peut se connecter ?</Label>
        <Segmented options={["Admin", "Sur invitation", "Ouvert"]} active={mode} fontSize={13} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {["@lea_stream", "@kevin_clips", "@nina_gaming"].map((h, i) => (
            <span key={h} style={{ transform: `scale(${usePop(32 + i * 5)})`, display: "inline-block" }}>
              <Badge>{h}</Badge>
            </span>
          ))}
        </div>
      </Card>
      <Card start={44} style={{ marginTop: 10, padding: "4px 14px" }}>
        {spaces.map((s, i) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: i < 2 ? `1px solid ${t.hairline}` : "none", opacity: prog(frame, 48 + i * 5, 54 + i * 5) }}>
            <div style={{ width: 36, height: 36, borderRadius: 18, background: i === 0 ? t.ink : t.accent, color: i === 0 && !t.dark ? "#fff" : "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", opacity: i === 0 ? 1 : 0.85 - i * 0.2 }}>{s.initial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800 }}>{s.n}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>{s.sub}</div>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.muted }}>{s.posts} publications</span>
          </div>
        ))}
      </Card>
      <Card start={64} style={{ marginTop: 10, padding: "6px 14px" }}>
        {checks.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${t.hairline}` : "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${usePop(72 + i * 7)})` }}>
              <Check size={13} color="#fff" stroke={3.2} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c}</span>
          </div>
        ))}
      </Card>
    </AppScreen>
  );
};
