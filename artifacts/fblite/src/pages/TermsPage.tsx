import { useState } from "react";
import { useNavigate } from "../router";
import {
  ArrowLeft, ShieldCheck, CalendarCheck, ChevronRight, CheckCircle2,
  Info, UserRound, Compass, FileText, Ban, Copyright, Flag, Coins,
  UserX, Lock, Activity, Scale, Mail,
} from "lucide-react";

const C = {
  bg: "#F7F8FA",
  card: "#FFFFFF",
  primary: "var(--bp-primary)",
  paleGreen: "#EAF9F0",
  text: "#111827",
  secondary: "#64748B",
  muted: "#9CA3AF",
  border: "#EEF0F3",
  shadow: "0 1px 10px rgba(15,23,42,0.05)",
};

type Section = {
  num: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bullets: React.ReactNode[];
};

const iconProps = { size: 22, color: "var(--bp-primary)", strokeWidth: 1.9 } as const;

const LAST_UPDATE = "17 août 2026";

const SECTIONS: Section[] = [
  {
    num: "01", title: "À propos de BrutePawa", subtitle: "Présentation et acceptation des conditions",
    icon: <Info {...iconProps} />,
    bullets: [
      "BrutePawa est une plateforme sociale permettant de se connecter, partager, communiquer et découvrir du contenu.",
      "Des fonctionnalités peuvent être ajoutées, modifiées ou supprimées à tout moment.",
      "En utilisant BrutePawa, vous acceptez pleinement les présentes Conditions d'utilisation ainsi que les politiques associées.",
      "Les fonctionnalités disponibles peuvent varier selon le pays, l'âge, le type de compte ou la version de l'application.",
    ],
  },
  {
    num: "02", title: "Votre compte", subtitle: "Création, gestion et sécurité de votre compte",
    icon: <UserRound {...iconProps} />,
    bullets: [
      "Vous devez fournir des informations exactes, complètes et à jour.",
      "Vous êtes responsable de la sécurité de votre compte et de la confidentialité de vos identifiants.",
      "Vous ne devez pas usurper l'identité d'une autre personne.",
      "Vous ne pouvez pas acheter, vendre ou transférer votre compte sans autorisation.",
      "Nous pouvons suspendre ou supprimer tout compte qui viole nos règles.",
      "Signalez-nous dès que possible toute utilisation non autorisée de votre compte.",
    ],
  },
  {
    num: "03", title: "Utilisation de BrutePawa", subtitle: "Règles d'utilisation et comportements attendus",
    icon: <Compass {...iconProps} />,
    bullets: [
      "Vous devez utiliser BrutePawa de manière légale, responsable et respectueuse.",
      "Vous ne devez pas frauder, tromper, menacer ou harceler d'autres personnes.",
      "Vous ne devez pas enfreindre la loi ou porter atteinte aux droits d'autrui.",
      "Vous ne devez pas utiliser de systèmes automatisés non autorisés ni extraire massivement des données.",
      "Vous ne devez pas interférer avec le bon fonctionnement de la plateforme ni contourner nos systèmes de sécurité.",
      "Respectez les autres utilisateurs, même en cas de désaccord.",
    ],
  },
  {
    num: "04", title: "Contenus publiés", subtitle: "Vos contenus et responsabilités",
    icon: <FileText {...iconProps} />,
    bullets: [
      "Vous pouvez publier des textes, photos, vidéos, audios, commentaires, stories, lives et autres contenus.",
      "Vous restez responsable des contenus que vous publiez ou partagez.",
      "Vous devez disposer des droits nécessaires pour partager ces contenus.",
      "BrutePawa peut retirer tout contenu qui viole nos règles ou la loi.",
    ],
  },
  {
    num: "05", title: "Contenus interdits", subtitle: "Contenus et activités strictement interdits",
    icon: <Ban {...iconProps} />,
    bullets: [
      "Il est strictement interdit de publier ou partager :",
      "Violence, menaces, harcèlement, haine.",
      "Exploitation sexuelle, contenus impliquant des mineurs.",
      "Fraude, escroquerie, phishing, spam.",
      "Logiciels malveillants, virus, scripts nuisibles.",
      "Manipulation artificielle des interactions (likes, abonnés, vues).",
      "Usurpation d'identité de personnes, d'entreprises ou de BrutePawa.",
      "Tout contenu illégal ou préjudiciable.",
    ],
  },
  {
    num: "06", title: "Propriété intellectuelle", subtitle: "Droits, licence et propriété des contenus",
    icon: <Copyright {...iconProps} />,
    bullets: [
      "Vous conservez les droits sur vos contenus.",
      "Vous nous accordez une licence mondiale, non exclusive et gratuite, pour utiliser vos contenus uniquement pour fournir, sécuriser et améliorer BrutePawa.",
      "La licence prend fin lorsque le contenu est supprimé de nos systèmes, sous réserve des copies techniques et obligations légales.",
      "BrutePawa détient tous les droits sur la plateforme, son design, son code, ses marques et ses éléments graphiques.",
      "Vous devez respecter les droits d'auteur, marques et droits à l'image des tiers.",
    ],
  },
  {
    num: "07", title: "Signalement et modération", subtitle: "Signaler un contenu ou un compte",
    icon: <Flag {...iconProps} />,
    bullets: [
      "Vous pouvez signaler tout contenu ou compte qui viole nos règles. Les signalements doivent être effectués de bonne foi.",
      "Nos équipes et systèmes, y compris automatisés, peuvent examiner, retirer ou restreindre des contenus.",
      "Nous pouvons avertir, limiter, suspendre ou supprimer les comptes selon la gravité, la répétition et le contexte des violations.",
      "Lorsque la loi l'exige, nous fournissons des informations sur la mesure prise et les moyens de la contester.",
    ],
  },
  {
    num: "08", title: "Créateurs et monétisation", subtitle: "Conditions pour les créateurs et revenus",
    icon: <Coins {...iconProps} />,
    bullets: [
      "Certaines fonctionnalités permettent aux créateurs éligibles de générer des revenus.",
      "Cela inclut les cadeaux, abonnements, contributions, contenus premium et événements.",
      "Les conditions d'éligibilité, commissions et modalités de paiement peuvent s'appliquer et être précisées dans des conditions supplémentaires.",
      "L'éligibilité peut dépendre de l'âge, du pays, du respect des règles et de la conformité fiscale ou réglementaire.",
      "BrutePawa peut modifier ou retirer l'accès à la monétisation à tout moment lorsqu'un créateur ne respecte plus les conditions.",
    ],
  },
  {
    num: "09", title: "Suppression et résiliation", subtitle: "Suppression et désactivation des comptes",
    icon: <UserX {...iconProps} />,
    bullets: [
      "Vous pouvez supprimer votre compte à tout moment depuis les fonctionnalités prévues à cet effet.",
      "Vous pouvez supprimer ou suspendre votre compte en cas de violation grave.",
      "Certaines données peuvent être conservées pour des raisons légales, de sécurité ou de prévention de fraude.",
      "La suppression peut entraîner la suppression de votre profil, publications et contenus associés.",
    ],
  },
  {
    num: "10", title: "Confidentialité et sécurité", subtitle: "Protection de vos informations et sécurité",
    icon: <Lock {...iconProps} />,
    bullets: [
      "Nous protégeons vos informations selon notre Politique de confidentialité.",
      "Vous êtes responsable de la sécurité de vos identifiants : protégez votre mot de passe et signalez toute activité suspecte.",
      "Aucun service en ligne n'est totalement sécurisé ; nous mettons en œuvre des mesures de protection raisonnables.",
    ],
  },
  {
    num: "11", title: "Disponibilité et évolution", subtitle: "Disponibilité, maintenance et mises à jour",
    icon: <Activity {...iconProps} />,
    bullets: [
      "BrutePawa peut être temporairement indisponible pour maintenance ou pour des raisons techniques.",
      "Nous pouvons ajouter, modifier ou supprimer des fonctionnalités à tout moment.",
      "Nous faisons de notre mieux pour assurer la continuité du service, sans garantie d'absence d'interruption.",
    ],
  },
  {
    num: "12", title: "Responsabilité et droit applicable", subtitle: "Responsabilités, limites et droit applicable",
    icon: <Scale {...iconProps} />,
    bullets: [
      "Vous êtes responsable de votre utilisation de BrutePawa et des contenus que vous publiez.",
      "Nous ne sommes pas responsables des contenus publiés par les utilisateurs, sauf lorsque la loi applicable engage notre responsabilité.",
      "Les présentes Conditions sont régies par les lois applicables ; vous conservez les droits impératifs prévus dans votre pays.",
      "Si une disposition est invalide, les autres restent applicables.",
    ],
  },
  {
    num: "13", title: "Informations générales et contact", subtitle: "Modifications, dispositions générales et contact",
    icon: <Mail {...iconProps} />,
    bullets: [
      "Nous pouvons modifier ces Conditions ; la date de dernière mise à jour figure en haut du document et un avis sera fourni lorsque la loi l'exige.",
      "Ces Conditions se lisent avec nos politiques associées : Politique de confidentialité, Règles de la communauté, Conditions des créateurs et de monétisation, Politique publicitaire.",
      "En cas de litige, contactez-nous d'abord pour rechercher une solution ; les recours prévus par la loi restent disponibles.",
      "Contact : Brute — e-mail et adresse officiels disponibles depuis la page « Nous contacter ».",
      `Version : 1.0 — Dernière mise à jour : ${LAST_UPDATE} — Entité : Brute.`,
    ],
  },
];

