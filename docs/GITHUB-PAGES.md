# GitHub Pages — vorbereitete Veröffentlichung

## Ergebnis und Status

Die vorhandene App kann vollständig statisch auf GitHub Pages laufen. Sie benötigt weder einen Server noch Vercel, eine Datenbank, einen Login oder einen API-Schlüssel. Der bisherige Code besteht aus Browser-ES-Modulen, nicht aus React. Die bestehende Darstellung und Logik wurden beibehalten; Vite 8.3.8 übernimmt jetzt den Production Build. `private: true` in package.json verhindert nur eine versehentliche npm-Veröffentlichung und beschränkt keine Besucher einer Pages-Website.

**Vorbereitetes Ziel:** `maxp-dotcom/thailand-explorer`.

**Erwartete URL nach erfolgreicher, ausdrücklich freigegebener Veröffentlichung:**
`https://maxp-dotcom.github.io/thailand-explorer/`

Diese URL ist noch kein Nachweis einer veröffentlichten Website. Das öffentliche Repository wurde von Max erstellt. Dieser Stand ist für den ausdrücklich beauftragten Quellcode-Upload nach main bestimmt. GitHub Pages wurde nicht aktiviert und der Deployment-Job bleibt fest gesperrt. Auch die bisherige private Site wird durch diesen Upload nicht aktualisiert.

GitHub ist im Chat verbunden. Der Zugriff auf das von Max angelegte Repository maxp-dotcom/thailand-explorer ist bestätigt; vor dem ersten Upload war das Repository leer. Die Verbindung meldet Schreibrechte. Es wurden keine bestehenden Repository-Dateien ersetzt. Für diese Aufgabe ist kein eigener API-Schlüssel oder dauerhaftes Deployment-Token erforderlich.

## Struktur

| Pfad | Zweck |
|---|---|
| `dist/` | Erhaltener, bislang so benannter App-Quellcode, Reiseinformationen, Bilder und Kartenumrisse |
| `vite.config.js` | Statischer Build; kopiert nur bekannte öffentliche Bilddateien |
| `build/` | Generiertes Pages-Artefakt, nicht eingecheckt |
| `scripts/pages-base.mjs` | Base Path aus Repository-Namen oder expliziter Konfiguration |
| `.github/workflows/pages.yml` | Tests, Build, Artefaktprüfung und zunächst gesperrtes Deployment |
| `dist/share-plan.js` | Validierte, versionierte Reiseplan-Links ohne Server |
| `scripts/audit-public.mjs` | Prüfung des tatsächlich ausgelieferten Artefakts |
| `scripts/export-github.mjs` | Bereinigtes Quellcodepaket ohne bisherigen Git-Verlauf oder Hosting-Zugang |
| `release/thailand-explorer-github.zip` | Zum Entpacken und Übernehmen in das neue Repository |

Der ursprüngliche `origin` zeigt auf den bisherigen Sites-Quellspeicher. Er wurde nicht verändert. Für GitHub daher das bereinigte Exportpaket verwenden; nicht den bisherigen Git-Verlauf oder dessen Remote übernehmen. `.openai/hosting.json` bleibt für die bestehende Anwendung lokal erhalten und wird ausdrücklich nicht exportiert oder als Pages-Datei veröffentlicht.

## Lokal reproduzieren

Node 24 LTS installieren, das Quellpaket entpacken und im Projektverzeichnis ausführen:

```sh
npm ci
npm test
npm run build
npm run test:production
```

`npm run build` erstellt `build/` und prüft das fertige Artefakt. `npm run test:production` benötigt den vorherigen Build und führt HTTP- und DOM-Prüfungen des tatsächlich gebündelten JavaScripts durch. `npm run dev` und `npm run preview` stehen für die eigene lokale Browserprüfung zur Verfügung. Der lokale Vite-Pfad ist ebenfalls `/thailand-explorer/`.

Optional einen neuen bereinigten Export erzeugen:

```sh
npm run export:github
```

Der Export ist eine lokale Dateioperation, kein Upload. Das Skript benötigt das Programm `zip`.

## Base Path, Routing und statische Dateien

Für das gewählte Repository ist der Base Path `/thailand-explorer/`. Im Workflow wird er automatisch aus `GITHUB_REPOSITORY` ermittelt. Bei einem späteren Repository-Namen ändert er sich damit passend; für `maxp-dotcom.github.io` wird `/` verwendet. Für eine eigene Domain kann die Repository-Variable `PAGES_BASE_PATH` explizit auf `/` gesetzt werden. Ohne CI-Umgebung ist der Standard der gewählte Name `/thailand-explorer/`.

Für einen anderen lokalen Build:

```sh
PAGES_BASE_PATH=/anderer-name/ npm run build
PAGES_BASE_PATH=/anderer-name/ npm run test:production
```

Die App nutzt Hash-Routing. Damit liefern direkte Aufrufe und Neuladen weiterhin dieselbe statische index.html; es werden keine Server-Rewrites benötigt:

- Startseite: `/thailand-explorer/`
- Bangkok: `/thailand-explorer/#destination/bangkok`
- Max’ Guide: `/thailand-explorer/#max-guide`
- Reiseplaner: `/thailand-explorer/#planner`
- Geteilte Reise: `/thailand-explorer/#trip/<versionierte-planungsdaten>`

Verwende diese von der App erzeugten URLs. Eine Adresse wie `/thailand-explorer/destination/bangkok` ohne `#` ist keine App-Route und bekommt die vorbereitete verständliche 404-Seite. Die 404-Seite ist kein Server-Rewrite und behauptet keinen HTTP-200-Erfolg für unbekannte Pfade.

Die Kartenumrisse werden über `new URL(..., import.meta.url)` von Vite als benannte Build-Datei verknüpft. Die 20 lokalen SVG-Bilder und ihre Lizenz werden gezielt unter `images/` veröffentlicht. Filter, Kartenmarker, Vergleiche und Reiseplanung bleiben reine Browserfunktionen. Google Fonts lädt die bisher verwendeten Schriften ohne Zugangsschlüssel; bei blockiertem Font-Abruf greifen die vorhandenen Schrift-Fallbacks.

## Reisepläne teilen

Im Reiseplaner öffnet „Reiseplan teilen“ eine Vorschau des Links. „Link kopieren“ verwendet die Browser-Zwischenablage; ist sie nicht verfügbar, wird der Link zum manuellen Kopieren markiert.

Der Link enthält ausschließlich eine erlaubte Auswahl: Reisedatum, Dauer, Flughäfen, Prioritäten, Abwechslung, Tempo, Transferbereitschaft, Max-/Tourismuspräferenz, ausgewählte Alternative, Ortsreihenfolgen und Tagesausflüge. Keine persönlichen Notizen, Kontakte, Hotelbuchungen, Gruppenangaben, anderen Browserdaten oder Zugangsdaten werden eingefügt. Das Linkfragment nach `#` wird beim normalen HTTP-Aufruf nicht an den Webserver gesendet. **Es ist dennoch lesbar und nicht verschlüsselt: Wer den vollständigen Link bekommt, kann diese Reisedaten lesen.**

Empfänger brauchen keine Anmeldung. Ein geteiltes Vorhaben wird erst nach „Reiseplan übernehmen“ in ihre Planung importiert. Der vorherige Browserplan wird unter `sabai-plan-before-share-v1` lokal gesichert. „Meinen Plan behalten“ verwirft den Import. Ungültige, überlange, unbekannte oder zeitlich unmögliche Links werden abgewiesen. Nach späteren Daten-/Regeländerungen kann eine alte Route unplanbar werden; sie wird dann nicht stillschweigend importiert.

Der bisherige `sabai-plan-v1`-Speicherschlüssel und alle bestehenden Funktionen bleiben erhalten. Browserdaten gehören aber immer zu ihrer jeweiligen Website-Origin. Eine Planung auf der bisherigen privaten Hosting-Domain wandert durch den Hostingwechsel nicht automatisch nach github.io. Die bisherige Website und ihre Browserdaten werden durch diese Vorbereitung nicht gelöscht. Bestehende Pläne daher vor einem tatsächlichen Umzug zusätzlich exportieren; neue Plan-Links können anschließend zwischen Nutzern geteilt werden.

## Freigabesperre und spätere Automatik

Pushes und Pull Requests nach `main` führen Tests und Build aus. Der Deployment-Job besitzt derzeit zusätzlich eine feste `false &&`-Sperre. Er kann deshalb bei diesem Quellcode-Upload unabhängig von Repository-Variablen nicht starten. Nach einer späteren ausdrücklichen Pages-Freigabe muss diese Sperre zunächst entfernt werden. Danach ist ein Deployment nur erlaubt, wenn gleichzeitig:

1. das Ereignis kein Pull Request ist,
2. der Branch `main` ist,
3. die Repository-Variable `PAGES_PUBLISH_ENABLED` exakt den Wert `true` hat,
4. Tests, Build und Production-Prüfungen erfolgreich waren.

**Die Variable wurde nicht angelegt oder aktiviert.** Abwesend oder `false` bedeutet: kein Deployment. Sie darf erst nach Max’ ausdrücklicher Freigabe auf `true` gesetzt werden. Das Environment `github-pages` kann zusätzlich mit manuellen Genehmigungen geschützt werden, falls solche Schutzregeln für das Repository eingerichtet werden sollen.

Nach der erstmaligen Freigabe und Aktivierung veröffentlichen erfolgreiche zukünftige Pushes nach `main` automatisch. Vorher bleiben diese Pushes reine Build-Prüfungen. Pull Requests erhalten nie Pages-Schreibrechte. Das Build-Job-Token hat nur `contents: read`; erst der freigegebene Deployment-Job hat `pages: write` und `id-token: write`. Die offiziellen Actions sind auf verifizierte Commit-SHAs festgelegt. Es wird kein persönliches Zugriffstoken als Repository-Secret benötigt.

