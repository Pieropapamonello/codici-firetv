export function categoryDescription(category) {
  const rules=[
    [/browser/i,'Browser per navigare sul web. La compatibilità con il telecomando dipende dall’app e dal dispositivo.'],
    [/player iptv/i,'Lettori per le tue liste IPTV: richiedono sorgenti o abbonamenti forniti dall’utente.'],
    [/media center/i,'Media center per organizzare e riprodurre video con le proprie sorgenti. Scegli la variante TV o Mobile e l’architettura corretta.'],
    [/componenti aggiuntivi/i,'Componenti e servizi da configurare con il proprio player e le proprie sorgenti.'],
    [/vpn|proxy/i,'Strumenti per connessioni VPN e proxy: controlla requisiti, configurazione e compatibilità.'],
    [/rete|diagnostica/i,'Strumenti per controllare connessione, rete locale e prestazioni del dispositivo.'],
    [/gioch|emulaz/i,'App per giochi, emulazione e accessori: verifica hardware e sistemi supportati.'],
    [/windows|pc/i,'Software destinato al computer: non installare i pacchetti Windows sulla Fire TV.'],
    [/file|archivi/i,'Strumenti per gestire file, cartelle e archivi. Controlla i permessi richiesti.'],
    [/launcher/i,'Strumenti per personalizzare la schermata iniziale: verifica prima la compatibilità con il tuo sistema.'],
    [/installazione|apk|store/i,'Strumenti e cataloghi per installare app. Verifica sempre provenienza e compatibilità dei file.'],
    [/streaming|diretta/i,'App per la riproduzione di contenuti: disponibilità, diritti e abbonamenti dipendono dalle sorgenti utilizzate.']
  ];
  return rules.find(([pattern])=>pattern.test(category))?.[1] || `App e strumenti per ${category.toLowerCase()}. Controlla dispositivo e requisiti prima di scaricare.`;
}
