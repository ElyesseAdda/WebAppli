# Zonia — Design system (site vitrine)

Document de référence pour reproduire la direction artistique du **site vitrine Zonia** dans n’importe quel projet.

**Source de vérité :** la page vitrine (`Vitrine.jsx`), telle qu’elle s’affiche : fond clair, cartes blanches, boutons pilule, cyan et or assombris pour rester lisibles.

**Hors sujet, à ne pas reproduire :** l’écran de connexion, la sidebar, le chat, le mail, les panneaux verre nuit, le bouton cyan plein `#19E4FA` avec texte ardoise, le wordmark blanc, le point or au centre du Z. Ce langage appartient à l’outil, pas à la vitrine.

Consigne pour une IA : appliquer ces tokens et ces composants tels quels. Ne pas « moderniser » vers un thème sombre, ne pas remplacer le bouton ardoise par un bouton cyan fluo, ne pas éclaircir le dégradé de titre avec `#FFD700` / `#19E4FA` en aplat de texte (illisible sur fond clair).

---

## 1. Personnalité

La vitrine est une page d’agence : claire, posée, chiffrée. On lit des preuves, pas un tableau de bord.

- Fond gris-bleu très clair, cartes blanches, texte presque noir.
- Le cyan et l’or existent, mais **assombris** dès qu’ils portent du texte. Le fluo ne sert qu’aux filets, aux halos et aux fonds d’icônes.
- Boutons en pilule. L’action principale est **ardoise nuit**, et passe au cyan profond au survol.
- Beaucoup d’air, ombres très diffuses, coins généreux (16 à 24 px).
- Police Outfit. Le mot « ZONIA » est en capitales, très espacé, encre ardoise.
- Icônes Lucide, trait fin, posées dans un carré arrondi cyan ou or.

Phrase de hero : **« Moins de tâches répétitives. Plus de temps pour votre métier. »** La seconde ligne seule porte le dégradé or → cyan.

---

## 2. Logo

Sur la vitrine, le signe est un **Z filaire encre**, sans point central.

### Construction

- ViewBox : `0 0 100 100`
- Trait : `M 25 25 H 75 L 25 75 H 75 L 25 25 Z`
- `fill: none`, `stroke-linecap: round`, `stroke-linejoin: round`, `stroke-width: 6`
- Pas de cercle au centre.

### Variantes vitrine

| Usage | Trait | Support |
| --- | --- | --- |
| Navbar et footer | `#0F172A` | Carré 40 px, rayon 12 px, fond `#F1F5F9`, anneau 1 px `#E2E8F0`. Le Z fait 26 px |
| Encadré or (catalogue) | `#A16207` | Carré 44 px, rayon 12 px, fond blanc, bordure `rgba(234, 179, 8, 0.4)`. Le Z fait 26 px |

### Wordmark

```
ZONIA
```

- Outfit, graisse 700, 18 px (`text-lg`)
- `letter-spacing: 0.22em`
- Couleur `#020617` (slate-950)
- Casse affichée en capitales, pas de point or, pas de lueur

Le bloc marque est toujours : tuile logo + wordmark, gap 12 px, alignés au centre.

### SVG prêt à coller

```svg
<span class="z-logo-tile" aria-hidden="true">
  <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
    <path d="M 25 25 H 75 L 25 75 H 75 L 25 25 Z" stroke="#0F172A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</span>
```

### Règles

- Taille de tuile : 40 px. Ne pas poser le Z nu dans le header.
- Ne pas passer le trait en blanc, en cyan fluo ou en or vif `#FFD700` sur fond clair : le or lisible est `#A16207`.
- Ne pas ajouter le point central. Il n’existe pas sur la vitrine.
- Zone de protection : au moins 12 px entre la tuile et le lien de navigation suivant.

---

## 3. Couleurs

Le fond de page n’est pas blanc pur. Le blanc est réservé aux cartes. Le texte important est slate-950, pas un gris moyen.

### Encre, fonds, filets

