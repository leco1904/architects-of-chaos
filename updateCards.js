// updateCards.js
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

// TRAGE HIER DEINEN KOPIERTEN GOOGLE SHEETS CSV LINK EIN:
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSzKlmRan47WB5juYx5_Gd8WaGgbfB_KODYY6Y8K-0fVvgfS_R375kB6ASujd58b6y5DCmMjUx3sgdR/pub?gid=1566842489&single=true&output=csv';
const DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbxw5VYdKotZ2hKlM0M2Sfhq2_2Gr5EcKPGWvlggoUK_M9FS5ua2m-ZQaGb0jMfbvX9U/exec'; 
const OUTPUT_PATH = './src/data/cards.json';
const IMG_BASE_DIR = './public/photos'; // Basis-Ordner für Bilder

// Hilfsfunktion: Generiert den Dateinamen exakt wie in App.jsx
function getFileName(card) {
    const isEffect = card.type === 'effect' || card.buff !== undefined;
    if (isEffect) {
        return card.name.toLowerCase().replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
    } else {
        const parts = card.name.trim().split(/\s+/);
        let lastName = parts[parts.length - 1];
        if (parts.length > 1 && ['i', 'ii', 'iii', 'iv', 'v', 'jr', 'sr'].includes(lastName.toLowerCase().replace(/[^a-z]/g, ''))) {
            lastName = parts[parts.length - 2];
        }
        return lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'unknown';
    }
}

// Hilfsfunktion: Wandelt Google Drive Share-Links in direkte Download-Links um
function getDirectLink(url) {
    if (url.includes('drive.google.com')) {
        const fileId = url.match(/[-\w]{25,}/);
        if (fileId) return `https://drive.google.com/uc?export=download&id=${fileId[0]}`;
    }
    return url;
}

async function updateCards() {
    console.log('Fetching cards from Google Sheets...');
    try {
        const response = await fetch(SHEET_CSV_URL);
        const csvText = await response.text();

        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        const cards = [];

        for (let i = 1; i < lines.length; i++) {
            // Smartes CSV Parsing: Ignoriert Kommas innerhalb von Anführungszeichen (Google Sheets Standard)
            const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const card = {};
            headers.forEach((rawHeader, index) => {
                // Entfernt umschließende Anführungszeichen und fixt doppelte Quotes
                let value = currentLine[index] ? currentLine[index].replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';
                
                // Wandle Zahlen-Strings automatisch in echte Zahlen um (wichtig für Stats!)
                if (!isNaN(value) && value !== '') value = Number(value);
                
                // 1. Mache den Header klein, damit er zu React/JSON Standards passt ("Name" -> "name")
                let key = rawHeader.toLowerCase().trim();
                
                // 2. Übersetze unvollständige Spaltennamen und camelCase aus dem Spreadsheet in die echten Game-Stats
                if (key === 'backtext') key = 'backText';
                if (key.startsWith('financ')) key = 'finance';
                if (key.startsWith('manipulat')) key = 'manipulation';
                if (key.startsWith('erosio')) key = 'erosion';
                if (key.startsWith('kingmak')) key = 'kingmaking';
                if (key.startsWith('arsena')) key = 'arsenal';
                if (key.startsWith('legitima')) key = 'legitimacy';
                // Fix: Spalte S (Syn) sicher zuordnen, auch wenn der Header unklar ist
                if (key === 's' || key === 'synergie' || key === 'synergy') key = 'syn';

                if (key !== '' && value !== '') {
                    // Fix: Syn-Feld IMMER als saubere Namens-Liste speichern
                    if (key === 'syn' || key === 'faction') {
                        card[key] = value.toString().split(',').map(s => s.trim()).filter(Boolean);
                    } else {
                        card[key] = value;
                    }
                }
            });

            // NEU: Passive Boosts für Apex & Anomaly Karten verarbeiten
            if ((card.type === 'apex' || card.type === 'anomaly') && card.passivestat && card.passiveval !== undefined) {
                card.passiveBuff = {
                    stat: card.passivestat.toString().trim().toLowerCase(),
                    val: Number(card.passiveval) || 0
                };
            }

            // Taktik-Karten Fix: Explizite Konvertierung zu Number
            if (card.type === 'effect' && card.passivestat && card.passiveval !== undefined) {
                card.stat = card.passivestat.toString().trim().toLowerCase();
                const rawVal = card.passiveval.toString().replace('%', '').trim();
                card.buffPercent = parseFloat(rawVal) || 0;
            }
            
            // Aufräumen
            delete card.passivestat;
            delete card.passiveval;

            // FIX: Nur Karten hinzufügen, die wirklich einen Namen haben! 
            // Verhindert den "undefined reading replace" Fehler bei leeren Zeilen.
            if (card.name && card.name.trim() !== "") {
                cards.push(card);
            }

            }

        // Trenne Charaktere und Effekte
        const characters = cards.filter(c => c.type !== 'effect');
        const effects = cards.filter(c => c.type === 'effect');

        const finalJson = { characters, effects };

        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalJson, null, 2));
        console.log('✅ src/data/cards.json erfolgreich aktualisiert!');
        
        // Starte danach den Bild-Sync
        await syncDriveImages();

    } catch (error) {
        console.error('❌ Fehler beim Updaten der Karten:', error);
    }
}

async function syncDriveImages() {
    console.log('Suche nach neuen Bildern im Google Drive...');
    try {
        // Wir nutzen redirect: 'follow', falls Google intern umleitet
        const response = await fetch(DRIVE_API_URL, { redirect: 'follow' });
        const responseText = await response.text(); // Erst als Text laden zum Prüfen

        let files;
        try {
            files = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ Google hat den Zugriff blockiert und eine HTML-Seite zurückgegeben!');
            console.error('FIX: Gehe in dein Google Apps Script -> "Bereitstellen" -> "Neue Bereitstellung".');
            console.error('WICHTIG: Setze "Ausführen als" auf "Mich" und "Zugriff" zwingend auf "Jeder" (Anyone)!');
            return; // Beendet den Bild-Sync sanft, ohne das Spiel crashen zu lassen
        }

        for (const file of files) {
            // Wir behalten den originalen Dateinamen (z.B. altman.png) aus dem Drive
            const fileName = file.name.toLowerCase(); 
            const targetDir = file.isEffect ? path.join(IMG_BASE_DIR, 'effects') : IMG_BASE_DIR;
            const targetPath = path.join(targetDir, fileName);

            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            if (!fs.existsSync(targetPath)) {
                try {
                    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.id}`;
                    const imgRes = await fetch(downloadUrl);
                    const buffer = await imgRes.arrayBuffer();
                    fs.writeFileSync(targetPath, Buffer.from(buffer));
                    console.log(`  📸 Neues Bild aus Drive geladen: ${fileName}`);
                } catch (err) {
                    console.error(`  ⚠️ Fehler beim Bild-Download (${fileName}):`, err.message);
                }
            }
        }
        console.log('✅ Alle Bilder sind synchronisiert!');
    } catch (error) {
        console.error('❌ Fehler beim Google Drive Sync:', error.message);
    }
}

updateCards();