from django.db import models


class DocumentNumeroCompteur(models.Model):
    """Compteur annuel des numéros de devis et de facture.

    Une ligne par série et par année. L'incrément se fait sous
    ``select_for_update`` pour qu'une création concurrente ne relise pas
    le même maximum.
    """

    SERIE_DEVIS = 'devis'
    SERIE_FACTURE = 'facture'

    serie = models.CharField(max_length=20)
    annee = models.PositiveIntegerField()
    dernier_numero = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Compteur de numéro de document"
        verbose_name_plural = "Compteurs de numéros de document"
        constraints = [
            models.UniqueConstraint(
                fields=['serie', 'annee'],
                name='uniq_document_numero_compteur_serie_annee',
            ),
        ]

    def __str__(self):
        return f"{self.serie} {self.annee} → {self.dernier_numero}"
