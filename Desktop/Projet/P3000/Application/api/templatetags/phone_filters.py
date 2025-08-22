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
