document.addEventListener("DOMContentLoaded", () => {
const contenedor = document.querySelector(".frutas-animadas");
const frutas = ["🍎", "🍐", "🍊", "🍑", "🍒", "🍓"];
const cantidad = 500;

for (let i = 0; i < cantidad; i++) {
    const fruta = document.createElement("span");
    fruta.innerText = frutas[Math.floor(Math.random() * frutas.length)];
    fruta.style.left = Math.random() * 100 + "vw";
    fruta.style.animationDelay = Math.random() * 10 + "s";
    fruta.style.fontSize = Math.random() * 20 + 20 + "px";
    contenedor.appendChild(fruta);
}
});