| Token | Hex | Rôle |
| --- | --- | --- |
| `--zonia-bg` | `#F4F7FB` | Fond de page |
| `--zonia-white` | `#FFFFFF` | Cartes, navbar, champs au survol, bouton secondaire |
| `--zonia-slate-50` | `#F8FAFC` | Puits « avant », pastilles neutres, fond de champ |
| `--zonia-slate-100` | `#F1F5F9` | Tuile logo, badge méta, hover menu mobile |
| `--zonia-slate-200` | `#E2E8F0` | Bordure de carte, de champ, de navbar |
| `--zonia-slate-300` | `#CBD5E1` | Bordure de bouton secondaire au survol |
| `--zonia-slate-400` | `#94A3B8` | Eyebrow d’étape, source, placeholder |
| `--zonia-slate-500` | `#64748B` | Label, méta, « avant », copyright |
| `--zonia-slate-600` | `#475569` | Corps de texte |
| `--zonia-slate-700` | `#334155` | Texte d’interface, liens de nav, chips |
| `--zonia-slate-800` | `#1E293B` | Corps mis en avant (« après ») |
| `--zonia-slate-900` | `#0F172A` | Titres de carte secondaires, texte sur sélection or |
| `--zonia-slate-950` | `#020617` | Titres, bouton primaire, wordmark |
| `--zonia-ink` | `#0F172A` | Trait du logo, sélection de texte |

`color-scheme` de la page : `light`. La sélection de texte est or : fond `#FFD700`, texte `#0F172A`.

### Cyan — trois intensités, pas une

| Token | Hex | Où il va |
| --- | --- | --- |
| `--zonia-cyan` | `#19E4FA` | Filet de survol, bordure « après », focus, barre de formulaire, ping décoratif. **Jamais comme couleur de texte, jamais comme fond de bouton** |
| `--zonia-cyan-action` | `#0891B2` | Survol du bouton primaire, curseur de slider, point stable du badge hero |
| `--zonia-cyan-text` | `#0E7490` | Eyebrow de section, lien « choisir », icône dans tuile cyan, coche, note de prix |
| `--zonia-cyan-wash` | `#ECFEFF` | Fond de pastille, panneau chiffre, colonne « après » |

Transparences du fluo, uniquement en fond ou en bordure :

| Usage | Valeur |
| --- | --- |
| Fond de tuile icône cyan | `rgba(25, 228, 250, 0.15)` |
| Bordure de tuile icône cyan | `rgba(25, 228, 250, 0.30)` |
| Bordure « après » et pastille info | `rgba(25, 228, 250, 0.40)` |
| Bordure de carte au survol | `rgba(25, 228, 250, 0.60)` ou `#19E4FA` plein sur les cartes catalogue |
| Halo de page | `rgba(25, 228, 250, 0.15)` qui tombe à transparent |

### Or — vif en fond, brun en texte

| Token | Hex | Où il va |
| --- | --- | --- |
| `--zonia-gold` | `#FFD700` | Sélection de texte, fond de tuile (à 20 %), filet d’encadré, second stop de la barre de formulaire |
| `--zonia-gold-line` | `#EAB308` | Bordure de tuile or, à 40 % |
| `--zonia-gold-text` | `#A16207` | Icône dans tuile or, Z dans l’encadré catalogue, **texte du dégradé** |
| `--zonia-gold-wash` | `#FFFBEB` | Encadré « une seule interface » |

| Usage | Valeur |
| --- | --- |
| Fond de tuile icône or | `rgba(255, 215, 0, 0.20)` |
| Bordure de tuile or | `rgba(234, 179, 8, 0.40)` |
| Bordure de l’encadré or | `rgba(255, 215, 0, 0.50)` |
| Halo or, bas de page | `rgba(255, 215, 0, 0.05)` |

### Sémantique formulaire

| État | Fond | Bordure | Texte |
| --- | --- | --- | --- |
| Succès | `#ECFDF5` | `#A7F3D0` | `#065F46` |
| Erreur | `#FEF2F2` | `#FECACA` | `#991B1B` |

### Dégradé de chiffre et de mot-clé

Uniquement pour un fragment de titre ou un prix. Jamais un paragraphe, jamais un bouton.

```css
background: linear-gradient(to right, #A16207, #0E7490, #A16207);
background-size: 200% auto;
-webkit-background-clip: text;
background-clip: text;
color: transparent;
-webkit-text-fill-color: transparent;
animation: zonia-shine 5s linear infinite;
```

