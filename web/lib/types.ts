// Mirrors app/schemas.py -- keep in sync with that file.

export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
};

export type Space = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  city: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price_month: number;
  size_sqm: number | null;
  is_active: boolean;
  created_at: string;
  owner_name?: string | null;
};

export type SpaceListResponse = {
  items: Space[];
  total: number;
  page: number;
  page_size: number;
};

export type Booking = {
  id: string;
  space_id: string;
  renter_id: string;
  move_in_date: string;
  move_out_date: string;
  custom_period_note: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export type BookingDetail = Booking & {
  space_title: string;
  space_city: string;
  renter_name?: string | null;
  renter_email?: string | null;
};
