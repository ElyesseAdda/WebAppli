/**
 * Script de test pour le système universel de génération PDF Drive
 * Ce fichier peut être supprimé après les tests
 */

import {
  generatePDFDrive,
  getSupportedDocumentTypes,
  isDocumentTypeSupported,
} from "./universalDriveGenerator";

// Fonction de test pour les devis de chantier
export const testDevisChantier = async () => {
  console.log("🧪 Test du système universel pour les devis de chantier");

  // Données de test (remplacez par de vraies données)
  const testData = {
    devisId: 15, // Remplacez par un ID de devis existant
    appelOffresId: 19, // Remplacez par un ID d'appel d'offres existant
    appelOffresName: "Test Url", // Remplacez par un nom d'appel d'offres existant
    societeName: "IMMOBILIERE DE LANFANT", // Remplacez par un nom de société existant
    numero: "DEV-015-25 - Test Url", // Remplacez par un numéro de devis existant
  };

  try {
    console.log("📋 Données de test:", testData);

    // Test 1: Génération normale (peut détecter un conflit)
    console.log("🚀 Test 1: Génération normale");
    await generatePDFDrive("devis_chantier", testData, {
      onSuccess: (response) => {
        console.log("✅ Test 1 réussi:", response);
      },
      onError: (error) => {
        console.log("❌ Test 1 échoué:", error);
      },
    });

    // Attendre 2 secondes
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Test 2: Génération avec remplacement forcé
    console.log("🚀 Test 2: Génération avec remplacement forcé");
    await generatePDFDrive(
      "devis_chantier",
      testData,
      {
        onSuccess: (response) => {
          console.log("✅ Test 2 réussi:", response);
        },
        onError: (error) => {
          console.log("❌ Test 2 échoué:", error);
        },
      },
      true
    ); // forceReplace = true
  } catch (error) {
    console.error("❌ Erreur lors des tests:", error);
  }
};

// Fonction de test pour vérifier les types supportés
export const testSupportedTypes = () => {
  console.log("🧪 Test des types de documents supportés");

  const supportedTypes = getSupportedDocumentTypes();
  console.log("📋 Types supportés:", supportedTypes);

  // Test de validation
  console.log("🔍 Test de validation:");
  console.log(
    "- devis_chantier supporté:",
    isDocumentTypeSupported("devis_chantier")
  );
  console.log("- facture supporté:", isDocumentTypeSupported("facture"));
  console.log(
    "- type_inexistant supporté:",
    isDocumentTypeSupported("type_inexistant")
  );
};

// Fonction de test pour les données manquantes
export const testMissingData = async () => {
  console.log("🧪 Test avec des données manquantes");

  const incompleteData = {
    devisId: 15,
    // appelOffresId manquant
    appelOffresName: "Test Url",
    societeName: "IMMOBILIERE DE LANFANT",
  };

  try {
    await generatePDFDrive("devis_chantier", incompleteData, {
      onSuccess: (response) => {
        console.log(
          "✅ Test avec données manquantes réussi (inattendu):",
          response
        );
      },
      onError: (error) => {
        console.log(
          "✅ Test avec données manquantes échoué (attendu):",
          error.message
        );
      },
    });
  } catch (error) {
    console.log(
      "✅ Test avec données manquantes échoué (attendu):",
      error.message
    );
  }
};

// Fonction de test pour un type non supporté
export const testUnsupportedType = async () => {
  console.log("🧪 Test avec un type non supporté");

  const testData = {
    id: 1,
    name: "Test",
  };

  try {
    await generatePDFDrive("type_inexistant", testData, {
      onSuccess: (response) => {
        console.log(
          "✅ Test avec type non supporté réussi (inattendu):",
          response
        );
      },
      onError: (error) => {
        console.log(
          "✅ Test avec type non supporté échoué (attendu):",
          error.message
        );
      },
    });
  } catch (error) {
    console.log(
      "✅ Test avec type non supporté échoué (attendu):",
      error.message
    );
  }
};

// Fonction principale de test
export const runAllTests = async () => {
  console.log("🚀 Démarrage de tous les tests du système universel");
  console.log("=" * 60);

  // Test 1: Types supportés
  testSupportedTypes();
  console.log("-" * 40);

  // Test 2: Données manquantes
  await testMissingData();
  console.log("-" * 40);

  // Test 3: Type non supporté
  await testUnsupportedType();
  console.log("-" * 40);

  // Test 4: Génération normale (commenté pour éviter les conflits)
  // await testDevisChantier();

  console.log("=" * 60);
  console.log("✅ Tous les tests terminés");
};

// Export par défaut
export default {
  testDevisChantier,
  testSupportedTypes,
  testMissingData,
  testUnsupportedType,
  runAllTests,
};
