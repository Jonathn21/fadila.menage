import { useState } from 'react';

const WA = '22891932723';

const TABS = [
  { key: 'question', icon: 'fa-circle-question', label: 'Une question' },
  { key: 'nettoyage', icon: 'fa-broom', label: 'Devis de nettoyage' },
  { key: 'personnel', icon: 'fa-people-group', label: 'Personnel de ménage' },
  { key: 'panier', icon: 'fa-gift', label: 'Panier-cadeau' },
];

const FREQ = [
  'Ponctuel',
  'Une fois par semaine',
  '2 fois par semaine',
  '3 fois par semaine',
  '4 fois par semaine',
  '5 fois par semaine ou temps plein',
];

function buildMessage(form, title) {
  const parts = [];
  form
    .querySelectorAll('input[type=text],input[type=tel],input[type=email],input[type=date],input[type=number],textarea')
    .forEach((el) => {
      if (el.value.trim()) parts.push((el.dataset.label || 'Champ') + ' : ' + el.value.trim());
    });
  form.querySelectorAll('input[type=radio]:checked').forEach((el) => {
    const fs = el.closest('fieldset');
    parts.push((fs ? fs.dataset.label : el.name) + ' : ' + el.value);
  });
  const cb = {};
  form.querySelectorAll('input[type=checkbox]:checked').forEach((el) => {
    const fs = el.closest('fieldset');
    const k = fs ? fs.dataset.label : el.name;
    (cb[k] = cb[k] || []).push(el.value);
  });
  Object.keys(cb).forEach((k) => parts.push(k + ' : ' + cb[k].join(', ')));
  return 'Bonjour Fadila Ménage, ' + title + '.\n\n' + parts.join('\n');
}