```css
@keyframes zonia-shine {
  to { background-position: 200% center; }
}
```

Le dégradé vif `#FFD700 → #19E4FA` est interdit en texte sur cette DA. Il ne reste que dans la barre de 4 px en haut du formulaire de contact :

```css
background: linear-gradient(to right, #19E4FA, #FFFFFF, #FFD700);
height: 4px;
```

---

## 4. Typographie

**Police :** Outfit, graisses 300, 400, 500, 600, 700, 800.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
font-family: 'Outfit', sans-serif;
```

Pas d’Inter, pas de serif, pas de monospace.

### Échelle

| Rôle | Taille | Graisse | Couleur | Notes |
| --- | --- | --- | --- | --- |
| Hero | 36 px, 60 px dès `md` | 800 | `#020617` | `tracking-tight`, line-height serré. La 2ᵉ ligne est en dégradé |
| Titre de section | 30 px, jusqu’à 48 px | 700 | `#020617` | — |
| Titre de bloc | 24 px, jusqu’à 30–36 px | 700 | `#020617` | — |
| Titre de carte | 18–20 px | 700 | `#020617` ou `#0F172A` | — |
| Chiffre hero (95 %) | 72 px, 96 px dès `md` | 800 | dégradé | `tracking-tight`, line-height 1 |
| Chiffre de carte | 36–48 px | 800 | dégradé | — |
| Prix dans une carte formule | 30 px | 800 | dégradé | préfixe et suffixe en 14 px `#64748B` |
| Chapô | 18 px, 20 px dès `md` | 400 | `#475569` | max-width ~42 rem, centré au hero |
| Corps | 14 px | 400 | `#475569` | line-height relâché (`leading-relaxed`) |
| Corps fort | 14 px | 600 | `#334155` | labels de slider, puces |
| Nav | 14 px | 500 | `#334155`, hover `#020617` | — |
| Bouton | 14 px (nav, carte) ou 18 px (hero, formulaire) | 700 | selon variante | — |
| Eyebrow | 12 px | 700 | `#0E7490` ou `#64748B` | capitales, tracking `0.16em` à `0.18em` |
| Label de champ | 12 px | 700 | `#64748B` | capitales, pas de tracking fort |
| Source, mention | 11 px | 400 | `#94A3B8` | — |
| Wordmark | 18 px | 700 | `#020617` | tracking `0.22em` |

Les titres sont en casse de phrase. Les capitales sont réservées au wordmark, aux eyebrows et aux labels de formulaire.

---

## 5. Atmosphère

Trois couches, toutes fixes, aucune cliquable.

### Fond

```css
background: #F4F7FB;
color: #1E293B;
min-height: 100vh;
overflow-x: hidden;
```

### Grille

Trait **ardoise**, pas blanc. Sur fond clair un trait blanc disparaîtrait.

```css
background-size: 56px 56px;
background-image:
  linear-gradient(to right, rgba(15, 23, 42, 0.045) 1px, transparent 1px),
  linear-gradient(to bottom, rgba(15, 23, 42, 0.045) 1px, transparent 1px);
```

La grille couvre le viewport (`position: fixed; inset: 0`), sous le contenu.

### Halos

Deux disques de 800 px, `border-radius: 50%`, `pointer-events: none`.

- Haut gauche, décalé de −200 px : `radial-gradient(circle, rgba(25, 228, 250, 0.15) 0%, rgba(15, 23, 42, 0) 70%)`
- Bas droite, décalé de −200 px : `radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, rgba(15, 23, 42, 0) 70%)`

Le halo or est volontairement plus faible que le halo cyan.

Les sections paires (gains, pourquoi, formules) posent un voile `background: rgba(255, 255, 255, 0.7)` pour rythmer la page sans casser la grille.

---

## 6. Mise en page

| Jeton | Valeur |
| --- | --- |
| Conteneur | `max-width: 80rem` (1280 px), padding 16 / 24 / 32 px |
| Hero | `max-width: 56rem`, centré |
| Chapô hero | `max-width: 42rem` |
| Contact | `max-width: 48rem` |
| Navbar | hauteur 64 px, 72 px dès `lg` |
| Section | padding vertical 80 à 96 px |
| Ancre | `scroll-margin-top: 96px` |
| Grille processus | 1 → 2 → 4 colonnes, gap 16 px |
| Grille solutions | 1 → 2 → 4 colonnes, gap 24 px |
| Grille catalogue | 1 → 2 → 3 colonnes, gap 24 px |
| Hero → premier contenu | padding-top 112 px, 144 px dès `lg` |

