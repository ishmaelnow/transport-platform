alter table public.driver_applications add column if not exists personal_photo_path text;
alter table public.driver_applications add column if not exists vehicle_photo_path text;
alter table public.driver_applications add column if not exists document_path text;

insert into storage.buckets (id, name, public) values ('driver-application-files', 'driver-application-files', false) on conflict (id) do nothing;

create policy driver_application_files_insert on storage.objects for insert to anon, authenticated
with check (bucket_id = 'driver-application-files');

create or replace function public.attach_driver_application_files(target_application_id uuid, personal_path text default null, vehicle_path text default null, document_path_value text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.driver_applications set personal_photo_path = coalesce(personal_path, personal_photo_path), vehicle_photo_path = coalesce(vehicle_path, vehicle_photo_path), document_path = coalesce(document_path_value, document_path) where driver_application_id = target_application_id;
end;
$$;
grant execute on function public.attach_driver_application_files(uuid, text, text, text) to anon, authenticated;
