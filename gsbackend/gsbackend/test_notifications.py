# test_notifications.py
"""
Script de test pour vérifier le système de notifications en temps réel

Usage:
    python manage.py shell < test_notifications.py
    
    Ou dans le shell Django:
    python manage.py shell
    >>> exec(open('test_notifications.py').read())
"""

from django.contrib.auth.models import User
from services.notification_service import NotificationService
from stages.models import Notification
import time

def test_notifications():
    """Tester l'envoi de notifications en temps réel"""
    
    print("\n" + "="*60)
    print("🧪 TEST DU SYSTÈME DE NOTIFICATIONS EN TEMPS RÉEL")
    print("="*60 + "\n")
    
    # 1️⃣ RÉCUPÉRER UN UTILISATEUR DE TEST
    print("1️⃣ Recherche d'un utilisateur de test...")
    try:
        user = User.objects.first()
        if not user:
            print("❌ Aucun utilisateur trouvé. Créez d'abord un utilisateur.")
            return
        print(f"✅ Utilisateur trouvé: {user.username} (ID: {user.id})")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return
    
    print("\n" + "-"*60 + "\n")
    
    # 2️⃣ NETTOYER LES ANCIENNES NOTIFICATIONS DE TEST
    print("2️⃣ Nettoyage des anciennes notifications de test...")
    test_notifications = Notification.objects.filter(
        user=user,
        titre__contains="Test"
    )
    count = test_notifications.count()
    test_notifications.delete()
    print(f"✅ {count} notifications de test supprimées")
    
    print("\n" + "-"*60 + "\n")
    
    # 3️⃣ ENVOYER DES NOTIFICATIONS DE TEST
    print("3️⃣ Envoi de notifications de test...")
    print("\n⚠️  OUVREZ VOTRE NAVIGATEUR ET CONNECTEZ-VOUS POUR VOIR LES NOTIFICATIONS EN TEMPS RÉEL!\n")
    
    notifications_test = [
        {
            'titre': '🧪 Test - Message Info',
            'message': 'Ceci est une notification de test de type INFO',
            'type': 'info'
        },
        {
            'titre': '🧪 Test - Alerte',
            'message': 'Ceci est une notification de test de type ALERTE',
            'type': 'alert'
        },
        {
            'titre': '🧪 Test - Succès',
            'message': 'Ceci est une notification de test de type SUCCÈS',
            'type': 'success'
        },
        {
            'titre': '🧪 Test - Message',
            'message': 'Ceci est une notification de test de type MESSAGE',
            'type': 'message'
        },
    ]
    
    for i, notif_data in enumerate(notifications_test, 1):
        print(f"\n   📤 Envoi notification {i}/{len(notifications_test)}: {notif_data['titre']}")
        
        try:
            notification = NotificationService.envoyer_notification(
                user=user,
                titre=notif_data['titre'],
                message=notif_data['message'],
                type_notif=notif_data['type']
            )
            
            if notification:
                print(f"   ✅ Notification créée (ID: {notification.id})")
                print(f"      - Type: {notification.type}")
                print(f"      - Icône: {notification.icone}")
                print(f"      - WebSocket: Envoyé au groupe user_{user.id}")
            else:
                print(f"   ❌ Échec de création")
                
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
        
        # Pause entre les notifications pour mieux voir l'effet en temps réel
        time.sleep(2)
    
    print("\n" + "-"*60 + "\n")
    
    # 4️⃣ VÉRIFIER LES NOTIFICATIONS EN BASE
    print("4️⃣ Vérification des notifications en base de données...")
    notifications = Notification.objects.filter(user=user).order_by('-date_creation')[:5]
    print(f"✅ {notifications.count()} notifications récentes trouvées:\n")
    
    for notif in notifications:
        print(f"   📋 [{notif.id}] {notif.icone} {notif.titre}")
        print(f"      Message: {notif.message}")
        print(f"      Type: {notif.type} | Lu: {notif.lu}")
        print(f"      Date: {notif.date_creation.strftime('%d/%m/%Y %H:%M:%S')}")
        print()
    
    print("-"*60 + "\n")
    
    # 5️⃣ STATISTIQUES
    print("5️⃣ Statistiques des notifications:")
    total = Notification.objects.filter(user=user).count()
    non_lues = Notification.objects.filter(user=user, lu=False).count()
    print(f"   📊 Total notifications: {total}")
    print(f"   📊 Non lues: {non_lues}")
    print(f"   📊 Lues: {total - non_lues}")
    
    print("\n" + "="*60)
    print("✅ TEST TERMINÉ")
    print("="*60 + "\n")
    
    print("💡 CONSEILS:")
    print("   1. Vérifiez que vous êtes connecté dans votre navigateur")
    print("   2. Ouvrez la console du navigateur (F12) pour voir les logs WebSocket")
    print("   3. Les notifications devraient apparaître en temps réel sans rafraîchir")
    print("   4. Vérifiez l'indicateur de connexion WebSocket (point vert)")
    print()

# Lancer le test
if __name__ == "__main__":
    test_notifications()