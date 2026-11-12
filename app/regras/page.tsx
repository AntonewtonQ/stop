import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell } from "@/components/content/content-shell";
import styles from "@/components/content/content.module.css";

export const metadata: Metadata = {
  title: "Regras do jogo Stop: como jogar e como contar pontos",
  description:
    "Regras completas do Stop (Adedonha): material, como se escolhe a letra, categorias, quando gritar STOP, pontuação de 0, 5, 10 e 20 pontos, votação e variantes.",
  alternates: { canonical: "/regras" },
};

export default function RulesPage() {
  return (
    <ContentShell
      eyebrow="Guia completo"
      title="Regras do jogo Stop"
      lead="Tudo o que precisas para jogar Stop, também conhecido como Adedonha ou Salada de Frutas: como funciona uma rodada, quando se pode gritar STOP e como se contam os pontos."
      breadcrumbs={[{ href: "/regras", label: "Regras" }]}
    >
      <h2>O que é o jogo Stop?</h2>
      <p>
        O Stop é um jogo de palavras rápido em que todos os jogadores recebem a
        mesma letra e tentam encontrar, antes dos outros, uma palavra para cada
        categoria: um nome de pessoa, um país, uma comida, um animal, e assim
        por diante. É conhecido por vários nomes: em Angola e em Portugal
        chama-se normalmente <strong>Stop</strong>; no Brasil é mais comum
        ouvir <strong>Adedonha</strong> ou <strong>Adedanha</strong>; noutros
        lugares chamam-lhe <strong>Salada de Frutas</strong> ou{" "}
        <strong>Nome, Cidade, Animal</strong>.
      </p>
      <p>
        Tradicionalmente joga-se com papel e caneta, na escola, em família ou
        entre amigos. O jogastop leva essas mesmas regras para o telemóvel:
        cada pessoa joga no seu ecrã e a pontuação é calculada automaticamente.
      </p>

      <h2>O que é preciso para jogar</h2>
      <ul>
        <li>
          <strong>Dois ou mais jogadores.</strong> O jogo fica mais divertido a
          partir de três ou quatro pessoas, porque as respostas repetidas
          passam a contar.
        </li>
        <li>
          <strong>Uma lista de categorias.</strong> As clássicas são Nome,
          País, Comida, Profissão e Animal. Muitos grupos juntam Cidade,
          Música, Filme, Cor, Fruta ou Marca.
        </li>
        <li>
          <strong>Uma forma de escolher a letra.</strong> No papel, alguém
          recita o alfabeto em silêncio até outro jogador dizer «Stop». No
          jogastop, o comandante da rodada escolhe a letra directamente.
        </li>
        <li>
          <strong>Um relógio</strong> (opcional), para a rodada não se
          arrastar quando ninguém consegue completar todas as categorias.
        </li>
      </ul>

      <h2>Como se joga uma rodada</h2>
      <ol>
        <li>
          <strong>Escolhe-se a letra.</strong> No jogastop há um comandante por
          rodada, que roda pela ordem de entrada na sala. O comandante escolhe
          uma letra que ainda não tenha saído nesta partida.
        </li>
        <li>
          <strong>Começa o relógio.</strong> Todos vêem a letra ao mesmo tempo
          e começam a escrever. A duração (30, 45, 60 ou 90 segundos) é
          definida pelo anfitrião antes da partida.
        </li>
        <li>
          <strong>Preenchem-se as categorias.</strong> Cada resposta tem de
          começar pela letra sorteada e encaixar na categoria. Durante o
          relógio ninguém vê as respostas dos outros.
        </li>
        <li>
          <strong>Alguém grita STOP.</strong> Só pode gritar STOP quem tiver
          preenchido <em>todas</em> as categorias. O primeiro STOP termina a
          rodada para toda a gente. Se ninguém o fizer, a rodada acaba quando
          o tempo se esgota.
        </li>
        <li>
          <strong>Corrigem-se as respostas e contam-se os pontos.</strong> As
          respostas ficam visíveis para todos, as duvidosas vão a votos e a
          pontuação é somada à classificação geral.
        </li>
      </ol>

      <h2>Como se contam os pontos</h2>
      <p>
        A regra de ouro do Stop é simples: <strong>ser original vale mais</strong>.
        Cada resposta é comparada com as respostas dos outros jogadores na
        mesma categoria.
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Situação</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Só tu deste uma resposta válida nessa categoria</td>
            <td>20</td>
          </tr>
          <tr>
            <td>Resposta válida e diferente das dos outros</td>
            <td>10</td>
          </tr>
          <tr>
            <td>Resposta válida, mas igual à de outro jogador</td>
            <td>5</td>
          </tr>
          <tr>
            <td>Em branco, inválida ou com a letra errada</td>
            <td>0</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.callout}>
        <p>
          <strong>Exemplo com a letra M, categoria Comida:</strong> a Ana
          escreve «Muamba», o Beto escreve «Muamba» e a Carla escreve
          «Mufete». A Ana e o Beto repetiram-se e ganham 5 pontos cada. A
          Carla escreveu algo diferente e ganha 10. Se a Ana e o Beto tivessem
          deixado em branco, a Carla seria a única com resposta válida e
          levaria 20.
        </p>
      </div>
      <p>
        Acentos, maiúsculas e espaços no início ou no fim não contam para
        decidir se duas respostas são iguais: «Moçâmedes» e «mocamedes» são consideradas a
        mesma resposta.
      </p>

      <h2>Respostas duvidosas e votação</h2>
      <p>
        No papel, as discussões sobre se «Mabeco» é mesmo um animal fazem
        parte da diversão. No jogastop, as respostas que o jogo reconhece são
        aceites automaticamente. As que começam pela letra certa mas não
        constam da lista do jogo vão a votos: os outros jogadores online
        aprovam ou rejeitam, e vence a maioria. Quem escreveu a resposta não
        vota nela. A rodada seguinte só começa quando todas as votações
        estiverem fechadas.
      </p>
      <p>
        Uma boa regra de convivência é combinar antes da partida o que vale:
        aceitam-se nomes de marcas em Comida? Uma cidade pequena conta? Vale a
        pena decidir isso antes, e não a meio de uma discussão.
      </p>

      <h2>Quantas rodadas tem uma partida?</h2>
      <p>
        Não há um número fixo. No jogastop, por defeito, há uma rodada por
        jogador, para que todos sejam comandantes uma vez e escolham uma
        letra. O anfitrião pode fixar entre 1 e 19 rodadas, o número de letras
        jogáveis. No fim, vence quem tiver mais pontos acumulados. Para jogar
        outra vez com o mesmo grupo, basta pedir uma revanche.
      </p>

      <h2>Que letras se usam?</h2>
      <p>
        Letras como K, W, Y, Q, X, Z e U quase não têm palavras em português
        para todas as categorias, por isso ficam de fora. O jogastop usa 19
        letras: A, B, C, D, E, F, G, H, I, J, L, M, N, O, P, R, S, T e V.
        Algumas são bem mais difíceis do que outras. Consulta as nossas{" "}
        <Link href="/palavras">listas de palavras por letra</Link> para treinar.
      </p>

      <h2>Variantes populares</h2>
      <h3>Stop sem relógio</h3>
      <p>
        A versão mais clássica: não há limite de tempo e a rodada acaba
        apenas quando alguém grita STOP. Funciona bem com jogadores
        experientes, mas pode tornar-se lenta com letras difíceis.
      </p>
      <h3>Categorias temáticas</h3>
      <p>
        Em vez das categorias de sempre, escolhe um tema: futebol (jogador,
        clube, estádio), música angolana (artista, género, canção) ou escola
        (disciplina, material, professor famoso). O jogastop permite criar
        categorias personalizadas no lobby.
      </p>
      <h3>Contagem regressiva depois do STOP</h3>
      <p>
        Em alguns grupos, quem grita STOP dá ainda 3 segundos aos outros para
        terminarem a palavra que estão a escrever. No jogastop o STOP é
        imediato, para ser justo para todos os ecrãs.
      </p>

      <h2>Perguntas frequentes</h2>
      <h3>Posso usar a mesma palavra em duas categorias?</h3>
      <p>
        Pode, se fizer sentido nas duas. «Benguela» é cidade e também nome de
        província, mas não é país. O bom senso e a votação decidem.
      </p>
      <h3>Palavras compostas contam pela primeira letra?</h3>
      <p>
        Sim. «Cabo Verde» vale para C e «Palanca-negra» vale para P.
      </p>
      <h3>Nomes em inglês ou francês valem?</h3>
      <p>
        Depende do grupo. O jogastop reconhece algumas respostas em
        português, inglês e francês, porque a interface existe nessas três
        línguas. As restantes vão a votos.
      </p>

      <p>
        Já sabes as regras. Agora vê as nossas{" "}
        <Link href="/dicas">dicas para ganhar no Stop</Link>.
      </p>
    </ContentShell>
  );
}
