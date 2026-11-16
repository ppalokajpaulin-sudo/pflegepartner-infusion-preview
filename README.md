# Pflegepartner AG — Check-Seiten (Pflege-Check und Auswahl)

Statische Site auf **Vercel** (`vercel.json`). Die früheren Infusions-Landingpages
(Produktseiten, Infusions-Check) sind entfernt: Infusionen sind verschreibungspflichtig,
Werbung für die Öffentlichkeit ist nicht erlaubt (Entscheid Marijana: keine Preise,
keine Produktnamen, keine Produktfotos).

| Adresse | Inhalt |
|---|---|
| `/quiz` | Auswahl «Worum geht es?» (`views/wahl.html`) |
| `/quiz?bereich=pflege` | Pflege-Check für Angehörige (`views/pflege.html`) |
| `/quiz?bereich=infusion`, `/infusions-check`, `/<produkt>`, `/infusion-*`, `/danke` | leiten auf https://pflegepartner.ch/infusionen/ |
| `/` (alle Produkt-Subdomains) | leitet auf https://pflegepartner.ch/infusionen/ |

Die Adressen `/start`, `/pflege-check`, `/spitex`, `/spitex-check`, `/check` und `quiz.pflegepartner.ch`
leiten weiter, so bricht kein bestehender Link. `leads.pflegepartner.ch` wird per Rewrite
auf das Railway-Dashboard geleitet.

Die gelöschten Seiten bleiben in der Git-Historie.
