from rest_framework import serializers  
from django.db.models import Q
from .models import (
    Chantier, Societe, Devis, Partie, SousPartie, LigneDetail, Client, 
    Agent, Stock, Presence, StockMovement, StockHistory, Event, MonthlyHours, 
    Schedule, LaborCost, DevisLigne, Facture, FactureLigne, BonCommande, LigneBonCommande,
    Avenant, FactureTS, Situation, SituationLigne, SituationLigneSupplementaire, SituationLigneSpeciale,
    ChantierLigneSupplementaire, SituationLigneAvenant, AgencyExpense, AgencyExpenseOverride,
    SousTraitant, ContactSousTraitant, ContratSousTraitance, AvenantSousTraitance, PaiementSousTraitant, ContactSociete,
    PaiementFournisseurMateriel, FactureFournisseurMateriel, HistoriqueModificationPaiementFournisseur, Fournisseur, Magasin, Banque, AppelOffres, AgencyExpenseAggregate,
    Document, PaiementGlobalSousTraitant, Emetteur, FactureSousTraitant, PaiementFactureSousTraitant,
    AgentPrime, Color, LigneSpeciale, AgencyExpenseMonth, SuiviPaiementSousTraitantMensuel, FactureSuiviSousTraitant,
    Distributeur, DistributeurMouvement, DistributeurCell, DistributeurVente, DistributeurReapproSession, DistributeurReapproLigne, DistributeurFrais, StockProduct, StockPurchase, StockPurchaseItem, StockLot, StockLoss,
    EntrepriseConfig
)
from decimal import Decimal, ROUND_HALF_UP

class DevisLigneSerializer(serializers.ModelSerializer):
    ligne_detail = serializers.PrimaryKeyRelatedField(queryset=LigneDetail.objects.all())
    total_ht = serializers.SerializerMethodField()

    class Meta:
        model = DevisLigne
        fields = ['id', 'ligne_detail', 'quantite', 'prix_unitaire', 'total_ht', 'index_global']
        # ✅ index_global peut être null/blank pour les anciens devis (default=0)
        extra_kwargs = {
            'index_global': {'required': False, 'allow_null': True}
        }

    def get_total_ht(self, obj):
        return obj.quantite * obj.prix_unitaire


class BanqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banque
        fields = ['id', 'nom_banque']

class MagasinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Magasin
        fields = ['id', 'nom', 'email']
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
        }