`scroll-behavior: smooth` sur `html`.

Rythme d’une section :

1. Eyebrow cyan, 12 px, tracking large.
2. Titre slate-950, 8 à 16 px sous l’eyebrow.
3. Chapô slate-600, largeur maîtrisée.
4. Grille de cartes, 40 à 64 px sous le chapô.

Le hero est centré. Les sections catalogue, formules et « concrètement » sont alignées à gauche.

---

## 7. Rayons, ombres, mouvement

### Rayons

| Usage | Valeur |
| --- | --- |
| Boutons, chips, badges, liens footer | 9999 px (pilule) |
| Grande carte (calculateur, guide, contact) | 24 px |
| Carte standard, encadré | 16 px |
| Tuile icône, puits avant / après, champ | 12 px |
| Menu burger | 8 px |

### Ombres

Toutes tirent vers le bas et s’estompent. Pas de lueur cyan autour d’une carte.

| Nom | Valeur | Usage |
| --- | --- | --- |
| Carte | `0 16px 40px -28px rgba(15, 23, 42, 0.45)` | Cartes processus, catalogue, formules |
| Carte forte | `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)` (`shadow-xl`) | Calculateur, guide, contact |
| Navbar | `0 16px 40px -24px rgba(15, 23, 42, 0.35)` | Barre fixe |
| Bouton primaire | `0 12px 30px -12px rgba(15, 23, 42, 0.55)` | Hero et CTA pleine largeur |
| Badge hero | `0 1px 2px rgba(15, 23, 42, 0.05)` | La puce « Agence IA » |

### Mouvement

| Geste | Effet |
| --- | --- |
| Bouton, carte | `transition: all 0.3s` (couleurs 0.15–0.2 s suffisent sur un chip) |
| Survol bouton hero / CTA | `translateY(-2px)` |
| Survol carte | `translateY(-4px)` et bordure cyan |
| Dégradé de texte | balayage 5 s, linéaire, infini |
| Pastille hero | ping Tailwind sur un point `#19E4FA`, point fixe `#0891B2` de 8 px |
| Page | pas de fade d’entrée sur les sections |

Respecter `prefers-reduced-motion` : couper le shine, le ping et les translations.

---

## 8. Navbar

Fixe, pleine largeur, `z-index: 50`.

```css
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(24px);
border-bottom: 1px solid #E2E8F0;
box-shadow: 0 16px 40px -24px rgba(15, 23, 42, 0.35);
```

- Liens : 14 px, graisse 500, `#334155`, survol `#020617`, gap 32 px. Pas de soulignement, pas de pill sur le lien inactif.
- CTA à droite : pilule, fond `#020617`, texte blanc, bordure `#020617`, padding `10px 20px`, 14 px, graisse 700. Survol : fond et bordure `#0891B2`.
- Sous 768 px : burger slate-900, panneau blanc, bordure haute `#E2E8F0`. Chaque lien mobile est une pilule outline (bordure `#020617`, survol fond `#020617` texte blanc). Le CTA mobile est une pilule pleine.

---

## 9. Boutons et liens

Tous les boutons de la vitrine sont des **pilules**. Il n’y a pas de bouton rectangle cyan.

Commun : `inline-flex`, centré, gap 8 px, graisse 700, `border-radius: 9999px`, police héritée. Désactivé : opacité 0.5, `cursor: not-allowed`.

### Primary — l’action

```css
background: #020617;
color: #FFFFFF;
border: 1px solid #020617;
padding: 16px 32px;          /* hero et formulaire : texte 18 px */
box-shadow: 0 12px 30px -12px rgba(15, 23, 42, 0.55);
```

Survol : `background: #0891B2`, `border-color: #0891B2`, `transform: translateY(-2px)`.

Nav (plus petit) : padding `10px 20px`, texte 14 px, même couleurs, sans translation obligatoire.

Dans une carte : padding `12px 16px`, texte 14 px. La version carte **mise en avant** reprend le primary. La version carte **standard** est l’outline ci-dessous.

