import { useState } from 'react';
import Select from './Select.jsx';

const WA = '22891932723';
const OFFRES = [
  { value: 'Aide-ménagère', label: 'Aide-ménagère', description: 'Entretien du domicile' },
  { value: 'Nounou', label: 'Nounou', description: "Garde et éveil des enfants" },
  { value: 'Cuisinier', label: 'Cuisinier', description: 'Préparation des repas' },
  { value: 'Chauffeur', label: 'Chauffeur', description: 'Conduite et déplacements' },
  { value: 'Jardinier', label: 'Jardinier', description: 'Entretien des espaces verts' },
  { value: 'Agent de nettoyage', label: 'Agent de nettoyage', description: 'Nettoyage de locaux' },
];
const STATUTS = [
  { value: "En recherche d'emploi", label: "En recherche d'emploi", description: 'Disponible immédiatement' },
  { value: 'En poste', label: 'En poste', description: 'Actuellement en activité' },
  { value: 'Étudiant(e)', label: 'Étudiant(e)', description: 'En cours d’études' },
  { value: 'Autre', label: 'Autre', description: 'Autre situation' },
];
const EXP = [
  { value: 'Aucune', label: 'Aucune', description: 'Débutant motivé' },
  { value: "Moins d'un an", label: "Moins d'un an", description: 'Première expérience' },
  { value: '1 à 3 ans', label: '1 à 3 ans', description: 'Expérience confirmée' },
  { value: 'Plus de 3 ans', label: 'Plus de 3 ans', description: 'Professionnel expérimenté' },
];

export default function ApplyForm() {
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);
  const [offre, setOffre] = useState('');
  const [statut, setStatut] = useState('');
  const [exp, setExp] = useState('');

  const step1ok = offre && statut && exp;

  const submit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const parts = [
      'Offre concernée : ' + offre,
      "Statut d'emploi : " + statut,
      'Expériences antérieures : ' + exp,
    ];
    form.querySelectorAll('input[type=text],input[type=email],input[type=url]').forEach((el) => {
      if (el.value.trim()) parts.push((el.dataset.label || 'Champ') + ' : ' + el.value.trim());
    });
    const msg = 'Bonjour Cocon, je souhaite postuler.\n\n' + parts.join('\n');
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
    setSent(true);
  };

  if (sent) {
    return (
      <div className="applyform">
        <div className="ok show">
          <i className="fa-solid fa-circle-check okcheck"></i>
          <h3>Candidature envoyée</h3>
          <p>Merci ! Nous étudions votre profil et vous recontactons pour la suite du recrutement.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="applyform" onSubmit={submit} noValidate>
      <div className="steps">
        <span className={'step-dot' + (step >= 1 ? ' active' : '')}>1</span>
        <span className="step-line"></span>
        <span className={'step-dot' + (step >= 2 ? ' active' : '')}>2</span>
      </div>

      {step === 1 && (
        <div className="astep">
          <h3>Nous recrutons</h3>
          <div className="field">
            <label>Choisissez l'offre d'emploi concernée</label>
            <Select value={offre} onChange={setOffre} options={OFFRES} placeholder="— Sélectionnez un poste —" />
          </div>
          <div className="field">
            <label>Quel est votre statut d'emploi ?</label>
            <Select value={statut} onChange={setStatut} options={STATUTS} placeholder="— Sélectionnez —" />
          </div>
          <div className="field">
            <label>Avez-vous des expériences antérieures ?</label>
            <Select value={exp} onChange={setExp} options={EXP} placeholder="— Sélectionnez —" />
          </div>
          <div className="apply-actions">
            <button type="button" className="btn btn-gold" disabled={!step1ok} onClick={() => setStep(2)}>
              Suivant <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="astep">
          <h3>Vos informations personnelles</h3>
          <div className="frow">
            <div className="field"><label>Prénom</label><input type="text" data-label="Prénom" required /></div>
            <div className="field"><label>Nom de famille</label><input type="text" data-label="Nom de famille" required /></div>
          </div>
          <div className="frow">
            <div className="field"><label>E-mail</label><input type="email" data-label="E-mail" required /></div>
            <div className="field"><label>CV — lien vers le CV</label><input type="url" data-label="CV (lien)" placeholder="https://…" /></div>
          </div>
          <div className="apply-actions two">
            <button type="button" className="btn btn-out-dark" onClick={() => setStep(1)}>
              <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Retour
            </button>
            <button type="submit" className="btn btn-green">Postuler</button>
          </div>
        </div>
      )}
    </form>
  );
}
