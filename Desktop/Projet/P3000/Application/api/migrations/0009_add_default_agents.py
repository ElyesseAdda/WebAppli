from django.db import migrations

def create_default_agents(apps, schema_editor):
    Agent = apps.get_model('api', 'Agent')
    
    default_agents = [
        {
            'name': 'Adel',
            'surname': 'Majri',
            'phone_Number': 761566672,  # Converti en entier sans les points
            'taux_Horaire': 0,  # Valeur par défaut
            'address': None,  # Champ optionnel
            'conge': None,  # Champ optionnel
            'heure_debut': None,  # Champ optionnel
            'heure_fin': None,  # Champ optionnel
            'heure_pause_debut': None,  # Champ optionnel
            'heure_pause_fin': None,  # Champ optionnel
            'jours_travail': None,  # Champ optionnel
        },
        {
            'name': 'Amine',
            'surname': 'Belaoued',
            'phone_Number': 770181227,  # Converti en entier sans les points
            'taux_Horaire': 0,  # Valeur par défaut
            'address': None,  # Champ optionnel
            'conge': None,  # Champ optionnel
            'heure_debut': None,  # Champ optionnel
            'heure_fin': None,  # Champ optionnel
            'heure_pause_debut': None,  # Champ optionnel
            'heure_pause_fin': None,  # Champ optionnel
            'jours_travail': None,  # Champ optionnel
        }
    ]
    
    for agent_data in default_agents:
        Agent.objects.get_or_create(
            name=agent_data['name'],
            surname=agent_data['surname'],
            defaults=agent_data
        )

def remove_default_agents(apps, schema_editor):
    Agent = apps.get_model('api', 'Agent')
    Agent.objects.filter(
        name__in=['Adel', 'Amine'],
        surname__in=['Majri', 'Belaoued']
    ).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0005_boncommande_statut'),
    ]

    operations = [
        migrations.RunPython(create_default_agents, remove_default_agents),
    ] 