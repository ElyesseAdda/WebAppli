from django.shortcuts import get_object_or_404, render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from decimal import Decimal
from .models import Devis, Partie, SousPartie, Chantier
import json
import urllib.parse
import re


def _to_kebab_case(value: str) -> str:
    """
    Convertit une clé camelCase ou PascalCase (fontWeight) en kebab-case (font-weight)
    pour un rendu CSS inline correct dans les templates.
    """
    if not value:
        return ''
    kebab = re.sub(r'(?<!^)(?=[A-Z])', '-', value).lower()
    return kebab


def build_inline_style(styles: dict | None) -> str:
    """
    Transforme un dictionnaire de styles provenant du frontend en attribut CSS inline.
    Exemple: {'fontWeight': 'bold', 'backgroundColor': '#fff'} -> 'font-weight:bold; background-color:#fff'
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


def is_new_system_devis(devis):
    """
    Détecte si un devis utilise le nouveau système (avec index_global)
    Utilise la même logique que DevisSerializer
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
    
    return has_unified_lignes or has_unified_items


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_saved_devis(request, devis_id):
    """
    Vue de prévisualisation qui redirige automatiquement vers la bonne version
    selon le système utilisé par le devis (ancien ou nouveau)
    """
    try:
        devis = get_object_or_404(Devis, id=devis_id)
        
        # Détecter si le devis utilise le nouveau système
        if is_new_system_devis(devis):
            # Rediriger vers preview_saved_devis_v2 pour le nouveau système
            from django.shortcuts import redirect
            return redirect(f'/api/preview-saved-devis-v2/{devis_id}/')
        
        # Sinon, continuer avec l'ancien système (code existant)
        # Gérer les deux cas : devis normal (avec chantier) et devis de chantier (avec appel_offres)
        if devis.devis_chantier and devis.appel_offres:
            # Cas d'un devis de chantier (appel d'offres)
            chantier = devis.appel_offres
            societe = devis.appel_offres.societe
            client = societe.client_name if societe else None
        else:
            # Cas d'un devis normal
            chantier = devis.chantier
            societe = chantier.societe if chantier else None
            client = societe.client_name if societe else None

        total_ht = Decimal('0')
        parties_data = []

        def parse_index(value, default=Decimal('999')):
            try:
                return float(value)
            except (TypeError, ValueError):
                return float(default)

        def parse_index(value, default=Decimal('999')):
            try:
                return float(value)
            except (TypeError, ValueError):
                return float(default)

        # Récupérer les lignes spéciales du devis
        lignes_speciales = devis.lignes_speciales or {}
        lignes_display = devis.lignes_display or {}

        # Fonction de tri naturel pour les parties
        def natural_sort_key(titre):
            import re
            # Extraire le numéro au début du titre (ex: "1-", "11-", "21-")
            match = re.match(r'^(\d+)-', titre)
            if match:
                # Retourner un tuple (numéro, titre) pour un tri correct
                return (int(match.group(1)), titre)
            # Si pas de numéro, retourner (0, titre) pour mettre en premier
            return (0, titre)

        # Récupérer et trier les parties
        parties_to_process = list(Partie.objects.filter(id__in=[ligne.ligne_detail.sous_partie.partie.id for ligne in devis.lignes.all()]).distinct())
        parties_to_process.sort(key=lambda p: natural_sort_key(p.titre))

        for partie in parties_to_process:
            sous_parties_data = []
            total_partie = Decimal('0')

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie.id), [])
            # Récupérer les lignes display pour cette partie
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie.id), [])

            # Récupérer et trier les sous-parties
            sous_parties_to_process = list(SousPartie.objects.filter(partie=partie, id__in=[ligne.ligne_detail.sous_partie.id for ligne in devis.lignes.all()]).distinct())
            sous_parties_to_process.sort(key=lambda sp: natural_sort_key(sp.description))

            for sous_partie in sous_parties_to_process:
                lignes_details_data = []
                total_sous_partie = Decimal('0')

                # Calculer le total des lignes de détail
                for ligne in devis.lignes.filter(ligne_detail__sous_partie=sous_partie):
                    total_ligne = Decimal(str(ligne.quantite)) * Decimal(str(ligne.prix_unitaire))
                    lignes_details_data.append({
                        'description': ligne.ligne_detail.description,
                        'unite': ligne.ligne_detail.unite,
                        'quantity': ligne.quantite,
                        'custom_price': ligne.prix_unitaire,
                        'total': total_ligne
                    })
                    total_sous_partie += total_ligne

                if lignes_details_data:
                    # Trier les lignes de détail par ordre naturel
                    lignes_details_data.sort(key=lambda l: natural_sort_key(l['description']))
                    
                    # Récupérer les lignes spéciales pour cette sous-partie
                    special_lines_sous_partie = lignes_speciales.get('sousParties', {}).get(str(sous_partie.id), [])
                    # Récupérer les lignes display pour cette sous-partie
                    display_lines_sous_partie = lignes_display.get('sousParties', {}).get(str(sous_partie.id), [])
                    sous_partie_data = {
                        'description': sous_partie.description,
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
                        'special_lines': []
                    }

                    # Calculer et ajouter chaque ligne spéciale
                    for special_line in special_lines_sous_partie:
                        if special_line['valueType'] == 'percentage':
                            montant = (total_sous_partie * Decimal(str(special_line['value']))) / Decimal('100')
                        else:
                            montant = Decimal(str(special_line['value']))

                        if special_line['type'] == 'reduction':
                            total_sous_partie -= montant
                        else:
                            total_sous_partie += montant

                        sous_partie_data['special_lines'].append({
                            'description': special_line['description'],
                            'value': special_line['value'],
                            'valueType': special_line['valueType'],
                            'type': special_line['type'],
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False),
                            'style_attr': build_inline_style(special_line.get('styles'))
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line['description'],
                            'value': display_line['value'],
                            'valueType': display_line['valueType'],
                            'type': display_line['type'],
                            'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                            'isHighlighted': display_line.get('isHighlighted', False),
                            'style_attr': build_inline_style(display_line.get('styles'))
                        })

                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie

            if sous_parties_data:
                partie_data = {
                    'titre': partie.titre,
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
                    'special_lines': []
                }

                # Calculer et ajouter les lignes spéciales de la partie
                for special_line in special_lines_partie:
                    if special_line['valueType'] == 'percentage':
                        montant = (total_partie * Decimal(str(special_line['value']))) / Decimal('100')
                    else:
                        montant = Decimal(str(special_line['value']))

                    if special_line['type'] == 'reduction':
                        total_partie -= montant
                    else:
                        total_partie += montant

                    partie_data['special_lines'].append({
                        'description': special_line['description'],
                        'value': special_line['value'],
                        'valueType': special_line['valueType'],
                        'type': special_line['type'],
                        'montant': montant,
                        'isHighlighted': special_line.get('isHighlighted', False),
                        'style_attr': build_inline_style(special_line.get('styles'))
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line['description'],
                        'value': display_line['value'],
                        'valueType': display_line['valueType'],
                        'type': display_line['type'],
                        'montant': Decimal(str(display_line['value'])),  # Montant affiché directement
                        'isHighlighted': display_line.get('isHighlighted', False),
                        'style_attr': build_inline_style(display_line.get('styles'))
                    })

                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie

        # Appliquer les lignes spéciales globales
        special_lines_global = lignes_speciales.get('global', [])
        for special_line in special_lines_global:
            if special_line['valueType'] == 'percentage':
                montant = (total_ht * Decimal(str(special_line['value']))) / Decimal('100')
            else:
                montant = Decimal(str(special_line['value']))

            special_line['montant'] = montant
            special_line['style_attr'] = build_inline_style(special_line.get('styles'))

            if special_line['type'] == 'reduction':
                total_ht -= montant
            else:
                total_ht += montant
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        for display_line in display_lines_global:
            display_line['montant'] = Decimal(str(display_line['value']))  # Montant affiché directement
            display_line['style_attr'] = build_inline_style(display_line.get('styles'))
            special_lines_global.append(display_line)

        # Calculer TVA et TTC
        tva = total_ht * (Decimal(str(devis.tva_rate)) / Decimal('100'))
        montant_ttc = total_ht + tva

        context = {
            'devis': devis,
            'chantier': chantier,
            'societe': societe,
            'client': client,
            'parties': parties_data,
            'total_ht': total_ht,
            'tva': tva,
            'montant_ttc': montant_ttc,
            'special_lines_global': special_lines_global
        }

        return render(request, 'preview_devis.html', context)

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_saved_devis_v2(request, devis_id):
    """
    Version V2 de la prévisualisation des devis sauvegardés
    Utilise parties_metadata comme preview_devis_v2 pour un affichage cohérent
    """
    try:
        devis = get_object_or_404(Devis, id=devis_id)
        
        # Gérer les deux cas : devis normal (avec chantier) et devis de chantier (avec appel_offres)
        if devis.devis_chantier and devis.appel_offres:
            # Cas d'un devis de chantier (appel d'offres)
            chantier = devis.appel_offres
            # ✅ Toujours récupérer la société depuis le chantier/appel d'offres
            societe = devis.appel_offres.societe if devis.appel_offres else None
            # Priorité au client directement associé au devis, sinon utiliser celui de la société
            clients_devis = list(devis.client.all())
            if clients_devis:
                client = clients_devis[0]
            else:
                client = societe.client_name if societe else None
        else:
            # Cas d'un devis normal
            chantier = devis.chantier
            # ✅ Toujours récupérer la société depuis le chantier
            societe = chantier.societe if chantier else None
            # Priorité au client directement associé au devis, sinon utiliser celui de la société
            clients_devis = list(devis.client.all())
            if clients_devis:
                client = clients_devis[0]
            else:
                client = societe.client_name if societe else None

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

        # Récupérer parties_metadata pour construire la structure (comme preview_devis_v2)
        parties_metadata = devis.parties_metadata or {}
        selected_parties = parties_metadata.get('selectedParties', [])

        # Si parties_metadata est vide, utiliser l'ancienne méthode de récupération
        if not selected_parties:
            # Fallback : récupérer les parties depuis les lignes
            parties_to_process = list(Partie.objects.filter(id__in=[ligne.ligne_detail.sous_partie.partie.id for ligne in devis.lignes.all()]).distinct())
            # Convertir en format metadata pour compatibilité
            selected_parties = []
            for partie in parties_to_process:
                sous_parties_meta = []
                sous_parties = SousPartie.objects.filter(partie=partie, id__in=[ligne.ligne_detail.sous_partie.id for ligne in devis.lignes.all()]).distinct()
                for sp in sous_parties:
                    lignes_ids = [l.ligne_detail.id for l in devis.lignes.filter(ligne_detail__sous_partie=sp)]
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

        # Fonction de tri par index_global ou numéro de partie (si présent)
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
            partie_index_global = parse_index(partie_meta.get('index_global'))

            # Récupérer les lignes spéciales pour cette partie
            special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie_meta['id']), [])
            display_lines_partie = lignes_display.get('parties', {}).get(str(partie_meta['id']), [])

            # Trier les sous-parties par index_global si présent, sinon par numéro
            sous_parties_meta = sorted(partie_meta.get('sousParties', []), key=lambda sp: float(sp.get('index_global', 999)) if 'index_global' in sp else (int(sp.get('numero', '999').split('.')[-1]) if sp.get('numero') and '.' in str(sp.get('numero')) else 999))

            # Traiter les sous-parties de cette partie
            for sous_partie_meta in sous_parties_meta:
                lignes_details_data = []
                total_sous_partie = Decimal('0')

                # Récupérer les lignes de détail pour cette sous-partie
                ligne_detail_ids = sous_partie_meta.get('lignesDetails', [])
                
                # Extraire les lignes correspondantes depuis les DevisLigne
                lignes_filtered = []
                for ligne_detail_id in ligne_detail_ids:
                    if ligne_detail_id in lignes_by_detail:
                        lignes_filtered.extend(lignes_by_detail[ligne_detail_id])
                
                # Trier par index_global si présent
                lignes_filtered.sort(key=lambda l: float(l.index_global) if l.index_global else 999)
                
                for ligne in lignes_filtered:
                    try:
                        total_ligne = Decimal(str(ligne.quantite)) * Decimal(str(ligne.prix_unitaire))
                        lignes_details_data.append({
                            'description': ligne.ligne_detail.description,
                            'unite': ligne.ligne_detail.unite,
                            'quantity': ligne.quantite,
                            'custom_price': ligne.prix_unitaire,
                            'total': total_ligne
                        })
                        total_sous_partie += total_ligne
                    except Exception:
                        pass

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
                        'numero': sous_partie_meta.get('numero'),  # ✅ Inclure le numéro
                        'lignes_details': lignes_details_data,
                        'total_sous_partie': total_sous_partie,
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
                        # 'display' n'affecte pas le total

                        sous_partie_data['special_lines'].append({
                            'description': special_line.get('description', ''),
                            'value': special_line.get('value', 0) or special_line.get('amount', 0),
                            'valueType': value_type,
                            'type': line_type,
                            'montant': montant,
                            'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(special_line.get('styles'))
                        })
                    
                    # Ajouter les lignes display de la sous-partie
                    for display_line in display_lines_sous_partie:
                        sous_partie_data['special_lines'].append({
                            'description': display_line.get('description', ''),
                            'value': display_line.get('value', 0) or display_line.get('amount', 0),
                            'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                            'type': display_line.get('type', 'display'),
                            'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                            'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(display_line.get('styles'))
                        })

                    sous_partie_data['total_sous_partie'] = total_sous_partie
                    sous_parties_data.append(sous_partie_data)
                    total_partie += total_sous_partie

            if sous_parties_data:
                # Trier les lignes spéciales de la partie par index_global
                def sort_special_lines_partie(lines):
                    return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                
                special_lines_partie = sort_special_lines_partie(special_lines_partie)
                display_lines_partie = sort_special_lines_partie(display_lines_partie)
                
                partie_data = {
                    'titre': partie_meta.get('titre', ''),
                    'numero': partie_meta.get('numero'),  # ✅ Inclure le numéro
                    'sous_parties': sous_parties_data,
                    'total_partie': total_partie,
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
                        'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                        'style_attr': build_inline_style(special_line.get('styles'))
                    })
                
                # Ajouter les lignes display de la partie
                for display_line in display_lines_partie:
                    partie_data['special_lines'].append({
                        'description': display_line.get('description', ''),
                        'value': display_line.get('value', 0) or display_line.get('amount', 0),
                        'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                        'type': display_line.get('type', 'display'),
                        'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                        'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                        'style_attr': build_inline_style(display_line.get('styles'))
                    })

                partie_data['total_partie'] = total_partie
                parties_data.append(partie_data)
                total_ht += total_partie

        # Appliquer les lignes spéciales globales (triées par index_global)
        special_lines_global = lignes_speciales.get('global', [])
        special_lines_global = sorted(special_lines_global, key=lambda l: parse_index(l.get('index_global')))
        
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
                'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                'style_attr': build_inline_style(special_line.get('styles'))
            })
        
        # Ajouter les lignes display globales
        display_lines_global = lignes_display.get('global', [])
        display_lines_global = sorted(display_lines_global, key=lambda l: parse_index(l.get('index_global')))
        
        for display_line in display_lines_global:
            special_lines_global_formatted.append({
                'description': display_line.get('description', ''),
                'value': display_line.get('value', 0) or display_line.get('amount', 0),
                'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                'type': display_line.get('type', 'display'),
                'montant': float(Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0)))),
                'index_global': parse_index(display_line.get('index_global')),
                'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                'style_attr': build_inline_style(display_line.get('styles'))
            })
        
        special_lines_global = special_lines_global_formatted

        # ✅ Fusionner parties et lignes spéciales globales par index_global
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

        # Calculer TVA et TTC
        tva = total_ht * (Decimal(str(devis.tva_rate)) / Decimal('100'))
        montant_ttc = total_ht + tva

        context = {
            'devis': devis,
            'chantier': chantier,
            'societe': societe,
            'client': client,
            'parties': parties_data,
            'total_ht': total_ht,
            'tva': tva,
            'montant_ttc': montant_ttc,
            'special_lines_global': special_lines_global,
            'global_items': global_items
        }

        return render(request, 'preview_devis_v2.html', context)

    except Exception as e:
        import traceback
        return JsonResponse({'error': f'{str(e)}\n{traceback.format_exc()}'}, status=400)


