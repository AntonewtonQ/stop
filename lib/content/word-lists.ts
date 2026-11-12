import { PLAYABLE_LETTERS } from "@/lib/game/constants";

/**
 * Curated example answers per letter for the public "/palavras" guides.
 * These pages exist to help players (and give the site real, useful
 * content); they are independent from the in-game validation lexicon.
 */

export const WORD_LIST_CATEGORIES = [
  "Nome",
  "País",
  "Comida",
  "Profissão",
  "Animal",
  "Cidade",
] as const;

export type WordListCategory = (typeof WORD_LIST_CATEGORIES)[number];

export type LetterGuide = {
  letter: string;
  difficulty: "fácil" | "média" | "difícil";
  tip: string;
  words: Record<WordListCategory, string[]>;
};

const guides: LetterGuide[] = [
  {
    letter: "A",
    difficulty: "fácil",
    tip: "É uma das letras mais generosas. Como quase todos vão escrever «Angola» e «Ana», guarda respostas menos óbvias, como Argélia ou Amélia, para fugir aos 5 pontos das respostas repetidas.",
    words: {
      Nome: ["Ana", "António", "Adilson", "Aurora", "Augusto", "Amélia"],
      País: ["Angola", "Argentina", "Alemanha", "Argélia", "Austrália", "Áustria"],
      Comida: ["Arroz", "Atum", "Abacaxi", "Alface", "Amendoim", "Açorda"],
      Profissão: ["Advogado", "Arquitecto", "Actor", "Agricultor", "Astronauta", "Arqueólogo"],
      Animal: ["Abelha", "Águia", "Avestruz", "Antílope", "Arara", "Anaconda"],
      Cidade: ["Ambriz", "Amesterdão", "Atenas", "Abuja", "Acra", "Adis Abeba"],
    },
  },
  {
    letter: "B",
    difficulty: "fácil",
    tip: "Em Angola, «Bombó» e «Benguela» são trunfos que muitos esquecem. Em Profissão, Bombeiro sai sempre; experimenta Bibliotecário ou Biólogo.",
    words: {
      Nome: ["Bruno", "Beatriz", "Bento", "Bernardo", "Benedita", "Baltazar"],
      País: ["Brasil", "Bélgica", "Benim", "Botsuana", "Bolívia", "Bulgária"],
      Comida: ["Banana", "Bacalhau", "Batata", "Bolo", "Bife", "Bombó"],
      Profissão: ["Bombeiro", "Bancário", "Bailarino", "Barbeiro", "Biólogo", "Bibliotecário"],
      Animal: ["Baleia", "Búfalo", "Burro", "Borboleta", "Besouro", "Babuíno"],
      Cidade: ["Benguela", "Barcelona", "Berlim", "Bruxelas", "Bissau", "Bogotá"],
    },
  },
  {
    letter: "C",
    difficulty: "fácil",
    tip: "Há tantas opções que a velocidade conta mais do que a criatividade. Calulu e Cabinda são respostas bem angolanas que costumam valer 10 pontos.",
    words: {
      Nome: ["Carlos", "Carla", "Cláudia", "Cristiano", "Celeste", "Custódio"],
      País: ["Cabo Verde", "Canadá", "Chile", "China", "Colômbia", "Camarões"],
      Comida: ["Calulu", "Cocada", "Cenoura", "Couve", "Caril", "Chouriço"],
      Profissão: ["Cozinheiro", "Carpinteiro", "Contabilista", "Canalizador", "Cantor", "Cirurgião"],
      Animal: ["Cão", "Cavalo", "Cobra", "Crocodilo", "Camelo", "Coelho"],
      Cidade: ["Cabinda", "Caxito", "Cairo", "Cidade do Cabo", "Coimbra", "Copenhaga"],
    },
  },
  {
    letter: "D",
    difficulty: "média",
    tip: "País é o ponto fraco: só há Dinamarca, Djibuti e Dominica. Memoriza-os. Em Cidade, o Dundo (Lunda Norte) é uma resposta angolana que poucos lembram.",
    words: {
      Nome: ["Daniel", "Diana", "Domingos", "Dulce", "David", "Débora"],
      País: ["Dinamarca", "Djibuti", "Dominica"],
      Comida: ["Damasco", "Dobrada", "Doce de leite", "Dourada"],
      Profissão: ["Dentista", "Designer", "Director", "Desenhador", "Docente", "Decorador"],
      Animal: ["Dromedário", "Doninha", "Dragão-de-komodo", "Dingo", "Diabo-da-tasmânia"],
      Cidade: ["Dundo", "Dakar", "Dubai", "Damasco", "Dublin", "Díli"],
    },
  },
  {
    letter: "E",
    difficulty: "média",
    tip: "Espanha e Egipto aparecem em quase todas as folhas. Para pontuar mais, pensa em Eritreia, Estónia ou Eslováquia. Em Animal, Ema e Enguia raramente se repetem.",
    words: {
      Nome: ["Eduardo", "Esperança", "Eva", "Elsa", "Emanuel", "Edson"],
      País: ["Espanha", "Egipto", "Equador", "Eritreia", "Estónia", "Etiópia"],
      Comida: ["Ervilha", "Espinafre", "Esparguete", "Empada", "Escabeche"],
      Profissão: ["Enfermeiro", "Engenheiro", "Electricista", "Economista", "Escritor", "Estilista"],
      Animal: ["Elefante", "Esquilo", "Ema", "Enguia", "Escorpião", "Estrela-do-mar"],
      Cidade: ["Edimburgo", "Estocolmo", "Évora", "Estrasburgo", "Entebbe"],
    },
  },
  {
    letter: "F",
    difficulty: "média",
    tip: "Funge é a resposta de ouro em Comida, mas por isso mesmo vai repetir-se. Fuba e Fiambre são alternativas seguras. País tem só quatro opções: França, Finlândia, Filipinas e Fiji.",
    words: {
      Nome: ["Fátima", "Fernando", "Filipe", "Francisca", "Feliciano", "Flávia"],
      País: ["França", "Finlândia", "Filipinas", "Fiji"],
      Comida: ["Funge", "Feijão", "Frango", "Fuba", "Fiambre", "Figo"],
      Profissão: ["Farmacêutico", "Fotógrafo", "Futebolista", "Físico", "Florista", "Fisioterapeuta"],
      Animal: ["Formiga", "Foca", "Flamingo", "Falcão", "Furão"],
      Cidade: ["Florença", "Frankfurt", "Freetown", "Faro", "Funchal"],
    },
  },
  {
    letter: "G",
    difficulty: "média",
    tip: "Ginguba e Gindungo são palavras bem angolanas que valem ouro em Comida. Em País, há muitas Guinés: Guiné-Bissau, Guiné Equatorial e Guiné.",
    words: {
      Nome: ["Gabriel", "Graça", "Gilberto", "Gertrudes", "Gaspar", "Glória"],
      País: ["Gana", "Gabão", "Gâmbia", "Grécia", "Guiné-Bissau", "Guatemala"],
      Comida: ["Ginguba", "Gindungo", "Gelado", "Goiaba", "Grão-de-bico", "Gengibre"],
      Profissão: ["Guia turístico", "Geólogo", "Gerente", "Gestor", "Guarda", "Guitarrista"],
      Animal: ["Girafa", "Gorila", "Gato", "Golfinho", "Galinha", "Gazela"],
      Cidade: ["Genebra", "Glasgow", "Guimarães", "Gaborone", "Granada"],
    },
  },
  {
    letter: "H",
    difficulty: "difícil",
    tip: "Uma das letras mais temidas. Comida é quase impossível: Hambúrguer e Hortelã salvam a ronda. Huambo é a cidade angolana que deves escrever logo.",
    words: {
      Nome: ["Helena", "Hélder", "Hugo", "Hermenegildo", "Henriqueta", "Horácio"],
      País: ["Haiti", "Honduras", "Hungria"],
      Comida: ["Hambúrguer", "Hortelã"],
      Profissão: ["Historiador", "Hospedeira", "Hoteleiro", "Higienista oral"],
      Animal: ["Hipopótamo", "Hiena", "Hamster", "Harpia"],
      Cidade: ["Huambo", "Havana", "Helsínquia", "Hamburgo", "Harare", "Hanói"],
    },
  },
  {
    letter: "I",
    difficulty: "média",
    tip: "País é fácil (Itália, Índia, Irlanda, Islândia…), mas Comida aperta: lembra-te de Inhame e Iogurte. Impala é um animal africano que pouca gente escreve.",
    words: {
      Nome: ["Isabel", "Inês", "Isaac", "Irene", "Ivone", "Ilídio"],
      País: ["Itália", "Índia", "Indonésia", "Irlanda", "Islândia", "Israel"],
      Comida: ["Inhame", "Iogurte", "Iscas"],
      Profissão: ["Informático", "Intérprete", "Ilustrador", "Inspector", "Investigador", "Instrutor"],
      Animal: ["Iguana", "Impala", "Íbis", "Iaque"],
      Cidade: ["Istambul", "Inhambane", "Islamabade", "Indianápolis"],
    },
  },
  {
    letter: "J",
    difficulty: "média",
    tip: "Só há três países: Japão, Jamaica e Jordânia. Em Animal, Jacaré e Joaninha saem rápido; Jibóia e Jumento costumam valer mais.",
    words: {
      Nome: ["João", "Joana", "José", "Júlia", "Jacinto", "Joaquina"],
      País: ["Japão", "Jamaica", "Jordânia"],
      Comida: ["Jaca", "Jardineira", "Jindungo"],
      Profissão: ["Jornalista", "Juiz", "Jardineiro", "Joalheiro", "Jogador"],
      Animal: ["Jacaré", "Javali", "Jibóia", "Joaninha", "Jaguar", "Jumento"],
      Cidade: ["Joanesburgo", "Jerusalém", "Jacarta", "Juba"],
    },
  },
  {
    letter: "L",
    difficulty: "fácil",
    tip: "Luanda, Lubango e Lobito: Angola dá-te três cidades só nesta letra. Em País, Lesoto e Libéria são menos previsíveis do que Líbia.",
    words: {
      Nome: ["Luís", "Laura", "Lúcia", "Lourenço", "Leonor", "Luísa"],
      País: ["Líbia", "Libéria", "Lesoto", "Líbano", "Letónia", "Luxemburgo"],
      Comida: ["Lagosta", "Lulas", "Laranja", "Leite", "Lentilhas", "Limão"],
      Profissão: ["Locutor", "Livreiro", "Lavrador", "Lojista", "Lenhador"],
      Animal: ["Leão", "Leopardo", "Lobo", "Lagarto", "Lontra", "Lince"],
      Cidade: ["Luanda", "Lubango", "Lobito", "Lisboa", "Londres", "Lusaca"],
    },
  },
  {
    letter: "M",
    difficulty: "fácil",
    tip: "Muamba e Mufete são clássicos da mesa angolana; Mabeco, o cão-selvagem africano, é um animal que quase ninguém escreve. Moçâmedes e Menongue completam a folha.",
    words: {
      Nome: ["Maria", "Manuel", "Marta", "Mateus", "Madalena", "Mário"],
      País: ["Moçambique", "Marrocos", "México", "Mali", "Madagáscar", "Malawi"],
      Comida: ["Muamba", "Mufete", "Mandioca", "Manga", "Massa", "Mamão"],
      Profissão: ["Médico", "Mecânico", "Motorista", "Músico", "Marinheiro", "Modelo"],
      Animal: ["Macaco", "Mosquito", "Morcego", "Mabeco", "Mamba", "Mocho"],
      Cidade: ["Malanje", "Moçâmedes", "Menongue", "Maputo", "Madrid", "Moscovo"],
    },
  },
  {
    letter: "N",
    difficulty: "média",
    tip: "Namíbia é a vizinha que todos escrevem; Nepal e Nicarágua dão mais pontos. N'dalatando, capital do Cuanza Norte, é uma cidade angolana que surpreende os adversários.",
    words: {
      Nome: ["Nelson", "Natália", "Nuno", "Nádia", "Noémia", "Nicolau"],
      País: ["Namíbia", "Nigéria", "Níger", "Noruega", "Nepal", "Nicarágua"],
      Comida: ["Nabo", "Nêspera", "Noz", "Nata", "Nhoque"],
      Profissão: ["Nutricionista", "Notário", "Nadador-salvador", "Neurologista"],
      Animal: ["Narval", "Naja", "Nandu", "Novilho"],
      Cidade: ["N'dalatando", "Nairobi", "Nova Iorque", "Nápoles", "Nice", "Niamey"],
    },
  },
  {
    letter: "O",
    difficulty: "difícil",
    tip: "Em País só existe Omã, por isso escreve-o sem hesitar. Ondjiva, no Cunene, salva a categoria Cidade. Em Animal, Ornitorrinco e Orangotango raramente se repetem.",
    words: {
      Nome: ["Olga", "Orlando", "Osvaldo", "Odete", "Óscar", "Olívia"],
      País: ["Omã"],
      Comida: ["Ovo", "Ostra", "Omelete", "Orégão"],
      Profissão: ["Oftalmologista", "Operário", "Oleiro", "Oficial", "Ourives", "Optometrista"],
      Animal: ["Onça", "Orca", "Ovelha", "Ornitorrinco", "Ouriço", "Orangotango"],
      Cidade: ["Ondjiva", "Oslo", "Otava", "Oxford", "Odessa", "Osaka"],
    },
  },
  {
    letter: "P",
    difficulty: "fácil",
    tip: "A Palanca-negra, símbolo de Angola, é a resposta perfeita em Animal. Porto Amboim e Pretória fogem às respostas repetidas de Paris e Porto.",
    words: {
      Nome: ["Pedro", "Paula", "Paulo", "Patrícia", "Pascoal", "Priscila"],
      País: ["Portugal", "Paraguai", "Peru", "Polónia", "Paquistão", "Panamá"],
      Comida: ["Peixe", "Pão", "Pirão", "Papaia", "Pizza", "Pudim"],
      Profissão: ["Professor", "Polícia", "Pintor", "Pedreiro", "Piloto", "Programador"],
      Animal: ["Palanca-negra", "Pato", "Pinguim", "Papagaio", "Pantera", "Pavão"],
      Cidade: ["Porto Amboim", "Porto", "Paris", "Praga", "Pequim", "Pretória"],
    },
  },
  {
    letter: "R",
    difficulty: "média",
    tip: "Reino Unido e República Checa contam como País com R. Em Comida, Rissol e Romã são boas saídas. Rinoceronte é óbvio; Rena e Rola nem tanto.",
    words: {
      Nome: ["Rosa", "Rui", "Rita", "Ricardo", "Raquel", "Romeu"],
      País: ["Rússia", "Ruanda", "Roménia", "Reino Unido", "República Checa"],
      Comida: ["Repolho", "Rabanete", "Rissol", "Romã", "Requeijão"],
      Profissão: ["Repórter", "Recepcionista", "Relojoeiro", "Radiologista"],
      Animal: ["Rato", "Rinoceronte", "Raposa", "Rã", "Rena", "Rola"],
      Cidade: ["Roma", "Rabat", "Riade", "Rio de Janeiro", "Roterdão", "Riga"],
    },
  },
  {
    letter: "S",
    difficulty: "fácil",
    tip: "Saurimo, Sumbe e Soyo dão-te três cidades angolanas. São Tomé e Príncipe é o país lusófono que muitos esquecem. Suricata é um animal divertido e pouco repetido.",
    words: {
      Nome: ["Sofia", "Sebastião", "Sara", "Samuel", "Silvana", "Sílvio"],
      País: ["Senegal", "São Tomé e Príncipe", "Suíça", "Suécia", "Sudão", "Síria"],
      Comida: ["Sopa", "Salada", "Sardinha", "Sumo", "Salsicha", "Sandes"],
      Profissão: ["Secretário", "Soldado", "Sapateiro", "Serralheiro", "Sociólogo", "Segurança"],
      Animal: ["Sapo", "Serpente", "Suricata", "Salamandra", "Sagui"],
      Cidade: ["Saurimo", "Sumbe", "Soyo", "Sydney", "Seul", "Santiago"],
    },
  },
  {
    letter: "T",
    difficulty: "fácil",
    tip: "Timor-Leste é o país lusófono com T. Tremoço e Tamarindo fogem ao óbvio Tomate. Tômbua, no Namibe, é uma cidade angolana pouco lembrada.",
    words: {
      Nome: ["Teresa", "Tomás", "Tânia", "Teodoro", "Telma", "Tiago"],
      País: ["Tanzânia", "Togo", "Tunísia", "Turquia", "Tailândia", "Timor-Leste"],
      Comida: ["Tomate", "Tarte", "Tapioca", "Torrada", "Tremoço", "Tamarindo"],
      Profissão: ["Taxista", "Técnico", "Tradutor", "Treinador", "Topógrafo", "Tesoureiro"],
      Animal: ["Tigre", "Tartaruga", "Tubarão", "Toupeira", "Tucano", "Tilápia"],
      Cidade: ["Tômbua", "Tóquio", "Toronto", "Turim", "Tunes", "Trípoli"],
    },
  },
  {
    letter: "V",
    difficulty: "difícil",
    tip: "Comida é a categoria crítica: Vagem, Vitela e Vieira salvam-te. Viana, em Luanda, é a cidade angolana mais rápida de lembrar.",
    words: {
      Nome: ["Vítor", "Vanda", "Valdemar", "Vera", "Vicente", "Violeta"],
      País: ["Venezuela", "Vietname", "Vanuatu", "Vaticano"],
      Comida: ["Vagem", "Vitela", "Vieira"],
      Profissão: ["Veterinário", "Vendedor", "Vigilante", "Vereador", "Violinista"],
      Animal: ["Vaca", "Veado", "Vespa", "Víbora", "Vaga-lume"],
      Cidade: ["Viana", "Veneza", "Viena", "Varsóvia", "Vílnius", "Valência"],
    },
  },
];

export const LETTER_GUIDES: readonly LetterGuide[] = guides;

export function getLetterGuide(letter: string) {
  const upper = letter.toUpperCase();
  return guides.find((guide) => guide.letter === upper) ?? null;
}

// Keep the guides aligned with the letters the game can actually draw.
if (process.env.NODE_ENV !== "production") {
  const missing = PLAYABLE_LETTERS.filter((letter) => !getLetterGuide(letter));
  if (missing.length > 0) {
    console.warn(`Missing word guides for letters: ${missing.join(", ")}`);
  }
}