Une flèche Lucide `ArrowRight` (16 ou 20 px) suit le libellé des CTA, pas celui des boutons « Choisir cette formule ».

### Secondary — l’alternative du hero

```css
background: #FFFFFF;
color: #0F172A;
border: 1px solid #E2E8F0;
padding: 16px 32px;
font-size: 18px;
box-shadow: none;
```

Survol : fond `#F8FAFC`, bordure `#CBD5E1`, `translateY(-2px)`.

### Outline — formule non mise en avant, menu mobile, footer

```css
background: transparent;
color: #020617;
border: 1px solid #020617;
padding: 12px 16px;
font-size: 14px;
font-weight: 700; /* 500 pour un lien de menu */
```

Survol : fond `#020617`, texte blanc.

### Ghost texte — « Choisir ce module »

Pas de pilule.

```css
color: #0E7490;
font-size: 14px;
font-weight: 700;
```

Survol : `#020617`. Flèche 16 px dans le même flux, gap 4 px.

### Chip de choix (segmented)

```css
padding: 8px 16px;
border-radius: 9999px;
font-size: 14px;
font-weight: 500;
border: 1px solid #E2E8F0;
background: #FFFFFF;
color: #334155;
```

Sélectionné : fond `#020617`, texte blanc, bordure `#020617`. Survol non sélectionné : bordure `#94A3B8`.

### Lien source

11 ou 12 px, `#94A3B8`, souligné, survol `#334155` ou `#1E293B`. Pas de cyan.

---

## 10. Cartes

Base commune :

```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px;
box-shadow: 0 16px 40px -28px rgba(15, 23, 42, 0.45);
```

Survol (cartes catalogue, service, processus, preuve) : `transform: translateY(-4px)` et `border-color: rgba(25, 228, 250, 0.6)` (ou `#19E4FA` plein). Transition 0.3 s. Le fond reste blanc.

### Carte formule

Même base, padding 24 px, colonne flex pleine hauteur. La carte **featured** remplace le survol cyan par un état permanent :

```css
border-color: #020617;
box-shadow: 0 16px 40px -28px rgba(15, 23, 42, 0.45), 0 0 0 1px #020617;
```

Son bouton est primary. Les autres ont le bouton outline. Un méta (durée) est une pilule `#F1F5F9`, texte 12 px graisse 600 `#64748B`, padding `4px 12px`.

### Grande carte (calculateur, guide, contact)

Rayon 24 px, padding 32 px (48 px sur le contact en `md`), `shadow-xl`, bordure `#E2E8F0`. Le contact est en `overflow: hidden` pour que la barre dégradée de 4 px affleure le bord haut.

### Tuile d’abonnement

Fond `#F8FAFC`, bordure `#F1F5F9`, rayon 12 px, padding 16 px. Survol : bordure `rgba(25, 228, 250, 0.6)`. Le prix est en dégradé, le suffixe « HT / mois » en 14 px `#64748B`.

### Puits de chiffre

À l’intérieur d’une carte, pas une carte autonome.

```css
border-radius: 12px;
padding: 16px;
background: linear-gradient(to bottom right, #F8FAFC, #ECFEFF);
border: 1px solid #F1F5F9;
```

Le grand nombre est en dégradé. Le libellé sous le nombre est 14 px, graisse 600, `#0F172A`. La preuve est 12 px `#475569`. La source est 11 px `#94A3B8`.

---

## 11. Tuiles d’icône

Deux tons, alternés (cyan, or, cyan, or). Ne pas mettre toutes les tuiles en cyan.

| Ton | Boîte | Icône |
| --- | --- | --- |
| Cyan | fond `rgba(25, 228, 250, 0.15)`, bordure `rgba(25, 228, 250, 0.30)` | `#0E7490` |
| Or | fond `rgba(255, 215, 0, 0.20)`, bordure `rgba(234, 179, 8, 0.40)` | `#A16207` |

| Contexte | Taille de boîte | Rayon | Icône |
| --- | --- | --- | --- |
| Carte service | 56 px | 12 px | 28 px |
| Carte catalogue | 48 px | 12 px | 24 px |
| Étape de processus | 40 px | 12 px | 20 px, fond plein `#ECFEFF` sans bordure or |

