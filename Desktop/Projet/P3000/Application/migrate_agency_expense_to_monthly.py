"""
Script de migration : AgencyExpense → AgencyExpenseMonth

Ce script génère les entrées mensuelles AgencyExpenseMonth à partir des AgencyExpense existantes.

Usage:
    python manage.py shell < migrate_agency_expense_to_monthly.py

Ou dans le shell Django:
    python manage.py shell
    >>> exec(open('migrate_agency_expense_to_monthly.py').read())
"""

from api.models import AgencyExpense, AgencyExpenseMonth
from datetime import date
from dateutil.relativedelta import relativedelta

def migrate_agency_expenses():
    """
    Génère les entrées AgencyExpenseMonth depuis les AgencyExpense existantes
    """
    print("🚀 Début de la migration AgencyExpense → AgencyExpenseMonth")
    print("-" * 60)
    
    expenses = AgencyExpense.objects.all()
    total_expenses = expenses.count()
    
    if total_expenses == 0:
        print("⚠️  Aucune dépense AgencyExpense à migrer.")
        return
    
    print(f"📊 {total_expenses} dépenses AgencyExpense trouvées")
    print()
    
    created_count = 0
    skipped_count = 0
    
    for idx, expense in enumerate(expenses, 1):
        print(f"[{idx}/{total_expenses}] Traitement : {expense.description[:50]}...")
        
        if expense.type == 'fixed':
            # Dépense fixe : générer une entrée par mois
            start_date = expense.date
            end_date = expense.end_date if expense.end_date else date.today()
            
            current_date = start_date.replace(day=1)  # Premier jour du mois
            month_count = 0
            
            while current_date <= end_date:
                # Créer l'entrée mensuelle
                obj, created = AgencyExpenseMonth.objects.get_or_create(
                    description=expense.description,
                    category=expense.category,
                    month=current_date.month,
                    year=current_date.year,
                    defaults={
                        'amount': expense.amount,
                        'agent': expense.agent,
                        'sous_traitant': expense.sous_traitant,
                        'chantier': expense.chantier,
                        'is_ecole_expense': expense.is_ecole_expense,
                        'ecole_hours': expense.ecole_hours,
                        'source_expense': expense,
                    }
                )
                
                if created:
                    created_count += 1
                    month_count += 1
                else:
                    skipped_count += 1
                
                # Passer au mois suivant
                current_date = current_date + relativedelta(months=1)
            
            print(f"  ✅ {month_count} mois générés (type: fixe)")
        
        elif expense.type == 'punctual':
            # Dépense ponctuelle : une seule entrée pour le mois de la date
            obj, created = AgencyExpenseMonth.objects.get_or_create(
                description=expense.description,
                category=expense.category,
                month=expense.date.month,
                year=expense.date.year,
                defaults={
                    'amount': expense.amount,
                    'agent': expense.agent,
                    'sous_traitant': expense.sous_traitant,
                    'chantier': expense.chantier,
                    'is_ecole_expense': expense.is_ecole_expense,
                    'ecole_hours': expense.ecole_hours,
                    'source_expense': expense,
                }
            )
            
            if created:
                created_count += 1
                print(f"  ✅ 1 mois généré (type: ponctuel)")
            else:
                skipped_count += 1
                print(f"  ⏭️  Déjà existant (ignoré)")
    
    print()
    print("-" * 60)
    print("✨ Migration terminée !")
    print(f"   • {created_count} entrées mensuelles créées")
    print(f"   • {skipped_count} entrées déjà existantes (ignorées)")
    print(f"   • Total en base : {AgencyExpenseMonth.objects.count()} entrées mensuelles")
    print()
    
    # Statistiques par catégorie
    print("📊 Répartition par catégorie :")
    from django.db.models import Count, Sum
    stats = AgencyExpenseMonth.objects.values('category').annotate(
        count=Count('id'),
        total=Sum('amount')
    ).order_by('-total')
    
    for stat in stats:
        print(f"   • {stat['category']:20} : {stat['count']:3} entrées - {float(stat['total']):,.2f} €")
    
    print()
    print("🎯 Les dépenses de catégorie 'Sous-traitant' apparaîtront dans le TableauSousTraitant !")

if __name__ == '__main__':
    migrate_agency_expenses()
else:
    # Si exécuté via exec() dans le shell
    migrate_agency_expenses()

