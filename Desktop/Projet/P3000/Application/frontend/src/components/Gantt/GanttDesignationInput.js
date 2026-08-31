import { Autocomplete, TextField } from "@mui/material";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

/**
 * Saisie de désignation avec suggestions issues des diagrammes déjà validés.
 *
 * Le mode `freeSolo` est essentiel : il garantit qu'une désignation inédite
 * reste acceptée. Les suggestions accélèrent la saisie sans jamais la bloquer.
 *
 * La valeur n'est remontée au parent qu'une fois la saisie validée (touche
 * Entrée, choix d'une suggestion ou sortie du champ), et non à chaque frappe :
 * remonter chaque caractère déclencherait l'enregistrement automatique en
 * pleine frappe, et la réponse du serveur écraserait le texte en cours.
 */
const GanttDesignationInput = ({
  valeur,
  onChange,
  onCouleurSuggeree,
  typeElement = "ligne",
  placeholder = "Désignation",
  autoFocus = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [saisie, setSaisie] = useState(valeur || "");
  const [ouvert, setOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState(false);
  const derniereValeurEmise = useRef(valeur || "");

  // Resynchronisation depuis le parent uniquement hors saisie, pour ne jamais
  // écraser ce que l'utilisateur est en train de taper.
  useEffect(() => {
    if (!enEdition) {
      setSaisie(valeur || "");
      derniereValeurEmise.current = valeur || "";
    }
  }, [valeur, enEdition]);

  // Les suggestions ne sont chargées qu'à l'ouverture de la liste : un
  // diagramme de trente lignes déclencherait sinon trente appels au montage.
  useEffect(() => {
    if (!ouvert) return undefined;
    let annule = false;
    const timer = setTimeout(() => {
      axios
        .get("/api/gantt/designations/", {
          params: { type: typeElement, q: saisie || undefined },
        })
        .then((res) => {
          if (!annule) setSuggestions(res.data || []);
        })
        .catch(() => {
          if (!annule) setSuggestions([]);
        });
    }, 250);
    return () => {
      annule = true;
      clearTimeout(timer);
    };
  }, [ouvert, saisie, typeElement]);

  const validerSaisie = (texte) => {
    const finale = texte === undefined ? saisie : texte;
    if (finale === derniereValeurEmise.current) return;
    derniereValeurEmise.current = finale;
    onChange(finale);
  };

  return (
    <Autocomplete
      freeSolo
      size="small"
      fullWidth
      open={ouvert && suggestions.length > 0}
      onOpen={() => setOuvert(true)}
      onClose={() => setOuvert(false)}
      options={suggestions}
      filterOptions={(options) => options}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.libelle || ""
      }
      inputValue={saisie}
      onInputChange={(event, nouvelleValeur) => setSaisie(nouvelleValeur)}
      onChange={(event, option) => {
        if (option && typeof option !== "string") {
          setSaisie(option.libelle);
          validerSaisie(option.libelle);
          if (option.couleur_defaut && onCouleurSuggeree) {
            onCouleurSuggeree(option.couleur_defaut);
          }
        } else if (typeof option === "string") {
          setSaisie(option);
          validerSaisie(option);
        }
        setOuvert(false);
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 2,
              marginRight: 8,
              backgroundColor: option.couleur_defaut || "#bbb",
            }}
          />
          {option.libelle}
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setEnEdition(true)}
          onBlur={() => {
            setEnEdition(false);
            setOuvert(false);
            validerSaisie();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setOuvert(false);
              validerSaisie();
            }
          }}
        />
      )}
    />
  );
};

export default GanttDesignationInput;