L’icône de processus est toujours cyan (fond wash, trait `#0E7490`). L’or et le cyan alternés commencent aux grilles de solutions et de catalogue.

Famille : **Lucide**, `stroke-width` par défaut. Couleur via `currentColor` / classe de texte, jamais un aplat fluo sur le trait.

---

## 12. Motifs de contenu

### Badge hero

Pilule blanche, bordure `#E2E8F0`, texte 14 px graisse 500 `#334155`, padding `8px 16px`, ombre légère. À gauche, un point 8 px : anneau ping `#19E4FA` et cœur `#0891B2`.

### Avant / après

Carte blanche simple, sans ombre forte, padding 20 px, rayon 16 px.

| Colonne | Fond | Bordure | Label | Texte |
| --- | --- | --- | --- | --- |
| AVANT | `#F8FAFC` | aucune | 11 px, graisse 700, tracking `0.16em`, `#94A3B8` | 14 px `#64748B` |
| APRÈS | `#ECFEFF` | `1px solid rgba(25, 228, 250, 0.4)` | mêmes cotes, couleur `#0E7490` | 14 px `#1E293B` |

Rayon interne : 12 px. Padding interne : 12 px.

### Encadré or

```css
background: #FFFBEB;
border: 1px solid rgba(255, 215, 0, 0.5);
border-radius: 16px;
padding: 24px 32px;
```

À gauche, tuile blanche 44 px avec le Z `#A16207`. Le premier segment de phrase est en graisse 700 `#020617`, la suite en `#1E293B`.

### Pastille info

```css
color: #0E7490;
background: #ECFEFF;
border: 1px solid rgba(25, 228, 250, 0.4);
border-radius: 9999px;
padding: 8px 16px;
font-size: 14px;
font-weight: 600;
```

### Puce de liste

Icône `Check` 16 px, `#0E7490`, alignée en haut du texte. Texte 14 px `#334155`, gap 8 px.

### Réassurance

Icône `Shield` 20 px `#0E7490` + titre 14 px graisse 700 `#020617` + texte 14 px `#475569`. Pas de carte autour : trois colonnes à même le fond.

### Facteurs de prix

Petites pilules : fond blanc, bordure `#E2E8F0`, texte 12 px graisse 600 `#475569`, padding `6px 12px`.

---

## 13. Formulaire de contact

Carte grande, barre dégradée de 4 px en haut (section 3).

Label : 12 px, graisse 700, `#64748B`, capitales, marge basse 8 px.

Champ, select, textarea :

```css
width: 100%;
background: #F8FAFC;
border: 1px solid #E2E8F0;
border-radius: 12px;
padding: 12px 16px;
color: #0F172A;
font: inherit;
font-size: 16px;
outline: none;
```

Placeholder `#94A3B8`. Focus : `box-shadow: 0 0 0 2px #19E4FA`, pas de changement de bordure nécessaire. Désactivé : opacité 0.5. Textarea : `resize: vertical`, 4 lignes.

Grille : 2 colonnes dès 640 px, gap 16 px. Le message et le bouton occupent les deux colonnes.

Bouton d’envoi : primary pleine largeur, padding vertical 16 px, texte 18 px. Le spinner sur ce bouton est **blanc** (bordure blanche, sommet transparent), 20 px — le fond du bouton est ardoise, pas cyan.

Message :

```css
padding: 12px;
border-radius: 8px;
font-size: 14px;
```

Succès et erreur : voir le tableau sémantique. Mention sous le bouton : 12 px, centré, `#64748B`.

Slider (calculateur) : `accent-color: #0891B2`. La valeur à droite du label est 18 px, graisse 800, `#020617`.

---

## 14. Footer

Fond blanc, bordure haute `#E2E8F0`, padding top 64 px, bottom 32 px.

Rangée : marque à gauche (même tuile + wordmark que la navbar), à droite une rangée de pilules outline (padding `8px 16px`, graisse 500, texte 14 px). Elles ouvrent les pages légales.

Copyright centré, 12 px, `#64748B` : `© {année} Zonia Systems. Tous droits réservés.`

---

## 15. Modale légale

Seul îlot sombre de la vitrine. Il ne définit pas la DA des pages : c’est un volet de lecture pour les mentions, posé sur le site clair.

