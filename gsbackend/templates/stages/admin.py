from django.contrib import admin
from .models import Demande,Stagiaire,Entretien,Notification,ConventionStage,Etablissement,StageEffectue,AttestationStage,Diplome
from django.utils.translation import gettext_lazy as _


from django.contrib import admin

from .models import Demande



    

admin.site.register(Demande)
admin.site.register(Stagiaire)
admin.site.register(Diplome)



admin.site.register(Entretien)


admin.site.register(Notification)
admin.site.register(AttestationStage)

admin.site.register(ConventionStage)
admin.site.register(Etablissement)
class StageEffectueAdmin(admin.ModelAdmin):
    list_display = ('stagiaire', 'date_debut', 'date_fin', 'type_stage', 'lieu_stage')
    search_fields = ('stagiaire__nom', 'stagiaire__prenom', 'type_stage')
    list_filter = ('type_stage', 'lieu_stage')

admin.site.register(StageEffectue, StageEffectueAdmin)
    




