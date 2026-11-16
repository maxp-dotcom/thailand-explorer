# Sabai — Thailand Explorer & Max’ Guide

Deutschsprachiger Destination Explorer, persönlicher Guide und regelbasierter Reiseplaner. Statische ES-Module ohne Backend und ohne Buchungsintegration. Eingaben und bearbeitete Routen werden ausschließlich im Browser gespeichert; Text-Export sichert die Planung außerhalb des Browsers. Google Fonts lädt nur die Schrift, keine Reiseeingaben.

## GitHub Pages vorbereiten

Die App läuft vollständig statisch. Der bestehende ES-Modul-Code unter `dist/` bleibt erhalten; Vite erstellt die öffentlichen Dateien unter `build/`. Es gibt keine React-, Server-, Datenbank- oder Vercel-Abhängigkeit.

Ziel: `maxp-dotcom/thailand-explorer`, Base Path `/thailand-explorer/`. **Pages-Veröffentlichung ausdrücklich freigegeben.** Der Workflow behält die Repository-Variable PAGES_PUBLISH_ENABLED=true, den main-Branch, den Ausschluss von Pull Requests und erfolgreiche Tests als Deployment-Bedingungen bei. Ein erfolgreicher Deployment-Lauf und der Abruf der Website bestätigen anschließend die Veröffentlichung.

```sh
npm ci
npm test
npm run build
npm run test:production
```

Node 24 empfohlen. `npm run dev` und `npm run preview` sind für lokale Browserprüfungen vorgesehen. `.openai/hosting.json` gehört zum bisherigen Hosting und wird nicht für GitHub Pages gebraucht oder in den bereinigten GitHub-Export kopiert.

[Deployment-Anleitung, Freigabesperre und Prüfung](docs/GITHUB-PAGES.md)

Mit `npm run export:github` wird unter `release/thailand-explorer-github.zip` ein bereinigtes Quellpaket ohne Git-Verlauf, Hosting-Identität, lokale Daten oder Zugangsdaten erstellt. Dieser Befehl veröffentlicht nichts.

## Architektur

- `dist/catalog.js`, `dist/data.js`, `dist/bangkok.js`: 20 Destinationen mit 16 bestätigten Besuchen von Max, 16 Interessenkategorien, erhaltener Datenkompatibilität und strukturiertem Bangkok-Guide; sechs Flughafencodes. Die Datenbank ist ein kuratierter Ausschnitt.
- `dist/explorer.js`, `dist/explorer-model.js`, `dist/map-view.js`: Filter, synchronisierte Karte, Vergleich, Detailansichten und interaktive Bangkok-Planungshilfen.
- [Umsetzung und Pflege](docs/THAILAND-EXPLORER.md), [Koordinatenquellen](docs/COORDINATES.md).
- `dist/engine.js`: reine deterministische Funktionen für Validierung, Kandidatensuche, Nächteverteilung, Tagesplanung, saisonale Bewertung und Reihenfolgeoptimierung. Keine Abhängigkeit von DOM, Speicherung oder Hosting.
- `dist/share-plan.js`: validierte, versionierte Reiseplan-Links mit einem begrenzten Datenumfang.
- `dist/app.js`: Eingabeentwurf getrennt von zuletzt berechneter Reise. Routenvergleich, Karte, Änderungen, Rückgängig, Tagesansicht, lokale Speicherung und Text-Export.
- `dist/map.json`: lokale Länderumrisse aus Natural Earth / geo-countries. Route und Marker basieren auf geografischen Koordinaten. Gestrichelte Linien sind keine Verkehrswege. Quelle: https://github.com/datasets/geo-countries (abgerufen 15.11.2026, Natural Earth public domain).
- `tests/`: Regeln und Invarianten sowie DOM-Interaktionen. DOM-Prüfungen ersetzen keine visuelle Browserprüfung.

## Planungsregeln 1.1

Die Reisedauer umfasst Ankunft und Abreise: 15 Tage entsprechen 14 Nächten. Die Flughafendestinationen bilden feste Anker. Nicht priorisierte Interessen bleiben zulässig. Prioritäten sind 0/1/2, ohne Ausschlussfilter. Die letzte Flughafenbasis erhält bei mehreren Aufenthalten mindestens eine Nacht; Transferpuffer und freier Abreisetag vermeiden unmittelbare ungeprüfte Anschlüsse.

Die Suche betrachtet bis zu 65 vielversprechende Teilrouten je Suchtiefe. Je nach Profil, Tempo und Transferbereitschaft ist die Anzahl von Aufenthalten begrenzt. Mindestnächte und das Gesamtbudget sind harte Bedingungen; die fünf Bewertungskriterien bestimmen die Auswahl. Nahezu gleich gut bewertete unterschiedliche Alternativen werden bevorzugt, zusätzliche Ortswechsel sind kein Selbstzweck. Ein globales Optimum wird nicht garantiert. Kurze Reisen dürfen identische Alternativen haben. Wenn keine Route die Bedingungen erfüllt, erscheint eine Erklärung.

