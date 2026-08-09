# Site Fadila Ménage — Lomé

Site vitrine de **Fadila Ménage**, agence de services domestiques à Lomé (Togo) :
placement de personnel de maison, nettoyage professionnel et paniers-cadeaux.

## Pages

| Fichier | Page |
|---------|------|
| `index.html` | Accueil |
| `nous-connaitre.html` | Présentation de l'agence |
| `nos-services.html` | Détail des services |
| `rejoindre.html` | Recrutement |
| `blog.html` | Blog / actualités |
| `faq.html` | Foire aux questions |
| `demander-un-devis.html` | Formulaire de devis + contact |

## Technique

Site **statique** : chaque page est un fichier HTML autonome (CSS et JavaScript
intégrés). Aucun serveur ni build n'est nécessaire.

- **Polices** : Google Fonts (Archivo, Inter)
- **Formulaire de devis / candidature** : redirige vers WhatsApp
- **Carte** : Google Maps intégré

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python -m http.server 8000
```

Puis ouvrir http://localhost:8000

## Historique

L'ancienne application de gestion des stages est conservée dans la branche git
`ancienne-app-stages`.
