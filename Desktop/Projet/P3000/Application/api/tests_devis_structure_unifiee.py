"""
Tests du système unifié (copie isolée Partie/SousPartie/LigneDetail).
"""
from decimal import Decimal

from django.test import TestCase

from api.devis_structure_unifiee import (
    apply_unified_on_create,
    devis_has_structure_isolee,
    materialize_unified_structure,
)
from api.models import (
    Chantier,
    Client,
    Devis,
    DevisLigne,
    LigneDetail,
    Partie,
    Societe,
    SousPartie,
)


class StructureIsoleeTests(TestCase):
    def setUp(self):
        self.client_obj = Client.objects.create(
            name="Dupont",
            surname="Jean",
            phone_Number=600000000,
            client_mail="j@test.com",
        )
        self.societe = Societe.objects.create(
            nom_societe="Soc Test",
            ville_societe="Paris",
            rue_societe="1 rue Test",
            codepostal_societe="75001",
            client_name=self.client_obj,
        )
        self.chantier = Chantier.objects.create(
            chantier_name="Chantier Test Unifie",
            societe=self.societe,
            ville="Paris",
            rue="1 rue Chantier",
            code_postal="75001",
            montant_ht=0,
            montant_ttc=0,
        )
        self.partie = Partie.objects.create(titre="1-Peinture", type="PEINTURE")
        self.sous_partie = SousPartie.objects.create(
            partie=self.partie, description="Murs"
        )
        self.ligne = LigneDetail.objects.create(
            sous_partie=self.sous_partie,
            partie=self.partie,
            description="Enduit",
            unite="m2",
            cout_main_oeuvre=Decimal("10.00"),
            cout_materiel=Decimal("5.00"),
            taux_fixe=Decimal("20"),
            marge=Decimal("10"),
            prix=Decimal("19.80"),
        )

    def _make_devis(self, **kwargs):
        defaults = dict(
            numero="DEV-TEST-UNI-001",
            price_ht=100,
            price_ttc=120,
            tva_rate=20,
            chantier=self.chantier,
            structure_isolee=False,
        )
        defaults.update(kwargs)
        return Devis.objects.create(**defaults)

    def test_unified_create_clones_and_isolates(self):
        devis = self._make_devis(numero="DEV-TEST-UNI-002")
        payload = {
            "lignes": [
                {
                    "ligne_detail": self.ligne.id,
                    "quantite": "2",
                    "prix_unitaire": "25.00",
                    "index_global": 1.101,
                }
            ],
            "parties_metadata": {
                "selectedParties": [
                    {
                        "id": self.partie.id,
                        "titre": self.partie.titre,
                        "type": self.partie.type,
                        "index_global": 1,
                        "numero": 1,
                        "sousParties": [
                            {
                                "id": self.sous_partie.id,
                                "description": self.sous_partie.description,
                                "index_global": 1.1,
                                "numero": "1.1",
                                "lignesDetails": [self.ligne.id],
                            }
                        ],
                    }
                ]
            },
            "lignes_speciales": {"global": [], "parties": {}, "sousParties": {}},
            "lignes_display": {"global": [], "parties": {}, "sousParties": {}},
        }

        info = apply_unified_on_create(devis, payload)
        devis.refresh_from_db()

        self.assertTrue(info["structure_isolee"])
        self.assertTrue(devis.structure_isolee)
        self.assertTrue(devis_has_structure_isolee(devis))

        dl = DevisLigne.objects.get(devis=devis)
        self.assertNotEqual(dl.ligne_detail_id, self.ligne.id)
        self.assertEqual(dl.ligne_detail.devis_id, devis.id)
        self.assertEqual(dl.ligne_detail.description, "Enduit")
        self.assertEqual(dl.quantite, Decimal("2.00"))
        self.assertEqual(dl.prix_unitaire, Decimal("25.00"))

        # Catalogue inchangé
        self.ligne.refresh_from_db()
        self.assertIsNone(self.ligne.devis_id)
        self.assertEqual(self.ligne.description, "Enduit")

        # Isolation : modifier le catalogue ne change pas la copie
        self.ligne.description = "Enduit MODIFIE CATALOGUE"
        self.ligne.save(update_fields=["description"])
        dl.ligne_detail.refresh_from_db()
        self.assertEqual(dl.ligne_detail.description, "Enduit")

        # Metadata pointe vers les copies
        meta_partie_id = devis.parties_metadata["selectedParties"][0]["id"]
        self.assertNotEqual(meta_partie_id, self.partie.id)
        self.assertTrue(Partie.objects.filter(id=meta_partie_id, devis=devis).exists())

    def test_legacy_devis_still_shares_catalogue(self):
        devis = self._make_devis(numero="DEV-TEST-LEG-001", structure_isolee=False)
        DevisLigne.objects.create(
            devis=devis,
            ligne_detail=self.ligne,
            quantite=Decimal("1"),
            prix_unitaire=Decimal("19.80"),
        )
        self.assertFalse(devis_has_structure_isolee(devis))
        self.ligne.description = "Change legacy"
        self.ligne.save(update_fields=["description"])
        dl = DevisLigne.objects.get(devis=devis)
        self.assertEqual(dl.ligne_detail.description, "Change legacy")

    def test_catalogue_unique_allows_clone_duplicate(self):
        devis = self._make_devis(numero="DEV-TEST-UNI-003")
        materialize_unified_structure(
            devis,
            [
                {
                    "ligne_detail": self.ligne.id,
                    "quantite": "1",
                    "prix_unitaire": "10",
                }
            ],
            parties_metadata={
                "selectedParties": [
                    {
                        "id": self.partie.id,
                        "titre": self.partie.titre,
                        "type": self.partie.type,
                        "index_global": 1,
                        "numero": 1,
                        "sousParties": [
                            {
                                "id": self.sous_partie.id,
                                "description": self.sous_partie.description,
                                "index_global": 1.1,
                                "lignesDetails": [self.ligne.id],
                            }
                        ],
                    }
                ]
            },
        )
        # Deuxième devis peut cloner la même ligne catalogue
        devis2 = self._make_devis(numero="DEV-TEST-UNI-004")
        materialize_unified_structure(
            devis2,
            [
                {
                    "ligne_detail": self.ligne.id,
                    "quantite": "3",
                    "prix_unitaire": "11",
                }
            ],
            parties_metadata={
                "selectedParties": [
                    {
                        "id": self.partie.id,
                        "titre": self.partie.titre,
                        "type": self.partie.type,
                        "index_global": 1,
                        "numero": 1,
                        "sousParties": [
                            {
                                "id": self.sous_partie.id,
                                "description": self.sous_partie.description,
                                "index_global": 1.1,
                                "lignesDetails": [self.ligne.id],
                            }
                        ],
                    }
                ]
            },
        )
        self.assertEqual(LigneDetail.objects.filter(devis=devis).count(), 1)
        self.assertEqual(LigneDetail.objects.filter(devis=devis2).count(), 1)
        self.assertEqual(LigneDetail.objects.filter(devis__isnull=True).count(), 1)

    def test_unified_update_applies_ligne_overrides_without_touching_catalogue(self):
        devis = self._make_devis(numero="DEV-TEST-UNI-005")
        apply_unified_on_create(
            devis,
            {
                "lignes": [
                    {
                        "ligne_detail": self.ligne.id,
                        "quantite": "1",
                        "prix_unitaire": "20",
                        "index_global": 1.101,
                    }
                ],
                "parties_metadata": {
                    "selectedParties": [
                        {
                            "id": self.partie.id,
                            "titre": self.partie.titre,
                            "type": self.partie.type,
                            "index_global": 1,
                            "numero": 1,
                            "sousParties": [
                                {
                                    "id": self.sous_partie.id,
                                    "description": self.sous_partie.description,
                                    "index_global": 1.1,
                                    "lignesDetails": [self.ligne.id],
                                }
                            ],
                        }
                    ]
                },
            },
        )
        devis.refresh_from_db()
        clone_id = DevisLigne.objects.get(devis=devis).ligne_detail_id
        meta = devis.parties_metadata

        from api.devis_structure_unifiee import apply_unified_on_update

        apply_unified_on_update(
            devis,
            validated_lignes=[
                {
                    "ligne_detail": clone_id,
                    "quantite": "2",
                    "prix_unitaire": "30",
                    "index_global": 1.101,
                    "description": "Enduit modifié devis",
                    "unite": "m2",
                    "cout_main_oeuvre": "12",
                    "cout_materiel": "6",
                }
            ],
            parties_metadata={
                "selectedParties": [
                    {
                        **meta["selectedParties"][0],
                        "titre": "Partie modifiée devis",
                        "sousParties": [
                            {
                                **meta["selectedParties"][0]["sousParties"][0],
                                "description": "Sous-partie modifiée",
                                "lignesDetails": [clone_id],
                            }
                        ],
                    }
                ]
            },
            lignes_speciales=devis.lignes_speciales,
            lignes_display=devis.lignes_display,
        )
        devis.refresh_from_db()
        new_clone = DevisLigne.objects.get(devis=devis).ligne_detail
        self.assertEqual(new_clone.description, "Enduit modifié devis")
        self.assertEqual(new_clone.cout_main_oeuvre, Decimal("12.00"))
        self.assertEqual(devis.parties_metadata["selectedParties"][0]["titre"], "Partie modifiée devis")

        self.ligne.refresh_from_db()
        self.assertEqual(self.ligne.description, "Enduit")
        self.assertEqual(self.ligne.cout_main_oeuvre, Decimal("10.00"))

    def test_guard_blocks_catalogue_patch_in_isolee_mode(self):
        from types import SimpleNamespace
        from api.devis_structure_unifiee import guard_catalogue_mutation

        request = SimpleNamespace(
            headers={"X-Devis-Edit-Mode": "isolee"},
            query_params={},
        )
        blocked = guard_catalogue_mutation(self.ligne, request)
        self.assertIsNotNone(blocked)
        self.assertEqual(blocked.status_code, 403)

        clone = LigneDetail.objects.create(
            sous_partie=self.sous_partie,
            partie=self.partie,
            description="Clone",
            unite="m2",
            cout_main_oeuvre=Decimal("1"),
            cout_materiel=Decimal("1"),
            taux_fixe=Decimal("20"),
            marge=Decimal("10"),
            prix=Decimal("2"),
            devis=self._make_devis(numero="DEV-TEST-UNI-006"),
            index_global=1,
        )
        self.assertIsNone(guard_catalogue_mutation(clone, request))
