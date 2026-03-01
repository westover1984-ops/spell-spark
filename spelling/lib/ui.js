export const cardStyle = {
  background: "var(--card)",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.08)"
};

export const btn = (variant="primary") => {
  const base = { padding: "12px 14px", borderRadius: 12, border: 0, fontWeight: 800, cursor: "pointer" };
  if (variant === "ghost") return { ...base, background: "transparent", color: "var(--text)", border: "1px solid rgba(255,255,255,0.18)" };
  if (variant === "danger") return { ...base, background: "var(--bad)", color: "white" };
  if (variant === "ok") return { ...base, background: "var(--ok)", color: "black" };
  return { ...base, background: "var(--accent)", color: "white" };
};
