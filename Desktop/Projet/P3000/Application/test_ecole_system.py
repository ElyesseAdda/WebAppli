#!/usr/bin/env python3
"""
Script de test pour le système d'événement "École" des alternants
"""

import os
import sys
import django
from datetime import date, datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Application.settings')
django.setup()

from api.models import Agent, Chantier, Event, AgencyExpense, Schedule
from api.ecole_utils import (
    get_or_create_ecole_chantier,
    create_ecole_assignments,
    calculate_ecole_hours_for_agent,
    create_ecole_expense_for_agent,
    recalculate_all_ecole_expenses_for_month
)

def test_ecole_system():
    """Test complet du système d'événement École"""
    
    print("🧪 TEST DU SYSTÈME ÉCOLE POUR ALTERNANTS")
    print("=" * 50)
    
    # 1. Test de création du chantier système
    print("\n1️⃣ Test de création du chantier système 'École'")
    try:
        ecole_chantier = get_or_create_ecole_chantier()
        print(f"✅ Chantier système créé/trouvé: {ecole_chantier.chantier_name} (ID: {ecole_chantier.id})")
        print(f"   - Type: {ecole_chantier.chantier_type}")
        print(f"   - Système: {ecole_chantier.is_system_chantier}")
    except Exception as e:
        print(f"❌ Erreur lors de la création du chantier: {e}")
        return False
    
    # 2. Test avec un agent existant
    print("\n2️⃣ Test avec un agent existant")
    try:
        # Récupérer le premier agent disponible
        agent = Agent.objects.first()
        if not agent:
            print("❌ Aucun agent trouvé dans la base de données")
            return False
        
        print(f"✅ Agent sélectionné: {agent.name} {agent.surname} (ID: {agent.id})")
        print(f"   - Taux horaire: {agent.taux_Horaire}€/h")
        
        # 3. Test de création d'assignations d'école
        print("\n3️⃣ Test de création d'assignations d'école")
        start_date = date(2024, 1, 15)  # 15 janvier 2024
        end_date = date(2024, 1, 19)    # 19 janvier 2024 (5 jours)
        
        assignments_created = create_ecole_assignments(agent.id, start_date, end_date)
        print(f"✅ {assignments_created} assignations d'école créées")
        
        # 4. Test de calcul des heures d'école
        print("\n4️⃣ Test de calcul des heures d'école")
        ecole_hours = calculate_ecole_hours_for_agent(agent.id, 1, 2024)
        print(f"✅ Heures d'école calculées: {ecole_hours}h")
        
        # 5. Test de création de dépense
        print("\n5️⃣ Test de création de dépense d'école")
        expense = create_ecole_expense_for_agent(agent.id, 1, 2024)
        if expense:
            print(f"✅ Dépense créée: {expense.description}")
            print(f"   - Montant: {expense.amount}€")
            print(f"   - Heures: {expense.ecole_hours}h")
            print(f"   - Catégorie: {expense.category}")
        else:
            print("ℹ️ Aucune dépense créée (pas d'heures d'école)")
        
        # 6. Test de recalcul des dépenses
        print("\n6️⃣ Test de recalcul des dépenses")
        recalculate_all_ecole_expenses_for_month(1, 2024)
        print("✅ Recalcul des dépenses effectué")
        
        # 7. Vérification des assignations dans le planning
        print("\n7️⃣ Vérification des assignations dans le planning")
        ecole_assignments = Schedule.objects.filter(
            agent_id=agent.id,
            chantier_id=ecole_chantier.id
        )
        print(f"✅ {ecole_assignments.count()} assignations trouvées dans le planning")
        
        # Afficher quelques exemples
        for assignment in ecole_assignments[:3]:
            print(f"   - {assignment.day} {assignment.hour}: {assignment.chantier.chantier_name}")
        
        print("\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_test_data():
    """Nettoyer les données de test"""
    print("\n🧹 Nettoyage des données de test...")
    
    try:
        # Supprimer les assignations d'école de test
        ecole_chantier = Chantier.objects.filter(chantier_type='ecole').first()
        if ecole_chantier:
            Schedule.objects.filter(chantier_id=ecole_chantier.id).delete()
            print("✅ Assignations d'école supprimées")
        
        # Supprimer les dépenses d'école de test
        AgencyExpense.objects.filter(is_ecole_expense=True).delete()
        print("✅ Dépenses d'école supprimées")
        
        # Supprimer les événements d'école de test
        Event.objects.filter(event_type='ecole').delete()
        print("✅ Événements d'école supprimés")
        
        print("✅ Nettoyage terminé")
        
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage: {e}")

if __name__ == "__main__":
    print("🚀 DÉMARRAGE DU TEST DU SYSTÈME ÉCOLE")
    
    # Exécuter les tests
    success = test_ecole_system()
    
    if success:
        print("\n✅ Le système d'événement 'École' fonctionne correctement !")
        
        # Demander si on veut nettoyer les données de test
        response = input("\nVoulez-vous nettoyer les données de test ? (y/N): ")
        if response.lower() in ['y', 'yes', 'oui']:
            cleanup_test_data()
    else:
        print("\n❌ Des erreurs ont été détectées dans le système")
    
    print("\n🏁 Test terminé")
