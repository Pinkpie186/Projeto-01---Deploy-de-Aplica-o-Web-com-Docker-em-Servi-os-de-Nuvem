# Projeto 01 — Deploy de Aplicação Web com Docker em AWS EC2

**Grupo:** 
Gabriel Bello - 10416808
(SEU NOMES E RA)

**Data:** 22/09/2025

## 1) Descrição da aplicação (web + back-end)

A solução é composta por dois serviços:

- **Backend (Node/Express)** — Porta **25000**  
  Expõe as rotas:
  - `GET /` → texto “Backend dos Gatos está rodando! 🐾”
  - `GET /health` → `{ "status": "ok" }` (health-check)
  - `GET /api/cat` → retorna 1 imagem da **The Cat API**
  - `GET /api/cats` → retorna 6 imagens da **The Cat API**

- **Frontend (Nginx + HTML/CSS/JS)** — Porta **8080**  
  Página responsiva com botão para exibir imagens de gatos. O frontend chama o backend via **proxy** (`/api/*`) configurado no Nginx.

**Requisito de isolamento atendido:** o backend **não é exposto ao público**; somente a **EC2 do frontend** pode acessá-lo (regra no **Security Group** do backend apontando para o **Security Group** do frontend).

---

## 2) Estrutura do repositório

```
projeto 1/
├─ backend/
│  ├─ Dockerfile
│  ├─ package.json
│  └─ server.js
└─ frontend/
   ├─ Dockerfile
   ├─ nginx.conf
   ├─ index.html
   ├─ style.css
   └─ script.js
```

---

## 3) Dockerfiles utilizados e explicação do empacotamento

### 3.1 Backend (`backend/Dockerfile`)
```dockerfile
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --only=production
COPY . .
EXPOSE 25000
CMD ["npm","start"]
```

**Explicação (camadas):**
1. Base leve (`node:18-alpine`).  
2. `WORKDIR` define diretório de trabalho.  
3. `COPY package.json` + `npm install` antes do `COPY .` → melhora cache.  
4. `COPY . .` traz o código.  
5. `EXPOSE 25000` documenta a porta do serviço.  
6. `CMD ["npm","start"]` inicia o servidor.

**`package.json` (trecho relevante):**
```json
{
  "name": "backend-cats",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  }
}
```

**`server.js` (rotas principais):**
```js
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 25000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Backend dos Gatos está rodando! 🐾");
});

app.get("/api/cat", async (req, res) => {
  try {
    const r = await axios.get("https://api.thecatapi.com/v1/images/search");
    res.json(r.data);
  } catch {
    res.status(500).json({ error: "Erro ao buscar imagem" });
  }
});

app.get("/api/cats", async (req, res) => {
  try {
    const r = await axios.get("https://api.thecatapi.com/v1/images/search?limit=6");
    res.json(r.data);
  } catch {
    res.status(500).json({ error: "Erro ao buscar galeria" });
  }
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`Servidor rodando na porta \${PORT}\`);
});
```

---

### 3.2 Frontend (`frontend/Dockerfile`)
```dockerfile
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d
COPY . /usr/share/nginx/html
EXPOSE 8080
```

**`nginx.conf` (trecho chave do proxy):**
```nginx
server {
  listen 8080;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # estáticos diretos
  location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$ {
    try_files $uri =404;
    access_log off;
    expires 1h;
  }

  # proxy para o backend (usar IP PRIVADO do back)
  location /api/ {
    proxy_pass http://10.0.X.Y:25000/;  # <--- IP privado da EC2 do backend
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

**Explicação:**  
- Remove o `default.conf` do Nginx, adiciona nosso `nginx.conf`, e copia os arquivos estáticos.  
- `listen 8080` → mapeamos `-p 8080:8080`.  
- `proxy_pass` aponta para o **IP privado** do backend, garantindo isolamento.

---

## 4) Passos para criar os containers (build e run)

### Backend (na EC2 do backend)
```bash
# instalar docker (Amazon Linux 2023)
sudo yum update -y
sudo yum install -y docker git
sudo systemctl enable --now docker

# clonar repo e ir para a pasta
git clone <NOSSO_REPO>
cd "<NOSSO_REPO>/projeto 1/backend"

