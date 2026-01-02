from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import datetime, timedelta, date
from ..models import (
    Chantier,
    Facture,
    BonCommande,
    Event,
    Situation,
)


class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet dédié au dashboard pour regrouper les informations
    venant des différents modules de l'application.
    """

    def list(self, request):
        """
        Récupère les données principales du dashboard.
        Paramètres de requête:
        - year: année (défaut: année actuelle)
        - month: mois (optionnel)
        - chantier_id: ID du chantier (optionnel, pour filtrer)
        """
        # Récupérer les paramètres de filtrage
        year_param = request.query_params.get('year')
        year = int(year_param) if year_param else datetime.now().year
        month = request.query_params.get('month')
        chantier_id = request.query_params.get('chantier_id')

        # Filtrer les chantiers
        chantiers_query = Chantier.objects.all()
        if chantier_id:
            chantiers_query = chantiers_query.filter(id=chantier_id)

        # Récupérer les statistiques des chantiers
        chantiers_stats = self.get_chantiers_stats(chantiers_query, year, month)

        # Récupérer les statistiques globales
        global_stats = self.get_global_stats(chantiers_query)

        # Récupérer les statistiques temporelles
        stats_temporelles = self.get_stats_temporelles(chantiers_query, year, month, request)

        return Response({
            'global_stats': global_stats,
            'chantiers': chantiers_stats,
            'stats_temporelles': stats_temporelles
        })

    @action(detail=False, methods=['get'])
    def resume(self, request):
        """
        Récupère un résumé détaillé du dashboard pour une année donnée.
        Paramètres de requête:
        - year: année (défaut: année actuelle)
        """
        # Récupérer les paramètres de filtrage
        year_param = request.query_params.get('year')
        year = int(year_param) if year_param else timezone.now().year
        
        # Récupérer tous les chantiers
        chantiers = Chantier.objects.all()
        
        # Calculer les statistiques globales
        global_stats = self.get_global_stats(chantiers)
        payment_stats = self.get_global_payment_stats(chantiers, year)
        
        # Préparer les données détaillées pour chaque chantier
        chantiers_data = []
        for chantier in chantiers:
            chantier_data = {
                'id': chantier.id,
                'nom': chantier.chantier_name,
                'state_chantier': chantier.state_chantier,
                'dates': {
                    'debut': chantier.date_debut,
                    'fin': chantier.date_fin
                },
                'adresse': {
                    'rue': chantier.rue,
                    'ville': chantier.ville,
                    'code_postal': chantier.code_postal
                },
                'montants': {
                    'ttc': float(chantier.montant_ttc or 0),
                    'ht': float(chantier.montant_ht or 0)
                },
                'rentabilite': self.get_rentabilite_stats(chantier),
                'ressources': self.get_ressources_stats(chantier, year),
                'paiements': self.get_paiements_stats(chantier, year)
            }
            chantiers_data.append(chantier_data)
        
        return Response({
            'global_stats': {
                **global_stats,
                'paiements': payment_stats
            },
            'chantiers': chantiers_data
        })

    def get_global_payment_stats(self, chantiers_query, year):
        """Calcule les statistiques globales de paiement"""
        factures_en_attente = Facture.objects.filter(
            chantier__in=chantiers_query,
            date_creation__year=year,
            state_facture__in=['En attente', 'Attente paiement']
        )
        factures_retardees = Facture.objects.filter(
            chantier__in=chantiers_query,
            date_creation__year=year,
            state_facture__in=['En attente', 'Attente paiement'],
            date_echeance__lt=timezone.now()
        )
        
        total_en_attente = factures_en_attente.aggregate(total=Sum('price_ttc'))['total'] or 0
        total_retardees = factures_retardees.aggregate(total=Sum('price_ttc'))['total'] or 0
        
        return {
            'total_en_attente': total_en_attente,
            'total_retardees': total_retardees,
            'nombre_en_attente': factures_en_attente.count(),
            'nombre_retardees': factures_retardees.count()
        }

    def get_rentabilite_stats(self, chantier):
        """Calcule les statistiques de rentabilité pour un chantier"""
        try:
            # Coûts réels
            cout_materiel = float(chantier.cout_materiel or 0)
            cout_main_oeuvre = float(chantier.cout_main_oeuvre or 0)
            cout_sous_traitance = float(chantier.cout_sous_traitance or 0)
            montant_ht = float(chantier.montant_ht or 0)
            
            # Coûts estimés
            cout_estime_materiel = float(chantier.cout_estime_materiel or 0)
            cout_estime_main_oeuvre = float(chantier.cout_estime_main_oeuvre or 0)
            marge_estimee = float(chantier.marge_estimee or 0)
            
            # Calculer les marges
            cout_total_reel = cout_materiel + cout_main_oeuvre + cout_sous_traitance
            marge_brute = montant_ht - cout_total_reel
            
            # Calculer les taux
            taux_marge_brute = (marge_brute / montant_ht * 100) if montant_ht > 0 else 0
            taux_marge_estimee = (marge_estimee / montant_ht * 100) if montant_ht > 0 else 0
            
            # Calculer les écarts
            ecart_materiel = cout_estime_materiel - cout_materiel
            ecart_main_oeuvre = cout_estime_main_oeuvre - cout_main_oeuvre
            
            return {
                'marge_brute': marge_brute,
                'marge_estimee': marge_estimee,
                'taux_marge_brute': taux_marge_brute,
                'taux_marge_estimee': taux_marge_estimee,
                'ecart_materiel': ecart_materiel,
                'ecart_main_oeuvre': ecart_main_oeuvre,
                'cout_total_reel': cout_total_reel,
                'cout_total_estime': cout_estime_materiel + cout_estime_main_oeuvre,
                'cout_materiel': cout_materiel,
                'cout_main_oeuvre': cout_main_oeuvre,
                'cout_sous_traitance': cout_sous_traitance,
                'cout_estime_materiel': cout_estime_materiel,
                'cout_estime_main_oeuvre': cout_estime_main_oeuvre
            }
        except Exception as e:
            print(f"Erreur dans get_rentabilite_stats: {str(e)}")
            return {
                'marge_brute': 0,
                'marge_estimee': 0,
                'taux_marge_brute': 0,
                'taux_marge_estimee': 0,
                'ecart_materiel': 0,
                'ecart_main_oeuvre': 0,
                'cout_total_reel': 0,
                'cout_total_estime': 0,
                'cout_materiel': 0,
                'cout_main_oeuvre': 0,
                'cout_sous_traitance': 0,
                'cout_estime_materiel': 0,
                'cout_estime_main_oeuvre': 0
            }

    def get_ressources_stats(self, chantier, year):
        """Calcule les statistiques de ressources pour un chantier"""
        try:
            # Récupérer les événements du chantier pour l'année
            events = Event.objects.filter(
                chantier=chantier,
                start_date__year=year
            )

            # Calculer le taux d'occupation mensuel
            taux_occupation_mensuel = {}
            for month in range(1, 13):
                events_mois = events.filter(start_date__month=month)
                if events_mois.exists():
                    # Calculer le taux d'occupation pour ce mois
                    total_heures = sum(float(e.hours_modified or 0) for e in events_mois)
                    jours_ouvres = len(set(e.start_date for e in events_mois))
                    taux_occupation = (total_heures / (jours_ouvres * 8)) * 100 if jours_ouvres > 0 else 0
                    taux_occupation_mensuel[month] = taux_occupation
                else:
                    taux_occupation_mensuel[month] = 0

            # Calculer le taux d'occupation global
            total_heures_annuel = sum(float(e.hours_modified or 0) for e in events)
            jours_ouvres_annuel = len(set(e.start_date for e in events))
            taux_occupation_global = (total_heures_annuel / (jours_ouvres_annuel * 8)) * 100 if jours_ouvres_annuel > 0 else 0

            return {
                'taux_occupation_mensuel': taux_occupation_mensuel,
                'taux_occupation_global': taux_occupation_global,
                'total_heures': total_heures_annuel,
                'jours_ouvres': jours_ouvres_annuel
            }
        except Exception as e:
            print(f"Erreur dans get_ressources_stats: {str(e)}")
            return {
                'taux_occupation_mensuel': {i: 0 for i in range(1, 13)},
                'taux_occupation_global': 0,
                'total_heures': 0,
                'jours_ouvres': 0
            }

    def get_paiements_stats(self, chantier, year):
        """Calcule les statistiques de paiement pour un chantier"""
        try:
            # Récupérer les factures du chantier pour l'année
            factures = Facture.objects.filter(
                chantier=chantier,
                date_creation__year=year
            )
            
            # Calculer les statistiques de paiement
            factures_en_attente = factures.filter(
                Q(state_facture='En attente') | 
                Q(state_facture='Attente paiement')
            )
            
            # Factures en retard (avec date d'échéance dépassée)
            factures_retardees = factures_en_attente.filter(
                date_echeance__lt=timezone.now()
            )
            
            # Calculer les totaux
            total_en_attente = factures_en_attente.aggregate(total=Sum('price_ttc'))['total'] or 0
            total_retardees = factures_retardees.aggregate(total=Sum('price_ttc'))['total'] or 0
            
            # Calculer le pourcentage de trésorerie bloquée
            total_ca = float(chantier.montant_ttc or 0)
            pourcentage_tresorerie_bloquee = (total_retardees / total_ca * 100) if total_ca > 0 else 0
            
            # Calculer les créances par âge
            creances_age = {
                'moins_30_jours': 0,
                '30_60_jours': 0,
                '60_90_jours': 0,
                'plus_90_jours': 0
            }
            
            for facture in factures_en_attente:
                montant = float(facture.price_ttc or 0)
                jours_retard = (timezone.now().date() - facture.date_creation.date()).days
                
                if jours_retard <= 30:
                    creances_age['moins_30_jours'] += montant
                elif jours_retard <= 60:
                    creances_age['30_60_jours'] += montant
                elif jours_retard <= 90:
                    creances_age['60_90_jours'] += montant
                else:
                    creances_age['plus_90_jours'] += montant
            
            return {
                'total_en_attente': total_en_attente,
                'total_retardees': total_retardees,
                'nombre_en_attente': factures_en_attente.count(),
                'nombre_retardees': factures_retardees.count(),
                'pourcentage_tresorerie_bloquee': pourcentage_tresorerie_bloquee,
                'creances_age': creances_age
            }
        except Exception as e:
            print(f"Erreur dans get_paiements_stats: {str(e)}")
            return {
                'total_en_attente': 0,
                'total_retardees': 0,
                'nombre_en_attente': 0,
                'nombre_retardees': 0,
                'pourcentage_tresorerie_bloquee': 0,
                'creances_age': {
                    'moins_30_jours': 0,
                    '30_60_jours': 0,
                    '60_90_jours': 0,
                    'plus_90_jours': 0
                }
            }

    def get_chantiers_stats(self, chantiers_query, year, month):
        """Calcule les statistiques pour chaque chantier"""
        chantiers_stats = {}
        
        for chantier in chantiers_query:
            # Calculer les coûts mensuels pour ce chantier
            bons_commande = BonCommande.objects.filter(
                chantier=chantier,
                date_creation__year=year,
                date_creation__month=month
            ) if month else BonCommande.objects.filter(
                chantier=chantier,
                date_creation__year=year
            )
            
            cout_materiel_mensuel = float(bons_commande.aggregate(total=Sum('montant_total'))['total'] or 0)
            cout_estime = float(chantier.cout_estime_materiel or 0)
            cout_reel = float(chantier.cout_materiel or 0)
            
            chantiers_stats[str(chantier.id)] = {
                'info': {
                    'nom': chantier.chantier_name
                },
                'stats_globales': {
                    'montant_ht': float(chantier.montant_ht or 0),
                    'cout_materiel': cout_reel,
                    'cout_estime_materiel': cout_estime,
                    'marge_fourniture': cout_estime - cout_reel,
                    'cout_sous_traitance': 0
                },
                'stats_mensuelles': {
                    str(year): {
                        str(month) if month else 'all': {
                            'cout_materiel': cout_materiel_mensuel,
                            'cout_main_oeuvre': float(chantier.cout_main_oeuvre or 0),
                            'marge_fourniture': cout_estime - cout_materiel_mensuel,
                            'cout_sous_traitance': 0
                        }
                    }
                }
            }
        
        return chantiers_stats

    def get_global_stats(self, chantiers_query):
        """Calcule les statistiques globales pour tous les chantiers"""
        try:
            # Calculer les totaux pour tous les chantiers
            total_montant_ttc = sum(float(c.montant_ttc or 0) for c in chantiers_query)
            total_montant_ht = sum(float(c.montant_ht or 0) for c in chantiers_query)
            total_cout_materiel = sum(float(c.cout_materiel or 0) for c in chantiers_query)
            total_cout_main_oeuvre = sum(float(c.cout_main_oeuvre or 0) for c in chantiers_query)
            total_cout_sous_traitance = sum(float(c.cout_sous_traitance or 0) for c in chantiers_query)
            total_cout_estime_materiel = sum(float(c.cout_estime_materiel or 0) for c in chantiers_query)
            total_cout_estime_main_oeuvre = sum(float(c.cout_estime_main_oeuvre or 0) for c in chantiers_query)
            
            # Calculer les marges
            marge_brute = total_montant_ht - (total_cout_materiel + total_cout_main_oeuvre + total_cout_sous_traitance)
            marge_estimee = total_montant_ht - (total_cout_estime_materiel + total_cout_estime_main_oeuvre)
            
            # Calculer les pourcentages
            taux_marge_brute = (marge_brute / total_montant_ht * 100) if total_montant_ht > 0 else 0
            taux_marge_estimee = (marge_estimee / total_montant_ht * 100) if total_montant_ht > 0 else 0
            
            # Compter les chantiers en cours
            nombre_chantiers_en_cours = chantiers_query.filter(state_chantier='En Cours').count()
            
            return {
                'total_montant_ttc': total_montant_ttc,
                'total_montant_ht': total_montant_ht,
                'total_montant_estime_ht': total_montant_ht,
                'total_cout_materiel': total_cout_materiel,
                'total_cout_main_oeuvre': total_cout_main_oeuvre,
                'total_cout_sous_traitance': total_cout_sous_traitance,
                'total_cout_estime_materiel': total_cout_estime_materiel,
                'total_cout_estime_main_oeuvre': total_cout_estime_main_oeuvre,
                'marge_brute': marge_brute,
                'marge_estimee': marge_estimee,
                'taux_marge_brute': taux_marge_brute,
                'taux_marge_estimee': taux_marge_estimee,
                'nombre_chantiers': chantiers_query.count(),
                'nombre_chantiers_en_cours': nombre_chantiers_en_cours
            }
        except Exception as e:
            print(f"Erreur dans get_global_stats: {str(e)}")
            return {
                'total_montant_ttc': 0,
                'total_montant_ht': 0,
                'total_montant_estime_ht': 0,
                'total_cout_materiel': 0,
                'total_cout_main_oeuvre': 0,
                'total_cout_sous_traitance': 0,
                'total_cout_estime_materiel': 0,
                'total_cout_estime_main_oeuvre': 0,
                'marge_brute': 0,
                'marge_estimee': 0,
                'taux_marge_brute': 0,
                'taux_marge_estimee': 0,
                'nombre_chantiers': 0,
                'nombre_chantiers_en_cours': 0
            }

    def get_stats_temporelles(self, chantiers_query, year, month, request=None):
        """
        Génère des statistiques temporelles pour les chantiers.
        Utilise les paramètres year et month pour définir la période.
        """
        stats = {}
        
        # Récupérer les paramètres de période
        period_start = request.query_params.get('period_start') if request else None
        period_end = request.query_params.get('period_end') if request else None
        
        # Si aucune période n'est spécifiée, utiliser les 6 derniers mois par défaut
        if not period_start or not period_end:
            current_date = datetime(int(year), int(month) if month else 12, 1)
            start_date = (current_date - timedelta(days=5*30)).replace(day=1)  # ~5 mois avant
            end_date = current_date
        else:
            # Convertir les dates de la requête
            try:
                start_date = datetime.strptime(period_start, '%Y-%m-%d')
                end_date = datetime.strptime(period_end, '%Y-%m-%d')
            except ValueError:
                # En cas d'erreur de format, utiliser les 6 derniers mois
                current_date = datetime(int(year), int(month) if month else 12, 1)
                start_date = (current_date - timedelta(days=5*30)).replace(day=1)
                end_date = current_date
        
        # Générer la liste des mois dans la période
        months = []
        current = start_date.replace(day=1)
        
        while current <= end_date:
            months.append({
                'year': current.year,
                'month': current.month,
                'label': current.strftime('%b %Y')  # Format: Jan 2023
            })
            # Passer au mois suivant
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        
        # Initialiser la structure de données
        for period in months:
            year_key = str(period['year'])
            month_key = str(period['month'])
            
            if year_key not in stats:
                stats[year_key] = {}
            
            stats[year_key][month_key] = {
                'label': period['label'],
                'cout_materiel': 0,
                'cout_main_oeuvre': 0,
                'marge_fourniture': 0,
                'cout_sous_traitance': 0
            }
        
        # Calculer les statistiques pour chaque période
        for period in months:
            year_key = str(period['year'])
            month_key = str(period['month'])
            
            # Calculer les coûts pour cette période
            bons_commande = BonCommande.objects.filter(
                chantier__in=chantiers_query,
                date_creation__year=period['year'],
                date_creation__month=period['month']
            )
            
            # Coût matériel pour cette période
            cout_materiel = float(bons_commande.aggregate(total=Sum('montant_total'))['total'] or 0)
            
            # Coût main d'œuvre pour cette période
            cout_main_oeuvre = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_main_oeuvre'))['total'] or 0)
            
            # Coût estimé matériel pour cette période
            cout_estime = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_estime_materiel'))['total'] or 0)
            
            # Coût sous-traitance pour cette période
            cout_sous_traitance = float(chantiers_query.filter(
                date_debut__lte=datetime(period['year'], period['month'], 28),
                date_fin__gte=datetime(period['year'], period['month'], 1)
            ).aggregate(total=Sum('cout_sous_traitance'))['total'] or 0)
            
            # Mettre à jour les statistiques
            stats[year_key][month_key]['cout_materiel'] = cout_materiel
            stats[year_key][month_key]['cout_main_oeuvre'] = cout_main_oeuvre
            stats[year_key][month_key]['marge_fourniture'] = cout_estime - cout_materiel
            stats[year_key][month_key]['cout_sous_traitance'] = cout_sous_traitance
        
        return stats


@api_view(['GET'])
def get_pending_payments(request):
    """
    Récupère les situations et factures en attente de paiement.
    Paramètres de requête:
    - annee: année de la date de paiement attendue (optionnel, si non spécifié, toutes les années sont incluses)
    """
    try:
        annee_param = request.query_params.get('annee')
        annee = int(annee_param) if annee_param else None
        
        result = []
        today = date.today()
        
        # 1. Récupérer les situations en attente de paiement (toutes les situations, peu importe le statut)
        situations_query = Situation.objects.filter(
            date_paiement_reel__isnull=True
        ).select_related('chantier').order_by('annee', 'mois', 'numero_situation')
        
        for situation in situations_query:
            # Calculer la date de paiement attendue
            date_paiement_attendue = None
            if situation.date_envoi and situation.delai_paiement:
                date_paiement_attendue = situation.date_envoi + timedelta(days=situation.delai_paiement)
            
            # Filtrer : uniquement les situations avec date de paiement attendue dans le futur
            if date_paiement_attendue is None or date_paiement_attendue <= today:
                continue
            
            # Filtrer par année de la date de paiement attendue si spécifié
            if annee and date_paiement_attendue.year != annee:
                continue
            
            montant = float(situation.montant_apres_retenues or situation.montant_total or 0)
            
            result.append({
                'id': situation.id,
                'type': 'situation',
                'numero': situation.numero_situation,
                'chantier_id': situation.chantier.id,
                'chantier_name': situation.chantier.chantier_name,
                'mois': situation.mois,
                'annee': situation.annee,
                'montant_ht': montant,
                'date_paiement_attendue': date_paiement_attendue.isoformat(),
                'date_envoi': situation.date_envoi.isoformat() if situation.date_envoi else None,
                'statut': situation.statut,
            })
        
        # 2. Récupérer les factures en attente de paiement
        factures_query = Facture.objects.filter(
            date_paiement__isnull=True,
            type_facture='classique'  # Seulement les factures classiques
        ).select_related('chantier').order_by('date_creation')
        
        for facture in factures_query:
            # Calculer la date de paiement attendue (même logique que pour les situations)
            date_paiement_attendue = None
            if facture.date_echeance:
                # Priorité à date_echeance si elle existe
                date_paiement_attendue = facture.date_echeance
            elif facture.date_envoi and facture.delai_paiement:
                # Sinon, calculer à partir de date_envoi + delai_paiement
                date_paiement_attendue = facture.date_envoi + timedelta(days=facture.delai_paiement)
            
            # Filtrer : uniquement les factures avec date de paiement attendue dans le futur
            if date_paiement_attendue is None or date_paiement_attendue <= today:
                continue
            
            # Filtrer par année de la date de paiement attendue si spécifié
            if annee and date_paiement_attendue.year != annee:
                continue
            
            montant = float(facture.price_ht or 0)
            
            result.append({
                'id': facture.id,
                'type': 'facture',
                'numero': facture.numero,
                'chantier_id': facture.chantier.id,
                'chantier_name': facture.chantier.chantier_name,
                'mois': None,
                'annee': facture.date_creation.year if facture.date_creation else None,
                'montant_ht': montant,
                'date_paiement_attendue': date_paiement_attendue.isoformat(),
                'date_envoi': facture.date_envoi.isoformat() if facture.date_envoi else None,
                'state_facture': facture.state_facture,
            })
        
        # 3. Trier par date de paiement attendue (les plus urgentes en premier)
        result.sort(key=lambda x: (
            x['date_paiement_attendue'] if x['date_paiement_attendue'] else '9999-12-31',
            x['chantier_name'],
            x['numero']
        ))
        
        return Response(result)
    except ValueError:
        return Response({'error': 'Format invalide pour l\'année'}, status=400)
    except Exception as e:
        return Response({'error': str(e)}, status=400)

