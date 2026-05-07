import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

const LigneDetailEditModal = ({ isOpen, onClose, ligneDetail, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    unite: '',
    prix: '',
    cout_main_oeuvre: '',
    cout_materiel: '',
    taux_fixe: '',
    marge: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMouseDown, setIsMouseDown] = useState(false);
  // 'couts' = prix calculé depuis les coûts | 'prix' = marge calculée depuis le prix
  const calcDirectionRef = useRef('couts');

  const hasCoutsRemplis = (data) =>
    (data.cout_main_oeuvre !== '' && data.cout_main_oeuvre !== null) ||
    (data.cout_materiel   !== '' && data.cout_materiel   !== null);

  // Calcule le prix depuis les coûts
  const calculerPrixDepuisCouts = (data) => {
    const mo   = parseFloat(data.cout_main_oeuvre) || 0;
    const mat  = parseFloat(data.cout_materiel)    || 0;
    const tf   = parseFloat(data.taux_fixe)        || 0;
    const mg   = parseFloat(data.marge)            || 0;
    const base       = mo + mat;
    const sous_total = base * (1 + tf / 100);
    return sous_total * (1 + mg / 100);
  };

  // Calcule la marge depuis le prix et les coûts (formule inverse)
  const calculerMargeDepuisPrix = (prix, data) => {
    const mo  = parseFloat(data.cout_main_oeuvre) || 0;
    const mat = parseFloat(data.cout_materiel)    || 0;
    const tf  = parseFloat(data.taux_fixe)        || 0;
    const base       = mo + mat;
    const sous_total = base * (1 + tf / 100);
    if (sous_total <= 0) return null;
    return ((prix / sous_total) - 1) * 100;
  };

  useEffect(() => {
    if (isOpen && ligneDetail) {
      const hasCouts = ligneDetail.cout_main_oeuvre > 0 || ligneDetail.cout_materiel > 0;
      calcDirectionRef.current = hasCouts ? 'couts' : 'prix';
      setFormData({
        description:      ligneDetail.description || '',
        unite:            ligneDetail.unite || '',
        prix:             String(ligneDetail.prix ?? ''),
        cout_main_oeuvre: hasCouts ? String(ligneDetail.cout_main_oeuvre ?? '') : '',
        cout_materiel:    hasCouts ? String(ligneDetail.cout_materiel    ?? '') : '',
        taux_fixe:        hasCouts ? String(ligneDetail.taux_fixe        ?? '') : '',
        marge:            hasCouts ? String(ligneDetail.marge            ?? '') : '',
      });
      setShowAdvanced(hasCouts);
      setError('');
    }
  }, [isOpen, ligneDetail]);

  // Coûts → recalcule le prix (seulement si c'est la direction active)
  useEffect(() => {
    if (calcDirectionRef.current !== 'couts') return;
    if (!hasCoutsRemplis(formData)) return;
    const newPrix = calculerPrixDepuisCouts(formData);
    setFormData(prev => ({ ...prev, prix: newPrix.toFixed(2) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.cout_main_oeuvre, formData.cout_materiel, formData.taux_fixe, formData.marge]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'prix') {
      // L'utilisateur saisit un prix manuellement
      if (value !== '' && value !== '-' && !/^-?\d*\.?\d*$/.test(value)) return;
      const newPrix = parseFloat(value);

      if (hasCoutsRemplis(formData) && !isNaN(newPrix)) {
        // Direction inversée : on recalcule la marge depuis le nouveau prix
        calcDirectionRef.current = 'prix';
        const newMarge = calculerMargeDepuisPrix(newPrix, formData);
        setFormData(prev => ({
          ...prev,
          prix:  value,
          marge: newMarge !== null ? newMarge.toFixed(2) : prev.marge,
        }));
      } else {
        setFormData(prev => ({ ...prev, prix: value }));
      }
      return;
    }

    // Pour tout autre champ (coûts, taux_fixe, marge) → on repasse en mode "couts → prix"
    if (['cout_main_oeuvre', 'cout_materiel', 'taux_fixe', 'marge'].includes(name)) {
      calcDirectionRef.current = 'couts';
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.unite.trim()) {
      setError("L'unité est obligatoire");
      return;
    }

    const prixFinal = parseFloat(formData.prix);
    if (isNaN(prixFinal)) {
      setError('Le prix unitaire est obligatoire');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const payload = {
        description:      formData.description,
        unite:            formData.unite,
        cout_main_oeuvre: formData.cout_main_oeuvre || '0',
        cout_materiel:    formData.cout_materiel    || '0',
        taux_fixe:        formData.taux_fixe        || '20',
        marge:            formData.marge            || '20',
        prix:             prixFinal,
      };
      const response = await axios.patch(`/api/ligne-details/${ligneDetail.id}/`, payload);
      onSuccess && onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.description?.[0] || 'Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!isMouseDown) onClose();
    setIsMouseDown(false);
  };

  const modal = (
    <div
      style={{
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
      onMouseUp={() => setIsMouseDown(false)}
    >
      <div
        style={{
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
        onMouseUp={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
          ✏️ Modifier la ligne de détail
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Entrez la description (utilisez Entrée pour revenir à la ligne)"
              style={{ width: '100%', padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
                Unité
              </label>
              <input
                type="text"
                name="unite"
                value={formData.unite}
                onChange={handleChange}
                placeholder="Ex: m², unité, h, ml"
                style={{ width: '100%', padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
                Prix unitaire (€) <span style={{ color: 'red' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  name="prix"
                  value={formData.prix}
                  onChange={handleChange}
                  placeholder="Ex: 25.50 ou -10.00"
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${hasCoutsRemplis(formData) ? '#1976d2' : '#dee2e6'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: hasCoutsRemplis(formData) ? '600' : 'normal',
                    backgroundColor: hasCoutsRemplis(formData) ? '#f0f7ff' : 'white',
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}
                  title="Afficher les détails de calcul"
                >
                  {showAdvanced ? '▼' : '▶'}
                </button>
              </div>
              {hasCoutsRemplis(formData) && (
                <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: '600', color: calcDirectionRef.current === 'couts' ? '#1976d2' : '#e65100' }}>
                  {calcDirectionRef.current === 'couts'
                    ? '⟶ Prix calculé depuis les coûts (modifiez un coût pour recalculer)'
                    : '⟵ Marge recalculée depuis le prix saisi'}
                </div>
              )}
              {!hasCoutsRemplis(formData) && showAdvanced && (
                <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                  Remplissez les champs ci-dessous pour calculer le prix automatiquement
                </div>
              )}
            </div>
          </div>

          {showAdvanced && (
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}
            >
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
                  Coût main d'œuvre (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="cout_main_oeuvre"
                  value={formData.cout_main_oeuvre}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
                  Coût matériel (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="cout_materiel"
                  value={formData.cout_materiel}
                  onChange={handleChange}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' }}>
                  Taux fixe (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="taux_fixe"
                  value={formData.taux_fixe}
                  onChange={handleChange}
                  placeholder="20"
                  style={{ width: '100%', padding: '10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: calcDirectionRef.current === 'prix' ? '#e65100' : '#333' }}>
                  Marge (%) : {formData.marge}%
                  {calcDirectionRef.current === 'prix' && (
                    <span style={{ fontSize: '11px', fontWeight: '500', marginLeft: '8px', color: '#e65100' }}>
                      ⟵ recalculée depuis le prix
                    </span>
                  )}
                </label>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="marge"
                    value={formData.marge}
                    onChange={handleChange}
                    style={{ flex: 1, padding: '8px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '6px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 20px', border: '1px solid #dee2e6', borderRadius: '6px', backgroundColor: 'white', color: '#333', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{ padding: '10px 20px', border: 'none', borderRadius: '6px', backgroundColor: isLoading ? '#ccc' : '#1976d2', color: 'white', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              {isLoading ? 'Mise à jour...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LigneDetailEditModal;


