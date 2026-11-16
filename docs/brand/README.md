# Marca jogastop: ficheiros de logótipo

Gerados a partir do logo do site (`components/brand/logo.tsx`). No wordmark,
as letras estão convertidas em contornos (fonte Geist, peso 850, espaçamento
-0,08em), por isso os SVG abrem iguais em qualquer programa, sem instalar a
fonte.

| Ficheiro | Uso |
|---|---|
| `jogastop-logo.svg/.png` | Logo horizontal sobre fundos claros |
| `jogastop-logo-branco.svg/.png` | Logo horizontal sobre fundos escuros (fundo transparente) |
| `jogastop-logo-fundo-petroleo.svg/.png` | Logo já aplicado sobre petróleo, para pré-visualização ou capas |
| `jogastop-simbolo.svg/.png` | Só o símbolo (cronómetro + S), fundos claros |
| `jogastop-simbolo-branco.svg/.png` | Só o símbolo, fundos escuros |
| `jogastop-perfil-instagram.png` | Foto de perfil 1080×1080, versão principal (petróleo) |
| `jogastop-perfil-instagram-ambar.png` | Foto de perfil 1080×1080, alternativa (âmbar) |

Tamanhos dos PNG: o logo tem 2400 px de largura, o símbolo 1024×1024 e o perfil
1080×1080. Para outros tamanhos, exporta a partir do SVG.

## Cores

| Nome | Hex | Uso |
|---|---|---|
| Petróleo | `#0F2D3D` | Cor principal, texto, fundos escuros |
| Petróleo suave | `#173E52` | Variação de fundo |
| Âmbar | `#F0B24A` | Destaque, «stop», caixa do S |
| Âmbar claro | `#FFC35B` | Brilhos, estados de hover |
| Âmbar profundo | `#C9810F` | Âmbar sobre fundo claro (melhor contraste) |
| Branco quente | `#FFFEFA` / `#F4F2EC` | Fundos claros |
| Cinza-azulado | `#637784` | Texto secundário |

## Regras rápidas

- Escreve o nome sempre `jogastop`: minúsculas e numa só palavra. «joga» na cor do texto, «stop» em âmbar.
- Deixa à volta do logo uma margem livre de pelo menos a altura da caixa do S.
- Não estiques, não rodes, não mudes as cores fora desta paleta e não ponhas o logo sobre fotografias com muito ruído.
- Em tamanhos pequenos (abaixo de 120 px de largura), usa só o símbolo.
