
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// File da modificare
const configPath = path.join(__dirname, 'public', 'firebase-config.js');

try {
  // Leggi il file corrente
  let content = fs.readFileSync(configPath, 'utf8');

  // Mappa delle variabili d'ambiente da sostituire
  const replacements = {
    'FIREBASE_API_KEY_PLACEHOLDER': process.env.FIREBASE_API_KEY,
    'FIREBASE_AUTH_DOMAIN_PLACEHOLDER': process.env.FIREBASE_AUTH_DOMAIN,
    'FIREBASE_PROJECT_ID_PLACEHOLDER': process.env.FIREBASE_PROJECT_ID,
    'FIREBASE_STORAGE_BUCKET_PLACEHOLDER': process.env.FIREBASE_STORAGE_BUCKET,
    'FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER': process.env.FIREBASE_MESSAGING_SENDER_ID,
    'FIREBASE_APP_ID_PLACEHOLDER': process.env.FIREBASE_APP_ID,
    'FIREBASE_DATABASE_URL_PLACEHOLDER': process.env.FIREBASE_DATABASE_URL
  };

  // Esegui le sostituzioni
  let hasMissingVars = false;
  // Use replace all occurences if multiple? Usually 1.
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (value) {
      // UsereplaceAll if available or global regex
      content = content.split(placeholder).join(value);
      console.log(`✅ Sostituito ${placeholder}`);
    } else {
      console.warn(`⚠️  Attenzione: Variabile d'ambiente mancante per ${placeholder}`);
      hasMissingVars = true;
    }
  }

  // Sovrascrivi il file
  fs.writeFileSync(configPath, content);
  console.log('🎉 firebase-config.js aggiornato con successo!');

} catch (err) {
  console.error('❌ Errore durante la build:', err);
  process.exit(1);
}
