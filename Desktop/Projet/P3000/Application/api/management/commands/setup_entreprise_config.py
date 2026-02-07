"""
Commande de management pour initialiser ou mettre à jour la configuration entreprise.
Usage:
    python manage.py setup_entreprise_config
    python manage.py setup_entreprise_config --nom "SAS ELEKABLE" --email "elekable@outlook.fr"
"""

from django.core.management.base import BaseCommand
from api.models import EntrepriseConfig


class Command(BaseCommand):
    help = "Initialise ou met à jour la configuration de l'entreprise (singleton EntrepriseConfig)"

    def add_arguments(self, parser):
        parser.add_argument('--nom', type=str, help='Raison sociale (ex: "SAS ELEKABLE")')
        parser.add_argument('--forme-juridique', type=str, help='Forme juridique (ex: "SAS")')
        parser.add_argument('--capital', type=str, help='Capital social (ex: "1 000,00€")')
        parser.add_argument('--adresse', type=str, help='Adresse (ex: "64, Boulevard les Arbousiers")')
        parser.add_argument('--code-postal', type=str, help='Code postal')
        parser.add_argument('--ville', type=str, help='Ville')
        parser.add_argument('--rcs', type=str, help='RCS (ex: "Aix-en-Provence 978 038 248")')
        parser.add_argument('--siret', type=str, help='SIRET')
        parser.add_argument('--tva-intra', type=str, help='TVA intracommunautaire')
        parser.add_argument('--email', type=str, help='Email de contact')
        parser.add_argument('--telephone', type=str, help='Téléphone')
        parser.add_argument('--representant-nom', type=str, help='Nom du représentant légal')
        parser.add_argument('--representant-fonction', type=str, help='Fonction du représentant')
        parser.add_argument('--nom-application', type=str, help='Nom affiché de l\'application')
        parser.add_argument('--domaine-public', type=str, help='Domaine public (ex: myp3000app.com)')
        parser.add_argument('--preset', type=str, choices=['elekable', 'p3000'], help='Utiliser un preset client prédéfini')

    def handle(self, *args, **options):
        # Presets pour les clients connus
        presets = {
            'elekable': {
                'nom': 'SAS ELEKABLE',
                'forme_juridique': 'SAS',
                'capital': '1 000,00€',
                'adresse': '64, Boulevard les Arbousiers',
                'code_postal': '13220',
                'ville': 'Châteauneuf-les-Martigues',
                'rcs': 'Aix-en-Provence 978 038 248',
                'email': 'elekable@outlook.fr',
                'telephone': '07.83.87.06.10',
                'representant_nom': 'Amara MAJRI',
                'representant_fonction': 'Gérant',
                'nom_application': 'Webapplication Elekable',
                'domaine_public': '',
            },
            'p3000': {
                'nom': 'P3000',
                'forme_juridique': '',
                'capital': '',
                'adresse': '',
                'code_postal': '',
                'ville': '',
                'rcs': '',
                'email': '',
                'telephone': '',
                'representant_nom': '',
                'representant_fonction': '',
                'nom_application': 'Webapplication P3000',
                'domaine_public': 'myp3000app.com',
            },
        }

        # Si un preset est demandé, utiliser ses valeurs comme base
        if options['preset']:
            preset_data = presets[options['preset']]
            self.stdout.write(f"Utilisation du preset '{options['preset']}'")
        else:
            preset_data = {}

        # Récupérer ou créer la config
        config = EntrepriseConfig.get_config()
        
        # Mapping options CLI -> champs du modèle
        field_mapping = {
            'nom': 'nom',
            'forme_juridique': 'forme_juridique',
            'capital': 'capital',
            'adresse': 'adresse',
            'code_postal': 'code_postal',
            'ville': 'ville',
            'rcs': 'rcs',
            'siret': 'siret',
            'tva_intra': 'tva_intra',
            'email': 'email',
            'telephone': 'telephone',
            'representant_nom': 'representant_nom',
            'representant_fonction': 'representant_fonction',
            'nom_application': 'nom_application',
            'domaine_public': 'domaine_public',
        }
        
        # CLI args mapping (avec tirets remplacés par underscores)
        cli_mapping = {
            'nom': 'nom',
            'forme_juridique': 'forme_juridique',
            'capital': 'capital',
            'adresse': 'adresse',
            'code_postal': 'code_postal',
            'ville': 'ville',
            'rcs': 'rcs',
            'siret': 'siret',
            'tva_intra': 'tva_intra',
            'email': 'email',
            'telephone': 'telephone',
            'representant_nom': 'representant_nom',
            'representant_fonction': 'representant_fonction',
            'nom_application': 'nom_application',
            'domaine_public': 'domaine_public',
        }

        updated = False
        
        # Appliquer le preset d'abord
        for field, value in preset_data.items():
            if field in field_mapping:
                setattr(config, field, value)
                updated = True
        
        # Les options CLI écrasent le preset
        for cli_key, field in cli_mapping.items():
            # Les options CLI ont des tirets dans argparse, convertis en underscores
            option_key = cli_key.replace('-', '_')
            value = options.get(option_key)
            if value is not None:
                setattr(config, field, value)
                updated = True

        if updated:
            config.save()
            self.stdout.write(self.style.SUCCESS(f"Configuration entreprise mise à jour :"))
        else:
            self.stdout.write(self.style.WARNING("Aucune modification. Utilisez --preset ou des options pour configurer."))
            self.stdout.write("Exemple: python manage.py setup_entreprise_config --preset elekable")
            self.stdout.write("Ou:      python manage.py setup_entreprise_config --nom 'Mon Entreprise' --email 'contact@example.com'")

        # Afficher la config actuelle
        self.stdout.write(f"\n  Nom:              {config.nom}")
        self.stdout.write(f"  Forme juridique:  {config.forme_juridique}")
        self.stdout.write(f"  Capital:          {config.capital}")
        self.stdout.write(f"  Adresse:          {config.adresse}")
        self.stdout.write(f"  Code postal:      {config.code_postal}")
        self.stdout.write(f"  Ville:            {config.ville}")
        self.stdout.write(f"  RCS:              {config.rcs}")
        self.stdout.write(f"  SIRET:            {config.siret}")
        self.stdout.write(f"  TVA intra:        {config.tva_intra}")
        self.stdout.write(f"  Email:            {config.email}")
        self.stdout.write(f"  Téléphone:        {config.telephone}")
        self.stdout.write(f"  Représentant:     {config.representant_nom} ({config.representant_fonction})")
        self.stdout.write(f"  Nom application:  {config.nom_application}")
        self.stdout.write(f"  Domaine public:   {config.domaine_public}")
