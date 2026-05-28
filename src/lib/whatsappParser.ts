// Extracted from ImportList.tsx — pure parser for WhatsApp player lists.
import type { ParsedPlayer, ParsedPlayers } from "./teamsGenerator";

export function parseWhatsAppList(text: string): ParsedPlayers {
  const lines = text.split('\n').filter(line => line.trim() !== '');
  const main: ParsedPlayer[] = [];
  const goalkeepers: ParsedPlayer[] = [];
  const substitutes: ParsedPlayer[] = [];
  let currentSection: 'main' | 'goalkeepers' | 'substitutes' = 'main';

  lines.forEach(line => {
    const trimmedLine = line.trim();
    const lowerLine = trimmedLine.toLowerCase();

    if (lowerLine.startsWith('goleiro') || lowerLine === 'goleiros:' || lowerLine === 'goleiros') {
      currentSection = 'goalkeepers';
      return;
    }
    if (
      lowerLine.startsWith('suplente') ||
      lowerLine.startsWith('reserva') ||
      lowerLine === 'suplentes:' ||
      lowerLine === 'suplentes' ||
      lowerLine === 'reservas:' ||
      lowerLine === 'reservas'
    ) {
      currentSection = 'substitutes';
      return;
    }

    const isSeed = /[*#@]/.test(trimmedLine);
    let seedLevel = 0;
    if (isSeed) {
      const levelMatch = trimmedLine.match(/[*#@](\d+)/);
      seedLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;
    }

    let cleanedName = trimmedLine
      .replace(/^[\d\.\-\)]+\s*/, '')
      .replace(/^[:\-\s]+/, '')
      .replace(/[*#@]\d*/g, '')
      .trim();
    if (cleanedName.includes(':')) {
      cleanedName = cleanedName.split(':').pop()?.trim() || '';
    }
    cleanedName = cleanedName.replace(/[^\p{L}\s]/gu, '').trim();

    if (cleanedName && cleanedName.length > 1) {
      const player: ParsedPlayer = { name: cleanedName, isSeed, seedLevel };
      if (currentSection === 'main' && main.length < 30) {
        main.push(player);
      } else if (currentSection === 'goalkeepers') {
        goalkeepers.push(player);
      } else {
        substitutes.push(player);
      }
    }
  });

  return { main, goalkeepers, substitutes };
}
