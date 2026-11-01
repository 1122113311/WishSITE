insert into public.reservation_admins (user_id)
select id
from auth.users
where email = 'YOUR_EMAIL_HERE'
on conflict (user_id) do nothing;

