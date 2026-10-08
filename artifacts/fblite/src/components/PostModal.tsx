import { useState } from "react";

interface Props {
  userInitials: string;
  userName: string;
  onClose: () => void;
  onPost: (content: string) => void;
}

export default function PostModal({ userInitials, userName, onClose, onPost }: Props) {
  const [content, setContent] = useState("");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>Créer une publication</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className="avatar">{userInitials}</div>
            <div>
              <div style={{ fontWeight: 700 }}>{userName}</div>
              <div style={{ fontSize: 12, color: "var(--fb-text-secondary)" }}>🌐 Public</div>
            </div>
          </div>
          <textarea
            className="post-textarea"
            placeholder={`Quoi de neuf, ${userName.split(" ")[0]} ?`}
            value={content}
            onChange={e => setContent(e.target.value)}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {["📷 Photo/Vidéo", "👥 Taguer des amis", "📍 Lieu", "😊 Humeur"].map(opt => (
              <button key={opt} style={{ fontSize: 13, padding: "6px 12px", borderRadius: 20, background: "var(--fb-bg)", border: "none", cursor: "pointer", color: "var(--fb-text-secondary)" }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn-primary"
            onClick={() => { if (content.trim()) { onPost(content.trim()); onClose(); } }}
            style={{ opacity: content.trim() ? 1 : 0.5 }}
          >
            Publier
          </button>
        </div>
      </div>
    </div>
  );
}
