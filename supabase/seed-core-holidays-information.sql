begin;
insert into public.jds_training_posts(id,group_id,title,body,kind,status) values
('98e2cc20-207e-5ef4-a9b7-5e4678d72916','dc2b714b-5799-473b-964a-04aa002e0ffa','CORE · Vacances de la formation 2026–2027 · Prévisionnel','Calendrier prévisionnel de la formation professionnelle CORE 2026–2027.

Toussaint : 24 octobre – 1er novembre 2026
Noël : 19 décembre 2026 – 3 janvier 2027
Hiver : 27 février – 14 mars 2027
Printemps : 10–25 avril 2027

Ces dates concernent la formation professionnelle CORE. Elles ne constituent pas une annonce de fermeture des cours open, camps ou studios. Certains camps sont prévus pendant ces vacances. Le calendrier INDUSTRY reste à confirmer.

Les rendez-vous pédagogiques et événements annuels CORE sont consultables dans les autres annonces de ta promotion.','announcement','published'),
('6df475e0-5841-567e-aa25-0edca1f1a890','fde3eddf-6728-420a-a5e9-39d2b714533d','CORE · Vacances de la formation 2026–2027 · Prévisionnel','Calendrier prévisionnel de la formation professionnelle CORE 2026–2027.

Toussaint : 24 octobre – 1er novembre 2026
Noël : 19 décembre 2026 – 3 janvier 2027
Hiver : 27 février – 14 mars 2027
Printemps : 10–25 avril 2027

Ces dates concernent la formation professionnelle CORE. Elles ne constituent pas une annonce de fermeture des cours open, camps ou studios. Certains camps sont prévus pendant ces vacances. Le calendrier INDUSTRY reste à confirmer.

Les rendez-vous pédagogiques et événements annuels CORE sont consultables dans les autres annonces de ta promotion.','announcement','published'),
('6a42034d-11e3-5523-99b7-b7eb33afedbe','eb348869-4e10-4dde-83e2-7bf1e0b1db7e','CORE · Vacances de la formation 2026–2027 · Prévisionnel','Calendrier prévisionnel de la formation professionnelle CORE 2026–2027.

Toussaint : 24 octobre – 1er novembre 2026
Noël : 19 décembre 2026 – 3 janvier 2027
Hiver : 27 février – 14 mars 2027
Printemps : 10–25 avril 2027

Ces dates concernent la formation professionnelle CORE. Elles ne constituent pas une annonce de fermeture des cours open, camps ou studios. Certains camps sont prévus pendant ces vacances. Le calendrier INDUSTRY reste à confirmer.

Les rendez-vous pédagogiques et événements annuels CORE sont consultables dans les autres annonces de ta promotion.','announcement','published')
on conflict(id) do update set title=excluded.title,body=excluded.body;
commit;