- Overlay : `rgba(0, 0, 0, 0.7)`, `backdrop-filter: blur(4px)`, `z-index: 50`
- Panneau : fond `#0F172A`, bordure `#334155`, rayon 16 px, largeur max 768 px, ombre `shadow-2xl`
- En-tête : `#1E293B` à 90 % + blur, bordure basse `#334155`, padding `16px 24px`, titre 24 px graisse 700 blanc
- Icône de titre : `#FFD700`, 24 px
- Fermeture : `#94A3B8`, survol blanc, fond `#334155`, rayon 8 px
- Corps : `#CBD5E1`, padding 24 px. Titres de section blancs 20 px. Liens `#19E4FA` soulignés au survol. Mentions secondaires 12 px `#94A3B8`

Ne pas réutiliser ce panneau pour un formulaire, une carte ou une navbar.

---

## 16. Voix

- Français, vouvoiement.
- Phrases concrètes, un bénéfice puis la preuve. Pas de superlatif sans chiffre.
- « Zonia » en prose, « ZONIA » seulement dans le wordmark.
- Les eyebrows nomment la section (« Notre processus », « Catalogue », « Formules »), ils ne répètent pas le titre.
- Un prix est toujours accompagné de « HT » ou d’un « à partir de ». « Sur devis » reste en texte, pas en dégradé géant.
- Les sources sont visibles, petites, gris clair, cliquables.

---

## 17. À faire / à ne pas faire

**Faire**

- Fond `#F4F7FB`, cartes blanches, bordure `#E2E8F0`.
- Bouton d’action `#020617`, survol `#0891B2`, forme pilule, texte blanc.
- Texte d’accent `#0E7490`. Filets et halos `#19E4FA`.
- Or de texte `#A16207`, or de fond `#FFD700` à faible opacité.
- Dégradé de titre `#A16207 → #0E7490 → #A16207`.
- Z encre `#0F172A` dans une tuile gris clair, sans point central.
- Outfit, ombre diffuse ardoise, survol de carte qui monte de 4 px.

**Ne pas faire**

- Reprendre le login : fond `#0F172A`, carte verre, bouton cyan fluo, texte ardoise sur le bouton, wordmark blanc, point or, double trait animé.
- Écrire en `#19E4FA` ou `#FFD700` sur fond blanc.
- Bouton rectangle, bouton à dégradé, bouton vert.
- Remplir le Z, ou le poser sans sa tuile dans le header.
- Ombre colorée violette, glass sombre, grille blanche.
- Mettre l’or et le cyan fluo dans le même titre en dégradé vif.

---

## 18. Feuille de tokens à coller

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

:root {
  --zonia-bg: #F4F7FB;
  --zonia-white: #FFFFFF;
  --zonia-slate-50: #F8FAFC;
  --zonia-slate-100: #F1F5F9;
  --zonia-slate-200: #E2E8F0;
  --zonia-slate-300: #CBD5E1;
  --zonia-slate-400: #94A3B8;
  --zonia-slate-500: #64748B;
  --zonia-slate-600: #475569;
  --zonia-slate-700: #334155;
  --zonia-slate-800: #1E293B;
  --zonia-slate-900: #0F172A;
  --zonia-slate-950: #020617;

  --zonia-cyan: #19E4FA;
  --zonia-cyan-action: #0891B2;
  --zonia-cyan-text: #0E7490;
  --zonia-cyan-wash: #ECFEFF;

  --zonia-gold: #FFD700;
  --zonia-gold-line: #EAB308;
  --zonia-gold-text: #A16207;
  --zonia-gold-wash: #FFFBEB;

  --zonia-font: 'Outfit', sans-serif;
  --zonia-content: 80rem;
  --zonia-radius-card: 16px;
  --zonia-radius-panel: 24px;
  --zonia-radius-control: 12px;
  --zonia-radius-pill: 9999px;

  --zonia-shadow-card: 0 16px 40px -28px rgba(15, 23, 42, 0.45);
  --zonia-shadow-nav: 0 16px 40px -24px rgba(15, 23, 42, 0.35);
  --zonia-shadow-cta: 0 12px 30px -12px rgba(15, 23, 42, 0.55);

  color-scheme: light;
}

