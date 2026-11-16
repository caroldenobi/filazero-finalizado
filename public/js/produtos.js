
const listaProdutos = document.getElementById("listaProdutos");
const formulario = document.getElementById("produtoForm");

const campoImagem = document.getElementById("imagem");
const imagemAtual = document.getElementById("imagemAtual");
const previewImagem = document.getElementById("previewImagem");

// ==================================================
// FUNÇÕES AUXILIARES
// ==================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function caminhoImagem(imagem) {
    if (!imagem) return "";

    // Imagens antigas continuam funcionando.
    if (imagem.startsWith("/")) {
        return imagem;
    }

    return "img/" + encodeURIComponent(imagem);
}

function mostrarPreview(caminho) {
    if (!caminho) {
        previewImagem.innerHTML =
            "<span>Nenhuma imagem selecionada</span>";
        return;
    }

    previewImagem.innerHTML = `
        <img
            src="${escaparHTML(caminho)}"
            alt="Pré-visualização do produto"
            style="max-width:200px; max-height:160px; object-fit:cover; border-radius:10px;"
            onerror="this.parentElement.textContent='Não foi possível carregar a imagem';"
        >
    `;
}

// ==================================================
// PRÉ-VISUALIZAÇÃO DA IMAGEM
// ==================================================

campoImagem.addEventListener("change", () => {
    const arquivo = campoImagem.files[0];

    if (!arquivo) {
        mostrarPreview(imagemAtual.value
            ? caminhoImagem(imagemAtual.value)
            : "");
        return;
    }

    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!tiposPermitidos.includes(arquivo.type)) {
        alert("Selecione uma imagem JPG, PNG ou WEBP.");
        campoImagem.value = "";
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        campoImagem.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = evento => {
        mostrarPreview(evento.target.result);
    };

    leitor.readAsDataURL(arquivo);
});

// ==================================================
// CARREGAR PRODUTOS
// ==================================================

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/todos-produtos");

        if (resposta.status === 403) {
            alert("Você não tem permissão para acessar esta página.");
            window.location.href = "/";
            return;
        }

        if (resposta.status === 401) {
            window.location.href = "/login.html";
            return;
        }

        const produtos = await resposta.json();

        listaProdutos.innerHTML = "";

        if (!Array.isArray(produtos) || produtos.length === 0) {
            listaProdutos.innerHTML = `
                <div class="produto-vazio">
                    <h3>Nenhum produto cadastrado.</h3>
                    <p>Clique em "Adicionar produto" para começar.</p>
                </div>
            `;
            return;
        }

        produtos.forEach(produto => {
            const card = document.createElement("div");
            card.className = "produto-admin";

            const disponibilidade = produto.disponivel
                ? "Disponível"
                : "Indisponível";

            const imagem = caminhoImagem(produto.imagem);

            card.innerHTML = `
                <div class="produto-admin-info">

                    <div class="produto-imagem">
                        ${
                            imagem
                                ? `<img
                                    src="${escaparHTML(imagem)}"
                                    alt="${escaparHTML(produto.nome)}"
                                    onerror="this.style.display='none'; this.parentElement.textContent='🍔';"
                                >`
                                : "🍔"
                        }
                    </div>

                    <div>
                        <span class="categoria">
                            ${escaparHTML(produto.categoria)}
                        </span>

                        <h3>${escaparHTML(produto.nome)}</h3>

                        <p>
                            ${escaparHTML(produto.descricao || "Sem descrição")}
                        </p>

                        <strong class="preco">
                            R$ ${Number(produto.preco)
                                .toFixed(2)
                                .replace(".", ",")}
                        </strong>

                        <span class="${
                            produto.disponivel
                                ? "disponivel"
                                : "indisponivel"
                        }">
                            ${disponibilidade}
                        </span>
                    </div>
                </div>

                <div class="produto-acoes">
                    <button type="button" class="editar">
                        ✏️ Editar
                    </button>

                    <button type="button" class="alternar">
                        ${
                            produto.disponivel
                                ? "🚫 Indisponibilizar"
                                : "✅ Disponibilizar"
                        }
                    </button>

                    <button type="button" class="botao-excluir excluir">
                        🗑️ Excluir
                    </button>
                </div>
            `;

            card.querySelector(".editar").addEventListener("click", () => {
                editarProduto(produto);
            });

            card.querySelector(".alternar").addEventListener("click", () => {
                alternarDisponibilidade(
                    produto.id,
                    Boolean(produto.disponivel)
                );
            });

            card.querySelector(".excluir").addEventListener("click", () => {
                excluirProduto(produto.id);
            });

            listaProdutos.appendChild(card);
        });

    } catch (erro) {
        console.error(erro);
        listaProdutos.innerHTML = "<p>Erro ao carregar produtos.</p>";
    }
}

