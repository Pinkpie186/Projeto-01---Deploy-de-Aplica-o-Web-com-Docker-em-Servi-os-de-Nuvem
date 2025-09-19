// Botão do Hero
document.getElementById("heroCat").addEventListener("click", async () => {
  try {
    const response = await fetch("https://api.thecatapi.com/v1/images/search");
    const data = await response.json();
    document.getElementById("heroCatImage").src = data[0].url;
  } catch (error) {
    console.error("Erro ao carregar imagem:", error);
  }
});

// Botão da Galeria
document.getElementById("loadGallery").addEventListener("click", async () => {
  try {
    const response = await fetch("https://api.thecatapi.com/v1/images/search?limit=6");
    const data = await response.json();
    const gallery = document.getElementById("galleryContainer");
    gallery.innerHTML = "";
    data.forEach(cat => {
      const img = document.createElement("img");
      img.src = cat.url;
      gallery.appendChild(img);
    });
  } catch (error) {
    console.error("Erro ao carregar galeria:", error);
  }
});
