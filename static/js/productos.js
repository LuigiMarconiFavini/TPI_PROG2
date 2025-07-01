/*
 * Este es el archivo JavaScript que maneja la lógica para la página de productos.
 * Aquí me encargo de permitir agregar productos al carrito y de mantener
 * el contador visual del carrito actualizado.
 */

function agregarAlCarrito(id, nombre, precio, imagen, stockDisponible) {
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    const yaEnCarrito = carrito.find(p => p.id === id);

    if (!yaEnCarrito) {
        if (stockDisponible > 0) {
            const nuevoProducto = { id, nombre, precio, imagen, cantidad: 1 };
            carrito.push(nuevoProducto);
            localStorage.setItem("carrito", JSON.stringify(carrito));
            alert(`"${nombre}" fue agregado al carrito.`);
        } else {
            alert(`"${nombre}" está actualmente SIN STOCK.`);
            return;
        }
    } else {
        if (yaEnCarrito.cantidad < stockDisponible) {
            yaEnCarrito.cantidad++;
            localStorage.setItem("carrito", JSON.stringify(carrito));
            alert(`Se añadió otra unidad de "${nombre}" al carrito. Cantidad actual: ${yaEnCarrito.cantidad}.`);
        } else {
            alert(`No hay suficiente stock de "${nombre}". Ya tienes ${yaEnCarrito.cantidad} en tu carrito y solo hay ${stockDisponible} disponibles.`);
        }
    }

    actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito")) || [];
    const contador = document.getElementById("contador-carrito");
    if (contador) {
        contador.textContent = carrito.length;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const botonesAgregar = document.querySelectorAll(".agregar-carrito");

    botonesAgregar.forEach((boton) => {
        boton.addEventListener("click", function () {
            const id = parseInt(this.getAttribute("data-id"));
            const nombre = this.getAttribute("data-nombre");
            const precio = parseFloat(this.getAttribute("data-precio"));
            const imagen = this.getAttribute("data-imagen");
            const stock = parseInt(this.getAttribute("data-stock"));

            agregarAlCarrito(id, nombre, precio, imagen, stock);
        });
    });

    actualizarContadorCarrito();
});
