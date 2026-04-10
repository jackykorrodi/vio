# VIO – Design System

> Referenz für alle UI-Entscheide. Claude Code liest diese Datei vor visuellen Änderungen.

## Farben
- Primary: `#6B4FBB` (VIO Violet)
- Ink: `#2D1F52` (Dunkel)
- Background: `#F7F5FF` (Hell-Violett)
- Success/Display: `#2BB67A` (Grün)
- Warning: `#E8A838` (Amber)
- Error: `#E05252` (Rot)
- DOOH Card: `linear-gradient(135deg, #3B2980, #2D1F52)`
- Display Card: `linear-gradient(135deg, #1A4A2E, #0F2E1C)`

## Typografie
- Headlines/Zahlen: Plus Jakarta Sans, weight 800
- Body/Labels: Jost, weight 400–500
- Nie andere Fonts verwenden

## Spacing
- Card padding: 24px
- Gap zwischen Cards: 12px
- Border-radius Cards: 16px
- Border-radius Buttons: 8px

## Komponenten-Regeln
- Alle Styles inline (style={{}}) — keine externen CSS-Klassen
- Buttons: Violet Background, weisse Schrift, hover darken 10%
- Cards: Immer border-radius 16px, shadow subtil
- Zahlen gross: Plus Jakarta Sans 800, min 28px
- Labels uppercase: 10–11px, letter-spacing 0.08em

## Was wir nie machen
- Glassmorphism, Blobs, Gradients als Dekoration
- Schatten die nach AI-Design riechen
- Mehr als 2 Schriftfamilien
- Violet als Hintergrundfarbe (nur als Akzent)
