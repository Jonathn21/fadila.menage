# Site Fadila Ménage — Lomé

Site vitrine de **Fadila Ménage**, agence de services domestiques à Lomé (Togo) :
placement de personnel de maison, nettoyage professionnel et paniers-cadeaux.

Construit avec **[Astro](https://astro.build)** (statique, rapide, bon SEO) et
**React** pour les formulaires interactifs.

## Démarrer

```bash
npm install
npm run dev       # serveur de dev sur http://localhost:4321
npm run build     # génère le site statique dans dist/
npm run preview   # prévisualise le build de production
```

## Structure

| Dossier | Rôle |
|---------|------|
| `src/pages/` | Les pages (accueil, nous-connaitre, nos-services, rejoindre, blog, faq, demander-un-devis) |
| `src/layouts/BaseLayout.astro` | Gabarit commun : `<head>`, en-tête, pied de page, scripts globaux |
| `src/components/` | `Header` & `Footer` (Astro) ; `DevisForms` & `ApplyForm` (React, îlots) |
| `src/styles/global.css` | Thème et styles partagés |
| `public/` | Logo et images |

## Formulaires

Les formulaires (Devis à onglets, Candidature en 2 étapes) sont des composants
React et envoient la demande **via WhatsApp**.

## Historique

L'ancienne application de gestion des stages est conservée dans la branche git
`ancienne-app-stages`.