class FournisseurSerializer(serializers.ModelSerializer):
    magasins = MagasinSerializer(many=True, required=False)

    class Meta:
        model = Fournisseur
        fields = ['id', 'name', 'Fournisseur_mail', 'phone_Number', 'description_fournisseur', 'magasin', 'magasins']
        extra_kwargs = {
            'Fournisseur_mail': {'required': False, 'allow_blank': True, 'allow_null': True},
            'phone_Number': {'required': False, 'allow_null': True},
            'description_fournisseur': {'required': False, 'allow_blank': True, 'allow_null': True},
            'magasin': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def create(self, validated_data):
        magasins_data = validated_data.pop('magasins', [])
        fournisseur = Fournisseur.objects.create(**validated_data)
        # Créer les magasins associés
        for magasin_data in magasins_data:
            # Filtrer les champs vides
            if magasin_data.get('nom') and magasin_data['nom'].strip():
                Magasin.objects.create(
                    fournisseur=fournisseur,
                    nom=magasin_data.get('nom', '').strip(),
                    email=magasin_data.get('email', '').strip() or None
                )
        return fournisseur

    def update(self, instance, validated_data):
        magasins_data = validated_data.pop('magasins', None)
        
        # Mettre à jour les champs du fournisseur
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Mettre à jour les magasins si fournis
        if magasins_data is not None:
            # Supprimer les magasins existants
            instance.magasins.all().delete()
            # Créer les nouveaux magasins
            for magasin_data in magasins_data:
                # Filtrer les champs vides
                if magasin_data.get('nom') and magasin_data['nom'].strip():
                    Magasin.objects.create(
                        fournisseur=instance,
                        nom=magasin_data.get('nom', '').strip(),
                        email=magasin_data.get('email', '').strip() or None
                    )

        return instance


class DevisListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des devis (pagination rapide)"""
    chantier_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Devis
        fields = [
            'id', 'numero', 'date_creation', 'price_ht', 'price_ttc',
            'status', 'chantier_name', 'client_name', 'devis_chantier', 'appel_offres', 'chantier'
        ]

    def get_chantier_name(self, obj):
        if obj.devis_chantier and obj.appel_offres:
            return obj.appel_offres.chantier_name if obj.appel_offres else None
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_client_name(self, obj):
        clients = None
        if hasattr(obj, '_prefetched_objects_cache') and 'client' in obj._prefetched_objects_cache:
            clients = obj._prefetched_objects_cache['client']
        if clients is None:
            clients = list(obj.client.all())
        if clients:
            return ", ".join(
                f"{client.name} {client.surname}".strip()
                for client in clients
            )
        # Fallback to societe contact
        societe = None
        if obj.devis_chantier and obj.appel_offres and obj.appel_offres.societe:
            societe = obj.appel_offres.societe
        elif obj.chantier and obj.chantier.societe:
            societe = obj.chantier.societe
        contact = getattr(societe, 'client_name', None) if societe else None
        if contact:
            return f"{contact.name} {contact.surname}".strip()
        return None


class DevisSerializer(serializers.ModelSerializer):
    lignes = DevisLigneSerializer(many=True, required=False)
    lignes_speciales = serializers.JSONField(required=False)
    lignes_display = serializers.JSONField(required=False)
    parties_metadata = serializers.JSONField(required=False)
    client = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    chantier = serializers.PrimaryKeyRelatedField(
        queryset=Chantier.objects.all(),
        allow_null=True,
        required=False
    )
    chantier_name = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Devis
        fields = [
            'id', 'numero', 'date_creation', 'price_ht', 'price_ttc',
            'tva_rate', 'nature_travaux', 'description', 'status',
            'chantier', 'appel_offres', 'chantier_name', 'client_name',
            'client', 'lignes', 'lignes_speciales', 'lignes_display', 'parties_metadata', 'devis_chantier',
            'cout_estime_main_oeuvre', 'cout_estime_materiel', 'lignes_speciales_v2', 'version_systeme_lignes',
            'contact_societe'
        ]
        read_only_fields = ['client']  # ✅ Retirer date_creation pour permettre sa modification

    # Ancienne méthode commentée (lignes_speciales est maintenant un JSONField, pas une relation)
    # def get_lignes_speciales(self, obj):
    #     lignes = obj.lignes_speciales.all()
    #     result = {
    #         'global': [],
    #         'parties': {},
    #         'sousParties': {}
    #     }
    #     ...
    
    def get_chantier_name(self, obj):
        if obj.devis_chantier and obj.appel_offres:
            return obj.appel_offres.chantier_name if obj.appel_offres else None
        if obj.chantier:
            return obj.chantier.chantier_name
        return None

    def get_client_name(self, obj):
        clients = None
        if hasattr(obj, '_prefetched_objects_cache') and 'client' in obj._prefetched_objects_cache:
            clients = obj._prefetched_objects_cache['client']
        if clients is None:
            clients = list(obj.client.all())
        if clients:
            return ", ".join(
                f"{client.name} {client.surname}".strip()
                for client in clients
            )
        # Fallback to societe contact
        societe = None
        if obj.devis_chantier and obj.appel_offres and obj.appel_offres.societe:
            societe = obj.appel_offres.societe
        elif obj.chantier and obj.chantier.societe:
            societe = obj.chantier.societe
        contact = getattr(societe, 'client_name', None) if societe else None
        if contact:
            return f"{contact.name} {contact.surname}".strip()
        return None

    def to_representation(self, instance):
        """
        Surcharge pour ajouter le système unifié avec mode dual (legacy/unified)
        """
        data = super().to_representation(instance)
        
        # DÉTECTION DU MODE
        # Si le devis a des parties/sous-parties/lignes avec index_global > 0, utiliser le nouveau système
        has_unified_items = (
            Partie.objects.filter(devis=instance, index_global__gt=0).exists() or
            SousPartie.objects.filter(devis=instance, index_global__gt=0).exists() or
            LigneDetail.objects.filter(devis=instance, index_global__gt=0).exists()
        )
        
        if has_unified_items:
            # NOUVEAU SYSTÈME : Utiliser index_global
            data['items'] = self._get_unified_items(instance)
            data['mode'] = 'unified'
        else:
            # ANCIEN SYSTÈME : Utiliser parties_metadata
            data['items'] = self._get_legacy_items(instance)
            data['mode'] = 'legacy'
        
        return data
    
    def _get_unified_items(self, instance):
        """Nouveau système avec index_global"""
        from .utils import recalculate_all_numeros
        
        all_items = []
        
        # Charger Parties avec index_global > 0
        parties = Partie.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        for partie in parties:
            all_items.append({
                'type': 'partie',
                'id': partie.id,
                'index_global': partie.index_global,
                'numero': partie.numero,
                'titre': partie.titre,
                'type_activite': partie.type,
            })
        
        # Charger SousParties avec index_global > 0
        sous_parties = SousPartie.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        for sp in sous_parties:
            all_items.append({
                'type': 'sous_partie',
                'id': sp.id,
                'index_global': sp.index_global,
                'numero': sp.numero,
                'partie_id': sp.partie_id,
                'description': sp.description,
            })
        
        # Charger LignesDetails avec index_global > 0
        lignes_details = LigneDetail.objects.filter(devis=instance, index_global__gt=0).order_by('index_global')
        for ld in lignes_details:
            all_items.append({
                'type': 'ligne_detail',
                'id': ld.id,
                'index_global': ld.index_global,
                'numero': ld.numero,
                'sous_partie_id': ld.sous_partie_id,
                'description': ld.description,
                'unite': ld.unite,
                'prix': str(ld.prix),
                'quantite': str(ld.quantite),
            })
        
        # Charger LignesSpeciales
        lignes_speciales = LigneSpeciale.objects.filter(devis=instance).order_by('index_global')
        for ls in lignes_speciales:
            all_items.append({
                'type': 'ligne_speciale',
                'id': ls.id,
                'index_global': ls.index_global,
                'numero': ls.numero,
                'description': ls.description,
                'type_speciale': ls.type_speciale,
                'value_type': ls.value_type,
                'value': str(ls.value),
                'base_calculation': ls.base_calculation,
                'styles': ls.styles,
            })
        
        # Tri par index_global et recalcul des numéros
        return recalculate_all_numeros(all_items)
    
    def _get_legacy_items(self, instance):
        """Ancien système avec parties_metadata"""
        from .utils import recalculate_all_numeros
        
        items = []
        parties_metadata = instance.parties_metadata or {}
        selected_parties = parties_metadata.get('selectedParties', [])
        
        for partie_data in selected_parties:
            # Partie
            items.append({
                'type': 'partie',
                'id': partie_data['id'],
                'index_global': len(items) + 1,
                'titre': partie_data.get('titre'),
                'type_activite': partie_data.get('type'),
                'mode': 'legacy'
            })
            
            # Sous-parties
            for sp_data in partie_data.get('sousParties', []):
                items.append({
                    'type': 'sous_partie',
                    'id': sp_data['id'],
                    'index_global': len(items) + 1,
                    'partie_id': partie_data['id'],
                    'description': sp_data.get('description'),
                    'mode': 'legacy'
                })
                
                # Lignes détails
                for ld_id in sp_data.get('lignesDetails', []):
                    try:
                        ligne = LigneDetail.objects.get(id=ld_id)
                        items.append({
                            'type': 'ligne_detail',
                            'id': ligne.id,
                            'index_global': len(items) + 1,
                            'sous_partie_id': sp_data['id'],
                            'description': ligne.description,
                            'unite': ligne.unite,
                            'prix': str(ligne.prix),
                            'mode': 'legacy'
                        })
                    except LigneDetail.DoesNotExist:
                        pass
        
        # Ajouter lignes spéciales v2 si présentes
        lignes_speciales_v2 = instance.lignes_speciales_v2 or {}
        for ls in lignes_speciales_v2.get('pending', []) + lignes_speciales_v2.get('placed', []):
            items.append({
                'type': 'ligne_speciale',
                'id': ls.get('id'),
                'index_global': len(items) + 1,
                'description': ls.get('description'),
                'type_speciale': ls.get('type_speciale', 'display'),
                'value_type': ls.get('value_type', 'fixed'),
                'value': str(ls.get('value', 0)),
                'styles': ls.get('styles', {}),
                'mode': 'legacy'
            })
        
        return recalculate_all_numeros(items)
    
    def create(self, validated_data):
        """
        Créer un devis avec gestion de date_creation
        (le modèle utilise maintenant default=timezone.now au lieu de auto_now_add=True)
        """
        # ✅ Gérer explicitement date_creation si fournie (parser si string)
        if 'date_creation' in validated_data:
            from django.utils.dateparse import parse_datetime, parse_date
            from django.utils import timezone
            from datetime import datetime
            date_creation_value = validated_data.get('date_creation')
            if date_creation_value and isinstance(date_creation_value, str):
                try:
                    # Essayer de parser comme datetime ISO complet d'abord
                    date_creation = parse_datetime(date_creation_value)
                    if not date_creation:
                        # Si échec, essayer comme date simple "YYYY-MM-DD"
                        parsed_date_simple = parse_date(date_creation_value)
                        if parsed_date_simple:
                            # Convertir la date en datetime à minuit (timezone-aware)
                            validated_data['date_creation'] = timezone.make_aware(
                                datetime.combine(parsed_date_simple, datetime.min.time())
                            )
                        else:
                            # Si le parsing échoue, retirer date_creation pour utiliser default
                            validated_data.pop('date_creation')
                    else:
                        validated_data['date_creation'] = date_creation
                except (ValueError, TypeError):
                    # En cas d'erreur, retirer date_creation pour utiliser default
                    validated_data.pop('date_creation', None)
        
        # Créer le devis (date_creation sera utilisée si fournie, sinon default=timezone.now)
        devis = Devis.objects.create(**validated_data)
        
        return devis
    
    def update(self, instance, validated_data):
        if 'lignes' in validated_data:
            DevisLigne.objects.filter(devis=instance).delete()
            
            lignes_data = validated_data.pop('lignes')
            for ligne_data in lignes_data:
                # ✅ Inclure index_global pour préserver l'ordre des lignes
                ligne_create_data = {
                    'devis': instance,
                    'ligne_detail': ligne_data['ligne_detail'],
                    'quantite': Decimal(str(ligne_data['quantite'])),
                    'prix_unitaire': Decimal(str(ligne_data['prix_unitaire']))
                }
                
                # Ajouter index_global si présent
                if 'index_global' in ligne_data and ligne_data['index_global'] is not None:
                    try:
                        ligne_create_data['index_global'] = Decimal(str(ligne_data['index_global']))
                    except (ValueError, TypeError):
                        pass
                
                DevisLigne.objects.create(**ligne_create_data)

        # Mettre à jour les lignes spéciales
        if 'lignes_speciales' in validated_data:
            instance.lignes_speciales = validated_data.pop('lignes_speciales')
        
        # Mettre à jour les lignes display
        if 'lignes_display' in validated_data:
            instance.lignes_display = validated_data.pop('lignes_display')
        
        # Mettre à jour parties_metadata si présent
        if 'parties_metadata' in validated_data:
            instance.parties_metadata = validated_data.pop('parties_metadata')

        # ✅ Gérer explicitement date_creation si fournie (parser si string)
        if 'date_creation' in validated_data:
            from django.utils.dateparse import parse_datetime, parse_date
            from django.utils import timezone
            from datetime import datetime
            date_creation = validated_data.pop('date_creation')
            if date_creation:
                try:
                    # Si c'est une string, la parser
                    if isinstance(date_creation, str):
                        # Essayer de parser comme datetime ISO complet d'abord
                        parsed_date = parse_datetime(date_creation)
                        if parsed_date:
                            instance.date_creation = parsed_date
                        else:
                            # Si échec, essayer comme date simple "YYYY-MM-DD"
                            parsed_date_simple = parse_date(date_creation)
                            if parsed_date_simple:
                                # Convertir la date en datetime à minuit (timezone-aware)
                                instance.date_creation = timezone.make_aware(
                                    datetime.combine(parsed_date_simple, datetime.min.time())
                                )
                    # Si c'est déjà un datetime, l'utiliser directement
                    elif hasattr(date_creation, 'isoformat'):
                        instance.date_creation = date_creation
                except (ValueError, TypeError) as e:
                    # En cas d'erreur, garder la date existante
                    pass

        # Mettre à jour les autres champs
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class ContactSocieteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSociete
        fields = [
            'id',
            'societe',
            'civilite',
            'nom',
            'prenom',
            'poste',
            'email',
            'telephone',
            'date_creation',
            'date_modification'
        ]
        extra_kwargs = {
            'societe': {'required': True},
            'civilite': {'required': False, 'allow_blank': True},
            'nom': {'required': True},
            'prenom': {'required': False, 'allow_blank': True, 'allow_null': True},
            'poste': {'required': False, 'allow_blank': True, 'allow_null': True},
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'telephone': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
class SocieteSerializer(serializers.ModelSerializer):
    contacts = ContactSocieteSerializer(many=True, read_only=True)
    
    class Meta:
        model = Societe
        fields = '__all__'

class ChantierSerializer(serializers.ModelSerializer):
    marge_fourniture = serializers.SerializerMethodField()
    societe = SocieteSerializer(read_only=True)

    class Meta:
        model = Chantier
        fields = [
            'id', 'chantier_name', 'societe', 'date_debut', 'date_fin',
            'montant_ttc', 'montant_ht', 'state_chantier', 'ville', 'rue',
            'code_postal', 'cout_materiel', 'cout_main_oeuvre', 
            'cout_sous_traitance', 'description',
            'cout_estime_main_oeuvre', 'cout_estime_materiel', 'marge_estimee',
            'marge_fourniture', 'taux_fixe',
            'maitre_ouvrage_nom_societe', 'maitre_ouvrage_telephone', 'maitre_ouvrage_email', 'maitre_ouvrage_contact',
            'assistance_maitrise_ouvrage_nom_societe', 'assistance_maitrise_ouvrage_telephone', 'assistance_maitrise_ouvrage_email', 'assistance_maitrise_ouvrage_contact',
            'maitre_oeuvre_nom_societe', 'maitre_oeuvre_telephone', 'maitre_oeuvre_email', 'maitre_oeuvre_contact',
            'drive_path'  # ✅ Chemin personnalisé dans le drive
        ]

    def get_marge_fourniture(self, obj):
        cout_estime = float(obj.cout_estime_materiel or 0)
        cout_reel = float(obj.cout_materiel or 0)
        return cout_estime - cout_reel





class LigneDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneDetail
        fields = [
            'id', 
            'description', 
            'unite', 
            'cout_main_oeuvre',
            'cout_materiel',
            'taux_fixe',
            'marge',
            'prix',
            'sous_partie',
            'is_deleted'
        ]

    def validate(self, data):
        """
        Vérifie si une ligne de détail similaire existe déjà dans la même sous-partie
        """
        description = data.get('description', '').strip().lower()
        sous_partie = data.get('sous_partie')
        
        if description and sous_partie:
            # Vérifie si une ligne avec la même description existe dans la sous-partie (non supprimée)
            existing_ligne = LigneDetail.objects.filter(
                Q(description__iexact=description) &
                Q(sous_partie=sous_partie) &
                Q(is_deleted=False)
            ).first()
            
            if existing_ligne:
                raise serializers.ValidationError({
                    'description': f'Cette ligne existe déjà dans la sous-partie "{sous_partie.description}". '
                                 f'Détails de la ligne existante : '
                                 f'Description: {existing_ligne.description}, '
                                 f'Unité: {existing_ligne.unite}, '
                                 f'Prix: {existing_ligne.prix}€'
                })
        
        return data

class SousPartieSerializer(serializers.ModelSerializer):
    lignes_details = LigneDetailSerializer(many=True, read_only=True)

    class Meta:
        model = SousPartie
        fields = '__all__'

    def validate(self, data):
        """
        Vérifie si une sous-partie similaire existe déjà dans la même partie
        """
        description = data.get('description', '').strip()
        partie = data.get('partie')
        
        # Si la description est vide, on la remplace par "Lignes directes"
        if not description or description.strip() == "":
            data['description'] = "Lignes directes"
            description = "Lignes directes"
        
        if description and partie:
            # Vérifie si une sous-partie "Lignes directes" existe déjà dans la partie
            if description == "Lignes directes":
                existing_sous_partie = SousPartie.objects.filter(
                    description="Lignes directes",
                    partie=partie,
                    is_deleted=False
                ).first()
                
                if existing_sous_partie:
                    nb_lignes = existing_sous_partie.lignes_details.count()
                    raise serializers.ValidationError({
                        'description': f'Cette partie a déjà des lignes directes. '
                                     f'Nombre de lignes existantes : {nb_lignes}. '
                                     f'Vous pouvez ajouter des lignes supplémentaires à cette sous-partie existante.'
                    })
            else:
                # Vérifie si une sous-partie avec la même description existe dans la partie (non supprimée)
                existing_sous_partie = SousPartie.objects.filter(
                    Q(description__iexact=description) &
                    Q(partie=partie) &
                    Q(is_deleted=False)
                ).first()
                
                if existing_sous_partie:
                    nb_lignes = existing_sous_partie.lignes_details.count()
                    raise serializers.ValidationError({
                        'description': f'Cette sous-partie existe déjà dans la partie "{partie.titre}". '
                                     f'Détails de la sous-partie existante : '
                                     f'Description: {existing_sous_partie.description}, '
                                     f'Nombre de lignes: {nb_lignes}'
                    })
        
        return data

class PartieSerializer(serializers.ModelSerializer):
    sous_parties = SousPartieSerializer(many=True, read_only=True)
    has_lignes_directes = serializers.SerializerMethodField()

    class Meta:
        model = Partie
        fields = '__all__'

    def get_has_lignes_directes(self, obj):
        """
        Retourne True si la partie a une sous-partie "Lignes directes"
        """
        return obj.sous_parties.filter(description="Lignes directes").exists()

    def validate(self, data):
        """
        Vérifie si une partie avec le même titre existe déjà dans le même type
        """
        titre = data.get('titre', '').strip().lower()
        type_partie = data.get('type')
        
        if titre and type_partie:
            # Vérifie si une partie avec le même titre existe dans le même type (non supprimée)
            existing_partie = Partie.objects.filter(
                titre__iexact=titre,
                type=type_partie,
                is_deleted=False
            ).first()
            
            if existing_partie:
                nb_sous_parties = existing_partie.sous_parties.count()
                total_lignes = sum(sp.lignes_details.count() for sp in existing_partie.sous_parties.all())
                raise serializers.ValidationError({
                    'titre': f'Cette partie existe déjà dans le domaine "{existing_partie.type}". '
                            f'Détails de la partie existante : '
                            f'Titre: {existing_partie.titre}, '
                            f'Type: {existing_partie.type}, '
                            f'Nombre de sous-parties: {nb_sous_parties}, '
                            f'Nombre total de lignes: {total_lignes}'
                })
        
        return data

class ClientSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Client
        fields = '__all__'

class MonthlyHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyHours
        fields = ['month', 'hours']

class AgentPrimeSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=100)
    montant = serializers.DecimalField(max_digits=10, decimal_places=2)

class AgentSerializer(serializers.ModelSerializer):
    heures_travail_journalieres = serializers.ReadOnlyField()
    monthly_hours = MonthlyHoursSerializer(many=True, read_only=True)
    primes = serializers.JSONField(required=False)

    class Meta:
        model = Agent
        fields = '__all__'


class PresenceSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    chantier_name = serializers.CharField(source='chantier.nom', read_only=True)
    cout_main_oeuvre = serializers.FloatField(read_only=True)

    class Meta:
        model = Presence
        fields = ['agent', 'chantier', 'date', 'heures_travail', 'agent_name', 'chantier_name', 'cout_main_oeuvre']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = '__all__'

class StockSerializer(serializers.ModelSerializer):
    fournisseur = serializers.PrimaryKeyRelatedField(queryset=Fournisseur.objects.all())
    # Afficher le nom du fournisseur en lecture pour le frontend
    fournisseur_name = serializers.CharField(source='fournisseur.name', read_only=True)

    class Meta:
        model = Stock
        fields = '__all__'

    
class StockHistorySerializer(serializers.ModelSerializer):
    stock = StockSerializer()  # Sérialiseur imbriqué pour afficher les détails du stock
    chantier = ChantierSerializer()  # Sérialiseur imbriqué pour renvoyer le chantier
    agent = AgentSerializer()  # Si vous avez un sérialiseur pour l'agent, vous pouvez l'imbriquer aussi

    class Meta:
        model = StockHistory
        fields = ['id', 'stock', 'quantite', 'type_operation', 'date_operation', 'montant', 'chantier', 'agent']
        
class StockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovement
        fields = '__all__'

class DistributeurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Distributeur
        fields = '__all__'


class DistributeurMouvementSerializer(serializers.ModelSerializer):
    montant_total = serializers.SerializerMethodField()

    class Meta:
        model = DistributeurMouvement
        fields = '__all__'

    def get_montant_total(self, obj):
        return float(obj.montant_total)


class DistributeurVenteSerializer(serializers.ModelSerializer):
    """Serializer pour les ventes distributeur — prix de vente stocké à l'instant T"""
    montant_total = serializers.SerializerMethodField()
    cell_nom_produit = serializers.CharField(source='cell.nom_produit', read_only=True)

    class Meta:
        model = DistributeurVente
        fields = '__all__'

    def get_montant_total(self, obj):
        return float(obj.montant_total)


class DistributeurReapproLigneSerializer(serializers.ModelSerializer):
    """Ligne de réappro : case + quantite + prix_vente + cout_unitaire (bénéfice = prix vente - coût lot)."""
    montant_total = serializers.SerializerMethodField()
    benefice = serializers.SerializerMethodField()
    cell_nom_produit = serializers.CharField(source='cell.nom_produit', read_only=True)
    cell_row = serializers.IntegerField(source='cell.row_index', read_only=True)
    cell_col = serializers.IntegerField(source='cell.col_index', read_only=True)

    class Meta:
        model = DistributeurReapproLigne
        fields = '__all__'

    def get_montant_total(self, obj):
        return float(obj.montant_total)

    def get_benefice(self, obj):
        return float(obj.benefice)


class DistributeurReapproSessionSerializer(serializers.ModelSerializer):
    """Session de réappro — avec lignes (unités par case, montant, bénéfice = prix vente - coût lot)."""
    lignes = DistributeurReapproLigneSerializer(many=True, read_only=True)
    total_unites = serializers.SerializerMethodField()
    total_montant = serializers.SerializerMethodField()
    total_benefice = serializers.SerializerMethodField()

    class Meta:
        model = DistributeurReapproSession
        fields = '__all__'

    def get_total_unites(self, obj):
        return sum(l.quantite for l in obj.lignes.all())

    def get_total_montant(self, obj):
        return round(sum(float(l.montant_total) for l in obj.lignes.all()), 2)

    def get_total_benefice(self, obj):
        return round(sum(float(l.benefice) for l in obj.lignes.all()), 2)


class DistributeurFraisSerializer(serializers.ModelSerializer):
    """Frais distributeur : entretien, frais banque TPE, etc. Avec category et recurrence pour regroupement."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    recurrence_display = serializers.SerializerMethodField()

    class Meta:
        model = DistributeurFrais
        fields = '__all__'

    def get_recurrence_display(self, obj):
        choices = dict(getattr(self.Meta.model, 'RECURRENCE_CHOICES', []))
        return choices.get(obj.recurrence or '', 'Ponctuel')


class DistributeurCellSerializer(serializers.ModelSerializer):
    initiales = serializers.CharField(read_only=True)
    image_display_url = serializers.SerializerMethodField()
    stock_product_nom = serializers.SerializerMethodField()

    class Meta:
        model = DistributeurCell
        fields = '__all__'

    def get_stock_product_nom(self, obj):
        """Nom du produit stock lié (pour affichage)."""
        if getattr(obj, 'stock_product', None):
            return obj.stock_product.nom
        return None

    def validate_nom_produit(self, value):
        """Convertit les chaînes vides en None"""
        if value and isinstance(value, str):
            value = value.strip()
            return value if value else None
        return value

    def validate_image_url(self, value):
        """Convertit les chaînes vides en None et valide l'URL si fournie"""
        if value and isinstance(value, str):
            value = value.strip()
            if value:
                # Valider que c'est une URL valide
                from django.core.validators import URLValidator
                from django.core.exceptions import ValidationError
                validator = URLValidator()
                try:
                    validator(value)
                except ValidationError:
                    raise serializers.ValidationError("URL invalide")
                return value
        return None

    def validate(self, data):
        """Valide : soit stock_product, soit nom_produit ou image_url."""
        stock_product = data.get('stock_product')
        nom_produit = data.get('nom_produit')
        image_url = data.get('image_url')
        if stock_product:
            return data
        if not nom_produit and not image_url:
            raise serializers.ValidationError(
                "Au moins un produit lié (stock), un nom de produit ou une URL d'image doit être fourni"
            )
        return data

    def get_image_display_url(self, obj):
        """Retourne l'URL d'affichage de l'image (S3 présignée ou URL directe)"""
        if obj.image_s3_key:
            from .utils import generate_presigned_url
            try:
                return generate_presigned_url('get_object', obj.image_s3_key, expires_in=3600)
            except Exception:
                return obj.image_url
        return obj.image_url

class StockProductSerializer(serializers.ModelSerializer):
    initiales = serializers.CharField(read_only=True)
    image_display_url = serializers.SerializerMethodField()

    class Meta:
        model = StockProduct
        fields = '__all__'

    def validate_nom_produit(self, value):
        """Convertit les chaînes vides en None"""
        if value and isinstance(value, str):
            value = value.strip()
            return value if value else None
        return value

    def validate_image_url(self, value):
        """Convertit les chaînes vides en None et valide l'URL si fournie"""
        if value and isinstance(value, str):
            value = value.strip()
            if value:
                from django.core.validators import URLValidator
                from django.core.exceptions import ValidationError
                validator = URLValidator()
                try:
                    validator(value)
                except ValidationError:
                    raise serializers.ValidationError("URL invalide")
                return value
        return None

    def validate(self, data):
        """Valide que soit nom_produit soit image_url est fourni si nom est vide"""
        nom = data.get('nom', '').strip()
        nom_produit = data.get('nom_produit')
        image_url = data.get('image_url')
        
        if not nom and not nom_produit and not image_url:
            raise serializers.ValidationError(
                "Au moins un nom ou une URL d'image doit être fourni"
            )
        return data

    def get_image_display_url(self, obj):
        """Retourne l'URL d'affichage de l'image (S3 présignée ou URL directe)"""
        if obj.image_s3_key:
            from .utils import generate_presigned_url
            try:
                return generate_presigned_url('get_object', obj.image_s3_key, expires_in=3600)
            except Exception:
                return obj.image_url
        return obj.image_url


class StockPurchaseItemSerializer(serializers.ModelSerializer):
    """Serializer pour les items d'achat avec toutes les informations pour le calcul des marges"""
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    date_achat = serializers.DateTimeField(source='achat.date_achat', read_only=True)
    lieu_achat = serializers.CharField(source='achat.lieu_achat', read_only=True)

    class Meta:
        model = StockPurchaseItem
        fields = '__all__'
        read_only_fields = ['montant_total']  # Calculé automatiquement dans save()


class StockLotSerializer(serializers.ModelSerializer):
    """Serializer pour les lots de stock (FIFO)"""
    est_epuise = serializers.BooleanField(read_only=True)
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = StockLot
        fields = '__all__'


class StockLossSerializer(serializers.ModelSerializer):
    """Serializer pour les pertes de stock"""
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = StockLoss
        fields = '__all__'


class StockPurchaseSerializer(serializers.ModelSerializer):
    items = StockPurchaseItemSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = StockPurchase
        fields = '__all__'


class StockPurchaseCreateSerializer(serializers.Serializer):
    """Serializer pour créer un achat avec ses items"""
    lieu_achat = serializers.CharField(max_length=150)
    date_achat = serializers.DateTimeField(required=False)
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )

    def validate_items(self, value):
        """Valide que chaque item a les champs requis"""
        for item in value:
            if 'produit_id' not in item and 'nom_produit' not in item:
                raise serializers.ValidationError("Chaque item doit avoir soit produit_id soit nom_produit")
            if 'quantite' not in item or 'prix_unitaire' not in item or 'unite' not in item:
                raise serializers.ValidationError("Chaque item doit avoir quantite, prix_unitaire et unite")
        return value

    def create(self, validated_data):
        """Crée l'achat et ses items, et met à jour les stocks"""
        items_data = validated_data.pop('items')
        achat = StockPurchase.objects.create(**validated_data)
        
        total = 0
        for item_data in items_data:
            produit_id = item_data.get('produit_id')
            # Convertir produit_id en entier si c'est une string ou un nombre
            if produit_id:
                try:
                    produit_id = int(produit_id)
                except (ValueError, TypeError):
                    produit_id = None
            
            nom_produit = item_data.get('nom_produit', '').strip()
            quantite = int(item_data['quantite'])
            prix_unitaire = float(item_data['prix_unitaire'])
            unite = item_data['unite']
            creer_produit = item_data.get('creer_produit', True)  # Par défaut True
            
            produit = None
            
            # 1. Essayer de récupérer le produit par ID si fourni
            if produit_id:
                try:
                    produit = StockProduct.objects.get(id=produit_id)
                    # S'assurer que le nom_produit correspond
                    if not nom_produit:
                        nom_produit = produit.nom
                except StockProduct.DoesNotExist:
                    produit = None
            
            # 2. Si pas de produit trouvé par ID, chercher par nom (insensible à la casse et aux espaces)
            if not produit and nom_produit:
                try:
                    # Chercher avec correspondance exacte d'abord
                    produit = StockProduct.objects.get(nom__iexact=nom_produit.strip())
                except StockProduct.DoesNotExist:
                    # Si pas trouvé, essayer avec correspondance partielle
                    try:
                        produit = StockProduct.objects.filter(nom__iexact=nom_produit.strip()).first()
                    except:
                        produit = None
                except StockProduct.MultipleObjectsReturned:
                    # Si plusieurs produits avec le même nom, prendre le premier
                    produit = StockProduct.objects.filter(nom__iexact=nom_produit.strip()).first()
            
            # 3. Si toujours pas de produit, créer un nouveau produit
            if not produit and nom_produit:
                produit = StockProduct.objects.create(
                    nom=nom_produit,
                    quantite=0  # On ajoutera la quantité après
                )
            
            # 4. Créer l'item d'achat avec tous les détails
            # Le montant_total sera calculé automatiquement dans la méthode save() du modèle
            item = StockPurchaseItem.objects.create(
                achat=achat,
                produit=produit,
                nom_produit=nom_produit or (produit.nom if produit else ''),
                quantite=quantite,
                prix_unitaire=prix_unitaire,
                unite=unite,
                creer_produit=creer_produit
            )
            
            # 5. Mettre à jour la quantité du produit (ajouter la quantité achetée)
            if produit:
                # Utiliser F() pour éviter les problèmes de race condition
                from django.db.models import F
                StockProduct.objects.filter(id=produit.id).update(quantite=F('quantite') + quantite)
                # Recharger depuis la DB pour avoir la valeur à jour
                produit.refresh_from_db()
            
            # 6. Le montant_total est maintenant un champ sauvegardé, on peut l'utiliser directement
            total += float(item.montant_total)
            
            # 7. Créer le StockLot pour le suivi FIFO
            # Un lot = une quantité d'un produit acheté à un prix donné à une date donnée
            from .models import StockLot
            StockLot.objects.create(
                produit=produit,
                purchase_item=item,
                quantite_restante=quantite,
                prix_achat_unitaire=prix_unitaire,
                date_achat=achat.date_achat
            )
        
        # Mettre à jour le total de l'achat
        achat.total = total
        achat.save()
        
        return achat


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ['id', 'agent', 'week', 'year', 'day', 'hour', 'chantier_id', 'is_sav', 'overtime_hours']

