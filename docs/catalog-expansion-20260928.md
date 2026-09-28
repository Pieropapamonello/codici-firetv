# Seconda espansione del catalogo

Confronto delle fonti richieste, 28 settembre 2026:

- KPFire: 182 collegamenti alle app, incluse le varianti e un bundle APKS. Esclusi pubblicità, donazioni e link per adulti.
- DownloaderCodes: 39 schede della home rilette; il parser ora riconosce anche la struttura delle pagine VPN e le immagini caricate in ritardo.
- WebAssistanceITA: codici dell’elenco già estratti; i collegamenti precedentemente esclusi sono stati ritentati.

Piano revisionato: **191 voci/varianti aggiuntive**, corrispondenti a **92 famiglie di app non presenti prima**; le altre ampliano le varianti di prodotti esistenti. **17** delle nuove voci hanno il codice Downloader della fonte. Un ulteriore codice arricchisce la voce Surfshark esistente. **85 icone locali aggiuntive**, con loghi uniformi per prodotto. Tutte le nuove voci dispongono di una descrizione, una categoria funzionale e di un’icona risolvibile.

Le varianti KPFire conservano versione, piattaforma e diciture Prem/Mod/Ad Free della fonte, senza trasformarle in certificazioni di autenticità o licenza. I pacchetti modificati non sono stati eseguiti né verificati sul dispositivo. I link sono controllati mediante HEAD e, quando necessario, GET dei soli header: non è un’analisi antivirus o della firma.

## Esclusioni esplicite

Non si dichiara una copertura del 100% dei download elencati dai distributori:

- 54 candidati non hanno un collegamento confermato dopo i controlli e non vengono pubblicati con un pulsante di download guasto.
- I codici già individuati per prodotti diversi restano esclusi.
- Lo stesso file indicato sia per Netfly sia per XP Player 64 bit è ambiguo: nessuna delle due etichette viene importata automaticamente per quel file.
- Insta IPTV punta a un file `.com`, non a un APK riconoscibile: escluso.
- MovieBox TV/Mobile con lo stesso URL è una sola voce, etichettata con piattaforma da verificare.
- BS Player è un bundle `.apks`: la scheda lo segnala, senza presentarlo come APK singolo.
- Copie dello stesso download e voci già presenti non vengono aggiunte di nuovo.

Dettagli per ciascun candidato: `scripts/expansion-reviewed-20260928.json` (sezioni additions/enrichments/skipped). Osservazioni dei link e provenienza delle icone nei file `scripts/expansion-*-checks-20260928.json`.

## Applicazione

Backup pre-espansione: `C:/Users/vitob/Downloads/codici-firetv-before-expansion-20260928.json`.

```powershell
./scripts/apply-source-import.ps1 -Apply -PlanPath scripts/expansion-reviewed-20260928.json -BackupPath 'C:/Users/vitob/Downloads/codici-firetv-before-expansion-20260928.json'
```

Scrittura circoscritta, con lease condivisa con i cron, confronto dei valori precedenti e verifica successiva. Nessun timestamp di nuova release né messaggio Telegram generato. Nessuna rimozione di dati preesistenti. Questa è un’importazione revisionata, non un nuovo aggiornamento automatico delle tre fonti.
