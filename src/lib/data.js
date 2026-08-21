/*
 * Données de démonstration — Basket Togo (mock).
 * ⚠️ Provisoire : sera remplacé par des requêtes Supabase.
 */

export const terrains = [
  { id: 't1', nom: 'Terrain de Bè', quartier: 'Bè, Lomé', surface: 'Bitume', paniers: 2, note: 4.6, ouvert: true, accent: 'a-orange', img: '/images/terrains/court-1.jpg' },
  { id: 't2', nom: 'Playground Agoè', quartier: 'Agoè, Lomé', surface: 'Béton', paniers: 2, note: 4.2, ouvert: true, accent: 'a-teal', img: '/images/terrains/court-2.jpg' },
  { id: 't3', nom: 'Terrain Université de Lomé', quartier: 'Campus, Lomé', surface: 'Bitume peint', paniers: 4, note: 4.8, ouvert: false, accent: 'a-blue', img: '/images/terrains/court-3.jpg' },
  { id: 't4', nom: 'City Sport Kara', quartier: 'Kara', surface: 'Résine', paniers: 2, note: 4.4, ouvert: true, accent: 'a-plum', img: '/images/terrains/court-4.jpg' },
  { id: 't5', nom: 'Terrain de Sokodé', quartier: 'Sokodé', surface: 'Béton', paniers: 2, note: 4.0, ouvert: true, accent: 'a-amber', img: '/images/terrains/court-5.jpg' },
  { id: 't6', nom: 'Bassar Hoops', quartier: 'Bassar', surface: 'Bitume', paniers: 1, note: 3.9, ouvert: true, accent: 'a-green', img: '/images/terrains/court-6.jpg' },
];

export const equipes = [
  { id: 'e1', nom: 'Lomé Ballers', quartier: 'Bè, Lomé', membres: 9, niveau: 'Confirmé', accent: 'a-orange' },
  { id: 'e2', nom: 'Kara Warriors', quartier: 'Kara', membres: 7, niveau: 'Intermédiaire', accent: 'a-teal' },
  { id: 'e3', nom: 'Sokodé Storm', quartier: 'Sokodé', membres: 8, niveau: 'Confirmé', accent: 'a-blue' },
  { id: 'e4', nom: 'Agoè Kings', quartier: 'Agoè, Lomé', membres: 6, niveau: 'Débutant', accent: 'a-plum' },
  { id: 'e5', nom: 'Atakpamé Panthers', quartier: 'Atakpamé', membres: 10, niveau: 'Élite', accent: 'a-amber' },
  { id: 'e6', nom: 'Kpalimé Vipers', quartier: 'Kpalimé', membres: 5, niveau: 'Débutant', accent: 'a-rose' },
];

export const evenements = [
  { id: 'ev1', titre: 'Tournoi 3x3 — Jeunes Talents', type: 'Tournoi 3x3', date: '2026-05-16T07:00', dateFin: '2026-05-17T18:00', terrainId: 't3', cat: 'U14 & U16', prix: 'Gratuit', equipes: 30, img: '/images/events/event-5.jpg', orga: 'Basket Togo', desc: 'Deux jours de compétition 3x3 pour les jeunes talents. Présence obligatoire 30 min avant le premier match.' },
  { id: 'ev2', titre: "Match d'ouverture — Lomé Ballers vs Kara Warriors", type: 'Match', date: '2026-06-28T18:00', dateFin: null, terrainId: 't1', cat: 'Open', prix: '1 000 F', equipes: 2, img: '/images/events/event-3.jpg', orga: 'Lomé Ballers', desc: 'Le grand match d\'ouverture de la saison. Ambiance garantie !' },
  { id: 'ev3', titre: 'Entraînement collectif ouvert', type: 'Entraînement', date: '2026-06-10T16:30', dateFin: null, terrainId: 't2', cat: 'Tous niveaux', prix: 'Gratuit', equipes: null, img: '/images/events/event-4.jpg', orga: 'Agoè Kings', desc: 'Séance ouverte à tous : dribble, passe, shoot, physique. Ramène tes potes.' },
  { id: 'ev4', titre: 'Playoff City Sport Kara', type: 'Tournoi', date: '2026-07-05T15:00', dateFin: '2026-07-06T20:00', terrainId: 't4', cat: 'Open', prix: '2 000 F', equipes: 8, img: '/images/events/event-6.jpg', orga: 'Kara Warriors', desc: 'Le playoff annuel de Kara. 8 équipes, une seule couronne.' },
];

export const TYPES_EVENT = ['Tournoi', 'Tournoi 3x3', 'Match', 'Match amical', 'Entraînement', 'Détection'];
export const CATEGORIES = ['Tous niveaux', 'U14', 'U16', 'U18', 'Open', 'Filles', 'Garçons'];

export const TYPES_DEFI = [
  '1 contre 1',
  '2 contre 2',
  '3 contre 3 (3x3)',
  '5 contre 5',
  'Match amical',
  'Match classé',
  'Concours de tirs',
  'Concours de dunks',
];

export const defis = [
  { id: 'd1', type: '5 contre 5', teamA: 'Lomé Ballers', teamB: 'Kara Warriors', terrainId: 't1', date: '2026-08-24T18:00', enjeu: 'Le respect du quartier', status: 'Accepté', auteur: 'Lomé Ballers' },
  { id: 'd2', type: '3 contre 3 (3x3)', teamA: 'Sokodé Storm', teamB: 'Atakpamé Panthers', terrainId: 't5', date: '2026-08-25T16:00', enjeu: '', status: 'En attente', auteur: 'Sokodé Storm' },
  { id: 'd3', type: 'Match amical', teamA: 'Agoè Kings', teamB: 'Kpalimé Vipers', terrainId: 't2', date: '2026-09-01T17:00', enjeu: '', status: 'Proposé', auteur: 'Agoè Kings' },
  { id: 'd4', type: 'Concours de tirs', teamA: 'Kara Warriors', teamB: 'Défi ouvert', terrainId: 't4', date: '2026-09-03T15:00', enjeu: '20 000 F', status: 'Ouvert', auteur: 'Kara Warriors' },
];

export function terrainById(id) {
  return terrains.find((t) => t.id === id) || null;
}

export const posts = [
  { id: 'p1', auteur: 'Kossi A.', team: 'Lomé Ballers', ini: 'K', accent: 'a-orange', txt: 'Gros match hier au terrain de Bè 🔥 Merci à tous ceux qui sont venus !', likes: 42, coms: 8, media: 'photo', time: 'il y a 2 h' },
  { id: 'p2', auteur: 'Ama D.', team: 'Kara Warriors', ini: 'A', accent: 'a-teal', txt: 'On lance un défi aux Lomé Ballers 💪 Qui est chaud ?', likes: 67, coms: 21, media: null, time: 'il y a 5 h' },
  { id: 'p3', auteur: 'Mensah T.', team: 'Sokodé Storm', ini: 'M', accent: 'a-blue', txt: 'Tournoi 3x3 ce week-end à Sokodé. Inscriptions ouvertes 🏆', likes: 30, coms: 5, media: 'video', time: 'hier' },
  { id: 'p4', auteur: 'Rita K.', team: 'Agoè Kings', ini: 'R', accent: 'a-plum', txt: 'Nouveau maillot pour la saison 👀 Vos avis ?', likes: 88, coms: 33, media: 'photo', time: 'hier' },
];
