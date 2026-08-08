-- NYCE 90.7 FM — ads (sponsor banners shown in the AdSlot placeholders around the site)

CREATE TABLE IF NOT EXISTS ads (
  id SERIAL PRIMARY KEY,
  advertiser TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
