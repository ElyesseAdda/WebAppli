from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from decimal import Decimal, ROUND_HALF_UP
import re
from .models import Situation, Devis, Chantier, Partie, SousPartie, LigneDetail, DevisLigne

def _to_kebab_case(s):
    """Convertit camelCase ou PascalCase en kebab-case"""
    import re
    return re.sub(r'(?<!^)(?=[A-Z])', '-', s).lower()

def build_inline_style(styles: dict | None) -> str:
    """
    Construit une chaîne de style inline à partir d'un dictionnaire de styles
    Utilisé pour les lignes spéciales avec styles personnalisés
    """
    if not styles:
        return ''
    
    parts = []
    for key, val in styles.items():
        if val in (None, ''):
            continue
        kebab_key = _to_kebab_case(str(key))
        parts.append(f"{kebab_key}:{val}")
    
    return '; '.join(parts)


def build_situation_title_label(numero_situation: str | None) -> str:
    """
    Construit un libelle court pour l'onglet d'une situation.
    Ex: "Facture n°06.2026 - Situation n°04" -> "Situation n°04"
    """
    raw = (numero_situation or '').strip()
    if not raw:
        return "Situation"

    match = re.search(r"(Situation\s*n[°o]?\s*\d+)", raw, re.IGNORECASE)
    if match:
        label = match.group(1).strip()
        label = re.sub(r"^situation", "Situation", label, flags=re.IGNORECASE)
        return label

    if raw.isdigit():
        return f"Situation n°{raw}"

    return f"Situation {raw}"

