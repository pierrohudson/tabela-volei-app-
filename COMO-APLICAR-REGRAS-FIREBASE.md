# 🛡️ Como Aplicar as Regras de Segurança no Firebase

Este passo leva **menos de 2 minutos** e fecha as duas vulnerabilidades mais críticas (impede que visitantes alterem o placar do campeonato ou apaguem o chat).

---

## Passo a passo

1. Abra o navegador e acesse o **Firebase Console**:
   👉 https://console.firebase.google.com/project/tabela-volei-dc585/database/tabela-volei-dc585-default-rtdb/rules

2. Na aba **Regras** (Rules), apague todo o conteúdo que estiver lá.

3. Copie e cole exatamente este JSON:

```json
{
  "rules": {
    "estado": {
      ".read": true,
      ".write": "auth != null && auth.token.email == 'mesario@voleidobosque.app'"
    },
    "chat": {
      ".read": true,
      "$msgId": {
        ".write": "auth != null && (!data.exists() || data.child('dono').val() == auth.uid)",
        ".validate": "newData.hasChildren(['id','texto','autor','em','dono']) && newData.child('texto').isString() && newData.child('texto').val().length <= 300 && newData.child('autor').isString() && newData.child('autor').val().length <= 18 && newData.child('dono').val() == auth.uid"
      }
    },
    "chat-apelidos": {
      ".read": true,
      "$nick": {
        ".write": "auth != null && (!data.exists() || data.val() == auth.uid)"
      }
    },
    ".read": true,
    ".write": false
  }
}
```

4. Clique no botão azul **Publicar** (Publish).

---

## O que essa regra faz (em termos simples)

| Path | Leitura | Escrita | Efeito de segurança |
|---|---|---|---|
| `/estado` (placar) | Aberto para todos | **Apenas mesario@voleidobosque.app** | 🔒 Ninguém além do Admin pode mudar o placar |
| `/chat/$msgId` | Aberto para todos | Qualquer visitante autenticado | 💬 Cada um só mexe na própria mensagem |
| `/chat` (raiz) | Aberto para todos | **Bloqueada** | 🚫 Ninguém pode apagar o chat inteiro com `DELETE /chat` |
| `/chat-apelidos` | Aberto para todos | Quem criou o apelido | 👤 Ninguém pode roubar ou apagar o apelido do outro |
| Qualquer outro | Aberto para leitura | **Bloqueada** | ⛔ Fechado por padrão |

Pronto! O app continuará funcionando 100% igual para você e para os jogadores, mas agora blindado contra ataques.