Nächte werden anhand von Interessen und Aufenthaltslänge verteilt. Ankunft reserviert 0,5 Tage, Transfers 0,5 oder 1 ganzen Planungstag, Abreise den ganzen Tag. Dies sind vorsichtige Modellannahmen, **keine verifizierten Reisezeiten**. Auf einem ganztägigen Transfer wird keine weitere Aktivität eingeplant. Der finale Flughafentag steht für die Abreise zur Verfügung. Unbestätigte Verbindungen können weitere Puffer erfordern.

Vielfalt misst unterschiedliche tatsächlich geplante Erlebnisarten (von 16). Interessenabdeckung misst deren gewichteten Anteil an den Wünschen. Transferkomfort misst einen relativen geografischen Aufwand; Aufenthaltsqualität berücksichtigt Puffer und knappe Mindestaufenthalte. Die saisonale Eignung ist nach Nächten gewichtete Monatsheuristik über alle Aufenthaltsdaten. Sie berücksichtigt Regen- und Seegangsrisiken nach Küste, Hitze und mögliche Rauchbelastung im Norden. Sie ist keine aktuelle Wettervorhersage oder bestätigte Parköffnung.

Alle Kriterien werden normalisiert. Die effektiven Gewichte und Regeln sind in der Ergebnisoberfläche nachlesbar. Transportmittel werden als zu prüfende Optionen dargestellt. Es werden keine konkreten Fähren, Flugverbindungen, Fahrzeiten oder Verfügbarkeiten behauptet.

Bei Hinzufügen, Entfernen oder Austausch bleiben Flughafenanker fest, Nächte werden neu zugeteilt und die Reihenfolge wird für den gewählten Ortsbestand optimiert. Manuelles Verschieben respektiert die gewählte Reihenfolge und bewertet sie sofort neu; ein gesonderter Optimierungsknopf erlaubt anschließend die automatische Neuordnung. Unmögliche Änderungen verändern den bestehenden Plan nicht. Ein Rückgängig-Schritt ist möglich.

Tagesausflüge nach Hong Islands und Railay nutzen volle Tage ab Krabi, ohne einen zusätzlichen Unterkunftswechsel. Ausflugswege fließen in den Transferaufwand ein. Hong Islands wird nicht als Übernachtungsbasis verwendet. Ein optionaler Max-Filter beschränkt Ziele auf bestätigte Besuche; eine weiche Tourismuspräferenz bevorzugt ruhigere Ziele.

## Reale Daten ergänzen

`evaluate`, `generateRoutes` und `optimizeOrder` akzeptieren ein austauschbares `TransportProvider`-Objekt:

```js
estimate(fromDestination, toDestination, { date, pace, tolerance })
// => { from, to, effort, buffer, label, options, verified, source,
//      crossCoast?, evidenceUrl?, ... }
```

`effort` ist eine dimensionslose Kostenkennzahl, `buffer` reservierte Tage. Der Heuristikprovider liefert `verified:false` und keinerlei Fahrtdauer oder konkrete Verbindung. Für reale Daten zuerst einen asynchronen, serverseitigen Datenabruf mit Datum, Gültigkeit und Quellenbelegen durchführen, dann einen synchronen Provider aus dem validierten Datensnapshot an die reine Engine übergeben. Zugangsschlüssel gehören auf den Server. Vor einer Anzeige konkreter Zeiten/Verbindungen sind die UI, Übernachtungs- und Anschlussregeln entsprechend zu erweitern. Der derzeitige Anbieter-Demonstrationstest verifiziert nur die austauschbare Schnittstelle; es ist kein Liveanbieter angeschlossen.

Eine spätere KI kann Kandidaten und Beschreibungen vorschlagen. Die vorhandene Regelengine sollte jeden Vorschlag weiterhin auf Flughäfen, Tagesbudget, Aufenthaltsminima, saisonale Eignung und belastbare Transportnachweise prüfen. Aktuelle Sperren und zwingend notwendige Übernachtungen müssen dann harte Datenbedingungen werden, nicht nur Hinweise. Reale Transportdaten können Umplanungen und eine neue Nächteverteilung erfordern.

## Verifikationsgrenzen

Kein CUA-Browserwerkzeug in dieser Ausführungsumgebung verfügbar; kein visueller oder realer Browser-End-to-End-Test durchgeführt. Automatisierte Engine- und DOM-Tests sowie Syntaxprüfungen sichern die implementierte Logik ab. Reise- und Saisonannahmen sind nicht als live verifiziert zu verstehen.
