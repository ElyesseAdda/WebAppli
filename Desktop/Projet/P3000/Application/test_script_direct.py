#!/usr/bin/env python
"""
Test direct du script generate_monthly_agents_pdf.js
"""

import os
import subprocess
import tempfile

def test_script_direct():
    """
    Test direct du script Node.js
    """
    print("🧪 TEST DIRECT DU SCRIPT generate_monthly_agents_pdf.js")
    print("=" * 60)
    
    # Chemin du script
    script_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'frontend', 'src', 'components', 'generate_monthly_agents_pdf.js'
    )
    
    # Fichier de sortie temporaire
    temp_pdf = os.path.join(tempfile.gettempdir(), 'test_monthly_agents.pdf')
    
    # URL de test (utiliser une URL qui existe)
    test_url = "https://www.google.com"  # URL de test simple qui fonctionne
    
    print(f"📁 Script: {script_path}")
    print(f"📄 Fichier de sortie: {temp_pdf}")
    print(f"🌐 URL de test: {test_url}")
    
    # Vérifier que le script existe
    if not os.path.exists(script_path):
        print(f"❌ Script introuvable: {script_path}")
        return
    
    print(f"✅ Script trouvé")
    
    # Commande à exécuter
    command = ['node', script_path, test_url, temp_pdf]
    print(f"🚀 Commande: {' '.join(command)}")
    
    try:
        # Exécuter le script
        print("\n🎯 Exécution du script...")
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(f"📊 Code de retour: {result.returncode}")
        print(f"📤 Sortie standard: {result.stdout}")
        print(f"📥 Sortie d'erreur: {result.stderr}")
        
        if result.returncode == 0:
            print("✅ Script exécuté avec succès")
            if os.path.exists(temp_pdf):
                print(f"📁 PDF généré: {temp_pdf}")
                print(f"📏 Taille: {os.path.getsize(temp_pdf)} octets")
            else:
                print("❌ PDF non généré")
        else:
            print("❌ Script a échoué")
            
    except subprocess.TimeoutExpired:
        print("⏰ Timeout (60 secondes)")
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
    
    # Nettoyer
    try:
        if os.path.exists(temp_pdf):
            os.remove(temp_pdf)
            print("🧹 Fichier temporaire supprimé")
    except:
        pass
    
    print("=" * 60)
    print("🏁 FIN DU TEST")

if __name__ == "__main__":
    test_script_direct()
