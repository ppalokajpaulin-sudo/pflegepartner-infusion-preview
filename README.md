# Pflegepartner AG — Infusions-Landingpage (Vorschau)

Nicht freigegebene **Vorschau** einer Conversion-Landingpage für die Infusionen
zuhause von Pflegepartner AG. Erstellt von LUP Studios.

Bilder (Hero, Team, Produkte) stammen von pflegepartner.ch und wurden für Web
optimiert (8.5 MB → ~790 KB).

> ⚠️ Bewusst auf `noindex, nofollow` + `robots.txt Disallow` gesetzt, damit die
> Vorschau nicht indexiert wird und nicht mit pflegepartner.ch konkurriert.
> Vor Livegang: Freigabe (Precheck), Tracking-IDs und Formular-Endpoint einsetzen.

## Quiz: eine Adresse für alles (`/quiz`)

Es gibt nur noch **`https://vitamine.pflegepartner.ch/quiz`**. Der Server wählt die Ansicht nach `?bereich=` (Regeln in `vercel.json`):

| Adresse | Zeigt |
|---|---|
| `/quiz` | Infusions-Check (`quiz.html`). Besucher **ohne** Anzeigen-Parameter (`utm_*`, `fbclid`, `gclid`) und ohne Klick von einer Produktseite sehen zuerst die Auswahl |
| `/quiz?bereich=wahl` | Auswahl «Worum geht es?» (`views/wahl.html`) |
| `/quiz?bereich=pflege` | Pflege-Check für Angehörige (`views/pflege.html`) |
| `/quiz?bereich=infusion` | Infusions-Check, nie die Auswahl |

Die früheren Adressen `/start`, `/pflege-check`, `/spitex`, `/spitex-check`, `/check`, `/infusions-check` und `quiz.pflegepartner.ch` leiten auf die passende `/quiz`-Adresse weiter (Anzeigen-Parameter bleiben erhalten), so bricht kein bestehender Link. Die Dateien in `views/` sind nur Bausteine, nirgends verlinkt und `noindex`.

Die Art der Anfrage erkennt der Leads-Server unabhängig von der Adresse: Der Pflege-Check schickt `ziel = "Pflege-Check (…)"`, alles andere gilt als Infusion. Lokal (reiner Datei-Server ohne Umschreibung) leiten die Seiten direkt auf die Dateien in `views/` um.
