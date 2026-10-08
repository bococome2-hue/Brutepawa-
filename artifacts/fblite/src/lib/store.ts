// Persistent localStorage store for Brute Pawa

export interface Post {
  id: number;
  userId: number;
  content: string;
  emoji?: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  sponsored: boolean;
  sponsorTag?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  authorName?: string;
  authorAvatarUrl?: string | null;
  authorCountry?: string;
  isPinned?: boolean;
  commentsDisabled?: boolean;
  audience?: string;
  taggedUsers?: { id: number; name: string }[];
  bgColor?: string | null;
  mood?: string | null;
  location?: string | null;
  musicTrackName?: string | null;
  musicArtist?: string | null;
  musicUrl?: string | null;
  musicArtworkUrl?: string | null;
  musicDuration?: string | null;
  musicLikesCount?: number;
}

// ── Posts ──────────────────────────────────────────────────────────────────
export function getPosts(): Post[] {
  try {
    const s = localStorage.getItem("bp_posts");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function savePosts(posts: Post[]): void {
  localStorage.setItem("bp_posts", JSON.stringify(posts));
}

// ── Applied Jobs ───────────────────────────────────────────────────────────
export function getAppliedJobs(): number[] {
  try {
    const s = localStorage.getItem("bp_applied_jobs");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function applyJob(id: number): void {
  const ids = getAppliedJobs();
  if (!ids.includes(id)) {
    localStorage.setItem("bp_applied_jobs", JSON.stringify([...ids, id]));
  }
}

// ── Enrolled Courses ───────────────────────────────────────────────────────
export interface CourseProgress {
  courseId: number;
  progress: number;
  enrolledAt: string;
}

export function getEnrolledCourses(): CourseProgress[] {
  try {
    const s = localStorage.getItem("bp_enrolled_courses");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function enrollCourse(courseId: number): void {
  const courses = getEnrolledCourses();
  if (!courses.find(c => c.courseId === courseId)) {
    localStorage.setItem("bp_enrolled_courses", JSON.stringify([
      ...courses,
      { courseId, progress: 0, enrolledAt: new Date().toLocaleDateString("fr-FR") }
    ]));
  }
}

export function updateCourseProgress(courseId: number, progress: number): void {
  const courses = getEnrolledCourses();
  const updated = courses.map(c => c.courseId === courseId ? { ...c, progress } : c);
  localStorage.setItem("bp_enrolled_courses", JSON.stringify(updated));
}

// ── Favorites (Marketplace) ────────────────────────────────────────────────
export function getFavorites(): number[] {
  try {
    const s = localStorage.getItem("bp_favorites");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function toggleFavorite(id: number): number[] {
  const favs = getFavorites();
  const updated = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
  localStorage.setItem("bp_favorites", JSON.stringify(updated));
  return updated;
}

// ── Marketplace Listings ───────────────────────────────────────────────────
export interface Listing {
  id: number;
  name: string;
  price: number;
  category: string;
  condition: string;
  countryCode: string;
  countryFlag: string;
  countryName: string;
  description: string;
  mediaUrls: string[];
  mediaKinds: ("image" | "video" | "audio")[];
  createdAt: string;
  sellerName: string;
  sellerFlag: string;
}

export function getListings(): Listing[] {
  try {
    const s = localStorage.getItem("bp_listings");
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

export function saveListings(listings: Listing[]): void {
  localStorage.setItem("bp_listings", JSON.stringify(listings));
}

export function addListing(listing: Omit<Listing, "id" | "createdAt">): Listing {
  const listings = getListings();
  const newListing: Listing = {
    ...listing,
    id: Date.now(),
    createdAt: new Date().toLocaleDateString("fr-FR"),
  };
  saveListings([newListing, ...listings]);
  return newListing;
}

export function deleteListing(id: number): void {
  saveListings(getListings().filter(l => l.id !== id));
}

