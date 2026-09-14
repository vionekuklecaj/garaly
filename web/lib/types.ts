// Mirrors app/schemas.py -- keep in sync with that file.

export type User = {
  id: string;
  email: string;
  name: string;
  is_admin?: boolean;
  created_at: string;
};

export type SpaceImage = {
  id: string;
  space_id: string;
  url: string;
  sort_order: number;
  created_at: string;
};

// Matches app/constants.py's AMENITY_KEYS.
export const AMENITY_KEYS = ["lighting", "electricity", "security", "access", "dry", "parking"] as const;
export type AmenityKey = (typeof AMENITY_KEYS)[number];

export type SpaceStatus = "pending_review" | "approved" | "rejected";

export type Space = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  address: string;
  zip_code: string;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  price_month: number;
  size_sqm: number | null;
  is_active: boolean;
  status: SpaceStatus;
  created_at: string;
  owner_name?: string | null;
  review_average?: number | null;
  review_count?: number;
  images?: SpaceImage[];
};

export type AdminSpace = Space & {
  owner_email?: string | null;
};

export type SpaceListResponse = {
  items: Space[];
  total: number;
  page: number;
  page_size: number;
};

// "accepted"/"pending"/"declined" no longer get created, but old rows (from
// before direct-reserve replaced the request/accept flow) may still carry
// them -- display code should treat anything it doesn't recognize as
// informational only, not assume it's one of the five below.
export type BookingStatus = "confirmed" | "cancelled" | "blocked" | "pending" | "accepted" | "declined";

export type Booking = {
  id: string;
  space_id: string;
  renter_id: string;
  move_in_date: string;
  move_out_date: string;
  custom_period_note: string;
  status: BookingStatus;
  created_at: string;
};

export type BookingDetail = Booking & {
  space_title: string;
  space_city: string;
  renter_name?: string | null;
  renter_email?: string | null;
  is_past: boolean;
  can_review: boolean;
};

export type Review = {
  id: string;
  space_id: string;
  renter_id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  renter_name?: string | null;
};
