-- Run as an administrative reporting query; do not expose publicly.
select count(*) as calls_successfully_filled from public.calls where status = 'filled';

select c.id, count(r.id) as responses_per_call,
       min(r.created_at) filter (where r.availability = 'available') - c.published_at as time_to_first_available,
       c.filled_at - c.published_at as time_to_filled
from public.calls c left join public.responses r on r.call_id = c.id
group by c.id order by c.published_at desc;

select organizer_id, count(*) as published_calls
from public.calls group by organizer_id having count(*) >= 2;
