from django import template
import re

register = template.Library()

@register.filter
def format_phone(phone_number):
    """
    Formate un numéro de téléphone au format français : 06.56.77.32.27
    
    Exemples:
    - 656773227 → 06.56.77.32.27
    - 0656773227 → 06.56.77.32.27  
    - 33656773227 → 06.56.77.32.27
    """
    if not phone_number:
        return ""
    
    # Convertir en string et supprimer tous les espaces/caractères non numériques
    phone_str = str(phone_number).strip()
    phone_digits = re.sub(r'[^\d]', '', phone_str)
    
    # Gérer les différents formats d'entrée
    if len(phone_digits) == 9:
        # Format: 656773227 → ajouter le 0
        phone_digits = "0" + phone_digits
    elif len(phone_digits) == 11 and phone_digits.startswith('33'):
        # Format: 33656773227 → remplacer 33 par 0
        phone_digits = "0" + phone_digits[2:]
    elif len(phone_digits) == 10 and phone_digits.startswith('0'):
        # Format: 0656773227 → déjà correct
        pass
    else:
        # Format non reconnu, retourner tel quel
        return phone_str
    
    # Vérifier qu'on a bien 10 chiffres
    if len(phone_digits) != 10:
        return phone_str
    
    # Formater avec des points : 06.56.77.32.27
    formatted = f"{phone_digits[0:2]}.{phone_digits[2:4]}.{phone_digits[4:6]}.{phone_digits[6:8]}.{phone_digits[8:10]}"
    
    return formatted

@register.filter
def format_phone_simple(phone_number):
    """
    Formate un numéro de téléphone au format simple : 0613263434
    
    Exemples:
    - 656773227 → 0656773227
    - 0656773227 → 0656773227  
    - 33656773227 → 0656773227
    """
    if not phone_number:
        return ""
    
    # Convertir en string et supprimer tous les espaces/caractères non numériques
    phone_str = str(phone_number).strip()
    phone_digits = re.sub(r'[^\d]', '', phone_str)
    
    # Gérer les différents formats d'entrée
    if len(phone_digits) == 9:
        # Format: 656773227 → ajouter le 0
        phone_digits = "0" + phone_digits
    elif len(phone_digits) == 11 and phone_digits.startswith('33'):
        # Format: 33656773227 → remplacer 33 par 0
        phone_digits = "0" + phone_digits[2:]
    elif len(phone_digits) == 10 and phone_digits.startswith('0'):
        # Format: 0656773227 → déjà correct
        pass
    else:
        # Format non reconnu, retourner tel quel
        return phone_str
    
    # Vérifier qu'on a bien 10 chiffres
    if len(phone_digits) != 10:
        return phone_str
    
    return phone_digits

@register.filter
def format_montant_espace(montant):
    """
    Formate un montant en séparant les centimes par une virgule et ajoutant des espaces pour les milliers : 1 234,56 €
    
    Exemples:
    - 1234.56 → 1 234,56 €
    - 1234.5 → 1 234,50 €
    - 1234 → 1 234,00 €
    - 1234567.89 → 1 234 567,89 €
    """
    if montant is None:
        return "0,00 €"
    
    # Convertir en float puis en string avec 2 décimales
    try:
        montant_float = float(montant)
        montant_str = f"{montant_float:.2f}"
        
        # Séparer la partie entière et les décimales
        parts = montant_str.split('.')
        partie_entiere = parts[0]
        decimales = parts[1]
        
        # Ajouter des espaces pour les milliers dans la partie entière
        partie_entiere_formatee = ""
        for i, digit in enumerate(reversed(partie_entiere)):
            if i > 0 and i % 3 == 0:
                partie_entiere_formatee = " " + partie_entiere_formatee
            partie_entiere_formatee = digit + partie_entiere_formatee
        
        # Assembler le montant final avec virgule
        montant_formatted = f"{partie_entiere_formatee},{decimales}"
        
        return f"{montant_formatted} €"
    except (ValueError, TypeError):
        return "0,00 €"

@register.filter
def format_taux_propre(taux):
    """
    Formate un taux en enlevant les décimales inutiles
    
    Exemples:
    - 5.00 → 5
    - 3.50 → 3.5
    - 0.00 → 0
    - 2.75 → 2.75
    """
    if taux is None:
        return "0"
    
    try:
        taux_float = float(taux)
        # Si le nombre est entier, afficher sans décimales
        if taux_float == int(taux_float):
            return str(int(taux_float))
        # Sinon, formater avec décimales mais enlever les zéros inutiles
        return str(taux_float).rstrip('0').rstrip('.')
    except (ValueError, TypeError):
        return str(taux)