function Radios({ label, name, values }) {
  return (
    <fieldset data-label={label}>
      <legend>{label}</legend>
      <div className="opts">
        {values.map((v, i) => (
          <label key={v}>
            <input type="radio" name={name} value={v} required={i === 0} /> {v}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Ok({ title, text }) {
  return (
    <div className="tabpanel">
      <div className="ok show">
        <i className="fa-solid fa-circle-check okcheck"></i>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default function DevisForms() {
  const [active, setActive] = useState('question');
  const [sent, setSent] = useState({});

  const submit = (title) => (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const msg = buildMessage(form, title);
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
    setSent((s) => ({ ...s, [active]: true }));
  };

  return (
    <>
      <p className="devis-intro">
        Un personnel de ménage, un devis de nettoyage, un panier-cadeau ou une autre question&nbsp;? Sélectionnez l'onglet correspondant.
      </p>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={'tab' + (active === t.key ? ' active' : '')}
            onClick={() => setActive(t.key)}
          >
            <i className={'fa-solid ' + t.icon}></i> {t.label}
          </button>
        ))}
      </div>

      {active === 'question' &&
        (sent.question ? (
          <Ok title="Demande envoyée" text="Merci. L'équipe Fadila Ménage vous recontacte sous 24 h." />
        ) : (
          <div className="tabpanel">
            <form className="qform" onSubmit={submit("j'ai une question")} noValidate>
              <h2>Une question&nbsp;?</h2>
              <p className="sub">Pour toute demande générale. Nous vous répondons sous 24 h.</p>
              <div className="frow">
                <div className="field"><label>Nom et prénom</label><input type="text" data-label="Nom et prénom" placeholder="Ex. Mme Adjo K." required /></div>
                <div className="field"><label>E-mail</label><input type="email" data-label="E-mail" placeholder="vous@exemple.com" required /></div>
              </div>
              <div className="field"><label>Téléphone</label><input type="tel" data-label="Téléphone" placeholder="+228 …" required /></div>
              <div className="field"><label>Message</label><textarea data-label="Message" placeholder="Rédigez votre message ici…" required></textarea></div>
              <button type="submit" className="btn btn-green">Envoyer</button>
              <p className="req-note">Vos informations restent confidentielles et ne sont pas partagées.</p>
            </form>
          </div>
        ))}

      {active === 'nettoyage' &&
        (sent.nettoyage ? (
          <Ok title="Demande envoyée" text="Merci. Nous préparons votre devis de nettoyage et revenons vers vous sous 24 h." />
        ) : (
          <div className="tabpanel">
            <form className="qform" onSubmit={submit('je souhaite un devis de nettoyage')} noValidate>
              <h2>Devis de nettoyage</h2>
              <p className="sub">Décrivez le local et le rythme souhaité.</p>
              <div className="frow">
                <div className="field"><label>Prénom</label><input type="text" data-label="Prénom" required /></div>
                <div className="field"><label>E-mail</label><input type="email" data-label="E-mail" required /></div>
              </div>
              <div className="frow">
                <div className="field"><label>Téléphone</label><input type="tel" data-label="Téléphone" required /></div>
                <div className="field"><label>Adresse / quartier</label><input type="text" data-label="Adresse" required /></div>
              </div>
              <Radios label="Type de local" name="type-local" values={['Bureau', 'Villa', 'Appartement', 'Maison ordinaire']} />
              <Radios label="Nombre de chambres" name="chambres" values={['1', '2', '3', '4', '5 ou plus']} />
              <Radios label="Nombre de WC-douche" name="wc" values={['1', '2', '3', '4', '5 ou plus']} />
              <Radios label="Fréquence souhaitée" name="freq-net" values={FREQ} />
              <div className="field"><label>Votre budget</label><input type="text" data-label="Budget" placeholder="Ex. 30 000 FCFA / mois" required /></div>
              <div className="field"><label>Demandes spécifiques ?</label><textarea data-label="Demandes spécifiques" placeholder="Rédigez vos commentaires, les détails de votre besoin et vos demandes spécifiques ici…"></textarea></div>
              <button type="submit" className="btn btn-green">Envoyer</button>
            </form>
          </div>
        ))}

      {active === 'personnel' &&
        (sent.personnel ? (
          <Ok title="Demande envoyée" text="Merci. Nous vous proposons le personnel formé et vérifié qui correspond, sous 24 h." />
        ) : (
          <div className="tabpanel">
            <form className="qform" onSubmit={submit('je souhaite engager du personnel de ménage')} noValidate>
              <h2>Personnel de ménage</h2>
              <p className="sub">Indiquez le type de personnel et le rythme souhaité.</p>
              <div className="frow">
                <div className="field"><label>Prénom</label><input type="text" data-label="Prénom" required /></div>
                <div className="field"><label>E-mail</label><input type="email" data-label="E-mail" required /></div>
              </div>
              <div className="frow">
                <div className="field"><label>Téléphone</label><input type="tel" data-label="Téléphone" required /></div>
                <div className="field"><label>Adresse / quartier</label><input type="text" data-label="Adresse" required /></div>
              </div>
              <Radios label="Type de personnel" name="perso" values={['Aide-ménagère', 'Nounou', 'Cuisinier', 'Chauffeur', 'Jardinier']} />
              <Radios label="Fréquence souhaitée" name="freq-perso" values={FREQ} />
              <div className="field"><label>Votre budget</label><input type="text" data-label="Budget" placeholder="Ex. 50 000 FCFA / mois" required /></div>
              <div className="field"><label>Demandes spécifiques ?</label><textarea data-label="Demandes spécifiques" placeholder="Rédigez vos commentaires, les détails de votre besoin et vos demandes spécifiques ici…"></textarea></div>
              <button type="submit" className="btn btn-green">Envoyer</button>
            </form>
          </div>
        ))}

      {active === 'panier' &&
        (sent.panier ? (
          <Ok title="Commande envoyée" text="Merci. Nous préparons votre panier-cadeau et vous recontactons pour la livraison." />
        ) : (
          <div className="tabpanel">
            <form className="qform" onSubmit={submit('je souhaite commander un panier-cadeau')} noValidate>
              <h2>Panier-cadeau</h2>
              <p className="sub">Composez un joli panier pour un proche.</p>
              <div className="field"><label>Objet</label><input type="text" data-label="Objet" placeholder="Quel est le motif de votre cadeau ? (ex. anniversaire)" required /></div>
              <fieldset data-label="Contenu du panier">
                <legend>Faites votre panier</legend>
                <div className="opts" style={{ flexDirection: 'column', gap: '8px' }}>
                  {['Carte de vœux', 'Gâteau', 'Fleurs', 'Fruits (fraises, pommes, bananes, raisins)', 'Champagne'].map((v) => (
                    <label key={v}><input type="checkbox" name="panier-contenu" value={v} /> {v}</label>
                  ))}
                </div>
              </fieldset>
              <div className="frow">
                <div className="field"><label>Nom du destinataire</label><input type="text" data-label="Destinataire" required /></div>
                <div className="field"><label>Téléphone du destinataire</label><input type="tel" data-label="Téléphone destinataire" required /></div>
              </div>
              <div className="field"><label>Votre message à imprimer sur la carte de vœux</label><textarea data-label="Message carte" placeholder="Ex. : Maman, joyeux anniversaire et merci d'être la meilleure des mamans. Loukman"></textarea></div>
              <div className="field"><label>Date et heure de livraison</label><input type="text" data-label="Livraison (date et heure)" placeholder="Ex. 24/12 à 16 h" required /></div>
              <div className="field"><label>Adresse de livraison</label><textarea data-label="Adresse de livraison" required></textarea></div>
              <div className="frow">
                <div className="field"><label>Votre nom et prénom</label><input type="text" data-label="Votre nom" required /></div>
                <div className="field"><label>Votre e-mail</label><input type="email" data-label="Votre e-mail" required /></div>
              </div>
              <div className="field"><label>Votre téléphone</label><input type="tel" data-label="Votre téléphone" required /></div>
              <button type="submit" className="btn btn-green">Envoyer</button>
            </form>
          </div>
        ))}
    </>
  );
}
