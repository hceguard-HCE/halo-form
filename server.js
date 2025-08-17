import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const FILE = "./aprobados.json";

app.use(express.json());

// 📂 servir archivos estáticos (por ejemplo index.html y css)
app.use(express.static(path.join(process.cwd(), "public")));

function getAprobados() {
  try {
    const data = fs.readFileSync(FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveAprobados(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// 🔹 API endpoint
app.get("/check/:id", (req, res) => {
  const aprobados = getAprobados();
  const id = req.params.id;
  res.json({ approved: !!aprobados[id] });
});

// 🔹 servir index.html como raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