html { scroll-behavior: smooth; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--zonia-bg);
  color: var(--zonia-slate-800);
  font-family: var(--zonia-font);
  overflow-x: hidden;
}

::selection {
  background: var(--zonia-gold);
  color: var(--zonia-slate-900);
}

.z-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-size: 56px 56px;
  background-image:
    linear-gradient(to right, rgba(15, 23, 42, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.045) 1px, transparent 1px);
}

.z-blob {
  position: absolute;
  width: 800px;
  height: 800px;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle, rgba(25, 228, 250, 0.15) 0%, rgba(15, 23, 42, 0) 70%);
}

.z-gradient-text {
  background: linear-gradient(to right, #A16207, #0E7490, #A16207);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  animation: zonia-shine 5s linear infinite;
}

@keyframes zonia-shine {
  to { background-position: 200% center; }
}

.z-logo-tile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--zonia-slate-100);
  box-shadow: 0 0 0 1px var(--zonia-slate-200);
}

.z-wordmark {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--zonia-slate-950);
}

.z-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--zonia-radius-pill);
  font-family: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s;
}
.z-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.z-btn--primary {
  background: var(--zonia-slate-950);
  color: white;
  border: 1px solid var(--zonia-slate-950);
  padding: 16px 32px;
  font-size: 18px;
  box-shadow: var(--zonia-shadow-cta);
}
.z-btn--primary:hover:not(:disabled) {
  background: var(--zonia-cyan-action);
  border-color: var(--zonia-cyan-action);
  transform: translateY(-2px);
}

.z-btn--secondary {
  background: white;
  color: var(--zonia-slate-900);
  border: 1px solid var(--zonia-slate-200);
  padding: 16px 32px;
  font-size: 18px;
}
.z-btn--secondary:hover:not(:disabled) {
  background: var(--zonia-slate-50);
  border-color: var(--zonia-slate-300);
  transform: translateY(-2px);
}

.z-btn--outline {
  background: transparent;
  color: var(--zonia-slate-950);
  border: 1px solid var(--zonia-slate-950);
  padding: 12px 16px;
  font-size: 14px;
}
.z-btn--outline:hover:not(:disabled) {
  background: var(--zonia-slate-950);
  color: white;
}

.z-card {
  background: white;
  border: 1px solid var(--zonia-slate-200);
  border-radius: var(--zonia-radius-card);
  box-shadow: var(--zonia-shadow-card);
  transition: transform 0.3s, border-color 0.3s;
}
.z-card:hover {
  transform: translateY(-4px);
  border-color: rgba(25, 228, 250, 0.6);
}

.z-field {
  width: 100%;
  box-sizing: border-box;
  background: var(--zonia-slate-50);
  border: 1px solid var(--zonia-slate-200);
  border-radius: var(--zonia-radius-control);
  padding: 12px 16px;
  color: var(--zonia-slate-900);
  font: inherit;
  font-size: 16px;
  outline: none;
}
.z-field::placeholder { color: var(--zonia-slate-400); }
.z-field:focus { box-shadow: 0 0 0 2px var(--zonia-cyan); }
```

---

## 19. Check-list avant de livrer un écran

1. Le fond est `#F4F7FB`, avec la grille ardoise à 4,5 % et les deux halos.
2. La police est Outfit. Les titres sont `#020617`, le corps `#475569`.
3. La marque est la tuile grise + Z encre + `ZONIA` en tracking `0.22em`. Pas de point or.
4. Le bouton principal est une pilule ardoise, blanche, qui devient `#0891B2` au survol.
5. Le cyan fluo `#19E4FA` ne colore aucun texte ni aucun bouton.
6. Les chiffres et le mot-clé du hero utilisent le dégradé `#A16207 → #0E7490`.
7. Les cartes sont blanches, rayon 16 ou 24 px, ombre diffuse, survol qui les relève et teinte le filet en cyan.
8. Les tuiles d’icônes alternent cyan (texte `#0E7490`) et or (texte `#A16207`).
9. Les champs sont gris très clair, rayon 12 px, anneau de focus `#19E4FA`.
10. Rien de l’écran de connexion : pas de verre nuit, pas de bouton cyan fluo, pas de wordmark blanc.
