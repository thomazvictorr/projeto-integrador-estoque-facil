const { abrirBanco } = require("./db");
const { criarApp } = require("./app");

const PORT = process.env.PORT || 3001;
const db = abrirBanco();
const app = criarApp(db);

app.listen(PORT, () => {
  console.log(`API Estoque Fácil rodando em http://localhost:${PORT}/api`);
});
