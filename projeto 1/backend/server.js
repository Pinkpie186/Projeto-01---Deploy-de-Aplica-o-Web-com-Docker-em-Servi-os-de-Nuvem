const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 25000;

app.use(cors());

// Rota básica para teste
app.get("/", (req, res) => {
  res.send("Backend dos Gatos está rodando! 🐾");
});

// Rota para buscar 1 imagem
app.get("/api/cat", async (req, res) => {
  try {
    const response = await axios.get("https://api.thecatapi.com/v1/images/search");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar imagem" });
  }
});

// Rota para buscar múltiplas imagens (galeria)
app.get("/api/cats", async (req, res) => {
  try {
    const response = await axios.get("https://api.thecatapi.com/v1/images/search?limit=6");
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar galeria" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
