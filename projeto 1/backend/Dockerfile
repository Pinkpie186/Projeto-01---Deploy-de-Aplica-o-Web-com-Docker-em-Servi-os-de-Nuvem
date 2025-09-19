# Imagem base Node.js
FROM node:18-alpine

# Cria diretório de app
WORKDIR /usr/src/app

# Copia package.json e instala dependências
COPY package.json ./
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Expõe porta 25000
EXPOSE 25000

# Comando de inicialização
CMD ["npm", "start"]
