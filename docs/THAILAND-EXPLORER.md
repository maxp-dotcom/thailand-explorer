# Thailand Explorer 1.1 — Umsetzung und Pflege

## Bestehende Anwendung und Verträglichkeit

Die vorhandene statische Sabai-Anwendung wurde erweitert. Hosting-ID, Zugriffskreis, grüne/cremefarbene Gestaltung, Schrift, ursprüngliche zwölf Destinations-IDs, Prioritäten-IDs, drei Routenprofile, Ortsänderungen, Rückgängig, Export und Speicherung bleiben erhalten. Die acht bestehenden Guide-Ziele wurden angereichert, acht neue ergänzt. Ayutthaya, Kanchanaburi, Chiang Rai und Krabi bleiben als zusätzliche Ziele vorhanden. Ihr Besuchsstatus und Tourismusgrad sind unbekannt.

`localStorage['sabai-plan-v1']` bleibt das Speicherformat für Reisen. Alte Eingaben mit acht Prioritäten bekommen acht weitere Kategorien mit neutralem Gewicht 0. Bestehende gespeicherte Ortsreihenfolgen werden wiederhergestellt. Neue Routenfelder `dayTrips` sind optional, der Standard ist eine leere Liste. Eine DOM-Regression lädt ausdrücklich einen gespeicherten Altstand mit Bangkok → Kanchanaburi → Krabi → Phuket und prüft, dass alle vier IDs in derselben Reihenfolge erhalten bleiben. Vergleichslisten nutzen separat `sabai-compare-v1`.

## Inhalt und Datenmodell

- `dist/catalog.js`: redaktionell pflegbare strukturierte Daten für 20 eindeutige Destinationen. Genau die 16 im Auftrag genannten Ziele haben `visitedByMax: true`. Unbekannt ist `null`, ein ausdrücklich bestätigtes Nicht-Bereist wäre `false`. Fehlende persönliche Notizen bleiben leer, Bewertungen `null`.
- `dist/data.js`: Verbindung zum bestehenden Katalog und zur Engine. Alte Aktivitäten und Scores bleiben erhalten. `coordinates` und `recommendedStay` sind kanonisch; Getter für `lat`, `lon` und `min` halten die Engine kompatibel. Geografische Cluster sind für die Logistik von redaktionellen Regionsfiltern getrennt.
- `dist/bangkok.js`: vier empfohlene Hotelgegenden, Unterkunftsbeispiele mit eindeutiger Planungseinordnung, Gruppenlogistik, unterschiedliche Flughafenzugänge, öffentliche Verkehrsmittel, Stadtviertel, Kulinarik, Nachtleben, Silvester und außergewöhnliche Erlebnisse. Die Daten sind auch auf dem normalisierten Bangkok-Objekt zugänglich.
- `dist/explorer-model.js`: pure Filter- und Sortierlogik. Suche in Namen, Region, Provinz, Beschreibung und Highlights. Besucht/unbesucht/unbekannt bleiben getrennt. Kategorien unterstützen ODER bzw. UND. Tourismusbereiche schließen fehlende Einstufungen aus, sobald der Bereich eingegrenzt ist; der volle Bereich zeigt auch unbewertete Ziele.
- `dist/explorer.js`: Explorer, Guide, Hash-basierte Detailansichten, Vergleich bis vier Ziele, filtergleiche Kartenmarker, Gruppenbudget und Silvester-Planungshilfe. Detailansichten sind unter `#destination/<id>` direkt erreichbar. Explorer-Filter verändern einen vorhandenen Reiseplan nicht automatisch; die explizite Aktion „Zum Trip“ verbindet beide Bereiche.
- `dist/map-view.js`: gemeinsame lokale Länderumrisse, Projektion und zwischengespeicherter Abruf der bestehenden Karte. Nahe Marker werden im Explorer gruppiert, um alle Ziele über eine Auswahl erreichbar zu halten. Gruppierung, Zoom und Karten-Pop-up folgen den gefilterten Daten.

Alle Reisebeschreibungen stammen aus dem gelieferten redaktionellen Auftrag. Der Visit-Badge belegt ausschließlich einen Besuch der Destination. Einzelne Hotels, Restaurants, Veranstaltungen und Aktivitäten sind dadurch nicht als von Max ausprobiert bestätigt. VELA und die weiteren Unterkunftsbeispiele werden als frühere Planungsoptionen beschrieben. Persönliche Notizen sind nicht aus allgemeinen Reiseinformationen abgeleitet. Es werden keine Namen oder Buchungsdetails von Mitreisenden übernommen.

## Reiseplanung

16 Kategorien verwenden die vorhandenen Prioritätswerte 0/1/2. Der neue Max-Schalter ist eine echte Einschränkung: Alle Übernachtungsziele einschließlich Flughafenorte müssen einen bestätigten Besuch haben. KBV ist daher in diesem Modus nicht möglich, solange Krabis Besuchsstatus unbekannt ist. Die Oberfläche erklärt diese Einschränkung; ein Flughafenort wird nicht stillschweigend umbenannt oder als bereist markiert.

„Möglichst wenig Massentourismus“ ist eine weiche Präferenz. Die nach Übernachtungen gewichtete Belastung für Tourismusgrade über 2 kann die Gesamtpassung um bis zu 6 Punkte vermindern. Fehlende Tourismusdaten gelten als unbekannt mit neutraler Modellannahme 3 und einem Hinweis; sie werden nicht als besonders ruhige Ziele ausgegeben.