class LaborCostSerializer(serializers.ModelSerializer):
    # Champs calculés/dérivés
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    taux_horaire = serializers.FloatField(source='agent.taux_Horaire', read_only=True)

    class Meta:
        model = LaborCost
        fields = [
            'id', 'agent', 'agent_name', 'chantier', 'chantier_name',
            'week', 'year',
            'hours_normal', 'hours_samedi', 'hours_dimanche', 'hours_ferie', 'hours_overtime',
            'cost_normal', 'cost_samedi', 'cost_dimanche', 'cost_ferie', 'cost_overtime',
            'details_majoration',
            'taux_horaire',
            'created_at', 'updated_at'
        ]



class FactureLigneSerializer(serializers.ModelSerializer):
    ligne_detail = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = FactureLigne
        fields = ['ligne_detail', 'quantite', 'prix_unitaire', 'total_ht']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['ligne_detail'] = instance.ligne_detail.id
        representation['total_ht'] = float(representation['total_ht'])
        return representation

class FactureSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='devis.numero', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)

    class Meta:
        model = Facture
        fields = [
            'id', 'numero', 'date_creation', 'state_facture',
            'date_echeance', 'date_paiement', 'date_envoi', 'delai_paiement', 
            'mode_paiement', 'devis', 'price_ht', 'price_ttc', 'chantier', 
            'chantier_name', 'devis_numero', 'type_facture', 'designation',
            'cout_estime_main_oeuvre', 'cout_estime_materiel', 'contact_societe'
        ]
        read_only_fields = ['date_creation', 'price_ht', 'price_ttc', 'chantier', 'chantier_name']

    def validate_numero(self, value):
        # Vérification de l'unicité du numéro de facture
        if Facture.objects.filter(numero=value).exists():
            raise serializers.ValidationError("Ce numéro de facture existe déjà")
            
        return value

    def validate(self, data):
        if data.get('state_facture') == 'Payée' and not data.get('date_paiement'):
            raise serializers.ValidationError({
                "date_paiement": "La date de paiement est requise lorsque la facture est marquée comme payée"
            })
        return data

