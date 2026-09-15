// One administrative primary group per artist; aliases are for identity matching only.
export const artistGroups: Record<string, { name: string; artists: string[] }> = {
  sertanejo: { name: 'Sertanejo', artists: ['Jorge & Mateus', 'Henrique & Juliano', 'Gusttavo Lima', 'Zé Neto & Cristiano', 'Maiara & Maraisa', 'Marília Mendonça', 'Luan Santana', 'Matheus & Kauan', 'Simone Mendes', 'Ana Castela', 'Murilo Huff', 'Lauana Prado', 'Bruno & Marrone', 'Chitãozinho & Xororó', 'Zezé Di Camargo & Luciano', 'Leonardo', 'Daniel', 'Fernando & Sorocaba', 'Hugo & Guilherme', 'Guilherme & Benuto', 'Israel & Rodolffo', 'Clayton & Romário', 'Leandro & Leonardo', 'Milionário & José Rico', 'Sérgio Reis', 'Almir Sater', 'Tião Carreiro & Pardinho', 'Roberta Miranda', 'Paula Fernandes'] },
  pagode_samba: { name: 'Pagode e samba', artists: ['Thiaguinho', 'Sorriso Maroto', 'Ferrugem', 'Dilsinho', 'Menos é Mais', 'Belo', 'Alexandre Pires', 'Péricles', 'Exaltasamba', 'Grupo Revelação', 'Raça Negra', 'Só Pra Contrariar', 'Turma do Pagode', 'Pixote', 'Mumuzinho', 'Zeca Pagodinho', 'Alcione', 'Arlindo Cruz', 'Beth Carvalho', 'Clara Nunes', 'Cartola', 'Martinho da Vila', 'Fundo de Quintal', 'Jorge Aragão', 'Paulinho da Viola', 'Dona Ivone Lara', 'Molejo'] },
  funk: { name: 'Funk', artists: ['MC Ryan SP', 'MC Hariel', 'MC IG', 'MC PH', 'MC Kevin o Chris', 'MC Livinho', 'Pedro Sampaio', 'DENNIS', 'MC Daniel', 'MC Don Juan', 'MC Kevinho', 'Claudinho & Buchecha', 'Bonde do Tigrão', 'MC Marcinho', 'Valesca Popozuda', 'MC Leozinho'] },
  trap_rap: { name: 'Trap e rap', artists: ['Matuê', 'Teto', 'WIU', 'Veigh', 'Orochi', 'L7NNON', 'Filipe Ret', 'Djonga', "BK'", 'Xamã', 'Emicida', "Racionais MC's", 'Hungria Hip Hop', 'KayBlack', 'MC Cabelinho', 'Gabriel o Pensador', 'Criolo', 'MV Bill', 'Rashid', 'Sabotage', 'Marcelo D2'] },
  pop: { name: 'Pop brasileiro', artists: ['Anitta', 'Ludmilla', 'Luísa Sonza', 'Jão', 'IZA', 'Gloria Groove', 'Marina Sena', 'Manu Gavassi', 'Giulia Be', 'Melim', 'Vitor Kley', 'Tiago Iorc', 'Sandy & Junior', 'Kelly Key', 'Pabllo Vittar', 'Rouge', 'Lulu Santos', 'Guilherme Arantes'] },
  axe: { name: 'Axé e música baiana', artists: ['Ivete Sangalo', 'Claudia Leitte', 'Daniela Mercury', 'Bell Marques', 'Chiclete com Banana', 'Banda Eva', 'Timbalada', 'É o Tchan', 'Harmonia do Samba', 'Parangolé', 'Psirico', 'Leo Santana', 'Saulo Fernandes', 'Durval Lelys', 'Tomate', 'Olodum', 'Cheiro de Amor', 'Asa de Águia', 'Margareth Menezes'] },
  forro: { name: 'Forró e piseiro', artists: ['Wesley Safadão', 'João Gomes', 'Zé Vaqueiro', 'Tarcísio do Acordeon', 'Xand Avião', 'Aviões do Forró', 'Calcinha Preta', 'Limão com Mel', 'Mastruz com Leite', 'Nattan', 'Mari Fernandez', 'Felipe Amorim', 'Henry Freitas', 'Dorgival Dantas', 'Falamansa', 'Luiz Gonzaga', 'Dominguinhos', 'Elba Ramalho', 'Alceu Valença', 'Flávio José', 'Jackson do Pandeiro'] },
  mpb: { name: 'MPB', artists: ['Caetano Veloso', 'Gilberto Gil', 'Chico Buarque', 'Djavan', 'Maria Bethânia', 'Gal Costa', 'Milton Nascimento', 'Elis Regina', 'Marisa Monte', 'Adriana Calcanhotto', 'Ana Carolina', 'Seu Jorge', 'Vanessa da Mata', 'Tim Maia', 'Jorge Ben Jor', 'Gonzaguinha', 'Belchior', 'Zé Ramalho', 'Maria Rita', 'Nando Reis', 'Cássia Eller', 'Roberto Carlos', 'Simone', 'Fagner', 'Ney Matogrosso', 'Secos & Molhados'] },
  rock: { name: 'Rock nacional', artists: ['Legião Urbana', 'Capital Inicial', 'Titãs', 'Paralamas do Sucesso', 'Barão Vermelho', 'Cazuza', 'Charlie Brown Jr.', 'Raimundos', 'CPM 22', 'NX Zero', 'Fresno', 'Skank', 'Jota Quest', 'Pitty', 'Detonautas', 'Engenheiros do Hawaii', 'Rita Lee', 'Os Mutantes', 'Raul Seixas', 'RPM', 'Ultraje a Rigor', 'Los Hermanos', 'O Rappa', 'Chico Science & Nação Zumbi'] },
};
export const artistAliases: Record<string, string[]> = {
  'Paralamas do Sucesso': ['Os Paralamas do Sucesso'],
  'MC Kevinho': ['Kevinho'],
  'MC Kevin o Chris': ['Kevin O Chris'],
  'Detonautas': ['Detonautas Roque Clube'],
  'DENNIS': ['Dennis DJ'],
  'Menos é Mais': ['Grupo Menos É Mais'],
  'Hungria Hip Hop': ['Hungria'],
};
