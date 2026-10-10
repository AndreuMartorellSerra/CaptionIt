-- Seed data for CaptionIt
-- This file initializes the game with modalities, templates, and sample rooms for local testing.

INSERT INTO modalities (category) VALUES ('Image'), ('Phrase');

INSERT INTO templates (content, modality_id) VALUES
('/images/meme-01.svg', 1),
('/images/meme-02.svg', 1),
('/images/meme-03.svg', 1),
('/images/meme-04.svg', 1),
('/images/meme-05.svg', 1),
('I only use my phone for...', 2),
('The worst advice I ever got was...', 2),
('If I were invisible for one day, I would...', 2),
('My secret talent is...', 2),
('The only thing scarier than spiders is...', 2),
('The real reason I woke up at 3 AM was...', 2),
('The last thing I whispered to my cat was...', 2),
('The description of this game should include...', 2),
('The best thing to do on a Monday morning is...', 2),
('I would never tell my boss that...', 2);

INSERT INTO rooms (code) VALUES ('TEST1234'), ('MEMA1234');

INSERT INTO parties (num_rounds, max_players, round_time, room_id, modality_id)
SELECT 3, 8, 45, id, 1 FROM rooms WHERE code = 'TEST1234';

INSERT INTO parties (num_rounds, max_players, round_time, room_id, modality_id)
SELECT 4, 6, 60, id, 2 FROM rooms WHERE code = 'MEMA1234';
