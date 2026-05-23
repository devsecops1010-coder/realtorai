-- Add public marketplace media fields for property cards and galleries.
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "galleryUrls" JSONB;
