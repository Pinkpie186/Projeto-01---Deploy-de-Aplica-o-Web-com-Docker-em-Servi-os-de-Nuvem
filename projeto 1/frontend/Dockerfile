# Imagem base oficial do Nginx
FROM nginx:alpine

# Remove o arquivo default de configuração do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia o arquivo de configuração customizado para usar a porta 8080
COPY nginx.conf /etc/nginx/conf.d

# Copia os arquivos da aplicação para a pasta pública do Nginx
COPY . /usr/share/nginx/html

# Expõe a porta 8080
EXPOSE 8080

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
