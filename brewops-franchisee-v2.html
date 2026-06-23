-- ============================================================
-- BREWOPS — IMAGE UPLOAD STORAGE SETUP
-- Run this in Supabase SQL Editor
--
-- Creates a public storage bucket for menu item photos and
-- promo slide backgrounds, with policies allowing the
-- franchisor to upload/manage and anyone to view (public read,
-- since these images need to display in the customer app too).
-- ============================================================

-- ── Create the bucket (public, since images need to show in customer app) ──
insert into storage.buckets (id, name, public)
values ('brewops-images', 'brewops-images', true)
on conflict (id) do nothing;

-- ── Allow public read access to all images in this bucket ──
drop policy if exists "brewops_images_public_read" on storage.objects;
create policy "brewops_images_public_read" on storage.objects
  for select using (bucket_id = 'brewops-images');

-- ── Allow authenticated franchisors to upload/update/delete images ──
drop policy if exists "brewops_images_franchisor_write" on storage.objects;
create policy "brewops_images_franchisor_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brewops-images' and get_my_role() = 'franchisor');

drop policy if exists "brewops_images_franchisor_update" on storage.objects;
create policy "brewops_images_franchisor_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'brewops-images' and get_my_role() = 'franchisor');

drop policy if exists "brewops_images_franchisor_delete" on storage.objects;
create policy "brewops_images_franchisor_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brewops-images' and get_my_role() = 'franchisor');

-- ── VERIFY ──
select id, name, public from storage.buckets where id = 'brewops-images';
select policyname, cmd from pg_policies where tablename = 'objects' and policyname like 'brewops_images%';

-- ============================================================
-- DONE — bucket "brewops-images" is ready for uploads from the
-- franchisor app's Menu Manager and Promo & Banners pages.
-- ============================================================
