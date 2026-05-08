-- Add thumbnail support to cases
alter table cases
  add column if not exists thumbnail_url text;  -- direct image URL (optional)

-- Update seed records with real thumbnail images
update cases set thumbnail_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Nimitz_FLIR1.jpg/640px-Nimitz_FLIR1.jpg'
  where title ilike '%Nimitz%';

update cases set thumbnail_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/GIMBAL.jpg/640px-GIMBAL.jpg'
  where title ilike '%Gimbal%';
