"""
Commande Django pour charger les données de démonstration
Usage: python manage.py load_demo_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
import random

from api.models import (
    Chantier, Client, Fournisseur, SousTraitant,
    Devis, LigneDevis, Facture, BonCommande,
    Agence, CategorieDepense
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Charge des données de démonstration réalistes pour l\'environnement de test'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force le rechargement même si des données existent déjà',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)

        self.stdout.write('🎯 Chargement des données de démonstration...\n')

        # Vérifier si des données existent déjà
        if not force and Chantier.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    '⚠️  Des données existent déjà. Utilisez --force pour forcer le rechargement.'
                )
            )
            return

        # Récupérer l'utilisateur admin
        try:
            admin_user = User.objects.get(username='demo-admin')
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    '❌ Erreur: Utilisateur demo-admin non trouvé. '
                    'Exécutez d\'abord: python manage.py create_demo_users'
                )
            )
            return

        # Récupérer ou créer l'agence
        agence = Agence.objects.first()
        if not agence:
            agence = Agence.objects.create(
                nom='Entreprise Démo BTP',
                adresse='123 Avenue de la Construction',
                ville='Paris',
                code_postal='75001',
            )

        # Créer des clients
        self.stdout.write('📋 Création des clients...')
        clients = []
        clients_data = [
            {
                'nom': 'Dupont',
                'prenom': 'Jean',
                'email': 'jean.dupont@email.com',
                'telephone': '06 12 34 56 78',
                'adresse': '15 Rue des Lilas',
                'ville': 'Lyon',
                'code_postal': '69001',
            },
            {
                'nom': 'Martin',
                'prenom': 'Sophie',
                'email': 'sophie.martin@email.com',
                'telephone': '06 23 45 67 89',
                'adresse': '42 Avenue Victor Hugo',
                'ville': 'Marseille',
                'code_postal': '13001',
            },
            {
                'nom': 'Bernard',
                'prenom': 'Pierre',
                'email': 'pierre.bernard@email.com',
                'telephone': '06 34 56 78 90',
                'adresse': '78 Boulevard Haussmann',
                'ville': 'Paris',
                'code_postal': '75008',
            },
            {
                'nom': 'Société Immobilière ABC',
                'prenom': '',
                'email': 'contact@immo-abc.com',
                'telephone': '01 45 67 89 01',
                'adresse': '123 Rue de la République',
                'ville': 'Toulouse',
                'code_postal': '31000',
            },
        ]

        for client_data in clients_data:
            client, created = Client.objects.get_or_create(
                email=client_data['email'],
                defaults=client_data
            )
            clients.append(client)
            if created:
                self.stdout.write(f'  ✅ Client créé: {client.nom} {client.prenom}')

        # Créer des fournisseurs
        self.stdout.write('\n🏪 Création des fournisseurs...')
        fournisseurs = []
        fournisseurs_data = [
            {
                'nom': 'Matériaux Pro',
                'email': 'contact@materiauxpro.com',
                'telephone': '01 23 45 67 89',
                'adresse': 'Zone Industrielle Nord',
                'ville': 'Paris',
            },
            {
                'nom': 'Électricité Moderne',
                'email': 'info@elec-moderne.com',
                'telephone': '01 34 56 78 90',
                'adresse': '45 Rue de l\'Industrie',
                'ville': 'Lyon',
            },
            {
                'nom': 'Plomberie Services',
                'email': 'contact@plomberie-services.fr',
                'telephone': '01 45 67 89 01',
                'adresse': '12 Avenue des Artisans',
                'ville': 'Marseille',
            },
        ]

        for fournisseur_data in fournisseurs_data:
            fournisseur, created = Fournisseur.objects.get_or_create(
                email=fournisseur_data['email'],
                defaults=fournisseur_data
            )
            fournisseurs.append(fournisseur)
            if created:
                self.stdout.write(f'  ✅ Fournisseur créé: {fournisseur.nom}')

        # Créer des sous-traitants
        self.stdout.write('\n👷 Création des sous-traitants...')
        sous_traitants = []
        st_data = [
            {
                'nom': 'Plâtrerie Expert',
                'email': 'contact@platrerie-expert.fr',
                'telephone': '06 12 34 56 78',
                'specialite': 'Plâtrerie',
            },
            {
                'nom': 'Menuiserie Bois & Alu',
                'email': 'info@menuiserie-ba.fr',
                'telephone': '06 23 45 67 89',
                'specialite': 'Menuiserie',
            },
        ]

        for st_item in st_data:
            st, created = SousTraitant.objects.get_or_create(
                email=st_item['email'],
                defaults=st_item
            )
            sous_traitants.append(st)
            if created:
                self.stdout.write(f'  ✅ Sous-traitant créé: {st.nom}')

        # Créer des chantiers
        self.stdout.write('\n🏗️  Création des chantiers...')
        chantiers = []
        chantiers_data = [
            {
                'nom': 'Rénovation Appartement Dupont',
                'adresse': '15 Rue des Lilas',
                'ville': 'Lyon',
                'code_postal': '69001',
                'client': clients[0],
                'date_debut': timezone.now() - timedelta(days=30),
                'date_fin_prevue': timezone.now() + timedelta(days=60),
                'statut': 'en_cours',
                'description': 'Rénovation complète d\'un appartement de 80m² : électricité, plomberie, peinture',
            },
            {
                'nom': 'Construction Maison Martin',
                'adresse': '42 Avenue Victor Hugo',
                'ville': 'Marseille',
                'code_postal': '13001',
                'client': clients[1],
                'date_debut': timezone.now() - timedelta(days=90),
                'date_fin_prevue': timezone.now() + timedelta(days=180),
                'statut': 'en_cours',
                'description': 'Construction d\'une maison individuelle de 120m²',
            },
            {
                'nom': 'Aménagement Bureau Bernard',
                'adresse': '78 Boulevard Haussmann',
                'ville': 'Paris',
                'code_postal': '75008',
                'client': clients[2],
                'date_debut': timezone.now() - timedelta(days=15),
                'date_fin_prevue': timezone.now() + timedelta(days=45),
                'statut': 'en_cours',
                'description': 'Aménagement de bureaux professionnels 200m²',
            },
            {
                'nom': 'Rénovation Immeuble ABC',
                'adresse': '123 Rue de la République',
                'ville': 'Toulouse',
                'code_postal': '31000',
                'client': clients[3],
                'date_debut': timezone.now() + timedelta(days=30),
                'date_fin_prevue': timezone.now() + timedelta(days=210),
                'statut': 'planifie',
                'description': 'Rénovation complète d\'un immeuble de 10 logements',
            },
            {
                'nom': 'Extension Maison Dupont',
                'adresse': '15 Rue des Lilas',
                'ville': 'Lyon',
                'code_postal': '69001',
                'client': clients[0],
                'date_debut': timezone.now() - timedelta(days=120),
                'date_fin_prevue': timezone.now() - timedelta(days=10),
                'statut': 'termine',
                'description': 'Extension de 30m² avec création d\'une véranda',
            },
        ]

        for chantier_data in chantiers_data:
            chantier, created = Chantier.objects.get_or_create(
                nom=chantier_data['nom'],
                defaults={
                    **chantier_data,
                    'created_by': admin_user,
                }
            )
            chantiers.append(chantier)
            if created:
                self.stdout.write(f'  ✅ Chantier créé: {chantier.nom}')

        # Créer des devis
        self.stdout.write('\n📄 Création des devis...')
        devis_data = [
            {
                'chantier': chantiers[0],
                'statut': 'valide',
                'montant_ht': Decimal('25000.00'),
                'montant_tva': Decimal('5000.00'),
                'montant_ttc': Decimal('30000.00'),
                'date_creation': timezone.now() - timedelta(days=35),
            },
            {
                'chantier': chantiers[1],
                'statut': 'valide',
                'montant_ht': Decimal('180000.00'),
                'montant_tva': Decimal('36000.00'),
                'montant_ttc': Decimal('216000.00'),
                'date_creation': timezone.now() - timedelta(days=95),
            },
            {
                'chantier': chantiers[2],
                'statut': 'envoye',
                'montant_ht': Decimal('45000.00'),
                'montant_tva': Decimal('9000.00'),
                'montant_ttc': Decimal('54000.00'),
                'date_creation': timezone.now() - timedelta(days=20),
            },
            {
                'chantier': chantiers[3],
                'statut': 'brouillon',
                'montant_ht': Decimal('320000.00'),
                'montant_tva': Decimal('64000.00'),
                'montant_ttc': Decimal('384000.00'),
                'date_creation': timezone.now() - timedelta(days=5),
            },
        ]

        for devis_item in devis_data:
            devis, created = Devis.objects.get_or_create(
                chantier=devis_item['chantier'],
                defaults={
                    **devis_item,
                    'created_by': admin_user,
                }
            )
            if created:
                self.stdout.write(
                    f'  ✅ Devis créé: {devis.chantier.nom} '
                    f'({devis.montant_ttc}€ - {devis.statut})'
                )

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(
            '\n✅ Données de démonstration chargées avec succès!\n'
        ))
        self.stdout.write(f'   Clients: {len(clients)}')
        self.stdout.write(f'   Fournisseurs: {len(fournisseurs)}')
        self.stdout.write(f'   Sous-traitants: {len(sous_traitants)}')
        self.stdout.write(f'   Chantiers: {len(chantiers)}')
        self.stdout.write(f'   Devis: {len(devis_data)}')
        self.stdout.write('\n' + '='*60 + '\n')
