import { useNavigate } from "../router";
import { SCORE_LEVELS, computeScore } from "../lib/score";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function ScorePage() {
  const navigate = useNavigate();

  const user = useCurrentUser();
  let ext: Record<string, string> = {};
  try { ext = JSON.parse(localStorage.getItem("fb_profile_ext") ?? "{}"); } catch { /**/ }

  const myScore = computeScore({
    avatarUrl: user.avatarUrl ?? undefined,
    coverUrl: user.coverUrl ?? undefined,
    bio: user.bio,
    phone: user.phone,
    postsCount: 0,
    friendsCount: 0,
    extCity: ext.city,
    extHometown: ext.hometown,
    extLanguages: ext.languages,
    extHobbies: ext.hobbies,
  });

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingBottom: 40, background: "var(--fb-bg)", minHeight: "100vh" }}>
      <div style={{
        background: "var(--fb-white)", padding: "12px 16px",
        borderBottom: "1px solid var(--fb-divider)",
        display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--bp-primary)" }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Score de confiance</span>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{
          background: "var(--fb-white)", borderRadius: 14, padding: 20,
          border: "1px solid var(--fb-divider)", marginBottom: 16, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{myScore.emoji}</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: myScore.color }}>Niveau {myScore.label}</div>
          <div style={{ fontSize: 15, color: "var(--fb-text-secondary)", marginBottom: 12 }}>{myScore.points} / 100 points</div>

          <div style={{ background: "var(--fb-bg)", borderRadius: 8, height: 10, margin: "0 auto", maxWidth: 260, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 8,
              width: `${myScore.pct}%`,
              background: `linear-gradient(90deg, ${myScore.color}88, ${myScore.color})`,
              transition: "width 0.6s ease",
            }} />
          </div>

          {myScore.nextLevel && myScore.pointsToNext !== null && (
            <div style={{ fontSize: 13, color: "var(--fb-text-secondary)", marginTop: 8 }}>
              Encore <b>{myScore.pointsToNext} pts</b> pour atteindre <b>{myScore.nextLevel}</b>
            </div>
          )}
          {!myScore.nextLevel && (
            <div style={{ fontSize: 13, color: "#9C27B0", marginTop: 8, fontWeight: 700 }}>
              🎉 Tu as atteint le niveau maximum !
            </div>
          )}
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Comment gagner des points ?</div>

        {myScore.breakdown.map(b => (
          <div key={b.label} style={{
            background: "var(--fb-white)", borderRadius: 10, padding: "12px 14px",
            border: "1px solid var(--fb-divider)", marginBottom: 8,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.label}</div>
              <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                {b.earned === 0 ? "Non complété" : "Complété ✅"}
              </div>
            </div>
            <div style={{
              fontWeight: 800, fontSize: 15,
              color: b.earned > 0 ? "#388E3C" : "var(--fb-text-secondary)",
            }}>
              {b.earned > 0 ? `+${b.earned}` : `0`} / {b.max}
            </div>
          </div>
        ))}

        <div style={{ fontWeight: 700, fontSize: 15, margin: "20px 0 10px" }}>Les 5 niveaux</div>

        {SCORE_LEVELS.map((lvl, i) => {
          const isCurrent = lvl.level === myScore.level;
          const isUnlocked = myScore.points >= lvl.min;
          return (
            <div key={lvl.level} style={{
              background: "var(--fb-white)", borderRadius: 14, padding: 16,
              border: `2px solid ${isCurrent ? lvl.color : "var(--fb-divider)"}`,
              marginBottom: 10, opacity: isUnlocked ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 32 }}>{lvl.emoji}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 17, color: lvl.color }}>{lvl.label}</span>
                    {isCurrent && (
                      <span style={{ background: lvl.color, color: "#fff", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                        TON NIVEAU
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>
                    À partir de {lvl.min} pts
                    {i < SCORE_LEVELS.length - 1 ? ` jusqu'à ${SCORE_LEVELS[i + 1].min - 1} pts` : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--fb-text)", marginBottom: 8 }}>{lvl.description}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {lvl.perks.map(p => (
                  <div key={p} style={{ fontSize: 12, color: isUnlocked ? "#388E3C" : "var(--fb-text-secondary)", display: "flex", gap: 6, alignItems: "center" }}>
                    <span>{isUnlocked ? "✅" : "🔒"}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