class ChantierDetailSerializer(serializers.ModelSerializer):
    societe_details = serializers.SerializerMethodField()
    statistiques = serializers.SerializerMethodField()
    adresse = serializers.SerializerMethodField()
    couts = serializers.SerializerMethodField()
    dates = serializers.SerializerMethodField()
    
    class Meta:
        model = Chantier
        fields = [
            
            'chantier_name',
            'state_chantier',
            'description',
            'societe_details',
            'statistiques',
            'adresse',
            'couts',
            'dates',
            'drive_path'  # ✅ Chemin personnalisé dans le drive
        ]

    def get_societe_details(self, obj):
        if not obj.societe:
            return None
        
        return {
            'id': obj.societe.id,
            'nom': obj.societe.nom_societe,
            'ville_societe': obj.societe.ville_societe,
            'rue_societe': obj.societe.rue_societe,
            'codepostal_societe': obj.societe.codepostal_societe,
            'client': {
                'nom': f"{obj.societe.client_name.name} {obj.societe.client_name.surname}" if obj.societe.client_name else None,
                'email': obj.societe.client_name.client_mail if obj.societe.client_name else None,
                'telephone': obj.societe.client_name.phone_Number if obj.societe.client_name else None
            } if obj.societe.client_name else None
        }

    def get_statistiques(self, obj):
        return {
            'nombre_devis': obj.nombre_devis,
            'nombre_factures': obj.nombre_facture,
            'cout_main_oeuvre_total': obj.cout_main_oeuvre_total,
            'montant_total_ttc': obj.montant_ttc or 0,
            'montant_total_ht': obj.montant_ht or 0,
            'marge_brute': (obj.montant_ht or 0) - (
                (obj.cout_materiel or 0) + 
                (obj.cout_main_oeuvre or 0) + 
                (obj.cout_sous_traitance or 0)
            )
        }

    def get_adresse(self, obj):
        return {
            'rue': obj.rue,
            'ville': obj.ville,
            'code_postal': obj.code_postal
        }

    def get_couts(self, obj):
        return {
            'materiel': obj.cout_materiel,
            'main_oeuvre': obj.cout_main_oeuvre,
            'sous_traitance': obj.cout_sous_traitance
        }

    def get_dates(self, obj):
        return {
            'debut': obj.date_debut,
            'fin': obj.date_fin
        }

class LigneBonCommandeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneBonCommande
        fields = '__all__'

class BonCommandeSerializer(serializers.ModelSerializer):
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    reste_a_payer = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    emetteur_name = serializers.SerializerMethodField()
    magasin_nom = serializers.SerializerMethodField()
    magasin_email = serializers.SerializerMethodField()

    class Meta:
        model = BonCommande
        fields = '__all__'
        extra_kwargs = {
            'magasin_retrait': {'required': False, 'allow_blank': True, 'allow_null': True},
            'magasin': {'required': False, 'allow_null': True},
        }

    def get_emetteur_name(self, obj):
        if obj.emetteur:
            return f"{obj.emetteur.name} {obj.emetteur.surname}"
        return None

    def get_magasin_nom(self, obj):
        if obj.magasin:
            return obj.magasin.nom
        return obj.magasin_retrait  # Fallback sur l'ancien champ pour compatibilité

    def get_magasin_email(self, obj):
        if obj.magasin:
            return obj.magasin.email
        return None

class FactureTSSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='numero_complet', read_only=True)
    devis_date_creation = serializers.DateTimeField(source='devis.date_creation', read_only=True)
    devis_nature_travaux = serializers.CharField(source='devis.nature_travaux', read_only=True)
    devis_status = serializers.CharField(source='devis.status', read_only=True)
    devis_price_ht = serializers.FloatField(source='devis.price_ht', read_only=True)
    devis_price_ttc = serializers.FloatField(source='devis.price_ttc', read_only=True)
    
    class Meta:
        model = FactureTS
        fields = [
            'id',
            'numero_ts',
            'designation',
            'date_creation',
            'montant_ht',
            'montant_ttc',
            'tva_rate',
            'devis',
            'chantier',
            'avenant',
            'devis_numero',
            'devis_date_creation',
            'devis_nature_travaux',
            'devis_status',
            'devis_price_ht',
            'devis_price_ttc'
        ]

class AvenantSerializer(serializers.ModelSerializer):
    factures_ts = FactureTSSerializer(many=True, read_only=True)
    nombre_ts = serializers.SerializerMethodField()
    
    class Meta:
        model = Avenant
        fields = [
            'id', 
            'numero', 
            'montant_total',
            'nombre_ts',
            'factures_ts'
        ]

    def get_nombre_ts(self, obj):
        return obj.factures_ts.count()

class FactureTSCreateSerializer(serializers.Serializer):
    devis_id = serializers.IntegerField()
    chantier_id = serializers.IntegerField()
    numero_ts = serializers.CharField(required=False, allow_blank=True)
    create_new_avenant = serializers.BooleanField()
    avenant_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if not data['create_new_avenant'] and not data.get('avenant_id'):
            raise serializers.ValidationError(
                "Un avenant existant doit être sélectionné si create_new_avenant est False"
            )

        try:
            devis = Devis.objects.get(id=data['devis_id'])
            
            # Vérifier si une facture existe déjà pour ce devis
            if Facture.objects.filter(devis=devis).exists():
                raise serializers.ValidationError(
                    f"Une facture existe déjà pour le devis {devis.numero}"
                )

            # Vérifier si le numéro de facture existe déjà
            potential_numero = f"{devis.numero} / {data.get('numero_ts', '')}"
            if Facture.objects.filter(numero=potential_numero).exists():
                raise serializers.ValidationError(
                    f"Une facture avec le numéro {potential_numero} existe déjà"
                )

        except Devis.DoesNotExist:
            raise serializers.ValidationError("Le devis spécifié n'existe pas")

        try:
            Chantier.objects.get(id=data['chantier_id'])
        except Chantier.DoesNotExist:
            raise serializers.ValidationError("Le chantier spécifié n'existe pas")

        return data

