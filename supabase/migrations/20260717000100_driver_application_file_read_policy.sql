create policy driver_application_files_select on storage.objects for select to authenticated
using (bucket_id = 'driver-application-files');
