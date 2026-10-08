import { useState } from "react";

interface Props {
  text: string;
  maxChars?: number;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  onMentionClick?: (name: string) => void;
}

/** Splits text into plain strings + @mention React nodes */
function renderWithMentions(
  text: string,
  onMentionClick?: (name: string) => void,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match @Word, @Word Word, or @Word Word Word (up to 3 name segments)
  const regex = /@([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]*)(\s[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]*)?(\s[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ]*)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const full = m[0];                    // e.g. "@LANOU sachadrac"
    const name = full.slice(1).trimEnd(); // without the @
    parts.push(
      <span
        key={m.index}
        onClick={onMentionClick ? e => { e.stopPropagation(); onMentionClick(name); } : undefined}
        style={{
          color: "var(--bp-primary)",
          fontWeight: 700,
          cursor: onMentionClick ? "pointer" : "default",
        }}
      >
        {full}
      </span>
    );
    last = m.index + full.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ExpandableText({
  text,
  maxChars = 220,
  fontSize = 15,
  color = "#111827",
  lineHeight = 1.6,
  onMentionClick,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const spanStyle: React.CSSProperties = {
    fontSize, color, lineHeight, whiteSpace: "pre-wrap", wordBreak: "break-word",
  };

  if (!text || text.length <= maxChars) {
    return (
      <span style={spanStyle}>
        {renderWithMentions(text, onMentionClick)}
      </span>
    );
  }

  if (expanded) {
    return (
      <span style={spanStyle}>
        {renderWithMentions(text, onMentionClick)}
        {"  "}
        <span
          onClick={e => { e.stopPropagation(); setExpanded(false); }}
          style={{ color: "var(--bp-primary)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Voir moins
        </span>
      </span>
    );
  }

  const cut = text.slice(0, maxChars).trimEnd();

  return (
    <span style={spanStyle}>
      {renderWithMentions(cut, onMentionClick)}
      <span style={{ color: "#9CA3AF" }}>{"... "}</span>
      <span
        onClick={e => { e.stopPropagation(); setExpanded(true); }}
        style={{ color: "var(--bp-primary)", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        Voir plus
      </span>
    </span>
  );
}
