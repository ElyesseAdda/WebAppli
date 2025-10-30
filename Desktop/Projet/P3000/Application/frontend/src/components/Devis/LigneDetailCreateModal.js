import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const LigneDetailCreateModal = ({ isOpen, onClose, description, sousPartieId, partieId, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    unite: '',
    prix: '',
    cout_main_oeuvre: '0',
    cout_materiel: '0',
    taux_fixe: '20',
    marge: '20'
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [prixCalcule, setPrixCalcule] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        description: description || '',
        unite: '',
        prix: '',
        cout_main_oeuvre: '0',
        cout_materiel: '0',
        taux_fixe: '20',
        marge: '20'
      });
      setShowAdvanced(false);
      setError('');
    }
  }, [isOpen, description]);

  // Calculer le prix automatiquement si les champs avancés sont remplis
  useEffect(() => {
    const cout_main_oeuvre = parseFloat(formData.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(formData.cout_materiel) || 0;
    const taux_fixe = parseFloat(formData.taux_fixe) || 0;
    const marge = parseFloat(formData.marge) || 0;
    
    // Toujours calculer le prix
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;

    setPrixCalcule(prix);
  }, [formData.cout_main_oeuvre, formData.cout_materiel, formData.taux_fixe, formData.marge]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.unite.trim()) {
      setError('L\'unité est obligatoire');
      return;
    }

    if (!prixCalcule || prixCalcule === 0) {
      setError('Le prix unitaire est obligatoire');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const cout_main_oeuvre = parseFloat(formData.cout_main_oeuvre) || 0;
      const cout_materiel = parseFloat(formData.cout_materiel) || 0;

      const data = {
        description: formData.description || description,
        unite: formData.unite,
        cout_main_oeuvre: formData.cout_main_oeuvre,
        cout_materiel: formData.cout_materiel,
        taux_fixe: formData.taux_fixe,
        marge: formData.marge,
        sous_partie: sousPartieId,
        partie: partieId,
        prix: prixCalcule
      };

      const response = await axios.post('/api/ligne-details/', data);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      
      onClose();
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError(err.response?.data?.error || err.response?.data?.description?.[0] || 'Erreur lors de la création');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!isMouseDown) {
      onClose();
    }
    setIsMouseDown(false);
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100000
    }} 
    onClick={handleBackdropClick}
    onMouseDown={() => setIsMouseDown(true)}
    onMouseUp={() => setIsMouseDown(false)}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '30px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }} 
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}>
        <h2 style={{
          marginTop: 0,
          marginBottom: '20px',
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1976d2'
        }}>
          ✨ Créer une nouvelle ligne de détail
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              fontSize: '14px',
              color: '#333'
            }}>
              Description <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Entrez la description"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          {/* Champs principaux en horizontal */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: '1' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Unité <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                name="unite"
                value={formData.unite}
                onChange={handleChange}
                placeholder="Ex: m², unité, h, ml"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              />
            </div>

            <div style={{ flex: '1' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Prix unitaire (€) <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  flex: '1',
                  padding: '10px',
                  border: '2px solid #1976d2',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {prixCalcule.toFixed(2)} €
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    padding: '10px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px'
                  }}
                  title="Afficher les détails de calcul"
                >
                  {showAdvanced ? '▼' : '▶'}
                </button>
              </div>
              {showAdvanced && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  Prix calculé automatiquement en fonction des coûts
                </div>
              )}
            </div>
          </div>

          {/* Champs avancés */}
          {showAdvanced && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '6px',
              marginBottom: '20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Coût main d'œuvre (€)
              </label>
              <input
                type="number"
                step="0.01"
                name="cout_main_oeuvre"
                value={formData.cout_main_oeuvre}
                onChange={handleChange}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Coût matériel (€)
              </label>
              <input
                type="number"
                step="0.01"
                name="cout_materiel"
                value={formData.cout_materiel}
                onChange={handleChange}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Taux fixe (%)
              </label>
              <input
                type="number"
                step="0.01"
                name="taux_fixe"
                value={formData.taux_fixe}
                onChange={handleChange}
                placeholder="20"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                fontSize: '14px',
                color: '#333'
              }}>
                Marge (%) : {formData.marge}%
              </label>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <input
                  type="range"
                  name="marge"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.marge}
                  onChange={handleChange}
                  style={{
                    flex: '1',
                    height: '8px',
                    borderRadius: '5px',
                    background: '#dee2e6',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="marge"
                  value={formData.marge}
                  onChange={handleChange}
                  style={{
                    width: '80px',
                    padding: '8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>
          </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#333',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: isLoading ? '#ccc' : '#1976d2',
                color: 'white',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {isLoading ? 'Création...' : 'Créer la ligne'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default LigneDetailCreateModal;

