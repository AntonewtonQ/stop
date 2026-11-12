import type { Metadata } from "next";
import Link from "next/link";

import { ContentShell } from "@/components/content/content-shell";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/i18n/privacy";

export const metadata: Metadata = {
  title: "Sobre o jogastop: o Stop online feito em Angola",
  description:
    "Quem faz o jogastop, porque o criámos e como nos contactar. Um jogo Stop online, gratuito e sem registo, feito em Angola para jogar com amigos.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return (
    <ContentShell
      eyebrow="Sobre nós"
      title="Sobre o jogastop"
      lead="O jogastop é uma versão online e gratuita do clássico jogo Stop, criada em Angola para jogar em grupo, seja na mesma sala ou cada um na sua casa."
      breadcrumbs={[{ href: "/sobre", label: "Sobre" }]}
    >
      <h2>Porque criámos o jogastop</h2>
      <p>
        Muitos de nós crescemos a jogar Stop com papel e caneta, na escola ou
        em casa. Era rápido, barato e punha toda a gente a rir. Mas, com os
        amigos espalhados por cidades e países diferentes, juntar todos à
        volta da mesma folha tornou-se difícil.
      </p>
      <p>
        O jogastop nasceu para resolver isso: abre-se uma sala, partilha-se o
        código no WhatsApp e, em segundos, todos estão a jogar com a mesma
        letra e o mesmo relógio. A pontuação é calculada automaticamente, as
        dúvidas resolvem-se por votação e ninguém precisa de criar conta.
      </p>

      <h2>Como funciona</h2>
      <ul>
        <li>
          <strong>Sem registo:</strong> escolhes um nome ou apelido e jogas.
        </li>
        <li>
          <strong>Em tempo real:</strong> a letra, o relógio e o STOP chegam a
          todos os jogadores ao mesmo tempo.
        </li>
        <li>
          <strong>No telemóvel ou no computador:</strong> funciona no
          navegador e pode ser instalado como aplicação.
        </li>
        <li>
          <strong>Com voz:</strong> podes falar com os outros jogadores
          durante a partida, se quiseres.
        </li>
        <li>
          <strong>Em três línguas:</strong> português, inglês e francês.
        </li>
      </ul>
      <p>
        Se ainda não conheces o jogo, começa pelas{" "}
        <Link href="/regras">regras do Stop</Link>.
      </p>

      <h2>Quem somos</h2>
      <p>
        O jogastop é desenvolvido por Antonewton Quima e Adilson Fernandes, em
        Angola. Somos uma equipa pequena e independente, e cada sugestão dos
        jogadores ajuda a melhorar o jogo.
      </p>

      <h2>Como o jogastop se mantém gratuito</h2>
      <p>
        O jogo é e continuará gratuito. Para cobrir os custos dos servidores,
        o site mostra alguns anúncios na página inicial e nas páginas
        informativas, nunca durante uma partida. Podes ler mais sobre os dados que tratamos e sobre
        publicidade na nossa{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h2>Contacto</h2>
      <p>
        Encontraste um erro, tens uma ideia para uma categoria nova ou queres
        sugerir palavras para as nossas listas? Escreve-nos para{" "}
        <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>.
        Respondemos assim que possível.
      </p>
    </ContentShell>
  );
}