@api_view(['GET'])
@permission_classes([AllowAny])
def preview_devis_v2(request):
    """
    Version V2 de la prévisualisation temporaire des devis - Basée sur les données du frontend
    Permet de prévisualiser un devis sans l'avoir sauvegardé en base de données
    """
    devis_data_encoded = request.GET.get('devis')

    if devis_data_encoded:
        try:
            # Décoder les données du devis depuis l'URL (Django décode déjà, mais on peut avoir besoin de unquote pour les caractères spéciaux)
            try:
                devis_data = json.loads(devis_data_encoded)
            except json.JSONDecodeError:
                # Si échec, essayer avec unquote
                devis_data = json.loads(urllib.parse.unquote(devis_data_encoded))
            
            chantier_id = devis_data.get('chantier') or devis_data.get('chantier_id')

            if chantier_id == -1 or not chantier_id:
                # Utiliser les données temporaires
                temp_data = devis_data.get('tempData', {})
                chantier = temp_data.get('chantier', {})
                client = temp_data.get('client', {})
                societe = temp_data.get('societe', {})

                # S'assurer que tous les champs ont une valeur par défaut
                for field in ['name', 'surname', 'phone_Number', 'client_mail', 'civilite', 'poste']:
                    if not client.get(field):
                        client[field] = ''

                for field in ['nom_societe', 'ville_societe', 'rue_societe', 'codepostal_societe']:
                    if not societe.get(field):
                        societe[field] = ''
                    
                for field in ['chantier_name', 'ville', 'rue', 'code_postal']:
                    if not chantier.get(field):
                        chantier[field] = ''
            else:
                # Utiliser les données existantes
                chantier = get_object_or_404(Chantier, id=chantier_id)
                societe = chantier.societe
                client = societe.client_name if societe else None

            # Utiliser les données du frontend (parties_metadata, lignes, etc.)
            total_ht = Decimal('0')
            parties_data = []

            def parse_index(value, default=Decimal('999')):
                try:
                    return float(value)
                except (TypeError, ValueError):
                    return float(default)

            # Récupérer les lignes spéciales du devis
            lignes_speciales = devis_data.get('lignes_speciales', {})
            lignes_display = devis_data.get('lignes_display', {})

            # Récupérer parties_metadata pour construire la structure
            parties_metadata = devis_data.get('parties_metadata', {})
            selected_parties = parties_metadata.get('selectedParties', [])

            # Fonction de tri par index_global ou numéro de partie (si présent)
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

            # Construire la structure des parties depuis parties_metadata
            for partie_meta in selected_parties:
                sous_parties_data = []
                total_partie = Decimal('0')
                partie_index_global = parse_index(partie_meta.get('index_global'))

                # Récupérer les lignes spéciales pour cette partie
                special_lines_partie = lignes_speciales.get('parties', {}).get(str(partie_meta['id']), [])
                display_lines_partie = lignes_display.get('parties', {}).get(str(partie_meta['id']), [])

                # Trier les sous-parties par index_global si présent, sinon par numéro
                sous_parties_meta = sorted(partie_meta.get('sousParties', []), key=lambda sp: float(sp.get('index_global', 999)) if 'index_global' in sp else (int(sp.get('numero', '999').split('.')[-1]) if sp.get('numero') and '.' in str(sp.get('numero')) else 999))

                # Traiter les sous-parties de cette partie
                for sous_partie_meta in sous_parties_meta:
                    lignes_details_data = []
                    total_sous_partie = Decimal('0')

                    # Récupérer les lignes de détail pour cette sous-partie
                    ligne_detail_ids = sous_partie_meta.get('lignesDetails', [])
                    
                    # Extraire les lignes correspondantes depuis les données du frontend
                    # Trier les lignes par index_global si présent
                    lignes_filtered = []
                    for ligne_data in devis_data.get('lignes', []):
                        if ligne_data.get('ligne') in ligne_detail_ids:
                            lignes_filtered.append(ligne_data)
                    
                    # Trier par index_global si présent
                    lignes_filtered.sort(key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                    
                    for ligne_data in lignes_filtered:
                        # Récupérer les détails de la ligne_detail depuis la base
                        try:
                            from .models import LigneDetail
                            ligne_detail = LigneDetail.objects.get(id=ligne_data['ligne'])
                            quantity = Decimal(str(ligne_data.get('quantity', 0)))
                            custom_price = Decimal(str(ligne_data.get('custom_price', 0)))
                            total_ligne = quantity * custom_price
                            
                            lignes_details_data.append({
                                'description': ligne_detail.description,
                                'unite': ligne_detail.unite,
                                'quantity': quantity,
                                'custom_price': custom_price,
                                'total': total_ligne
                            })
                            total_sous_partie += total_ligne
                        except Exception:
                            pass

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
                            'numero': sous_partie_meta.get('numero'),  # ✅ Inclure le numéro
                            'lignes_details': lignes_details_data,
                            'total_sous_partie': total_sous_partie,
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
                            # 'display' n'affecte pas le total

                            sous_partie_data['special_lines'].append({
                                'description': special_line.get('description', ''),
                                'value': special_line.get('value', 0) or special_line.get('amount', 0),
                                'valueType': value_type,
                                'type': line_type,
                                'montant': montant,
                                'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                                'style_attr': build_inline_style(special_line.get('styles'))
                            })
                        
                        # Ajouter les lignes display de la sous-partie
                        for display_line in display_lines_sous_partie:
                            sous_partie_data['special_lines'].append({
                                'description': display_line.get('description', ''),
                                'value': display_line.get('value', 0) or display_line.get('amount', 0),
                                'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                                'type': display_line.get('type', 'display'),
                                'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                                'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                                'style_attr': build_inline_style(display_line.get('styles'))
                            })

                        sous_partie_data['total_sous_partie'] = total_sous_partie
                        sous_parties_data.append(sous_partie_data)
                        total_partie += total_sous_partie

                if sous_parties_data:
                    # Trier les lignes spéciales de la partie par index_global
                    def sort_special_lines_partie(lines):
                        return sorted(lines, key=lambda l: float(l.get('index_global', 999)) if 'index_global' in l else 999)
                    
                    special_lines_partie = sort_special_lines_partie(special_lines_partie)
                    display_lines_partie = sort_special_lines_partie(display_lines_partie)
                    
                    partie_data = {
                        'titre': partie_meta.get('titre', ''),
                        'numero': partie_meta.get('numero'),  # ✅ Inclure le numéro
                        'sous_parties': sous_parties_data,
                        'total_partie': total_partie,
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
                            'isHighlighted': special_line.get('isHighlighted', False) or (special_line.get('styles', {}).get('backgroundColor') == '#ffff00' or special_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(special_line.get('styles'))
                        })
                    
                    # Ajouter les lignes display de la partie
                    for display_line in display_lines_partie:
                        partie_data['special_lines'].append({
                            'description': display_line.get('description', ''),
                            'value': display_line.get('value', 0) or display_line.get('amount', 0),
                            'valueType': display_line.get('value_type') or display_line.get('valueType', 'fixed'),
                            'type': display_line.get('type', 'display'),
                            'montant': Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))),
                            'isHighlighted': display_line.get('isHighlighted', False) or (display_line.get('styles', {}).get('backgroundColor') == '#ffff00' or display_line.get('styles', {}).get('backgroundColor') == '#fbff24'),
                            'style_attr': build_inline_style(display_line.get('styles'))
                        })

                    partie_data['total_partie'] = total_partie
                    parties_data.append(partie_data)
                    total_ht += total_partie

            # Appliquer les lignes spéciales globales (triées par index_global)
            special_lines_global = lignes_speciales.get('global', [])
            special_lines_global = sorted(special_lines_global, key=lambda l: parse_index(l.get('index_global')))
            
            for special_line in special_lines_global:
                value_type = special_line.get('value_type') or special_line.get('valueType', 'fixed')
                if value_type == 'percentage':
                    montant = (total_ht * Decimal(str(special_line.get('value', 0)))) / Decimal('100')
                else:
                    montant = Decimal(str(special_line.get('value', 0) or special_line.get('amount', 0)))

                special_line['montant'] = float(montant)
                special_line['style_attr'] = build_inline_style(special_line.get('styles'))
                special_line['index_global'] = parse_index(special_line.get('index_global'))

                line_type = special_line.get('type', 'display')
                if line_type == 'reduction':
                    total_ht -= montant
                elif line_type == 'addition':
                    total_ht += montant
            
            # Ajouter les lignes display globales
            display_lines_global = lignes_display.get('global', [])
            display_lines_global = sorted(display_lines_global, key=lambda l: parse_index(l.get('index_global')))
            
            for display_line in display_lines_global:
                display_line['montant'] = float(Decimal(str(display_line.get('value', 0) or display_line.get('amount', 0))))
                display_line['style_attr'] = build_inline_style(display_line.get('styles'))
                display_line['index_global'] = parse_index(display_line.get('index_global'))
                special_lines_global.append(display_line)

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

            # Calculer TVA et TTC
            tva_rate = Decimal(str(devis_data.get('tva_rate', 20)))
            tva = total_ht * (tva_rate / Decimal('100'))
            montant_ttc = total_ht + tva

            # Créer un objet devis temporaire pour le template
            class TempDevis:
                def __init__(self, data):
                    self.numero = data.get('numero', '')
                    self.date_creation = data.get('date_creation')
                    self.nature_travaux = data.get('nature_travaux', '')
                    self.tva_rate = float(tva_rate)

            temp_devis = TempDevis(devis_data)

            context = {
                'devis': temp_devis,
                'chantier': chantier,
                'societe': societe,
                'client': client,
                'parties': parties_data,
                'total_ht': total_ht,
                'tva': tva,
                'montant_ttc': montant_ttc,
                'special_lines_global': special_lines_global,
                'global_items': global_items
            }

            return render(request, 'preview_devis_v2.html', context)

        except json.JSONDecodeError as e:
            return JsonResponse({'error': f'Erreur de décodage JSON: {str(e)}'}, status=400)
        except Exception as e:
            import traceback
            return JsonResponse({'error': f'{str(e)}\n{traceback.format_exc()}'}, status=400)
    else:
        return JsonResponse({'error': 'Aucune donnée de devis trouvée'}, status=400)

