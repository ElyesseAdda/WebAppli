# from .models import Schedule, LaborCost, Agent, Chantier

# def recalculate_labor_costs_for_period(week=None, year=None, agent_id=None, chantier_id=None):
#     schedules = Schedule.objects.all()
#     if week:
#         schedules = schedules.filter(week=week)
#     if year:
#         schedules = schedules.filter(year=year)
#     if agent_id:
#         schedules = schedules.filter(agent_id=agent_id)
#     if chantier_id:
#         schedules = schedules.filter(chantier_id=chantier_id)

#     data = {}
#     for s in schedules:
#         key = (s.agent_id, s.chantier_id, s.week, s.year)
#         data.setdefault(key, 0)
#         data[key] += 1

#     for (agent_id, chantier_id, week, year), hours in data.items():
#         agent = Agent.objects.get(id=agent_id)
#         chantier = Chantier.objects.get(id=chantier_id)
#         cost = hours * (agent.taux_Horaire or 0)
#         LaborCost.objects.update_or_create(
#             agent=agent, chantier=chantier, week=week, year=year,
#             defaults={'hours': hours, 'cost': cost}
#         )

from django.utils.text import slugify
from pathlib import Path
import os


def build_document_key(societe, chantier, category, filename):
    """
    Génère une clé S3 pour un document selon l'arborescence:
    companies/{societe_id}_{societe_slug}/chantiers/{chantier_id}_{chantier_slug}/{category}/{filename}
    
    Args:
        societe: instance du modèle Societe
        chantier: instance du modèle Chantier
        category: catégorie du document (devis, factures, etc.)
        filename: nom original du fichier
    
    Returns:
        str: clé S3 complète
    """
    # Nettoyer et slugifier les noms
    societe_part = f"{societe.id}_{slugify(societe.nom_societe)}" if societe else "sans_societe"
    chantier_part = f"{chantier.id}_{slugify(chantier.chantier_name)}" if chantier else "sans_chantier"
    category_part = slugify(category)
    
    # Nettoyer le nom de fichier
    name = Path(filename)
    safe_filename = f"{slugify(name.stem)}{name.suffix.lower()}"
    
    # Construire le chemin
    if societe and chantier:
        return f"companies/{societe_part}/chantiers/{chantier_part}/{category_part}/{safe_filename}"
    elif societe:
        return f"companies/{societe_part}/{category_part}/{safe_filename}"
    else:
        return f"documents/{category_part}/{safe_filename}"


def get_s3_client():
    """
    Retourne un client S3 configuré
    """
    import boto3
    from django.conf import settings
    
    return boto3.client(
        's3',
        aws_access_key_id=os.getenv('S3_ACCESS_KEY'),
        aws_secret_access_key=os.getenv('S3_SECRET_KEY'),
        region_name=os.getenv('S3_REGION', 'eu-west-3'),
        endpoint_url=os.getenv('S3_ENDPOINT_URL'),  # Pour MinIO si utilisé
    )


def generate_presigned_url(operation, key, expires_in=3600):
    """
    Génère une URL présignée pour S3
    
    Args:
        operation: 'get_object' ou 'put_object'
        key: clé S3
        expires_in: durée de validité en secondes
    
    Returns:
        str: URL présignée
    """
    s3_client = get_s3_client()
    
    return s3_client.generate_presigned_url(
        operation,
        Params={
            'Bucket': os.getenv('S3_BUCKET_NAME'),
            'Key': key
        },
        ExpiresIn=expires_in
    )


def generate_presigned_post(key, fields=None, conditions=None, expires_in=3600):
    """
    Génère une URL présignée POST pour upload direct
    
    Args:
        key: clé S3
        fields: champs additionnels
        conditions: conditions de validation
        expires_in: durée de validité en secondes
    
    Returns:
        dict: réponse avec URL et champs
    """
    s3_client = get_s3_client()
    
    if fields is None:
        fields = {'acl': 'private'}
    
    if conditions is None:
        conditions = [
            {'acl': 'private'},
            ['content-length-range', 0, 100 * 1024 * 1024],  # 100 MB max
        ]
    
    return s3_client.generate_presigned_post(
        Bucket=os.getenv('S3_BUCKET_NAME'),
        Key=key,
        Fields=fields,
        Conditions=conditions,
        ExpiresIn=expires_in
    )
