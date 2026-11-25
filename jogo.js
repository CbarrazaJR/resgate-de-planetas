// Busca um elemento da página pelo id.
const id = (nome) => document.getElementById(nome);
// Nome usado para salvar a partida no navegador.
const CHAVE = "rescate-planetas-v1";

// Preço inicial e produção de cada melhoria.
const melhorias = [
  { nome: "Painel solar", preco: 12, clique: 2, segundo: 0 },
  { nome: "Drone de reparo", preco: 25, clique: 0, segundo: 2 },
  { nome: "Reator", preco: 80, clique: 0, segundo: 7 },
];
// Energia e melhoria necessárias para concluir cada objetivo.
const objetivos = [
  { nome: "Reativar o núcleo", energia: 30, melhoria: 0 },
  { nome: "Recuperar a atmosfera", energia: 120, melhoria: 1 },
  { nome: "Aquecer a superfície", energia: 280, melhoria: 2 },
  { nome: "Restaurar a vida", energia: 500, segundo: 10 },
];
// Mensagens exibidas conforme o planeta é recuperado.
const fases = ["Núcleo inativo.", "Núcleo ativo.", "Atmosfera recuperada.",
  "Superfície aquecida.", "Missão cumprida! Astéria voltou à vida."];

// Recupera e valida os dados salvos. Se falhar, inicia uma nova partida.
function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    const energia = dados?.energia;
    // Aceita os nomes dos campos usados nas partidas antigas.
    const energiaGerada = dados?.energiaGerada ?? dados?.generada;
    const niveis = dados?.niveis ?? dados?.niveles;
    if (niveis?.length === melhorias.length && Array.isArray(niveis)
      && [energia, energiaGerada, ...niveis].every((n) => Number.isSafeInteger(n) && n >= 0)
      && energiaGerada >= energia) {
      return { energia, energiaGerada, niveis };
    }
  } catch {}
  return novaPartida();
}

// Cria o saldo e os níveis iniciais.
const novaPartida = () => ({ energia: 0, energiaGerada: 0, niveis: melhorias.map(() => 0) });
// Guarda os dados da partida atual.
let partida = carregar();

// Salva a partida e mostra um aviso se a gravação falhar.
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(partida));
  } catch {
    id("aviso").textContent = "Não foi possível salvar a partida.";
    id("aviso").hidden = false;
  }
}

// Soma os bônus de cada melhoria multiplicados pelo nível comprado.
const producao = (tipo) => melhorias.reduce(
  (total, melhoria, i) => total + melhoria[tipo] * partida.niveis[i], tipo === "clique" ? 1 : 0
);
// Aumenta o preço a cada compra e arredonda para cima.
const preco = (i) => Math.ceil(melhorias[i].preco * 1.55 ** partida.niveis[i]);

// Cria a lista de objetivos no HTML.
id("objetivos").innerHTML = objetivos.map(({ nome }) =>
  `<li><strong class="objetivo-titulo">${nome}</strong><span class="objetivo-detalhes"></span></li>`
).join("");
// Cria os botões de compra com nome e bônus de cada melhoria.
id("melhorias").innerHTML = melhorias.map(({ nome, clique, segundo }) =>
  `<button type="button" class="melhoria">
    <span><strong>${nome}</strong><br><small>${clique ? `+${clique} por clique` : `+${segundo} por segundo`} · <b></b></small></span>
    <span class="preco"></span>
  </button>`
).join("");

// Guarda os elementos criados para atualizar seus textos depois.
const botoes = [...id("melhorias").children];
const itens = [...id("objetivos").children];

// Atualiza saldo, produção, preços e progresso da missão.
function atualizar() {
  const segundo = producao("segundo");
  id("saldo").textContent = partida.energia.toLocaleString("pt-BR");
  id("por-segundo").textContent = segundo;
  id("gerar").textContent = `Gerar energia (+${producao("clique")})`;

  // Bloqueia compras sem saldo suficiente e mostra nível e preço.
  botoes.forEach((botao, i) => {
    const valor = preco(i);
    botao.disabled = partida.energia < valor;
    botao.querySelector("b").textContent = `Nível ${partida.niveis[i]}`;
    botao.querySelector(".preco").textContent = `${valor} energia`;
  });

  // Conta as metas cumpridas e verifica os requisitos de cada uma.
  let fase = 0;
  let concluidos = 0;
  objetivos.forEach((meta, i) => {
    const gerada = Math.min(partida.energiaGerada, meta.energia);
    const instalada = partida.niveis[meta.melhoria] > 0;
    const extra = meta.segundo
      ? `${Math.min(segundo, meta.segundo)}/${meta.segundo} energia/s`
      : `${melhorias[meta.melhoria].nome} ${instalada ? "instalado" : "a instalar"}`;
    const pronto = gerada === meta.energia && (meta.segundo ? segundo >= meta.segundo : instalada);
    if (pronto) concluidos++;
    // A aparência avança pelas etapas concluídas desde o primeiro objetivo.
    if (pronto && fase === i) fase++;
    itens[i].dataset.concluido = pronto;
    itens[i].lastElementChild.textContent = pronto ? "Concluído" : `${gerada}/${meta.energia} de energia · ${extra}`;
  });

  // Atualiza a barra e a fase usada pelo CSS para colorir o planeta.
  id("resumo").textContent = `${concluidos} de ${objetivos.length} objetivos concluídos`;
  id("progresso").value = concluidos;
  id("imagem-planeta").dataset.fase = fase;
  if (id("fase").textContent !== fases[fase]) id("fase").textContent = fases[fase];
}

// Soma a energia ao saldo e ao total gerado, salva e atualiza a tela.
function ganhar(quantidade) {
  if (!quantidade) return;
  partida.energia += quantidade;
  partida.energiaGerada += quantidade;
  salvar();
  atualizar();
}

// Gera energia ao clicar no botão principal.
id("gerar").onclick = () => ganhar(producao("clique"));
// Desconta o preço e aumenta o nível da melhoria comprada.
botoes.forEach((botao, i) => {
  botao.onclick = () => {
    const valor = preco(i);
    if (partida.energia < valor) return;
    partida.energia -= valor;
    partida.niveis[i]++;
    salvar();
    atualizar();
  };
});
// Pede confirmação antes de zerar a partida.
id("reiniciar").onclick = () => {
  if (!confirm("Reiniciar partida?")) return;
  partida = novaPartida();
  salvar();
  atualizar();
  id("gerar").focus();
};

// Mostra os dados iniciais e gera energia automaticamente a cada segundo.
atualizar();
setInterval(() => ganhar(producao("segundo")), 1000);