Hong Islands hat `destinationType: 'dayTrip'` und `overnightAllowed: false`. Es wird nie als reguläre Übernachtungsbasis generiert. Railay unterstützt beide Varianten. Beide Ausflüge sind in diesem MVP ab Krabi planbar. Ein gewählter Ausflug erhält einen ganzen freien Erlebnistag ohne Transferpuffer einer Unterkunftsverlagerung. Er belegt weder Ankunft noch Abreise. Die nötigen Nächte der Basis werden vor der Verteilung übriger Nächte reserviert. Hin- und Rückweg fließen als unbestätigte geografische Aufwandsschätzung in den Transferkomfort ein; ihre Zeit ist im Ausflugstag enthalten. Die Unterkunftswechselzahl bleibt gleich, wenn die Basis bereits existiert.

Fehlt die Ausflugsbasis beim Hinzufügen aus dem Explorer, wird Krabi als notwendige Basis ergänzt, wenn das Budget reicht, und die Ergänzung ausdrücklich gemeldet. Mit aktivem Max-Modus scheitert dies transparent an Krabis unbekanntem Status. Ein bestehender Ausflug lässt sich entfernen und zurücknehmen. Die Basis kann erst entfernt oder ausgetauscht werden, wenn abhängige Ausflüge entfernt sind. Die Ausflüge werden in der Routenkarte gesondert dargestellt und im Tagesplan/Export genannt.

BKK und DMK bleiben unterschiedliche Flughafen-Codes in Eingaben, Export und `airportAccess`. Beide gehören geografisch zur Übernachtungsdestination Bangkok, erhalten aber unterschiedliche Anreisehinweise. Ein Wechsel zwischen den Flughäfen erzeugt einen ausdrücklichen Hinweis. Die Engine gibt keine vermeintlich identischen Flughafen-Transfers oder bestätigten Fahrzeiten aus.

Die monatlichen Saisonhinweise wurden um die Trat-Inselgruppe ergänzt. Ein Aufenthalt in Bangkok am 31. Dezember verweist auf die Silvesterplanung. Der New-Year-Check vergleicht grobe Hotel- und Veranstaltungsgegenden und gibt eine Prüfliste für den Rückweg aus. Aktuelle Straßensperren, Sichtachsen, Veranstaltungen oder Sonderfahrpläne werden nicht als bestätigt ausgegeben.

## Bildrechte und Quellen

Es gab im bisherigen Projekt keine Destinationsfotos. Alle 20 Kartenbilder sind eigene, lokal gespeicherte SVG-Illustrationen unter `dist/images/`, als „Illustration · kein Ortsfoto“ gekennzeichnet und unter CC0-1.0 zur Verfügung gestellt. Sie zeigen eine stilisierte Reiseatmosphäre, keine verifizierte Ortsansicht. Dadurch gibt es keine erfundenen Bild-URLs, fremden Bildrechte oder Live-Abhängigkeiten. Spätere Fotos benötigen je Bild einen belegten Ursprung, Fotografen, Lizenz und aussagekräftigen Alttext.

Koordinaten wurden am 15.11.2026 mit geografischen Referenzen abgeglichen. Quellen, Orientierungsart und Datum sind je Destination in `coordinateSource` gespeichert und in den Details abrufbar. [COORDINATES.md](COORDINATES.md) dokumentiert alle Werte. Bei Hong Islands ist der geprüfte Wert ein Orientierungspunkt aus einer südlichen Ankerplatzreferenz für Koh Hong in Krabi, ausdrücklich keine Anlegestellen- oder Navigationsempfehlung. Die gleichnamige Insel in Phang Nga wurde als falscher Treffer verworfen.

Die vorhandenen Länderumrisse aus Natural Earth / geo-countries wurden weiterverwendet.

## Prüfung

`npm test`: 22 erfolgreiche Tests. Abgedeckt sind die bisherigen elf Engine-Prüfungen, Katalog/Quellen/lokale Bilder, die Tri-State-Besuchslogik, alle Filterkombinationen und Sortierungen, alle 16 Kategorien, Tagesausflüge und Flughafenbasis-Nächte, Max-Modus, Tourismuspräferenz, BKK/DMK, Bangkok-Silvesterhinweise, Zimmerbudget und der allgemeine Silvester-Check. Der DOM-Regressionstest prüft gespeicherte Altplanung, Filter/Marker, leere Ergebnisse, Vergleich, Bangkok-Abschnitte, Lageauswahl, Budget, sichere Texteingaben, Tagesausflug hinzufügen/entfernen und die bisherigen Routenaktionen.

Syntaxprüfung aller ES-Module sowie `git diff --check` sind erfolgreich. Layout-Regeln decken große Desktops, Tablets sowie 600/370-Pixel-Breakpoints ab; Karten, Formulare, Detailabschnitte und Vergleiche passen sich an bzw. besitzen einen explizit scrollbar gekennzeichneten Tabellenbereich.

Es steht kein CUA-/Browserwerkzeug in dieser Umgebung bereit. Eine visuelle Desktop-/Mobilprüfung, echte Touch-Interaktionen und Browser-End-to-End-Tests konnten nicht durchgeführt werden. DOM-Tests belegen die Bedienlogik, nicht die gerenderte Darstellung. Keine zusätzlichen Browser wurden installiert. Reale Verkehrsdaten, aktuelle Hotelpreise, Veranstaltungen oder Wetterdaten sind weiterhin nicht angeschlossen.
