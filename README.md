# 🏐 Vôlei do Bosque — Championship Dashboard

App de campeonato de vôlei em formato **PWA** ( Progressive Web App): funciona como
aplicativo no celular, instala na tela inicial e **continua funcionando offline**.

🔗 **Acesso:** https://pierrohudson.github.io/tabela-volei-app-/

---

## ✨ O que o app faz

| Aba | Descrição |
|---|---|
| **Classificação** | Tabela automática com J, V, D, SP, SC, Saldo e Total. Desempate: Pontos → Vitórias → Saldo → Sets Pró |
| **Jogos** | Os 10 confrontos da primeira fase, na ordem original do campeonato |
| **Finais** | Disputa de 3º lugar e grande final, liberadas quando a primeira fase termina |
| **Premiação** | Pódio com campeão, vice e terceiro lugar |
| **⭐ Jogadores** | Elenco com notas de 0 a 5 (meia estrela) + sorteio equilibrado de times |

## 🔴 Modo Ao Vivo

O placar é sincronizado em **tempo real** via Firebase Realtime Database.

- **Mesário** (organizador): clica em **🔓 Área do Mesário**, digita a senha e libera a edição.
  Tudo que ele altera aparece **na hora** no celular de todo mundo.
- **Público** (jogadores e torcida): abre em modo somente leitura. Os campos ficam
  realmente travados — ninguém consegue alterar o resultado do campeonato.

O app continua funcionando **sem internet** (graças ao Service Worker): quem já instalou
recebe as atualizações automaticamente, sem precisar reinstalar.

## 🎲 Sorteio de times

Na aba **⭐ Jogadores** o Mesário monta o elenco (nome + nota de 0 a 5) e sorteia os times.
O algoritmo distribui em "cobra" e depois faz um ajuste fino para **minimizar a diferença
de força entre os times**, sempre com a mesma quantidade de jogadores em cada um.
O melhor de cada time recebe o selo de **(C)** de capitão.

---

## 🔒 Segurança

- O Firebase Authentication exige senha para **escrever** no banco.
- Regras aplicadas: leitura pública, escrita apenas para quem está autenticado.
- A senha do Mesário nunca trafega em texto puro — só o hash SHA-256 fica no código.
- Sem backend próprio, sem dados pessoais coletados, sem rastreamento.

## 📱 Instalar no celular

**iPhone (Safari):** Compartilhar → Adicionar à Tela de Início

**Android (Chrome):** menu ⋮ → Instalar aplicativo

## 🛠️ Stack

HTML + CSS + JavaScript puro (sem framework), PWA, Firebase Realtime Database.
