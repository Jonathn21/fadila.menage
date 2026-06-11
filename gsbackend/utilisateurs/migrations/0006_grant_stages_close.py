from django.db import migrations


def grant_stages_close(apps, schema_editor):
    """Accorde la nouvelle permission `stages.close` aux utilisateurs
    existants qui possèdent déjà `stages.end_early`.

    Les gabarits rôle -> permissions ne s'appliquent qu'à la création d'un
    compte ; cette migration rattrape les comptes déjà créés pour qu'ils
    voient l'action « Clôturer le stage ». Idempotent. Le Superutilisateur
    contourne le système au runtime, mais on garde ses données cohérentes.
    """
    Utilisateur = apps.get_model("utilisateurs", "Utilisateur")
    for user in Utilisateur.objects.all():
        perms = list(user.permissions or [])
        if "stages.end_early" in perms and "stages.close" not in perms:
            perms.append("stages.close")
            user.permissions = perms
            user.save(update_fields=["permissions"])


def revoke_stages_close(apps, schema_editor):
    Utilisateur = apps.get_model("utilisateurs", "Utilisateur")
    for user in Utilisateur.objects.all():
        perms = list(user.permissions or [])
        if "stages.close" in perms:
            perms.remove("stages.close")
            user.permissions = perms
            user.save(update_fields=["permissions"])


class Migration(migrations.Migration):

    dependencies = [
        ("utilisateurs", "0005_seed_user_permissions"),
    ]

    operations = [
        migrations.RunPython(grant_stages_close, revoke_stages_close),
    ]
