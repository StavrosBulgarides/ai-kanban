-- Change "Input Required" status color from purple to red
UPDATE statuses SET color = '#ef4444' WHERE name = 'Input Required' AND color = '#8b5cf6';
