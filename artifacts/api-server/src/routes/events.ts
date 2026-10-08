import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventRsvpsTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.get("/events", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      id: eventsTable.id,
      organizerId: eventsTable.organizerId,
      title: eventsTable.title,
      description: eventsTable.description,
      location: eventsTable.location,
      startAt: eventsTable.startAt,
      endAt: eventsTable.endAt,
      coverUrl: eventsTable.coverUrl,
      isOnline: eventsTable.isOnline,
      type: eventsTable.type,
      goingCount: eventsTable.goingCount,
      interestedCount: eventsTable.interestedCount,
      createdAt: eventsTable.createdAt,
      organizerFirstName: usersTable.firstName,
      organizerLastName: usersTable.lastName,
      organizerAvatarUrl: usersTable.avatarUrl,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .orderBy(desc(eventsTable.startAt))
    .limit(50);

  const eventIds = rows.map(r => r.id);
  let myRsvps: { eventId: number; status: string }[] = [];
  if (eventIds.length > 0) {
    myRsvps = await db
      .select({ eventId: eventRsvpsTable.eventId, status: eventRsvpsTable.status })
      .from(eventRsvpsTable)
      .where(and(
        eq(eventRsvpsTable.userId, userId),
        sql`${eventRsvpsTable.eventId} = ANY(ARRAY[${sql.join(eventIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      ));
  }
  const rsvpMap = new Map(myRsvps.map(r => [r.eventId, r.status]));

  res.json(rows.map(r => ({
    id: r.id,
    organizerId: r.organizerId,
    organizerName: r.organizerFirstName && r.organizerLastName ? `${r.organizerFirstName} ${r.organizerLastName}` : "Organisateur",
    organizerAvatarUrl: r.organizerAvatarUrl ?? null,
    title: r.title,
    description: r.description ?? "",
    location: r.location ?? "",
    startAt: r.startAt,
    endAt: r.endAt ?? null,
    coverUrl: r.coverUrl ?? null,
    isOnline: r.isOnline,
    type: r.type,
    goingCount: r.goingCount,
    interestedCount: r.interestedCount,
    createdAt: r.createdAt,
    myRsvp: rsvpMap.get(r.id) ?? null,
  })));
});

router.post("/events", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const { title, description, location, startAt, endAt, isOnline, type } = req.body ?? {};
  if (!title || !startAt) { res.status(400).json({ error: "Titre et date de début requis" }); return; }
  const [event] = await db.insert(eventsTable).values({
    organizerId: userId,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    location: location ? String(location).trim() : null,
    startAt: new Date(startAt),
    endAt: endAt ? new Date(endAt) : null,
    isOnline: Boolean(isOnline),
    type: ["public", "private", "friends"].includes(type) ? type : "public",
  }).returning();
  res.status(201).json(event);
});

router.get("/events/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const [event] = await db
    .select({
      id: eventsTable.id,
      organizerId: eventsTable.organizerId,
      title: eventsTable.title,
      description: eventsTable.description,
      location: eventsTable.location,
      startAt: eventsTable.startAt,
      endAt: eventsTable.endAt,
      coverUrl: eventsTable.coverUrl,
      isOnline: eventsTable.isOnline,
      type: eventsTable.type,
      goingCount: eventsTable.goingCount,
      interestedCount: eventsTable.interestedCount,
      createdAt: eventsTable.createdAt,
      organizerFirstName: usersTable.firstName,
      organizerLastName: usersTable.lastName,
      organizerAvatarUrl: usersTable.avatarUrl,
    })
    .from(eventsTable)
    .leftJoin(usersTable, eq(eventsTable.organizerId, usersTable.id))
    .where(eq(eventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Événement introuvable" }); return; }
  const [rsvp] = await db.select().from(eventRsvpsTable).where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, userId)));
  res.json({
    ...event,
    organizerName: event.organizerFirstName && event.organizerLastName ? `${event.organizerFirstName} ${event.organizerLastName}` : "Organisateur",
    myRsvp: rsvp?.status ?? null,
  });
});

router.post("/events/:id/rsvp", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { status } = req.body ?? {};
  if (!["going", "interested", "not_going"].includes(status)) {
    res.status(400).json({ error: "Statut invalide (going, interested, not_going)" }); return;
  }
  const existing = await db.select().from(eventRsvpsTable).where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, userId)));
  const prevStatus = existing[0]?.status ?? null;

  if (existing.length > 0) {
    if (prevStatus === status) {
      await db.delete(eventRsvpsTable).where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, userId)));
      if (status === "going") await db.update(eventsTable).set({ goingCount: sql`GREATEST(going_count - 1, 0)` }).where(eq(eventsTable.id, id));
      if (status === "interested") await db.update(eventsTable).set({ interestedCount: sql`GREATEST(interested_count - 1, 0)` }).where(eq(eventsTable.id, id));
      res.json({ myRsvp: null });
    } else {
      await db.update(eventRsvpsTable).set({ status }).where(and(eq(eventRsvpsTable.eventId, id), eq(eventRsvpsTable.userId, userId)));
      if (prevStatus === "going") await db.update(eventsTable).set({ goingCount: sql`GREATEST(going_count - 1, 0)` }).where(eq(eventsTable.id, id));
      if (prevStatus === "interested") await db.update(eventsTable).set({ interestedCount: sql`GREATEST(interested_count - 1, 0)` }).where(eq(eventsTable.id, id));
      if (status === "going") await db.update(eventsTable).set({ goingCount: sql`going_count + 1` }).where(eq(eventsTable.id, id));
      if (status === "interested") await db.update(eventsTable).set({ interestedCount: sql`interested_count + 1` }).where(eq(eventsTable.id, id));
      res.json({ myRsvp: status });
    }
  } else {
    await db.insert(eventRsvpsTable).values({ eventId: id, userId, status });
    if (status === "going") await db.update(eventsTable).set({ goingCount: sql`going_count + 1` }).where(eq(eventsTable.id, id));
    if (status === "interested") await db.update(eventsTable).set({ interestedCount: sql`interested_count + 1` }).where(eq(eventsTable.id, id));
    res.json({ myRsvp: status });
  }
});

export default router;
