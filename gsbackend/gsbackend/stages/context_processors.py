from .models import Demande, Stagiaire

def sidebar_counts(request):
    demandes_attente = Demande.objects.filter(statut_stage='En attente', est_archivee=False).count()
    demandes_acceptees = Demande.objects.filter(statut_stage='Acceptée').count()
    demandes_refusees = Demande.objects.filter(statut_stage='Refusée').count()
    demandes_traitement = Demande.objects.filter(statut_stage='En cours de traitement').count()  # Corrigé majuscule + orthographe
  
    demandes_archivees = Demande.objects.filter(est_archivee=True).count()

    stages_a_venir = Stagiaire.objects.filter(statut='À venir').count()
    stages_en_cours = Stagiaire.objects.filter(statut='Actuel').count()
    stages_termines = Stagiaire.objects.filter(statut='Terminé').count()

    return {
        'count_demandes_attente': demandes_attente,
        'count_demandes_acceptees': demandes_acceptees,
        'count_demandes_refusees': demandes_refusees,
        'count_demandes_traitement': demandes_traitement,
        'count_demandes_archivees': demandes_archivees,
        'count_stages_avenir': stages_a_venir,
        'count_stages_en_cours': stages_en_cours,
        'count_stages_termines': stages_termines,
    }

