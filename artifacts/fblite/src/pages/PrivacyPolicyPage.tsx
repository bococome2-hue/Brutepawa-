import { useState } from "react";
import { useNavigate } from "../router";
import {
  ArrowLeft, ShieldCheck, CalendarCheck, ChevronRight, CheckCircle2, Lock,
  BookOpen, Database, Settings2, Share2, ServerCog, UserCheck, Baby,
  Cookie, Globe2, Archive, RefreshCcw, Mail, Info,
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

const iconProps = { size: 22, color: "var(--bp-primary)", strokeWidth: 1.9 } as const;

const LAST_UPDATE = "17 août 2026";

type Section = {
  num: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bullets: React.ReactNode[];
};

const SECTIONS: Section[] = [
  {
    num: "01", title: "Introduction", subtitle: "Qui sommes-nous et portée de cette politique",
    icon: <BookOpen {...iconProps} />,
    bullets: [
      "La présente Politique de confidentialité explique comment Brute (qui exploite BrutePawa) collecte, utilise, partage et protège vos données personnelles lorsque vous utilisez BrutePawa, notre réseau social et l'ensemble de nos services, applications, site web et fonctionnalités.",
      "Elle s'applique aux utilisateurs de BrutePawa dans le monde entier, sous réserve des règles obligatoires de votre pays ou région (dont le RGPD lorsqu'il est applicable).",
      "Nos principes : collecter uniquement le nécessaire, expliquer clairement nos usages, protéger vos données et respecter vos droits.",
      "En utilisant BrutePawa, vous reconnaissez avoir pris connaissance de cette Politique de confidentialité.",
    ],
  },
  {
    num: "02", title: "Données que nous collectons", subtitle: "Les types de données que nous recueillons",
    icon: <Database {...iconProps} />,
    bullets: [
      "Nous collectons différentes catégories de données, selon la manière dont vous utilisez BrutePawa :",
      "Informations de compte (nom, e-mail, téléphone, mot de passe protégé, date de naissance, photo, pays).",
      "Informations de profil (biographie, centres d'intérêt, liens, informations publiques).",
      "Contenus que vous créez (textes, photos, vidéos, audios, messages, stories, lives).",
      "Données relatives à votre activité (abonnements, likes, commentaires, recherches, préférences).",
      "Données techniques (adresse IP, appareil, système, version, journaux techniques).",
      "Données de localisation, uniquement avec les autorisations nécessaires.",
      "Données relatives aux paiements (statut, montant, devise, identifiant de transaction) — les données bancaires complètes sont traitées par des prestataires spécialisés.",
    ],
  },
  {
    num: "03", title: "Comment nous utilisons vos données", subtitle: "Les finalités et bases légales du traitement",
    icon: <Settings2 {...iconProps} />,
    bullets: [
      "Nous utilisons vos données personnelles pour les finalités suivantes :",
      "Fournir et améliorer nos services (compte, profil, publications, messages, notifications, paiements).",
      "Personnaliser votre expérience (recommandations, contenus pertinents, préférences).",
      "Assurer la sécurité et prévenir la fraude (détection des abus, du spam et des logiciels malveillants).",
      "Modérer les contenus et comportements, avec des systèmes automatisés et une intervention humaine si nécessaire.",
      "Communiquer avec vous (support, sécurité, modifications importantes).",
      "Analyser et développer nos services.",
      "Respecter nos obligations légales.",
    ],
  },
  {
    num: "04", title: "Partage de vos données", subtitle: "Destinataires et situations de partage",
    icon: <Share2 {...iconProps} />,
    bullets: [
      "Nous ne vendons pas vos données personnelles. Nous pouvons les partager uniquement dans les situations suivantes :",
      "Avec d'autres utilisateurs (informations que vous rendez publiques selon vos paramètres).",
      "Avec des prestataires de services (hébergement, stockage, sécurité, paiements, support), uniquement dans la mesure nécessaire.",
      "Pour des raisons légales ou judiciaires (obligation légale, procédure valide, protection des utilisateurs, prévention de fraude).",
      "Lors d'une transaction d'entreprise (fusion, acquisition, restructuration), sous réserve des exigences légales.",
    ],
  },
  {
    num: "05", title: "Stockage et sécurité", subtitle: "Comment nous protégeons vos données",
    icon: <ServerCog {...iconProps} />,
    bullets: [
      "Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :",
      "Chiffrement des données lorsque cela est approprié.",
      "Contrôles d'accès stricts et authentification.",
      "Surveillance et détection d'incidents.",
      "Sauvegardes régulières.",
      "Protection contre les accès non autorisés.",
      "Aucun système connecté à Internet n'est totalement sécurisé ; en cas de violation soumise à notification, nous prendrons les mesures requises par la loi.",
    ],
  },
  {
    num: "06", title: "Vos droits et vos choix", subtitle: "Vos droits et comment les exercer",
    icon: <UserCheck {...iconProps} />,
    bullets: [
      "Selon la législation applicable, vous pouvez disposer des droits suivants :",
      "Droit d'accès.",
      "Droit de rectification.",
      "Droit à l'effacement.",
      "Droit à la limitation.",
      "Droit d'opposition.",
      "Droit à la portabilité.",
      "Retrait du consentement à tout moment.",
      "Vous pouvez exercer vos droits depuis les outils disponibles dans BrutePawa ou en nous contactant ; nous pouvons vérifier votre identité avant de traiter certaines demandes.",
    ],
  },
  {
    num: "07", title: "Données des enfants", subtitle: "Protection des données des mineurs",
    icon: <Baby {...iconProps} />,
    bullets: [
      "BrutePawa n'est pas destiné aux enfants de moins de l'âge minimal requis par la loi.",
      "Nous ne collectons pas sciemment de données personnelles auprès d'enfants au-delà de ce qui est nécessaire au fonctionnement légal du service.",
      "Si nous apprenons qu'un compte a été créé en violation des règles d'âge, nous pouvons prendre des mesures, notamment supprimer ou restreindre le compte et les données associées.",
      "Si vous pensez qu'un enfant utilise BrutePawa en violation des règles applicables, contactez-nous.",
    ],
  },
  {
    num: "08", title: "Cookies et technologies similaires", subtitle: "Cookies, traceurs et outils similaires",
    icon: <Cookie {...iconProps} />,
    bullets: [
      "Nous utilisons des cookies et technologies similaires pour :",
      "Assurer le fonctionnement du site et maintenir votre session.",
      "Améliorer votre expérience et mémoriser vos préférences.",
      "Analyser l'utilisation et les performances.",
      "Personnaliser les contenus et les publicités lorsque cela s'applique.",
      "Assurer la sécurité et détecter des activités inhabituelles.",
      <span key="c">Vous pouvez gérer vos préférences de cookies à tout moment, notamment depuis les paramètres de votre navigateur.</span>,
    ],
  },
  {
    num: "09", title: "Transferts internationaux", subtitle: "Transferts de données hors de votre pays",
    icon: <Globe2 {...iconProps} />,
    bullets: [
      "Vos données peuvent être transférées et traitées dans des pays situés en dehors de votre pays de résidence, où nos infrastructures et prestataires opèrent.",
      "Dans ce cas, nous mettons en place des garanties appropriées pour assurer un niveau de protection adéquat conformément à la législation applicable.",
      "Pour les utilisateurs concernés par le RGPD, les transferts sont encadrés par les mécanismes prévus (décision d'adéquation ou garanties appropriées).",
    ],
  },
  {
    num: "10", title: "Conservation des données", subtitle: "Durées de conservation et critères",
    icon: <Archive {...iconProps} />,
    bullets: [
      "Nous conservons vos données uniquement pendant la durée nécessaire aux finalités pour lesquelles elles sont traitées, sauf obligation légale contraire.",
      "La durée dépend de l'existence de votre compte, de la nature des données, de nos obligations légales, de la sécurité et de la prévention des fraudes.",
      "Lorsque vous supprimez votre compte, nous lançons les processus de suppression ou d'anonymisation ; certaines copies peuvent rester temporairement dans les sauvegardes ou être conservées pour des raisons légales.",
      "Nous ne conservons pas les données personnelles indéfiniment sans raison légitime.",
    ],
  },
  {
    num: "11", title: "Modifications de cette politique", subtitle: "Mises à jour et notifications",
    icon: <RefreshCcw {...iconProps} />,
    bullets: [
      "Nous pouvons modifier cette Politique de confidentialité pour refléter les évolutions de nos pratiques, de nos prestataires ou pour des raisons légales.",
      "La date de dernière mise à jour apparaît en haut de cette Politique.",
      "Nous vous informerons des modifications importantes lorsque cela est requis.",
      <span key="c" style={{ color: "var(--bp-primary)", fontWeight: 600 }}>Consultez régulièrement cette page pour rester informé.</span>,
    ],
  },
  {
    num: "12", title: "Contact et exercice de vos droits", subtitle: "Nous contacter et autorités compétentes",
    icon: <Mail {...iconProps} />,
    bullets: [
      "Pour exercer vos droits ou pour toute question relative à vos données personnelles, contactez-nous :",
      "E-mail : depuis la page « Nous contacter » de l'application.",
      "Formulaire : Paramètres → Confidentialité.",
      "Adresse : Brute (siège légal de Brute).",
      "Vous pouvez également contacter l'autorité de protection des données compétente de votre pays ou région pour déposer une réclamation.",
    ],
  },
  {
    num: "13", title: "Informations générales", subtitle: "Informations légales et complémentaires",
    icon: <Info {...iconProps} />,
    bullets: [
      "Responsable du traitement : Brute — service BrutePawa.",
      "Bases légales des traitements : exécution du contrat, consentement, intérêts légitimes, obligations légales.",
      "Certaines informations peuvent provenir d'autres sources (autres utilisateurs, services d'authentification, prestataires techniques, systèmes de sécurité).",
      "Des systèmes automatisés peuvent être utilisés pour recommander des contenus, détecter le spam et améliorer la sécurité, dans le respect de la législation applicable.",
      "Documents associés : Conditions d'utilisation, Règles de la communauté, Politique de cookies, Politique de signalement.",
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

export default function PrivacyPolicyPage() {
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
      {header("Politique de confidentialité", () => navigate("/settings/messaging/about"))}

      {/* Hero card */}
      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ background: C.card, borderRadius: 22, boxShadow: C.shadow, border: `1px solid ${C.border}`, padding: "22px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,var(--bp-primary),var(--bp-primary-dark))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 22px rgba(var(--bp-primary-rgb),0.3)" }}>
            <Lock size={28} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17.5, color: C.text, letterSpacing: "-0.3px", marginBottom: 5 }}>Politique de confidentialité</div>
            <div style={{ fontSize: 12.5, color: C.secondary, lineHeight: 1.5, marginBottom: 12 }}>
              Nous respectons votre vie privée et nous nous engageons à protéger vos données personnelles
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

      {/* Trust note */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ background: C.paleGreen, borderRadius: 18, padding: "15px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <ShieldCheck size={19} color="var(--bp-primary)" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 3 }}>Votre confiance, notre priorité</div>
            <div style={{ fontSize: 12, color: C.secondary, lineHeight: 1.55 }}>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données.
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
          J'ai lu et j'accepte la politique
        </button>
      </div>
    </div>
  );
}
