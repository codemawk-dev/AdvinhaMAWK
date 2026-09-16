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
artistGroups.sertanejo!.artists.push('João Bosco & Vinícius', 'Victor & Leo', 'César Menotti & Fabiano', 'Edson & Hudson', 'Rick & Renner', 'João Paulo & Daniel', 'Chrystian & Ralf', 'Rio Negro & Solimões', 'Eduardo Costa', 'Michel Teló', 'Israel Novaes', 'Lucas Lucco', 'Cristiano Araújo', 'Felipe Araújo', 'Marcos & Belutti', 'João Neto & Frederico');
artistGroups.mpb!.artists.push('Tom Jobim', 'Vinicius de Moraes', 'João Gilberto', 'Toquinho', 'Ivan Lins', 'Leila Pinheiro', 'Zizi Possi', 'Zélia Duncan', 'Lenine', 'Zeca Baleiro', 'Flávio Venturini', 'Beto Guedes', 'Lô Borges', 'Oswaldo Montenegro');
artistGroups.pagode_samba!.artists.push('Nelson Cavaquinho', 'Adoniran Barbosa', 'Noel Rosa', 'Nelson Sargento', 'Wilson Moreira', 'Bezerra da Silva', 'Dudu Nobre', 'Diogo Nogueira', 'Teresa Cristina', 'Leci Brandão');
artistGroups.rock!.artists.push('Biquini Cavadão', 'Nenhum de Nós', 'Ira!', 'Kid Abelha', 'Pato Fu', '14 Bis', 'Camisa de Vênus', 'Tihuana', 'Dead Fish', 'Moptop');
artistGroups.pop!.artists.push('Sandy', 'Wanessa Camargo', 'Lexa', 'Kell Smith', 'Vitão', 'Duda Beat', 'ANAVITÓRIA', 'Clarice Falcão', 'Tiê', 'Roberta Campos');
artistGroups.pop!.artists.push('Carol Biazin', 'Jovem Dionisio', 'Lagum', 'Gilsons', 'Rubel', 'Liniker', 'Rachel Reis');
artistGroups.trap_rap!.artists.push('Baco Exu do Blues', 'Yunk Vino', 'Froid', 'Sant', 'Sidoka', 'Derek', 'Duquesa', 'Tasha & Tracie');
artistGroups.sertanejo!.artists.push('Yasmin Santos', 'Léo & Raphael', 'Diego & Victor Hugo', 'Ícaro & Gilmar', 'João Carreiro');
artistGroups.forro!.artists.push('Iguinho e Lulinha', 'Vitor Fernandes', 'Eric Land', 'Raí Saia Rodada');
artistGroups.funk!.artists.push('MC Davi', 'MC Menor JP', 'MC Tuto', 'MC Paiva', 'MC Pipokinha', 'MC Dricka', 'MC Zaac', 'MC Fioti', 'MC WM', 'MC Kekel');
artistGroups.pagode_samba!.artists.push('Grupo Vou pro Sereno', 'Grupo Clareou', 'Grupo Kamisa 10', 'Di Propósito', 'Vitinho', 'Suél', 'Tiee', 'Chininha', 'Grupo Bom Gosto');
export const artistAliases: Record<string, string[]> = {
  'Tom Jobim': ['Antônio Carlos Jobim', 'Antonio Carlos Jobim'],
  'Rio Negro & Solimões': ['Rionegro & Solimões'],
  'Biquini Cavadão': ['Biquini'],
  'Paralamas do Sucesso': ['Os Paralamas do Sucesso'],
  'MC Kevinho': ['Kevinho'],
  'MC Kevin o Chris': ['Kevin O Chris'],
  'Detonautas': ['Detonautas Roque Clube'],
  'DENNIS': ['Dennis DJ'],
  'Menos é Mais': ['Grupo Menos É Mais'],
  'Hungria Hip Hop': ['Hungria'],
};