class FactureCIECreateSerializer(serializers.Serializer):
    devis_id = serializers.IntegerField()
    chantier_id = serializers.IntegerField()
    numero_ts = serializers.CharField(required=False, allow_blank=True)
    mois_situation = serializers.IntegerField(min_value=1, max_value=12)
    annee_situation = serializers.IntegerField(min_value=2000, max_value=2100)

    def validate(self, data):
        try:
            devis = Devis.objects.get(id=data['devis_id'])
            
            # Vérifier si une facture existe déjà pour ce devis
            if Facture.objects.filter(devis=devis).exists():
                raise serializers.ValidationError(
                    f"Une facture existe déjà pour le devis {devis.numero}"
                )

            # Vérifier si le numéro de facture existe déjà
            potential_numero = f"{devis.numero} / {data.get('numero_ts', '')}"
            if Facture.objects.filter(numero=potential_numero).exists():
                raise serializers.ValidationError(
                    f"Une facture avec le numéro {potential_numero} existe déjà"
                )

            if devis.devis_chantier:
                raise serializers.ValidationError(
                    "Les devis de chantier ne peuvent pas être transformés en facture CIE"
                )
        except Devis.DoesNotExist:
            raise serializers.ValidationError("Le devis spécifié n'existe pas")

        try:
            Chantier.objects.get(id=data['chantier_id'])
        except Chantier.DoesNotExist:
            raise serializers.ValidationError("Le chantier spécifié n'existe pas")

        return data

class SituationLigneSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigne
        fields = ['id', 'ligne_devis', 'description', 'quantite', 'prix_unitaire', 
                 'total_ht', 'pourcentage_actuel', 'montant']

    def to_internal_value(self, data):
        # Convertir les champs numériques en Decimal
        numeric_fields = ['quantite', 'prix_unitaire', 'total_ht', 'pourcentage_actuel', 'montant']
        for field in numeric_fields:
            if field in data:
                try:
                    data[field] = Decimal(str(data[field])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                except:
                    data[field] = Decimal('0.00')
        return super().to_internal_value(data)

class SituationLigneSupplementaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigneSupplementaire
        fields = ['id', 'description', 'montant', 'type']

    def to_internal_value(self, data):
        if 'montant' in data:
            try:
                data['montant'] = Decimal(str(data['montant'])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except:
                data['montant'] = Decimal('0.00')
        return super().to_internal_value(data)

class SituationLigneAvenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigneAvenant
        fields = ['id', 'avenant', 'facture_ts', 'montant_ht', 'pourcentage_actuel', 'montant']

    def to_internal_value(self, data):
        numeric_fields = ['montant_ht', 'pourcentage_actuel', 'montant']
        for field in numeric_fields:
            if field in data:
                try:
                    data[field] = Decimal(str(data[field])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                except:
                    data[field] = Decimal('0.00')
        return super().to_internal_value(data)

class SituationLigneSpecialeSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigneSpeciale
        fields = ['id', 'description', 'montant_ht', 'value', 'value_type', 'type', 
                 'niveau', 'partie_id', 'sous_partie_id', 'pourcentage_precedent', 
                 'pourcentage_actuel', 'montant']

    def to_internal_value(self, data):
        numeric_fields = ['montant_ht', 'value', 'pourcentage_precedent', 'pourcentage_actuel', 'montant']
        for field in numeric_fields:
            if field in data:
                try:
                    data[field] = Decimal(str(data[field])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                except:
                    data[field] = Decimal('0.00')
        return super().to_internal_value(data)

class SituationSerializer(serializers.ModelSerializer):
    lignes = SituationLigneSerializer(many=True, read_only=True)
    lignes_supplementaires = SituationLigneSupplementaireSerializer(many=True, read_only=True)
    lignes_avenant = SituationLigneAvenantSerializer(many=True, read_only=True)
    lignes_speciales = SituationLigneSpecialeSerializer(many=True, read_only=True)

    class Meta:
        model = Situation
        fields = '__all__'

    def validate_numero_situation(self, value):
        """
        Validation simple pour s'assurer que le numéro de situation est une chaîne non vide
        """
        if not value:
            raise serializers.ValidationError("Le numéro de situation ne peut pas être vide")
        return value

    def to_internal_value(self, data):
        numeric_fields = [
            'montant_ht_mois', 'montant_precedent', 'cumul_precedent',
            'montant_total', 'pourcentage_avancement', 'retenue_garantie',
            'montant_prorata', 'retenue_cie', 'montant_apres_retenues',
            'tva', 'taux_prorata', 'tva_rate'
        ]
        
        for field in numeric_fields:
            if field in data:
                try:
                    data[field] = Decimal(str(data[field])).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                except:
                    data[field] = Decimal('0.00')
        
        return super().to_internal_value(data)

class SituationCreateSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        # Fonction helper pour convertir en Decimal
        def to_decimal(value):
            if value is None or value == '':
                return Decimal('0.00')
            try:
                return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except:  # Capture toutes les exceptions possibles
                return Decimal('0.00')


        
        # Copier les données pour éviter de modifier l'original
        data = data.copy()

        # Convertir les champs numériques principaux
        numeric_fields = [
            'montant_ht_mois', 'cumul_precedent', 'montant_total_cumul_ht',
            'retenue_garantie', 'montant_prorata', 'retenue_cie',
            'montant_apres_retenues', 'tva', 'montant_total_ttc',
            'pourcentage_avancement', 'taux_prorata', 'tva_rate'
        ]

        for field in numeric_fields:
            if field in data:
                data[field] = to_decimal(data[field])

        # Traiter les lignes
        if 'lignes' in data:
            for ligne in data['lignes']:
                for field in ['quantite', 'prix_unitaire', 'total_ht', 'pourcentage_actuel', 'montant']:
                    if field in ligne:
                        ligne[field] = to_decimal(ligne[field])

        # Traiter les lignes supplémentaires
        if 'lignes_supplementaires' in data:
            for ligne in data['lignes_supplementaires']:
                if 'montant' in ligne:
                    ligne['montant'] = to_decimal(ligne['montant'])

        return super().to_internal_value(data)

    class Meta:
        model = Situation
        fields = '__all__'

    def create(self, validated_data):
        try:
            # ✅ Si contact_societe n'est pas fourni, copier celui du devis si disponible
            if 'contact_societe' not in validated_data or validated_data.get('contact_societe') is None:
                devis = validated_data.get('devis')
                if devis and hasattr(devis, 'contact_societe') and devis.contact_societe:
                    validated_data['contact_societe'] = devis.contact_societe
            return super().create(validated_data)
        except Exception as e:
            print(f"Erreur lors de la création: {str(e)}")
            raise serializers.ValidationError(str(e))

class SituationLigneUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SituationLigne
        fields = ['pourcentage']

    def validate_pourcentage(self, value):
        if not isinstance(value, (int, float)):
            raise serializers.ValidationError("Le pourcentage doit être un nombre")
        
        if value < 0 or value > 100:
            raise serializers.ValidationError("Le pourcentage doit être compris entre 0 et 100")
            
        return value

    def update(self, instance, validated_data):
        # Vérifier si le pourcentage est inférieur au pourcentage de la situation précédente
        derniere_situation = (
            Situation.objects
            .filter(
                chantier=instance.situation.chantier,
                numero_situation__lt=instance.situation.numero_situation
            )
            .order_by('-numero_situation')
            .first()
        )
        
        if derniere_situation:
            derniere_ligne = SituationLigne.objects.filter(
                situation=derniere_situation,
                ligne_devis=instance.ligne_devis,
                facture_ts=instance.facture_ts
            ).first()
            
            if derniere_ligne and validated_data['pourcentage'] < derniere_ligne.pourcentage:
                raise serializers.ValidationError(
                    "Le nouveau pourcentage ne peut pas être inférieur à celui de la situation précédente"
                )

        instance.pourcentage = validated_data['pourcentage']
        instance.save()
        return instance

class FactureTSListSerializer(serializers.ModelSerializer):
    devis_numero = serializers.CharField(source='numero_complet', read_only=True)
    avenant_numero = serializers.IntegerField(source='avenant.numero', read_only=True)
    
    class Meta:
        model = FactureTS
        fields = [
            'id',
            'devis_numero',
            'numero_ts',
            'designation',
            'montant_ht',
            'montant_ttc',
            'date_creation',
            'avenant_numero',
            
        ]

class ChantierLigneSupplementaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChantierLigneSupplementaire
        fields = ['id', 'description', 'montant']

class AgencyExpenseOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyExpenseOverride
        fields = ['month', 'year', 'description', 'amount']

class AgencyExpenseSerializer(serializers.ModelSerializer):
    current_override = serializers.SerializerMethodField()
    sous_traitant_name = serializers.CharField(source='sous_traitant.entreprise', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)

    class Meta:
        model = AgencyExpense
        fields = [
            'id', 'description', 'amount', 'type', 'date', 'end_date', 
            'category', 'current_override', 'sous_traitant', 'sous_traitant_name',
            'chantier', 'chantier_name', 'agent', 'is_ecole_expense', 'ecole_hours'
        ]

    def get_current_override(self, obj):
        request = self.context.get('request')
        if request and hasattr(obj, 'current_override'):
            return obj.current_override
        return None


class AgencyExpenseMonthSerializer(serializers.ModelSerializer):
    sous_traitant_name = serializers.CharField(source='sous_traitant.entreprise', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    agent_name = serializers.SerializerMethodField()
    date_paiement_prevue = serializers.SerializerMethodField()
    recurrence_parent = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = AgencyExpenseMonth
        fields = [
            'id', 'description', 'amount', 'category', 'month', 'year', 
            'date_paiement', 'date_reception_facture', 'date_paiement_reel', 'delai_paiement',
            'date_paiement_prevue', 'factures',
            'sous_traitant', 'sous_traitant_name', 'chantier', 'chantier_name',
            'agent', 'agent_name', 'is_ecole_expense', 'ecole_hours',
            'source_expense',
            'is_recurring_template', 'recurrence_start', 'recurrence_end',
            'closed_until', 'recurrence_parent',
            'created_at', 'updated_at'
        ]
    
    def get_agent_name(self, obj):
        if obj.agent:
            return f"{obj.agent.name} {obj.agent.surname}"
        return None
    
    def get_date_paiement_prevue(self, obj):
        """Calcule la date de paiement prévue"""
        # Utiliser date_reception_facture en priorité, sinon date_paiement (ancien champ)
        date_reception = obj.date_reception_facture or obj.date_paiement
        if date_reception and obj.delai_paiement:
            from datetime import timedelta
            date_prevue = date_reception + timedelta(days=obj.delai_paiement)
            return date_prevue.isoformat()
        return None

class AgencyExpenseAggregateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgencyExpenseAggregate
        fields = '__all__'

class ContactSousTraitantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSousTraitant
        fields = [
            'id',
            'sous_traitant',
            'nom',
            'prenom',
            'poste',
            'email',
            'telephone',
            'date_creation',
            'date_modification'
        ]
        extra_kwargs = {
            'sous_traitant': {'required': True},
            'nom': {'required': True},
            'prenom': {'required': False, 'allow_blank': True, 'allow_null': True},
            'poste': {'required': False, 'allow_blank': True, 'allow_null': True},
            'email': {'required': False, 'allow_blank': True, 'allow_null': True},
            'telephone': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

class SousTraitantSerializer(serializers.ModelSerializer):
    contacts = ContactSousTraitantSerializer(many=True, read_only=True)
    
    class Meta:
        model = SousTraitant
        fields = [
            'id',
            'entreprise',
            'capital',
            'adresse',
            'code_postal',
            'ville',
            'numero_rcs',
            'representant',
            'date_creation',
            'date_modification',
            'forme_juridique',
            'email',
            'phone_Number',
            'type',
            'contacts'
        ]

class AvenantSousTraitanceSerializer(serializers.ModelSerializer):
    montant_total_contrat_et_avenants = serializers.ReadOnlyField()
    
    class Meta:
        model = AvenantSousTraitance
        fields = ['id', 'contrat', 'description', 'montant', 'date_creation', 'date_modification', 'numero', 'type_travaux', 'montant_total_contrat_et_avenants']
        read_only_fields = ['date_modification']

class ContratSousTraitanceSerializer(serializers.ModelSerializer):
    avenants = AvenantSousTraitanceSerializer(many=True, read_only=True)
    sous_traitant_details = SousTraitantSerializer(source='sous_traitant', read_only=True)

    class Meta:
        model = ContratSousTraitance
        fields = [
            'id',
            'chantier',
            'sous_traitant',
            'sous_traitant_details',
            'sans_contrat',
            'type_contrat',
            'description_prestation',
            'date_debut',
            'duree',
            'adresse_prestation',
            'nom_operation',
            'montant_operation',
            'nom_maitre_ouvrage',
            'nom_maitre_oeuvre',
            'date_creation',
            'date_modification',
            'avenants'
        ]
        extra_kwargs = {
            'description_prestation': {'required': False, 'allow_blank': True},
            'date_debut': {'required': False},
            'duree': {'required': False, 'allow_blank': True},
            'adresse_prestation': {'required': False, 'allow_blank': True},
            'nom_operation': {'required': False, 'allow_blank': True},
            'montant_operation': {'required': False},
            'nom_maitre_ouvrage': {'required': False, 'allow_blank': True},
            'nom_maitre_oeuvre': {'required': False, 'allow_blank': True},
            'date_creation': {'required': False},
        }

class PaiementSousTraitantSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaiementSousTraitant
        fields = [
            'id',
            'sous_traitant',
            'chantier',
            'contrat',
            'avenant',
            'mois',
            'annee',
            'date_paiement',
            'montant_facture_ht',
            'date_envoi_facture',
            'delai_paiement',
            'montant_paye_ht',
            'date_paiement_reel',
            'mois_annee',
            'jours_retard',
        ]

class PaiementGlobalSousTraitantSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaiementGlobalSousTraitant
        fields = [
            'id',
            'sous_traitant',
            'chantier',
            'date_paiement',
            'montant_paye_ht',
            'date_paiement_reel',
            'commentaire',
            'created_at',
            'updated_at',
            'mois_annee',
        ]

class PaiementFactureSousTraitantSerializer(serializers.ModelSerializer):
    jours_retard = serializers.ReadOnlyField()
    
    class Meta:
        model = PaiementFactureSousTraitant
        fields = [
            'id',
            'facture',
            'montant_paye',
            'date_paiement_reel',
            'commentaire',
            'jours_retard',
            'created_at',
            'updated_at',
        ]

class FactureSousTraitantSerializer(serializers.ModelSerializer):
    paiements = PaiementFactureSousTraitantSerializer(many=True, read_only=True)
    mois_annee = serializers.ReadOnlyField()
    montant_total_paye = serializers.ReadOnlyField()
    ecart_paiement = serializers.ReadOnlyField()
    est_soldee = serializers.ReadOnlyField()
    date_paiement_prevue = serializers.ReadOnlyField()  # Calculé automatiquement
    
    class Meta:
        model = FactureSousTraitant
        fields = [
            'id',
            'sous_traitant',
            'chantier',
            'mois',
            'annee',
            'numero_facture',
            'montant_facture_ht',
            'montant_retenue',
            'date_reception',
            'delai_paiement',
            'date_paiement_prevue',
            'paiements',
            'mois_annee',
            'montant_total_paye',
            'ecart_paiement',
            'est_soldee',
            'created_at',
            'updated_at',
        ]

# --- SERIALIZER POUR LE RECAP FINANCIER CHANTIER ---
from rest_framework import serializers

class RecapDocumentSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False, allow_null=True)
    numero = serializers.CharField(required=False, allow_null=True)
    date = serializers.DateField(required=False, allow_null=True)
    montant = serializers.FloatField()
    statut = serializers.CharField()
    fournisseur = serializers.CharField(required=False, allow_null=True)
    agent = serializers.CharField(required=False, allow_null=True)
    heures = serializers.FloatField(required=False, allow_null=True)
    sous_traitant = serializers.CharField(required=False, allow_null=True)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Si c'est un document matériel, ne garder que les champs pertinents
        if 'fournisseur' in rep and rep.get('fournisseur') is not None:
            # On retire agent, heures, sous_traitant
            rep.pop('agent', None)
            rep.pop('heures', None)
            rep.pop('sous_traitant', None)
        return rep

class RecapCategorieSerializer(serializers.Serializer):
    total = serializers.FloatField()
    documents = RecapDocumentSerializer(many=True)

class RecapSectionSerializer(serializers.Serializer):
    materiel = RecapCategorieSerializer()
    main_oeuvre = RecapCategorieSerializer()
    sous_traitant = RecapCategorieSerializer()

class RecapEntreeSectionSerializer(serializers.Serializer):
    situation = RecapCategorieSerializer()
    facture = RecapCategorieSerializer()

class RecapFinancierSerializer(serializers.Serializer):
    periode = serializers.CharField()
    sorties = serializers.DictField(child=RecapSectionSerializer())
    entrees = serializers.DictField(child=RecapEntreeSectionSerializer())
    montant_ht = serializers.FloatField()
    taux_fixe = serializers.FloatField()
    montant_taux_fixe = serializers.FloatField()

class FactureFournisseurMaterielSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactureFournisseurMateriel
        fields = ['id', 'paiement', 'numero_facture', 'montant_facture', 'payee', 'date_paiement_facture']


class PaiementFournisseurMaterielSerializer(serializers.ModelSerializer):
    montant_a_payer_ttc = serializers.ReadOnlyField()
    factures = serializers.SerializerMethodField()
    historique_modifications = serializers.SerializerMethodField()
    
    class Meta:
        model = PaiementFournisseurMateriel
        fields = ['id', 'chantier', 'fournisseur', 'mois', 'annee', 'montant', 'montant_a_payer', 'montant_a_payer_ttc', 'date_paiement', 'date_envoi', 'date_paiement_prevue', 'date_saisie', 'date_modification', 'factures', 'historique_modifications']
    
    def get_factures(self, obj):
        """Retourne la liste des factures avec numéro, montant, payee et date_paiement_facture"""
        return [
            {
                'id': f.id,
                'numero_facture': f.numero_facture,
                'montant_facture': float(f.montant_facture) if f.montant_facture else 0.0,
                'payee': f.payee if f.payee else False,
                'date_paiement_facture': f.date_paiement_facture.isoformat() if f.date_paiement_facture else None
            }
            for f in obj.factures.all()
        ]
    
    def get_historique_modifications(self, obj):
        """Retourne l'historique des modifications de date de paiement"""
        return [
            {
                'id': h.id,
                'date_modification': h.date_modification,
                'date_paiement_avant': h.date_paiement_avant.isoformat() if h.date_paiement_avant else None,
                'date_paiement_apres': h.date_paiement_apres.isoformat() if h.date_paiement_apres else None,
            }
            for h in obj.historique_modifications.all()[:10]  # Limiter à 10 dernières modifications
        ]

class AppelOffresSerializer(serializers.ModelSerializer):
    societe = SocieteSerializer(read_only=True)
    societe_id = serializers.PrimaryKeyRelatedField(
        queryset=Societe.objects.all(),
        source='societe',
        write_only=True
    )
    # ✅ Champ calculé pour indiquer si l'appel d'offres a déjà été transformé
    deja_transforme = serializers.SerializerMethodField()
    chantier_transformé_id = serializers.SerializerMethodField()
    chantier_transformé_name = serializers.SerializerMethodField()
    
    def get_deja_transforme(self, obj):
        """Vérifie si l'appel d'offres a déjà été transformé en chantier"""
        # ✅ Utiliser le champ chantier_transformé qui persiste même après rechargement
        return obj.chantier_transformé is not None
    
    def get_chantier_transformé_id(self, obj):
        """Retourne l'ID du chantier transformé si existant"""
        if obj.chantier_transformé:
            return obj.chantier_transformé.id
        return None
    
    def get_chantier_transformé_name(self, obj):
        """Retourne le nom du chantier transformé si existant"""
        if obj.chantier_transformé:
            return obj.chantier_transformé.chantier_name
        return None
    
    class Meta:
        model = AppelOffres
        fields = '__all__'
        read_only_fields = ('date_debut', 'date_validation') 


# --- SERIALIZERS POUR LE DRIVE ---

class DocumentSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour les documents du drive
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    societe_name = serializers.CharField(source='societe.nom_societe', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    size_mb = serializers.FloatField(read_only=True)
    extension = serializers.CharField(read_only=True)
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'owner', 'owner_name', 'societe', 'societe_name', 
            'chantier', 'chantier_name', 'category', 'category_display',
            'filename', 'content_type', 'size', 'size_mb', 'extension',
            'created_at', 'created_by', 'updated_at', 'is_deleted',
            'download_url'
        ]
        read_only_fields = ['owner', 'created_by', 'created_at', 'updated_at', 'is_deleted']
    
    def get_download_url(self, obj):
        """Génère l'URL de téléchargement présignée"""
        from .utils import generate_presigned_url
        try:
            return generate_presigned_url('get_object', obj.s3_key, expires_in=3600)
        except Exception:
            return None
    
    def create(self, validated_data):
        """Assigne automatiquement l'utilisateur connecté comme propriétaire"""
        validated_data['owner'] = self.context['request'].user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class DocumentUploadSerializer(serializers.Serializer):
    """
    Sérialiseur pour la demande d'upload (génération d'URL présignée)
    """
    societe_id = serializers.IntegerField(required=False, allow_null=True)
    chantier_id = serializers.IntegerField(required=False, allow_null=True)
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES)
    filename = serializers.CharField(max_length=255)
    
    def validate(self, data):
        """Validation personnalisée"""
        # Vérifier que l'utilisateur a accès à la société/chantier
        user = self.context['request'].user
        
        if data.get('societe_id'):
            try:
                societe = Societe.objects.get(id=data['societe_id'])
                # Ici vous pouvez ajouter une logique de permissions si nécessaire
            except Societe.DoesNotExist:
                raise serializers.ValidationError("Société introuvable")
        
        if data.get('chantier_id'):
            try:
                chantier = Chantier.objects.get(id=data['chantier_id'])
                # Ici vous pouvez ajouter une logique de permissions si nécessaire
            except Chantier.DoesNotExist:
                raise serializers.ValidationError("Chantier introuvable")
        
        return data


class DocumentListSerializer(serializers.Serializer):
    """
    Sérialiseur pour la liste des documents avec filtres
    """
    societe_id = serializers.IntegerField(required=False, allow_null=True)
    chantier_id = serializers.IntegerField(required=False, allow_null=True)
    category = serializers.ChoiceField(choices=Document.CATEGORY_CHOICES, required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=20)


class FolderItemSerializer(serializers.Serializer):
    """
    Sérialiseur pour les éléments de dossier (fichiers et sous-dossiers)
    """
    name = serializers.CharField()
    type = serializers.CharField()  # 'file' ou 'folder'
    size = serializers.IntegerField(required=False)
    size_mb = serializers.FloatField(required=False)
    modified_at = serializers.DateTimeField(required=False)
    extension = serializers.CharField(required=False)
    document_id = serializers.IntegerField(required=False)


class EmetteurSerializer(serializers.ModelSerializer):
    """
    Serializer pour les émetteurs de bons de commande
    """
    class Meta:
        model = Emetteur
        fields = ['id', 'name', 'surname', 'email', 'phone_Number', 'is_active']
        read_only_fields = ['id']

class AgentPrimeSerializer(serializers.ModelSerializer):
    """
    Serializer pour les primes des agents
    """
    agent_name = serializers.CharField(source='agent.name', read_only=True)
    agent_surname = serializers.CharField(source='agent.surname', read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True, allow_null=True)
    type_affectation_display = serializers.CharField(source='get_type_affectation_display', read_only=True)
    
    class Meta:
        model = AgentPrime
        fields = [
            'id', 'agent', 'agent_name', 'agent_surname',
            'mois', 'annee', 'montant', 'description',
            'type_affectation', 'type_affectation_display',
            'chantier', 'chantier_name',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def validate(self, data):
        """Validation personnalisée"""
        # Si type_affectation = 'chantier', chantier est obligatoire
        if data.get('type_affectation') == 'chantier' and not data.get('chantier'):
            raise serializers.ValidationError({
                'chantier': "Un chantier doit être spécifié pour une prime de type 'chantier'"
            })
        
        # Si type_affectation = 'agence', chantier doit être null
        if data.get('type_affectation') == 'agence' and data.get('chantier'):
            raise serializers.ValidationError({
                'chantier': "Une prime de type 'agence' ne peut pas avoir de chantier associé"
            })
        
        # Vérifier que le montant est positif
        if data.get('montant') and data['montant'] <= 0:
            raise serializers.ValidationError({
                'montant': "Le montant de la prime doit être positif"
            })
        
        return data
    
    def create(self, validated_data):
        """Assigne automatiquement l'utilisateur connecté"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ColorSerializer(serializers.ModelSerializer):
    """Serializer pour le modèle Color"""
    class Meta:
        model = Color
        fields = ['id', 'name', 'hex_value', 'usage_count', 'created_at']
        read_only_fields = ['usage_count', 'created_at']
    
    def create(self, validated_data):
        """Assigne automatiquement l'utilisateur connecté"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)


class FactureSuiviSousTraitantSerializer(serializers.ModelSerializer):
    """Serializer pour les factures du suivi sous-traitant"""
    class Meta:
        model = FactureSuiviSousTraitant
        fields = [
            'id',
            'numero_facture',
            'montant_facture_ht',
            'payee',
            'date_paiement_facture',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SuiviPaiementSousTraitantMensuelSerializer(serializers.ModelSerializer):
    """Serializer pour le suivi des paiements sous-traitants mensuels"""
    factures_suivi = FactureSuiviSousTraitantSerializer(many=True, read_only=True)
    chantier_name = serializers.CharField(source='chantier.chantier_name', read_only=True)
    mois_annee = serializers.CharField(read_only=True)
    ecart_paiement_jours = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SuiviPaiementSousTraitantMensuel
        fields = [
            'id',
            'mois',
            'annee',
            'sous_traitant',
            'chantier',
            'chantier_name',
            'montant_paye_ht',
            'date_paiement_reel',
            'date_envoi_facture',
            'date_paiement_prevue',
            'delai_paiement',
            'factures_suivi',
            'mois_annee',
            'ecart_paiement_jours',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'date_paiement_prevue', 'mois_annee', 'ecart_paiement_jours', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validation des données"""
        # Vérifier que le mois est entre 1 et 12
        if 'mois' in data and (data['mois'] < 1 or data['mois'] > 12):
            raise serializers.ValidationError({
                'mois': "Le mois doit être entre 1 et 12"
            })
        
        # Vérifier que l'année est valide
        if 'annee' in data and (data['annee'] < 2000 or data['annee'] > 2100):
            raise serializers.ValidationError({
                'annee': "L'année doit être entre 2000 et 2100"
            })
        
        return data


class EntrepriseConfigSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration entreprise (lecture seule pour le frontend)."""
    class Meta:
        model = EntrepriseConfig
        fields = [
            'nom', 'forme_juridique', 'capital',
            'adresse', 'code_postal', 'ville',
            'rcs', 'siret', 'tva_intra',
            'email', 'telephone',
            'representant_nom', 'representant_fonction',
            'nom_application', 'domaine_public',
        ]
        read_only_fields = fields