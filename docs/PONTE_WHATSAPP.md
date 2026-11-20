# A ponte do WhatsApp Web (M30 do hub)

*20/11/2026.* Pedido do operador: *"autenticação de número de WhatsApp pra rodar o WhatsApp Web dentro
do site na infra do Prisma"*.

## O que é, e por que não é o WhatsApp Web numa moldura

O WhatsApp Web não abre dentro de outro site. A página manda `frame-ancestors` só para domínios do
próprio WhatsApp (verificado em 20/11/2026, no cabeçalho `Content-Security-Policy` de
`web.whatsapp.com`). E mesmo que abrisse, a sessão ficaria no navegador de quem olha o site.

Então a ponte faz o que o WhatsApp Web faz, num aparelho seu:

- Entra no número como **aparelho vinculado**, pelo **código de pareamento**. É o "Conectar com número
  de telefone" do celular, e dispensa câmera e QR.
- Roda no **G15** (servidor de bolso, Termux), com o [Baileys](https://github.com/WhiskeySockets/Baileys)
  7.0.0-rc14.
- Grava as conversas no Supabase pela conta de papel `ponte`. A RLS deixa essa conta escrever só o
  canal dela.
- O **Prisma** mostra as conversas no painel do WhatsApp, junto com as da API oficial (M27). Quem
  responde de lá põe a resposta numa fila, e a ponte manda.

```
celular (WhatsApp) ── aparelho vinculado ── G15: ponte.mjs ── conta ponte ── Supabase ── Prisma (dono)
```

A sessão do WhatsApp **nunca sai do G15**. Ela fica em `~/.fenix/whatsapp/<número>/`, com permissão
700. O banco recebe só as mensagens, os estados e o código de pareamento, que vale minutos.

## O risco, dito sem enfeite

O Baileys é um **cliente não oficial**. Os Termos do WhatsApp proíbem cliente não oficial e automação
(whatsapp.com/legal/terms-of-service; o texto não foi relido hoje). **O número pode ser banido.** A
via sem esse risco continua sendo a Cloud API oficial (M27, `hub/docs/WHATSAPP.md`).

O que a ponte faz para parecer o que é, uma pessoa respondendo pelo computador:

| Freio | Onde |
|---|---|
| uma mensagem a cada 3 s, no máximo 55 por hora | `Limitador`, `logica.mjs` |
| grupo, status e canal não entram, nem para ler | `contatoDaChave`, `logica.mjs` |
| não marca "online" ao conectar; o celular segue recebendo as notificações dele | `markOnlineOnConnect: false`, `ponte.mjs` |
| não pede código de pareamento em laço: código vencido desliga e espera o dono pedir outro | `orquestra.mjs` |
| conta recusada (403) ou sessão tomada por outra conexão (440): para de insistir | `orquestra.mjs` |
| sem rede, cada nova tentativa espera mais, até 89 s | `espera`, `ponte.mjs` |
| uma ponte por aparelho (trava): duas brigariam pela mesma sessão | `trava.mjs` |

Nada disso torna o uso permitido. Só tira da ponte os comportamentos que mais chamam atenção.

**Licenças.** O Baileys é MIT. O `libsignal` 6.0.0, que ele usa, é **GPL-3.0** (conferido no
`package-lock.json` em 20/11/2026). Rodar no próprio aparelho não obriga nada. Se um dia a ponte for
distribuída (pacote, APK), o conjunto segue a GPL-3.0.

## Onde fica cada coisa no G15

| O quê | Onde | Permissão |
|---|---|---|
| sessão do WhatsApp, por número | `~/.fenix/whatsapp/<número>/` | 700 |
| conta da ponte (só o *refresh token*; a senha nunca é gravada) | `~/.fenix/ponte.json` | 600 |
| trava (uma ponte por aparelho) | `~/.fenix/ponte.trava` | 600 |
| serviço | `$PREFIX/var/service/ponte-whatsapp/` | — |
| registro | `$PREFIX/var/log/sv/ponte-whatsapp/current` | — |
| estado da instalação | `~/fenix-workspace/ponte-state.json` | — |

## Ligar, passo a passo (operador)

1. **Banco e função (PC).**
   - `supabase db push` no hub, que aplica as migrations até a 0043.
   - `supabase functions deploy whatsapp`.
   - Ver `hub/docs/WHATSAPP.md` → "A ponte".
2. **A conta da ponte.**
   - No Supabase, em Authentication → Users → Add user, crie um usuário com e-mail próprio para ela
     (não o seu) e senha forte, já confirmado.
   - No Prisma, em WhatsApp → Ponte → "Dar o papel de ponte", digite esse e-mail.
   - Essa conta não abre página nenhuma do site.
3. **No G15 (Termux).**
   1. Se ainda não fez: `bash scripts/dispositivos/servidor-de-bolso.sh --apply`. Sem isso, a ponte
      não volta sozinha depois de reiniciar.
   2. `bash scripts/ponte-whatsapp/instalar-termux.sh` mostra o que faria.
   3. `bash scripts/ponte-whatsapp/instalar-termux.sh --apply` instala Node e as dependências, e roda
      as provas.
   4. `cd scripts/ponte-whatsapp && node ponte.mjs --entrar` pede a URL do Supabase, a chave
      pública, o e-mail e a senha da conta da ponte.
   5. `bash scripts/ponte-whatsapp/instalar-termux.sh --apply` de novo liga o serviço.
4. **O código.**
   - No Prisma, em WhatsApp → Ponte, digite o número e clique em "Pedir código". Em segundos aparece
     um código de 8 letras.
   - No celular do número: WhatsApp → Aparelhos conectados → Conectar um aparelho → **Conectar com
     número de telefone** → digite o código.
5. **Conferir.**
   - O painel mostra "Conectada" e um sinal recente.
   - Uma mensagem de outro número aparece na conversa, e o aviso chega pelo push do APK Admin (M29).

## Desfazer

- **O número:** Prisma → Ponte → Desconectar. Com a conexão aberta, a ponte sai do WhatsApp e o
  aparelho some da lista do celular. Durante uma queda, ela desliga só do lado do G15, e o painel
  pede para conferir em "Aparelhos conectados".
- **O serviço:** `bash scripts/ponte-whatsapp/instalar-termux.sh --remover --apply`. A sessão e a
  conta ficam em `~/.fenix`. Apagar essa pasta é à mão, e é decisão sua.
- **A conta da ponte:** apague o usuário no Supabase, em Authentication → Users.

## Provas

`node --test scripts/ponte-whatsapp/*.test.mjs`: **30/30** em 20/11/2026. As provas não carregam o
Baileys. Quem faz o papel do WhatsApp é um falso que dispara os mesmos eventos. Elas cobrem:

- pedir o código uma vez só, conectar, e o "reinicie" pós-pareamento não virar queda;
- o código vencido não pedir outro;
- desconectar no celular apagar a sessão do aparelho;
- 403 e 440 pararem a ponte; 411 pedir pareamento novo;
- a fila sair com o freio;
- o recibo de leitura só subir o estado da mensagem;
- a trava de uma ponte por aparelho;
- o instalador, por padrão, só mostrar o que faria.

**Ainda não provado:** a conexão de verdade com o WhatsApp e o serviço rodando num Termux real. Não
há aparelho nesta sessão. A primeira conexão no G15 é o teste que falta.