## Was du nach ausdrücklicher Freigabe tun musst

Für GitHub Free braucht diese kostenlose Pages-Variante ein **öffentliches** Repository. Dadurch sind auch die hochgeladenen Quelltexte öffentlich. Das Repository wurde inzwischen von Max öffentlich erstellt und der Quellcode-Upload wurde ausdrücklich beauftragt. Die Website-Veröffentlichung ist weiterhin nicht freigegeben.

Nach der Freigabe:

1. Bereits erledigt: Das öffentliche Repository `maxp-dotcom/thailand-explorer` wurde von Max erstellt. Den bestehenden main-Stand erhalten und künftige Änderungen darauf aufbauen.
2. Der erste Quellcode-Upload wird in diesem Stand über die verbundene GitHub-Schnittstelle vorgenommen. Die folgenden Befehle sind nur eine Alternative für ein noch leeres Repository; nicht erneut auf ein inzwischen befülltes Repository anwenden:

```sh
git init -b main
git add .
git commit -m "Prepare Thailand Explorer for GitHub Pages"
git remote add origin https://github.com/maxp-dotcom/thailand-explorer.git
git push -u origin main
```

Die normale GitHub-Anmeldung für Git verwenden. Keine Tokens in Dateien, URLs oder Chatnachrichten einfügen. Die veröffentlichte Website benötigt diese Anmeldung nicht.

3. Wenn Codex die weiteren Schritte übernehmen soll, bei der installierten GitHub-Verbindung den Repository-Zugriff auch für `thailand-explorer` aktivieren und die Repository-URL in diesem Chat nennen.
4. Im neuen Repository **Settings → Pages → Build and deployment → Source → GitHub Actions** wählen.
5. Nach erteilter Veröffentlichungsfreigabe zuerst die feste `false &&`-Sperre im deploy-Job des Workflows entfernen. Anschließend unter **Settings → Secrets and variables → Actions → Variables** die Repository-Variable `PAGES_PUBLISH_ENABLED` auf `true` setzen. Kein Secret anlegen. `PAGES_BASE_PATH` für das normale Projekt-Repository leer lassen.
6. **Actions → Build and deploy Thailand Explorer → Run workflow → main** ausführen. Anschließend die von GitHub gemeldete Deployment-URL prüfen. Spätere Pushes nach main starten dies automatisch.

Bis zur Aufhebung der festen Sperre nach ausdrücklicher Freigabe ist der Deployment-Job immer gesperrt. Ein öffentliches Repository veröffentlicht allerdings bereits den Quellcode; deshalb auch Schritt 1 und den Upload erst nach ausdrücklicher Freigabe durchführen.

## Prüfung und Grenzen

Erfolgreich ausgeführt:

- 28 Tests für bisherige Funktionen, Daten, Speicherung, Freigabesperre, Base Path und Linkformat.
- Production Build mit Vite 8.3.8; 27 öffentliche Dateien, keine Source Maps.
- 2 zusätzliche Production-Tests gegen das echte Build-Artefakt: HTTP-Abrufe unter dem Repository-Unterpfad, alle lokalen Bilder, Kartenumrisse, Ziel-Deep-Link und erneuter Dokumentstart, Filter, geteilter Plan, Importentscheidung und Sicherung des Empfängerplans.
- YAML-Parsing des Workflows und Prüfung der Freigabebedingung.
- Artefaktprüfung auf typische private Schlüssel, bekannte Tokenformate, Credential-URLs, Bearer-Zugangsdaten, E-Mail-Adressen und interne Hosting-Metadaten. Die Fundprüfung protokolliert keine möglichen Geheimniswerte. Die Reiseinhalte wurden zusätzlich auf personenbezogene Buchungsdetails geprüft; die angegebenen Hotel-/Location-Adressen sind die bewusst vorgesehenen öffentlichen Orientierungspunkte.
- Keine `.git`-, `.openai`-, `.env`-, Dokumentations-, Test- oder Abhängigkeitsdateien im Pages-Artefakt.

Die HTTP-/DOM-Tests prüfen echte gebündelte Dateien und Interaktionslogik, jedoch keine visuelle Browserdarstellung. Es steht weiterhin kein CUA-Browserwerkzeug bereit; eine visuelle Desktop-/Mobilprüfung ist noch offen. Kein tatsächlicher GitHub-Actions-Lauf oder öffentliches Pages-Deployment wurde durchgeführt, da die Pages-Freigabe weiterhin fehlt. Ein Push des Quellcodes darf bereits den getrennten Build-Job starten; das ist kein Pages-Deployment.

## Offizielle Referenzen

- Vite: https://vite.dev/guide/static-deploy#github-pages
- GitHub: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- Die verwendeten Action-Tags/Commit-SHAs wurden vor der Vorbereitung direkt über die öffentlichen GitHub-Referenzen für `actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact` und `actions/deploy-pages` abgeglichen.
