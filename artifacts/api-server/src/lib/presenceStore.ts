const store = new Map<number, Date>();

export function touchPresence(userId: number): void {
  store.set(userId, new Date());
}

export function getPresence(userId: number): { online: boolean; lastSeenAt: string | null } {
  const last = store.get(userId);
  if (!last) return { online: false, lastSeenAt: null };
  const diffMs = Date.now() - last.getTime();
  const online = diffMs < 3 * 60 * 1000;
  return { online, lastSeenAt: last.toISOString() };
}