def is_new_system_devis(devis):
    """
    Détecte si un devis utilise le nouveau système (avec index_global et parties_metadata)
    """
    from .models import Partie, SousPartie, LigneDetail, DevisLigne
    
    # Vérifier si le devis a des DevisLigne avec index_global > 0
    has_unified_lignes = DevisLigne.objects.filter(
        devis=devis, 
        index_global__gt=0
    ).exists()
    
    # Vérifier si le devis a des parties/sous-parties/lignes avec index_global > 0
    has_unified_items = (
        Partie.objects.filter(devis=devis, index_global__gt=0).exists() or
        SousPartie.objects.filter(devis=devis, index_global__gt=0).exists() or
        LigneDetail.objects.filter(devis=devis, index_global__gt=0).exists()
    )
    
    # Vérifier si parties_metadata existe et contient des données
    has_parties_metadata = (
        devis.parties_metadata and 
        devis.parties_metadata.get('selectedParties', [])
    )
    
    return has_unified_lignes or has_unified_items or bool(has_parties_metadata)


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_situation_v2(request, situation_id):
    """
    Version V2 de la prévisualisation des situations
    Utilise parties_metadata comme preview_saved_devis_v2 pour un affichage cohérent
    """
    try:
        # ✅ Charger contact_societe avec select_related pour optimiser la requête
        situation = get_object_or_404(Situation.objects.select_related('contact_societe', 'devis__contact_societe'), id=situation_id)
        devis = situation.devis
        chantier = situation.chantier
        societe = chantier.societe if chantier else None
        
        # ✅ Récupérer le contact_societe (priorité à celui de la situation, sinon celui du devis)
        contact_societe = situation.contact_societe if hasattr(situation, 'contact_societe') and situation.contact_societe else (devis.contact_societe if hasattr(devis, 'contact_societe') and devis.contact_societe else None)
        
        # Récupérer le client
        clients_devis = list(devis.client.all())
        if clients_devis:
            client = clients_devis[0]
        else:
            client = societe.client_name if societe else None
        
        # Dictionnaire pour un accès rapide aux lignes de situation
        situation_lignes_dict = {
            ligne.ligne_devis.id: ligne 
            for ligne in situation.lignes.all()
        }
        
        total_ht = Decimal('0')
        parties_data = []

        def parse_index(value, default=Decimal('999')):
            try:
                return float(value)
            except (TypeError, ValueError):
                return float(default)
        
        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}
        
        # Récupérer parties_metadata pour construire la structure
        parties_metadata = devis.parties_metadata or {}
        selected_parties = parties_metadata.get('selectedParties', [])
        
        # Si parties_metadata est vide, utiliser l'ancienne méthode de récupération
        if not selected_parties:
            # Fallback : récupérer les parties depuis les lignes
            parties_to_process = list(Partie.objects.filter(
                id__in=[ligne.ligne_detail.sous_partie.partie.id 
                       for ligne in devis.lignes.all()]
            ).distinct())
            
            # Convertir en format metadata pour compatibilité
            selected_parties = []
            for partie in parties_to_process:
                sous_parties_meta = []
                sous_parties = SousPartie.objects.filter(
                    partie=partie, 
                    id__in=[ligne.ligne_detail.sous_partie.id 
                           for ligne in devis.lignes.all()]
                ).distinct()
                
                for sp in sous_parties:
                    lignes_ids = [
                        l.ligne_detail.id 
                        for l in devis.lignes.filter(ligne_detail__sous_partie=sp)
                    ]
                    sous_parties_meta.append({
                        'id': sp.id,
                        'description': sp.description,
                        'numero': getattr(sp, 'numero', None),
                        'index_global': getattr(sp, 'index_global', 0),
                        'lignesDetails': lignes_ids
                    })
                
                selected_parties.append({
                    'id': partie.id,
                    'titre': partie.titre,
                    'numero': getattr(partie, 'numero', None),
                    'index_global': getattr(partie, 'index_global', 0),
                    'sousParties': sous_parties_meta
                })
        
        # Fonction de tri par index_global ou numéro de partie
        def sort_key_by_index(partie):
            # Si on a index_global dans les données, l'utiliser
            if 'index_global' in partie:
                return parse_index(partie.get('index_global'))
            # Sinon, utiliser le numéro
            numero = partie.get('numero')
            if numero and isinstance(numero, (int, str)) and str(numero).isdigit():
                return int(numero)
            return 999  # Mettre les parties sans numéro à la fin
        
        # Trier les parties par index_global si présent, sinon par numéro
        selected_parties = sorted(selected_parties, key=sort_key_by_index)
        
        # Construire un mapping des lignes par ligne_detail.id pour accès rapide
        lignes_by_detail = {}
        for ligne in devis.lignes.all().order_by('index_global'):
            ligne_detail_id = ligne.ligne_detail.id
            if ligne_detail_id not in lignes_by_detail:
                lignes_by_detail[ligne_detail_id] = []
            lignes_by_detail[ligne_detail_id].append(ligne)
        
        # Construire la structure des parties depuis parties_metadata
        for partie_meta in selected_parties:
            sous_parties_data = []
            total_partie = Decimal('0')
            total_avancement_partie = Decimal('0')
            partie_index_global = parse_index(partie_meta.get('index_global'))
            
            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie_meta['id']), [])
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie_meta['id']), [])
            
            # Trier les sous-parties par index_global si présent, sinon par numéro
            sous_parties_meta = sorted(
                partie_meta.get('sousParties', []), 
                key=lambda sp: float(sp.get('index_global', 999)) 
                    if 'index_global' in sp 
                    else (int(sp.get('numero', '999').split('.')[-1]) 
                          if sp.get('numero') and '.' in str(sp.get('numero')) 
                          else 999)
            )
            
            # Traiter les sous-parties de cette partie
            for sous_partie_meta in sous_parties_meta:
                lignes_details_data = []
                total_sous_partie = Decimal('0')
                total_avancement_sous_partie = Decimal('0')
                
                # Récupérer les lignes de détail pour cette sous-partie
                ligne_detail_ids = sous_partie_meta.get('lignesDetails', [])
                
                # Extraire les lignes correspondantes depuis les DevisLigne
                lignes_filtered = []
                for ligne_detail_id in ligne_detail_ids:
                    if ligne_detail_id in lignes_by_detail:
                        lignes_filtered.extend(lignes_by_detail[ligne_detail_id])
                
                # Trier par index_global si présent
                lignes_filtered.sort(key=lambda l: float(l.index_global) if l.index_global else 999)
                
                # Traiter chaque ligne
                for ligne in lignes_filtered:
                    situation_ligne = situation_lignes_dict.get(ligne.id)
                    
                    if situation_ligne:
                        # Utiliser les données de la situation stockées en DB
                        total_ligne = situation_ligne.total_ht
                        montant_situation = situation_ligne.montant
                        pourcentage = situation_ligne.pourcentage_actuel
                    else:
                        # Fallback si la ligne n'existe pas en situation
                        total_ligne = ligne.quantite * ligne.prix_unitaire
                        pourcentage = Decimal('0')
                        montant_situation = Decimal('0')
                    
                    lignes_details_data.append({
                        'description': ligne.ligne_detail.description,
                        'unite': ligne.ligne_detail.unite,
                        'quantity': ligne.quantite,
                        'custom_price': ligne.prix_unitaire,
                        'total_ht': total_ligne,
                        'pourcentage': pourcentage,
                        'montant_situation': montant_situation
                    })
                    
                    total_sous_partie += total_ligne
                    total_avancement_sous_partie += montant_situation
                
                if lignes_details_data:
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie_meta['id']), [])
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(str(sous_partie_meta['id']), [])
                    
                    # Trier les lignes spéciales par index_global si présent
                    def sort_special_lines(lines):
                        return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                    
                    special_lines_sous_partie = sort_special_lines(special_lines_sous_partie)
                    display_lines_sous_partie = sort_special_lines(display_lines_sous_partie)
                    
                    sous_partie_data = {
                        'description': sous_partie_meta.get('description', ''),
                        'numero': sous_partie_meta.get('numero'),  # ✅ Numéro depuis partie_metadata
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'montant_avancement': total_avancement_sous_partie,
                        'pourcentage': (total_avancement_sous_partie / total_sous_partie * 100) if total_sous_partie else Decimal('0'),
                        'special_lines': []
                    }
                    
                    # Calculer et ajouter chaque ligne spéciale
                    for special_line in special_lines_sous_partie:
                        value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
                        if value_type == 'percentage':
                            montant = (total_sous_partie * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))
                        
                        line_type = special_line.get('type', 'display')
                        if line_type == 'reduction':
                            total_sous_partie -= montant
                        elif line_type == 'addition':
                            total_sous_partie += montant
                        
                        sous_partie_data['special_lines'].append({
                            'description': special_line.get('description', ''),
                            'value': special_line.get('value', 0) or special_line.get('amount', 0),
                            'valueType': value_type,
                            'type': line_type,
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False) or (
                                special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                                special_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                            ),
                            'style_attr': build_inline_style(special_line.get('styles'))  # ✅ Style inline
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line.get('description', ''),
                            'value': display_line.get('value', 0) or display_line.get('amount', 0),
                            'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                            'type': display_line.get('type', 'display'),
                            'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                            'isHighlighted': display_line.get('isHighlighted', False) or (
                                display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                                display_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                            ),
                            'style_attr': build_inline_style(display_line.get('styles'))  # ✅ Style inline
                        })
                    
                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie
                    total_avancement_partie += total_avancement_sous_partie
            
            if sous_parties_data:
                # Trier les lignes spéciales de la partie par index_global
                def sort_special_lines_partie(lines):
                    return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                
                special_lines_partie = sort_special_lines_partie(special_lines_partie)
                display_lines_partie = sort_special_lines_partie(display_lines_partie)
                
                # Stocker total_partie AVANT application des lignes spéciales de la partie
                total_partie_sans_speciales = total_partie
                
                partie_data = {
                    'titre': partie_meta.get('titre', ''),
                    'numero': partie_meta.get('numero'),  # ✅ Numéro depuis partie_metadata
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'total_partie_sans_speciales': total_partie_sans_speciales,  # ✅ Pour calculer total_marche_ht
                    'montant_avancement': total_avancement_partie,
                    'pourcentage': (total_avancement_partie / total_partie * 100) if total_partie else Decimal('0'),
                    'special_lines': [],
                    'index_global': partie_index_global
                }
                
                # Calculer et ajouter les lignes spéciales de la partie
                for special_line in special_lines_partie:
                    value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
                    if value_type == 'percentage':
                        montant = (total_partie * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))
                    
                    line_type = special_line.get('type', 'display')
                    if line_type == 'reduction':
                        total_partie -= montant
                    elif line_type == 'addition':
                        total_partie += montant
                    
                    partie_data['special_lines'].append({
                        'description': special_line.get('description', ''),
                        'value': special_line.get('value', 0) or special_line.get('amount', 0),
                        'valueType': value_type,
                        'type': line_type,
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False) or (
                            special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                            special_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                        ),
                        'style_attr': build_inline_style(special_line.get('styles'))  # ✅ Style inline
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line.get('description', ''),
                        'value': display_line.get('value', 0) or display_line.get('amount', 0),
                        'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                        'type': display_line.get('type', 'display'),
                        'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                        'isHighlighted': display_line.get('isHighlighted', False) or (
                            display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                            display_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                        ),
                        'style_attr': build_inline_style(display_line.get('styles'))  # ✅ Style inline
                    })
                
                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie
        
        # Appliquer les lignes spéciales globales (triées par index_global)
        special_lines_global = lignes_speciales.get('global', [])
        special_lines_global = sorted(
            special_lines_global, 
            key=lambda l: parse_index(l.get('index_global'))
        )
        
        # Convertir les lignes spéciales globales en format cohérent pour le template
        special_lines_global_formatted = []
        for special_line in special_lines_global:
            value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
            if value_type == 'percentage':
                montant = (total_ht * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
            else:
                montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))
            
            line_type = special_line.get('type', 'display')
            if line_type == 'reduction':
                total_ht -= montant
            elif line_type == 'addition':
                total_ht += montant
            
            special_lines_global_formatted.append({
                'description': special_line.get('description', ''),
                'value': special_line.get('value', 0) or special_line.get('amount', 0),
                'valueType': value_type,
                'type': line_type,
                'montant': float(montant),
                'index_global': parse_index(special_line.get('index_global')),
                'isHighlighted': special_line.get('isHighlighted', False) or (
                    special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                    special_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                ),
                'style_attr': build_inline_style(special_line.get('styles'))  # ✅ Style inline
            })
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        display_lines_global = sorted(
            display_lines_global, 
            key=lambda l: parse_index(l.get('index_global'))
        )
        
        for display_line in display_lines_global:
            special_lines_global_formatted.append({
                'description': display_line.get('description', ''),
                'value': display_line.get('value', 0) or display_line.get('amount', 0),
                'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                'type': display_line.get('type', 'display'),
                'montant': float(Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0)))),
                'index_global': parse_index(display_line.get('index_global')),
                'isHighlighted': display_line.get('isHighlighted', False) or (
                    display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or 
                    display_line.get('styles', {}).get('backgroundColor') == '#fbff24'
                ),
                'style_attr': build_inline_style(display_line.get('styles'))  # ✅ Style inline
            })
        
        special_lines_global = special_lines_global_formatted

        global_items = []
        for partie in parties_data:
            global_items.append({
                'type': 'partie',
                'index_global': partie.get('index_global', parse_index(None)),
                'data': partie
            })
        for line in special_lines_global:
            global_items.append({
                'type': 'special_line',
                'index_global': line.get('index_global', parse_index(None)),
                'data': line
            })
        global_items = sorted(global_items, key=lambda item: item.get('index_global', 999))
        
        # Gestion des avenants (identique à preview_situation)
        avenant_data = []
        current_avenant = None
        current_avenant_lines = []
        total_avenant = Decimal('0')
        pourcentage_avenant = Decimal('0')
        montant_avancement_avenant = Decimal('0')
        nb_lignes_avenant = 0
        
        for ligne_avenant in situation.lignes_avenant.all().order_by('facture_ts__avenant__numero'):
            facture_ts = ligne_avenant.facture_ts
            avenant = facture_ts.avenant
            
            if current_avenant != avenant.numero:
                if current_avenant_lines:
                    avg_pourcentage = pourcentage_avenant / nb_lignes_avenant if nb_lignes_avenant > 0 else Decimal('0')
                    avenant_data.append({
                        'numero': current_avenant,
                        'lignes': current_avenant_lines,
                        'pourcentage_avenant': avg_pourcentage,
                        'total_avenant': total_avenant,
                        'montant_avancement': montant_avancement_avenant
                    })
                
                current_avenant = avenant.numero
                current_avenant_lines = []
                total_avenant = Decimal('0')
                pourcentage_avenant = Decimal('0')
                montant_avancement_avenant = Decimal('0')
                nb_lignes_avenant = 0
            
            current_avenant_lines.append({
                'devis_numero': facture_ts.numero_complet,
                'designation': facture_ts.designation,
                'montant_ht': ligne_avenant.montant_ht,
                'pourcentage_actuel': ligne_avenant.pourcentage_actuel,
                'montant': ligne_avenant.montant
            })
            
            total_avenant += ligne_avenant.montant_ht
            pourcentage_avenant += ligne_avenant.pourcentage_actuel
            montant_avancement_avenant += ligne_avenant.montant
            nb_lignes_avenant += 1
        
        # Ajouter le dernier avenant
        if current_avenant_lines:
            avg_pourcentage = pourcentage_avenant / nb_lignes_avenant if nb_lignes_avenant > 0 else Decimal('0')
            avenant_data.append({
                'numero': current_avenant,
                'lignes': current_avenant_lines,
                'pourcentage_avenant': avg_pourcentage,
                'total_avenant': total_avenant,
                'montant_avancement': montant_avancement_avenant
            })
        
        # Gestion des lignes supplémentaires
        lignes_supplementaires_data = []
        for ligne in situation.lignes_supplementaires.all():
            lignes_supplementaires_data.append({
                'description': ligne.description,
                'type': ligne.type,
                'montant': ligne.montant,
                'isHighlighted': False
            })
        
        # Utiliser directement les valeurs stockées en DB (elles sont déjà calculées et correctes)
        montant_ht_mois = situation.montant_ht_mois or Decimal('0')
        retenue_garantie = situation.retenue_garantie or Decimal('0')
        taux_retenue_garantie = situation.taux_retenue_garantie or Decimal('5.00')
        montant_prorata = situation.montant_prorata or Decimal('0')
        retenue_cie = situation.retenue_cie or Decimal('0')
        type_retenue_cie = situation.type_retenue_cie or 'deduction'
        montant_apres_retenues = situation.montant_apres_retenues or Decimal('0')
        tva_rate = situation.tva_rate if hasattr(situation, 'tva_rate') and situation.tva_rate is not None else Decimal('20.00')
        tva = situation.tva or Decimal('0')
        
        # Calculer les totaux pour tous les avenants
        total_avenants = Decimal('0')
        total_montant_avancement_avenants = Decimal('0')
        for av in avenant_data:
            total_avenants += av['total_avenant']
            total_montant_avancement_avenants += av['montant_avancement']
        
        pourcentage_total_avenants = (total_montant_avancement_avenants / total_avenants * 100) if total_avenants else Decimal('0')
        
        # Calculer le montant total du marché HT
        # total_marche_ht = somme des total_partie (avant lignes spéciales de la partie) + lignes spéciales (hors display)
        total_parties_sans_speciales = Decimal('0')
        total_lignes_speciales_parties = Decimal('0')
        total_lignes_speciales_globales = Decimal('0')
        
        for partie_data in parties_data:
            # Utiliser total_partie_sans_speciales si disponible (avant lignes spéciales de la partie)
            if 'total_partie_sans_speciales' in partie_data:
                total_parties_sans_speciales += partie_data['total_partie_sans_speciales']
            else:
                # Fallback : calculer en soustrayant les lignes spéciales de la partie
                total_partie_sans = Decimal(str(partie_data.get('total_partie', 0)))
                for special_line in partie_data.get('special_lines', []):
                    if special_line.get('type') != 'display':
                        montant = Decimal(str(special_line.get('montant', 0)))
                        if special_line.get('type') == 'reduction':
                            total_partie_sans += montant  # Annuler la réduction
                        elif special_line.get('type') in ['addition', 'ajout']:
                            total_partie_sans -= montant  # Annuler l'addition
                total_parties_sans_speciales += total_partie_sans
            
            # Calculer les lignes spéciales de la partie (hors display)
            for special_line in partie_data.get('special_lines', []):
                if special_line.get('type') != 'display':
                    montant = Decimal(str(special_line.get('montant', 0)))
                    if special_line.get('type') == 'reduction':
                        total_lignes_speciales_parties -= montant
                    elif special_line.get('type') in ['addition', 'ajout']:
                        total_lignes_speciales_parties += montant
        
        # Calculer les lignes spéciales globales (hors display)
        for special_line in special_lines_global:
            if special_line.get('type') != 'display':
                montant = Decimal(str(special_line.get('montant', 0)))
                if special_line.get('type') == 'reduction':
                    total_lignes_speciales_globales -= montant
                elif special_line.get('type') in ['addition', 'ajout']:
                    total_lignes_speciales_globales += montant
        
        # total_marche_ht = somme des parties (inclut déjà les lignes spéciales des sous-parties) + lignes spéciales parties + lignes spéciales globales
        total_marche_ht = total_parties_sans_speciales + total_lignes_speciales_parties + total_lignes_speciales_globales
        
        # Calculer le montant total des travaux HT
        # Montant total des travaux HT = somme des montants d'avancement (colonne TOTAL) de toutes les parties
        # + montants d'avancement des lignes spéciales (hors display) des parties, sous-parties et globales
        
        # Somme de tous les montants d'avancement des parties (colonne TOTAL)
        total_montant_avancement_parties = Decimal('0')
        for partie_data in parties_data:
            total_montant_avancement_parties += Decimal(str(partie_data.get('montant_avancement', 0)))
        
        # Calculer les montants d'avancement des lignes spéciales (hors display)
        # Pour les lignes spéciales du devis, le montant d'avancement = montant × (pourcentage_avancement / 100)
        total_montant_avancement_lignes_speciales = Decimal('0')
        pourcentage_avancement_global = situation.pourcentage_avancement or Decimal('0')
        
        # Lignes spéciales des sous-parties
        for partie_data in parties_data:
            for sous_partie_data in partie_data.get('sous_parties', []):
                for special_line in sous_partie_data.get('special_lines', []):
                    if special_line.get('type') != 'display':
                        montant_ht = Decimal(str(special_line.get('montant', 0)))
                        # Calculer le montant d'avancement de la ligne spéciale
                        montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                        
                        if special_line.get('type') == 'reduction':
                            total_montant_avancement_lignes_speciales -= montant_avancement
                        elif special_line.get('type') in ['addition', 'ajout']:
                            total_montant_avancement_lignes_speciales += montant_avancement
        
        # Lignes spéciales des parties
        for partie_data in parties_data:
            for special_line in partie_data.get('special_lines', []):
                if special_line.get('type') != 'display':
                    montant_ht = Decimal(str(special_line.get('montant', 0)))
                    # Calculer le montant d'avancement de la ligne spéciale
                    montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                    
                    if special_line.get('type') == 'reduction':
                        total_montant_avancement_lignes_speciales -= montant_avancement
                    elif special_line.get('type') in ['addition', 'ajout']:
                        total_montant_avancement_lignes_speciales += montant_avancement
        
        # Lignes spéciales globales du devis
        for special_line in special_lines_global:
            if special_line.get('type') != 'display':
                montant_ht = Decimal(str(special_line.get('montant', 0)))
                # Calculer le montant d'avancement de la ligne spéciale
                montant_avancement = (montant_ht * pourcentage_avancement_global) / Decimal('100')
                
                if special_line.get('type') == 'reduction':
                    total_montant_avancement_lignes_speciales -= montant_avancement
                elif special_line.get('type') in ['addition', 'ajout']:
                    total_montant_avancement_lignes_speciales += montant_avancement
        
        # Récupérer les lignes spéciales de la situation (si elles existent) et ajouter leur montant d'avancement
        # Le champ 'montant' des SituationLigneSpeciale est déjà le montant d'avancement
        for ligne_speciale in situation.lignes_speciales.all():
            if ligne_speciale.type != 'display':
                montant_avancement = Decimal(str(ligne_speciale.montant))  # montant est déjà le montant d'avancement
                if ligne_speciale.type == 'reduction':
                    total_montant_avancement_lignes_speciales -= montant_avancement
                elif ligne_speciale.type in ['addition', 'ajout']:
                    total_montant_avancement_lignes_speciales += montant_avancement
        
        # Montant total des travaux HT = somme des montants d'avancement des parties + lignes spéciales (hors display) + avenants
        # total_montant_avancement_avenants est déjà calculé précédemment
        montant_total_travaux_ht = total_montant_avancement_parties + total_montant_avancement_lignes_speciales + total_montant_avancement_avenants
        
        # ✅ Créer un objet situation avec contact_societe pour le template
        # Le template utilise situation.contact_societe et d'autres propriétés, donc on crée un objet qui a toutes ces propriétés
        class SituationForTemplate:
            def __init__(self, situation_obj, contact, montant_ht_mois_value, retenue_garantie_value, taux_retenue_garantie_value, montant_prorata_value, taux_prorata_value, retenue_cie_value, type_retenue_cie_value, montant_apres_retenues_value, tva_value, tva_rate_value):
                self.id = situation_obj.id
                self.numero = situation_obj.numero
                self.mois = situation_obj.mois
                self.annee = situation_obj.annee
                self.numero_situation = situation_obj.numero_situation
                self.date_creation = situation_obj.date_creation
                self.statut = situation_obj.statut
                self.date_validation = situation_obj.date_validation
                self.contact_societe = contact
                # Propriétés utilisées par le template
                self.pourcentage_avancement = situation_obj.pourcentage_avancement
                self.montant_total_cumul_ht = situation_obj.montant_total_cumul_ht
                self.cumul_precedent = situation_obj.cumul_precedent
                self.montant_ht_mois = montant_ht_mois_value
                # Propriétés pour les retenues et prorata
                self.retenue_garantie = retenue_garantie_value
                self.taux_retenue_garantie = taux_retenue_garantie_value
                self.montant_prorata = montant_prorata_value
                self.taux_prorata = taux_prorata_value
                self.retenue_cie = retenue_cie_value
                self.type_retenue_cie = type_retenue_cie_value
                self.montant_apres_retenues = montant_apres_retenues_value
                self.tva = tva_value
                self.tva_rate = tva_rate_value
        
        situation_for_template = SituationForTemplate(
            situation, 
            contact_societe, 
            montant_ht_mois,
            retenue_garantie,
            taux_retenue_garantie,
            montant_prorata,
            situation.taux_prorata or Decimal('2.50'),
            retenue_cie,
            type_retenue_cie,
            montant_apres_retenues,
            tva,
            tva_rate
        )

        situation_title_label = build_situation_title_label(situation.numero_situation)
        
        context = {
            'chantier': {
                'nom': chantier.chantier_name,
                'ville': chantier.ville,
                'rue': chantier.rue,
            },
            'societe': {
                'nom': societe.nom_societe,
                'ville': societe.ville_societe,
                'rue': societe.rue_societe,
                'codepostal_societe': societe.codepostal_societe,
            },
            'client': {
                'civilite': client.civilite if hasattr(client, 'civilite') else '',
                'nom': client.name,
                'prenom': client.surname,
                'client_mail': client.client_mail,
                'phone_Number': client.phone_Number,
                'poste': client.poste if hasattr(client, 'poste') else '',
            },
            'devis': {
                'numero': devis.numero,
                'nature_travaux': devis.nature_travaux,
            },
            'situation': situation_for_template,
            'situation_title_label': situation_title_label,
            'situation_data': {
                'id': situation.id,
                'numero': situation.numero,
                'mois': situation.mois,
                'annee': situation.annee,
                'numero_situation': situation.numero_situation,
                'montant_ht_mois': montant_ht_mois,
                'montant_precedent': situation.montant_precedent,
                'montant_total': situation.montant_total,
                'pourcentage_avancement': situation.pourcentage_avancement,
                'retenue_garantie': retenue_garantie,
                'taux_retenue_garantie': taux_retenue_garantie,
                'montant_prorata': montant_prorata,
                'taux_prorata': situation.taux_prorata,
                'retenue_cie': retenue_cie,
                'type_retenue_cie': type_retenue_cie,
                'date_creation': situation.date_creation,
                'montant_total_devis': situation.montant_total_devis,
                'montant_total_travaux': montant_total_travaux_ht,
                'total_avancement': situation.total_avancement,
                'cumul_precedent': situation.cumul_precedent,
                'montant_apres_retenues': montant_apres_retenues,
                'montant_total_cumul_ht': situation.montant_total_cumul_ht,
                'tva': tva,
                'tva_rate': tva_rate,
                'statut': situation.statut,
                'date_validation': situation.date_validation,
            },
            'parties': parties_data,  # ✅ Structure avec numéros et styles
            'global_items': global_items,
            'lignes_avenant': avenant_data,
            'lignes_supplementaires': lignes_supplementaires_data,
            'special_lines_global': special_lines_global,  # ✅ Avec style_attr
            'total_ht': str(total_ht),
            'tva': str(tva),
            'montant_ttc': str(montant_apres_retenues + tva),
            'total_avenants': total_avenants,
            'pourcentage_total_avenants': pourcentage_total_avenants,
            'montant_total_avenants': total_montant_avancement_avenants,
            'total_marche_ht': total_marche_ht,
        }
        
        return render(request, 'preview_situation_v2.html', context)
    
    except Exception as e:
        import traceback
        return JsonResponse({'error': f'{str(e)}\n{traceback.format_exc()}'}, status=400)

