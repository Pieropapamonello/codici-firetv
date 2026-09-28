# Importazione fonti Downloader — 28 settembre 2026

Fonti richieste: WebAssistanceITA, KPFire (Linktree), DownloaderCodes.

- 51 voci/varianti aggiuntive nel piano revisionato; 8 codici abbinati a download già presenti.
- 71 immagini delle app scaricate senza modifiche in `public/assets/catalog/`; provenienza e URL originali in `scripts/source-icon-checks-20260928.json`. I loghi identificano i rispettivi prodotti, non un’affiliazione.
- Codici estratti il 27 settembre e destinazioni osservate sulle pagine AFTVnews. Il controllo HEAD dei download è del 28 settembre. Non è una verifica delle firme o del contenuto degli APK.
- Le pagine web hanno il pulsante “Apri pagina”. Le informazioni sulla fonte sono richiudibili nella scheda della variante.
- Nessun codice è abbinato a un’architettura soltanto in base al nome dell’app. Se un aggiornamento cambia il download, il codice importato legato al vecchio URL non viene più proposto.
- Le voci già presenti non vengono cancellate né rinominate; le corrispondenze certe ricevono solo i campi del codice e della sua provenienza. Le varianti rimangono raggruppate nell’interfaccia.
- Esclusi codici per prodotti differenti (MegaBoxHD → Tubio; Movye → Nebulo; Spotify → DNS Changer), collegamenti non confermati, falsi APK che restituiscono HTML e pacchetti KPFire esplicitamente modificati/non identificati. Non tutti gli elementi dei siti sono quindi pubblicati.
- Importazione una tantum, non nuovo cron. Nessun messaggio Telegram, timestamp di rilascio o notifica di “nuova versione” generati dall’importazione.

## Riproduzione e tutela dei dati

`parse-catalog-source.mjs` estrae dati strutturati senza eseguire script dei siti. Gli snapshot di ricerca e il piano revisionato sono in `scripts/`. `plan-source-import.mjs` produce un piano preliminare, **non** scrive nel database. Il piano preliminare deve passare anche il controllo link e la revisione prima di essere applicato.

`apply-source-import.ps1` mostra il riepilogo; `-Apply` applica solo `source-import-reviewed-20260928.json`, acquisendo la stessa lease dei cron, controllando i valori attesi e verificando i dati dopo la scrittura. Le credenziali restano in memoria. Backup pre-importazione: `C:/Users/vitob/Downloads/codici-firetv-before-source-import-20260928.json`.

Il ripristino, se richiesto, consiste nel rimuovere esclusivamente gli ID `source_…` del piano e ripristinare dal backup i soli campi arricchiti, previo confronto con lo stato corrente. Non sostituire l’intero database con il backup.
