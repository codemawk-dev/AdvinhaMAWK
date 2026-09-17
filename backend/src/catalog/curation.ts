import { normalizeName, normalizeTitle } from './normalization.js';
// Editorial recognition hints, not measured popularity. Update through playtests and admin weights.
const hints: Record<string, string[]> = {
  'Jorge & Mateus': ['Sossegue', 'Os Anjos Cantam', 'Pode Chorar'],
  'Henrique & Juliano': ['Cuida Bem Dela', 'Liberdade Provisória'],
  'Marília Mendonça': ['Infiel', 'Todo Mundo Vai Sofrer'],
  'Chitãozinho & Xororó': ['Evidências'],
  'Thiaguinho': ['Ousadia & Alegria', 'Falta Você'],
  'Zeca Pagodinho': ['Deixa a Vida Me Levar', 'Verdade'],
  'Raça Negra': ['Cheia de Manias', 'É Tarde Demais'],
  'MC Ryan SP': ['Tubarão Te Amo'],
  'MC Marcinho': ['Glamurosa'],
  'Claudinho & Buchecha': ['Só Love', 'Quero Te Encontrar'],
  'Matuê': ['Máquina do Tempo', 'Kenny G', 'Anos Luz'],
  "Racionais MC's": ['Vida Loka, Pt. 2', 'Diário de um Detento'],
  'Anitta': ['Show das Poderosas', 'Bang', 'Envolver'],
  'Ludmilla': ['Hoje', 'Cheguei'],
  'Ivete Sangalo': ['Sorte Grande', 'Festa', 'Quando a Chuva Passar'],
  'Daniela Mercury': ['O Canto da Cidade'],
  'Wesley Safadão': ['Camarote', 'Ar Condicionado no 15'],
  'Luiz Gonzaga': ['Asa Branca', 'Xote das Meninas'],
  'João Gomes': ['Meu Pedaço de Pecado'],
  'Caetano Veloso': ['Sozinho', 'Você É Linda', 'Sampa'],
  'Tim Maia': ['Não Quero Dinheiro (Só Quero Amar)', 'Gostava Tanto de Você', 'Azul da Cor do Mar'],
  'Gonzaguinha': ['O Que É, O Que É?', 'O Que É O Que É', 'Explode Coração'],
  'Legião Urbana': ['Tempo Perdido', 'Pais e Filhos', 'Eduardo e Mônica'],
  'Rita Lee': ['Mania de Você', 'Ovelha Negra', 'Lança Perfume'],
};
const normalized = new Map(Object.entries(hints).map(([artist, titles]) => [normalizeName(artist), new Set(titles.map(normalizeTitle))]));
export function editorialWeights(artist: string, title: string) {
  return normalized.get(normalizeName(artist))?.has(normalizeTitle(title))
    ? { popularityWeight: 3, difficultyWeight: 0.9 }
    : { popularityWeight: 1, difficultyWeight: 1 };
}