// ==================================================
// ABRIR FORMULÁRIO
// ==================================================

function abrirFormulario() {
    document.getElementById("formularioProduto").style.display = "block";

    document.getElementById("tituloFormulario").textContent =
        "Adicionar produto";

    formulario.reset();

    document.getElementById("produtoId").value = "";
    imagemAtual.value = "";

    mostrarPreview("");
}

// ==================================================
// FECHAR FORMULÁRIO
// ==================================================

function fecharFormulario() {
    document.getElementById("formularioProduto").style.display = "none";
    formulario.reset();
    imagemAtual.value = "";
    mostrarPreview("");
}

// ==================================================
// SALVAR PRODUTO
// ==================================================

formulario.addEventListener("submit", async evento => {
    evento.preventDefault();

    const id = document.getElementById("produtoId").value;
    const arquivo = campoImagem.files[0];

    if (!id && !arquivo) {
        alert("Selecione uma imagem para o produto.");
        return;
    }

    if (arquivo && arquivo.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5 MB.");
        return;
    }

    const dados = new FormData();

    dados.append("nome", document.getElementById("nome").value.trim());
    dados.append("descricao", document.getElementById("descricao").value.trim());
    dados.append("preco", document.getElementById("preco").value);
    dados.append("categoria", document.getElementById("categoria").value);
    dados.append("imagemAtual", imagemAtual.value);

    if (arquivo) {
        dados.append("imagem", arquivo);
    }

    try {
        let resposta;

        if (id) {
            resposta = await fetch(`/api/produtos/${id}`, {
                method: "PUT",
                body: dados
            });
        } else {
            resposta = await fetch("/api/produtos", {
                method: "POST",
                body: dados
            });
        }

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível salvar o produto.");
            return;
        }

        alert(resultado.mensagem);

        fecharFormulario();
        await carregarProdutos();

    } catch (erro) {
        console.error(erro);
        alert("Erro ao salvar produto. Verifique sua conexão.");
    }
});

// ==================================================
// EDITAR PRODUTO
// ==================================================

function editarProduto(produto) {
    document.getElementById("formularioProduto").style.display = "block";

    document.getElementById("tituloFormulario").textContent =
        "Editar produto";

    document.getElementById("produtoId").value = produto.id;
    document.getElementById("nome").value = produto.nome;
    document.getElementById("descricao").value = produto.descricao || "";
    document.getElementById("preco").value = produto.preco;
    document.getElementById("categoria").value = produto.categoria;

    // O navegador não permite preencher um input file por código.
    // Guardamos apenas o caminho da imagem que já existe.
    campoImagem.value = "";
    imagemAtual.value = produto.imagem || "";

    mostrarPreview(
        produto.imagem ? caminhoImagem(produto.imagem) : ""
    );

    document.getElementById("formularioProduto").scrollIntoView({
        behavior: "smooth"
    });
}

// ==================================================
// EXCLUIR PRODUTO
// ==================================================

async function excluirProduto(id) {
    const confirmar = confirm(
        "Tem certeza que deseja excluir este produto?"
    );

    if (!confirmar) return;

    try {
        const resposta = await fetch(`/api/produtos/${id}`, {
            method: "DELETE"
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert(dados.mensagem || "Não foi possível excluir o produto.");
            return;
        }

        alert(dados.mensagem);
        await carregarProdutos();

    } catch (erro) {
        console.error(erro);
        alert("Erro ao excluir produto.");
    }
}

// ==================================================
// ALTERAR DISPONIBILIDADE
// ==================================================

async function alternarDisponibilidade(id, disponibilidadeAtual) {
    try {
        const respostaProdutos = await fetch("/api/todos-produtos");
        const produtos = await respostaProdutos.json();

        const produto = produtos.find(p => Number(p.id) === Number(id));

        if (!produto) {
            alert("Produto não encontrado.");
            return;
        }

        const dados = new FormData();

        dados.append("nome", produto.nome);
        dados.append("descricao", produto.descricao || "");
        dados.append("preco", produto.preco);
        dados.append("categoria", produto.categoria);
        dados.append("imagemAtual", produto.imagem || "");
        dados.append("disponivel", disponibilidadeAtual ? "0" : "1");

        const resposta = await fetch(`/api/produtos/${id}`, {
            method: "PUT",
            body: dados
        });

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            alert(resultado.mensagem || "Não foi possível alterar.");
            return;
        }

        await carregarProdutos();

    } catch (erro) {
        console.error(erro);
        alert("Erro ao alterar disponibilidade.");
    }
}

// ==================================================
// INICIAR
// ==================================================

carregarProdutos();
