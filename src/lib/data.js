/*
 * Données de démonstration — Basket Togo (mock).
 * ⚠️ Provisoire : sera remplacé par des requêtes Supabase.
 */

export const terrains = [
  { id: 't1', nom: 'Terrain de Bè', quartier: 'Bè, Lomé', surface: 'Bitume', paniers: 2, note: 4.6, ouvert: true, accent: 'a-orange' },
  { id: 't2', nom: 'Playground Agoè', quartier: 'Agoè, Lomé', surface: 'Béton', paniers: 2, note: 4.2, ouvert: true, accent: 'a-teal' },
  { id: 't3', nom: 'Terrain Université de Lomé', quartier: 'Campus, Lomé', surface: 'Bitume peint', paniers: 4, note: 4.8, ouvert: false, accent: 'a-blue' },
  { id: 't4', nom: 'City Sport Kara', quartier: 'Kara', surface: 'Résine', paniers: 2, note: 4.4, ouvert: true, accent: 'a-plum' },
  { id: 't5', nom: 'Terrain de Sokodé', quartier: 'Sokodé', surface: 'Béton', paniers: 2, note: 4.0, ouvert: true, accent: 'a-amber' },
  { id: 't6', nom: 'Bassar Hoops', quartier: 'Bassar', surface: 'Bitume', paniers: 1, note: 3.9, ouvert: true, accent: 'a-green' },
];

export const equipes = [
  { id: 'e1', nom: 'Lomé Ballers', quartier: 'Bè, Lomé', membres: 9, niveau: 'Confirmé', accent: 'a-orange' },
  { id: 'e2', nom: 'Kara Warriors', quartier: 'Kara', membres: 7, niveau: 'Intermédiaire', accent: 'a-teal' },
  { id: 'e3', nom: 'Sokodé Storm', quartier: 'Sokodé', membres: 8, niveau: 'Confirmé', accent: 'a-blue' },
  { id: 'e4', nom: 'Agoè Kings', quartier: 'Agoè, Lomé', membres: 6, niveau: 'Débutant', accent: 'a-plum' },
  { id: 'e5', nom: 'Atakpamé Panthers', quartier: 'Atakpamé', membres: 10, niveau: 'Élite', accent: 'a-amber' },
  { id: 'e6', nom: 'Kpalimé Vipers', quartier: 'Kpalimé', membres: 5, niveau: 'Débutant', accent: 'a-rose' },
];

export const posts = [
  { id: 'p1', auteur: 'Kossi A.', team: 'Lomé Ballers', ini: 'K', accent: 'a-orange', txt: 'Gros match hier au terrain de Bè 🔥 Merci à tous ceux qui sont venus !', likes: 42, coms: 8, media: 'photo', time: 'il y a 2 h' },
  { id: 'p2', auteur: 'Ama D.', team: 'Kara Warriors', ini: 'A', accent: 'a-teal', txt: 'On lance un défi aux Lomé Ballers 💪 Qui est chaud ?', likes: 67, coms: 21, media: null, time: 'il y a 5 h' },
  { id: 'p3', auteur: 'Mensah T.', team: 'Sokodé Storm', ini: 'M', accent: 'a-blue', txt: 'Tournoi 3x3 ce week-end à Sokodé. Inscriptions ouvertes 🏆', likes: 30, coms: 5, media: 'video', time: 'hier' },
  { id: 'p4', auteur: 'Rita K.', team: 'Agoè Kings', ini: 'R', accent: 'a-plum', txt: 'Nouveau maillot pour la saison 👀 Vos avis ?', likes: 88, coms: 33, media: 'photo', time: 'hier' },
];
