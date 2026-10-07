export const batteryGuide = `🔋 *Fire TV — risparmio energetico per qualsiasi app*

Per Fire TV con Fire OS basato su Android e ADB disponibile. Aiuta le app in background: non risolve APK incompatibili e non garantisce l'avvio automatico o l'esecuzione continua.

1. *Attiva Debug ADB*
Impostazioni → La mia Fire TV (o Dispositivo e software) → Informazioni → premi 7 volte sul nome del dispositivo. Torna indietro → Opzioni sviluppatore → Debug ADB. Le voci possono variare.

2. *Trova l'IP*
Informazioni → Rete. Telefono e Fire TV devono essere sulla stessa rete locale fidata.

3. *Sul telefono Android*
Installa [Termux da F-Droid](https://f-droid.org/en/packages/com.termux/), poi esegui:
\`pkg update && pkg install android-tools -y\`
Connettiti sostituendo l'IP:
\`adb connect 192.168.1.XX:5555\`
Accetta l'autorizzazione sulla TV. “Consenti sempre” solo per dispositivi tuoi e fidati.

4. *Trova il pacchetto dell'app già installata*
\`adb shell pm list packages -3\`
Mostra le app non di sistema. Per cercare, per esempio:
\`adb shell pm list packages stremio\`
Il nome del pacchetto può essere diverso dal nome dell'app: se non trovi risultati usa l'elenco completo e controlla con lo sviluppatore. Copia solo il nome dopo “package:”.

5. *Escludi la tua app*
Sostituisci NOME.PACCHETTO con il pacchetto esatto, senza “package:”:
\`adb shell dumpsys deviceidle whitelist +NOME.PACCHETTO\`
Ripeti per ogni app desiderata. Non incollare il segnaposto letteralmente.

6. *Verifica*
\`adb shell dumpsys deviceidle whitelist\`
Controlla che compaia il tuo pacchetto. Se ottieni un errore o “Permission denied”, l'esenzione non è confermata: non usare comandi casuali per aggirarlo.

↩️ *Annulla solo questa esenzione*
\`adb shell dumpsys deviceidle whitelist -NOME.PACCHETTO\`

Non serve pm grant REQUEST_IGNORE_BATTERY_OPTIMIZATIONS: non è un permesso runtime concedibile così. L'esenzione non elimina tutte le restrizioni di Fire OS; dopo riavvii, aggiornamenti o reinstallazioni ricontrollala, senza considerarla garantita per sempre.

Quando hai finito:
\`adb disconnect\`
Disattiva Debug ADB se non ti serve. Non esporre la porta ADB su Internet.`;
