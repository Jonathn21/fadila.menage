from django.db import migrations


def seed_permissions(apps, schema_editor):
    """Initialise les permissions des utilisateurs existants à partir du
    gabarit correspondant à leur rôle.

    On n'écrase pas un ensemble déjà renseigné (idempotent / sûr en cas de
    réexécution). Le Superutilisateur contourne le système au runtime mais
    reçoit tout de même le gabarit complet pour cohérence des données.
    """
    from utilisateurs.permissions import get_default_permissions_for_role

    Utilisateur = apps.get_model("utilisateurs", "Utilisateur")
    for user in Utilisateur.objects.all():
        if user.permissions:
            continue
        user.permissions = get_default_permissions_for_role(user.role)
        user.save(update_fields=["permissions"])


def unseed_permissions(apps, schema_editor):
    Utilisateur = apps.get_model("utilisateurs", "Utilisateur")
    Utilisateur.objects.update(permissions=list())


class Migration(migrations.Migration):

    dependencies = [
        ("utilisateurs", "0004_utilisateur_permissions"),
    ]

    operations = [
        migrations.RunPython(seed_permissions, unseed_permissions),
    ]