function SommaireRow({ s, onClick, last = false }: { s: Section; onClick: () => void; last?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 13, padding: "13px 16px",
        background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left",
        borderBottom: last ? "none" : `1px solid ${C.border}`,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: C.paleGreen, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--bp-primary)", fontWeight: 800, fontSize: 12.5,
      }}>
        {s.num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text, marginBottom: 2 }}>{s.title}</div>
        <div style={{ fontSize: 11.5, color: C.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.subtitle}</div>
      </div>
      <ChevronRight size={16} color="#CBD5E1" strokeWidth={2.2} style={{ flexShrink: 0 }} />
    </button>
  );
}

export default function TermsPage() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState<number | null>(null); // null = sommaire
  const section = current !== null ? SECTIONS[current] : null;

  const header = (title: string, onBack: () => void) => (
    <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, height: 56, display: "flex", alignItems: "center", padding: "0 6px", position: "sticky", top: 0, zIndex: 30 }}>
      <button aria-label="Retour" onClick={onBack} style={{ width: 44, height: 44, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ArrowLeft size={22} color={C.text} strokeWidth={2} />
      </button>
      <h1 style={{ flex: 1, fontWeight: 700, fontSize: 16, color: C.text, margin: 0, textAlign: "center", letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
      <div style={{ width: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShieldCheck size={19} color="var(--bp-primary)" strokeWidth={1.9} />
      </div>
    </div>
  );

  /* ---------- Section detail view ---------- */
  if (section) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 28, zoom: 0.8 }}>
        {header(`${parseInt(section.num)}. ${section.title}`, () => setCurrent(null))}

        <div style={{ padding: "22px 16px 0" }}>
          <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "26px 22px" }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: C.paleGreen, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              {section.icon}
            </div>
            <div style={{ fontWeight: 800, fontSize: 19, color: C.text, letterSpacing: "-0.3px", marginBottom: 18 }}>{section.title}</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
              {section.bullets.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.primary, flexShrink: 0, marginTop: 7 }} />
                  <span style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.6 }}>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setCurrent(null)}
            style={{
              width: "100%", marginTop: 20, padding: "15px 0", borderRadius: 999, border: "none", cursor: "pointer",
              background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14.5,
              boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)",
            }}
          >
            Retour au sommaire
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Sommaire view ---------- */
  return (
    <div style={{ background: C.bg, minHeight: "100dvh", fontFamily: "Inter,-apple-system,BlinkMacSystemFont,sans-serif", paddingBottom: 28, zoom: 0.8 }}>
      {header("Conditions d'utilisation", () => navigate("/settings/messaging/about"))}

      {/* Hero card */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "22px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)" }}>
            <ShieldCheck size={28} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17.5, color: C.text, letterSpacing: "-0.3px", marginBottom: 5 }}>Conditions d'utilisation</div>
            <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.5, marginBottom: 12 }}>
              Veuillez lire attentivement les conditions avant d'utiliser BrutePawa
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.paleGreen, color: C.primary, fontSize: 11.5, fontWeight: 600, padding: "5px 11px", borderRadius: 999 }}>
              <CalendarCheck size={13} strokeWidth={2} />
              Dernière mise à jour : {LAST_UPDATE}
            </div>
          </div>
        </div>
      </div>

      {/* Sommaire */}
      <div style={{ padding: "22px 16px 0" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 12, letterSpacing: "-0.2px" }}>Sommaire</div>
        <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          {SECTIONS.map((s, i) => (
            <SommaireRow key={s.num} s={s} onClick={() => setCurrent(i)} last={i === SECTIONS.length - 1} />
          ))}
        </div>
      </div>

      {/* Acceptance note */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ background: C.paleGreen, borderRadius: 18, padding: "15px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ShieldCheck size={19} color="var(--bp-primary)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 3 }}>En utilisant BrutePawa</div>
            <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.55 }}>
              Vous acceptez pleinement ces conditions et notre <span style={{ color: C.primary, fontWeight: 600 }}>Politique de confidentialité</span>.
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate("/settings/messaging/about")}
          style={{
            width: "100%", marginTop: 16, padding: "15px 0", borderRadius: 999, border: "none", cursor: "pointer",
            background: C.primary, color: "#fff", fontWeight: 700, fontSize: 14,
            boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <CheckCircle2 size={17} strokeWidth={2.2} />
          J'ai lu et j'accepte les conditions d'utilisation
        </button>
      </div>
    </div>
  );
}