# build e run
sudo docker build -t backend-cats:latest .
sudo docker rm -f backend-cats 2>/dev/null || true
sudo docker run -d --name backend-cats -p 25000:25000 --restart unless-stopped backend-cats:latest

# teste
curl -s http://localhost:25000/health
curl -s http://localhost:25000/api/cat | head
```

### Frontend (na EC2 do frontend)
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl enable --now docker

git clone <SEU_REPO>
cd "<SEU_REPO>/projeto 1/frontend"

# edite nginx.conf e coloque o IP PRIVADO do backend no proxy_pass
sudo docker build -t frontend-cats:latest .
sudo docker rm -f frontend-cats 2>/dev/null || true
sudo docker run -d --name frontend-cats -p 8080:8080 --restart unless-stopped frontend-cats:latest

# testes
curl -I http://localhost:8080
curl -s http://localhost:8080/api/cat | head
```

---

## 5) AWS: VM (EC2), VPC e regras de segurança (detalhado)

### VPC & Sub-redes (exemplo)
- **VPC:** `10.0.0.0/16`
- **Subnet Pública (frontend):** `10.0.1.0/24` → **Route Table** com rota `0.0.0.0/0` via **Internet Gateway**
- **Subnet Privada ou Pública controlada (backend):** `10.0.2.0/24`  
  - Se **privada**, usar **NAT Gateway** para saída à internet (The Cat API).  
  - Se **pública**, **NÃO** expor a 25000 ao público; controle via SG.

### Security Groups
- **SG-frontend (EC2 do front):**
  - **Inbound:**  
    - TCP **8080** de `0.0.0.0/0` (acesso público ao site)  
    - TCP **22** do seu IP (SSH) *(opcional)*
  - **Outbound:** All traffic (padrão)

- **SG-backend (EC2 do back):**
  - **Inbound:**  
    - TCP **25000** **apenas** do **SG-frontend** (Source = *Security Group* do front)  
    - TCP **22** do seu IP (opcional)
  - **Outbound:** All traffic (precisa sair para a The Cat API)


### IP privado do backend (para configurar no Nginx)
```bash
# rodar na EC2 do backend
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token"   -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
curl -s -H "X-aws-ec2-metadata-token: $TOKEN"   http://169.254.169.254/latest/meta-data/local-ipv4
```

---

## 7) Desafios encontrados e como foram superados

- **CSS não carregava (página “sem estilo”)**  
  Causa: `index.html` apontava para caminho do Windows.  
  Solução: usar `href="/style.css"` (caminho web) e rebuild.

- **“Connection reset by peer” no front**  
  Causa: porta do Nginx/`docker run` mapeada errado.  
  Solução: `listen 8080;` no `nginx.conf` e `docker run -p 8080:8080`.

- **`Cannot GET /health`**  
  Causa: rota não existia/estava em cache de build.  
  Solução: adicionar `/health` no `server.js` e `docker build --no-cache`.

- **Permissão Docker**  
  Causa: `permission denied` no daemon.  
  Solução: usar `sudo` e/ou adicionar usuário ao grupo `docker`.

- **Conflito de nome de container**  
  Causa: tentar subir um container com nome existente.  
  Solução: `docker rm -f <nome>` antes de `docker run`.

- **Isolamento do backend**  
  Causa: SG do back aberto (0.0.0.0/0) ou front e back na mesma EC2.  
  Solução: duas EC2s; `SG-backend` com **origem = SG-frontend**; `proxy_pass` para IP **privado**.

---

## 9) Apêndice — comandos rápidos

**Backend**
```bash
cd "<REPO>/projeto 1/backend"
sudo docker build -t backend-cats:latest .
sudo docker rm -f backend-cats 2>/dev/null || true
sudo docker run -d --name backend-cats -p 25000:25000 --restart unless-stopped backend-cats:latest
curl -s http://localhost:25000/health
```

**Frontend**
```bash
cd "<REPO>/projeto 1/frontend"
sudo docker build -t frontend-cats:latest .
sudo docker rm -f frontend-cats 2>/dev/null || true
sudo docker run -d --name frontend-cats -p 8080:8080 --restart unless-stopped frontend-cats:latest
curl -s http://localhost:8080/api/cat | head
```
