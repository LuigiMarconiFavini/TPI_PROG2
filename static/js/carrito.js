/*
 * Este es el archivo JavaScript que controla la funcionalidad del carrito de compras.
 * Aquí me encargo de manejar la adición, eliminación y actualización de productos
 * en el carrito, así como de la lógica de compra y la interacción con el backend.
 */
document.addEventListener("DOMContentLoaded", function () {
    const contenedorCarrito = document.getElementById("carritoItems");
    const textoTotalCarrito = document.getElementById("totalCarrito");
    const botonLimpiar = document.getElementById("btn-limpiar");
    const botonComprar = document.getElementById("btn-comprar");

    const loginModal = document.getElementById('loginModal');
    const closeButton = document.querySelector('.close-button');
    const modalLoginBtn = document.getElementById('modalLoginBtn');
    const modalRegisterBtn = document.getElementById('modalRegisterBtn');

    // --- Carga y Gestión del Carrito ---
    // Intento cargar el carrito desde el almacenamiento local (localStorage).
    // Si no hay nada guardado, lo inicializo como un arreglo vacío.
    let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

    carrito = carrito.map(producto => {
        return {
            ...producto,
            cantidad: producto.cantidad ? parseInt(producto.cantidad) : 1
        };
    });


    function guardarCarritoEnStorage() {
        localStorage.setItem("carrito", JSON.stringify(carrito));
    }

    function calcularTotalCarrito() {
        let total = 0;
        for (let producto of carrito) {
            total += producto.precio * producto.cantidad;
        }
        return total;
    }

    function mostrarCarrito() {
        contenedorCarrito.innerHTML = "";

        if (carrito.length === 0) {
            contenedorCarrito.innerHTML = "<p>Tu carrito está vacío.</p>";
            textoTotalCarrito.textContent = "Total: $0";
            botonComprar.disabled = true;
            botonLimpiar.disabled = true;
            return;
        } else {
            botonComprar.disabled = false;
            botonLimpiar.disabled = false;
        }

        carrito.forEach((producto, indice) => {
            const productoDiv = document.createElement("div");
            productoDiv.className = "carrito-item";

            let imageUrl;
            if (producto.imagen.startsWith('http://') || producto.imagen.startsWith('https://')) {
                imageUrl = producto.imagen;
            } else if (producto.imagen.startsWith('/static/')) {
                imageUrl = location.origin + producto.imagen;
            } else {
                let cleanedImagePath = producto.imagen.startsWith('static/') ? producto.imagen.substring(7) : producto.imagen;
                imageUrl = location.origin + '/static/' + cleanedImagePath;
            }

            productoDiv.innerHTML = `
                <img src="${imageUrl}" alt="${producto.nombre}">
                <div class="carrito-detalles">
                    <p>${producto.nombre}</p>
                    <p>Precio unitario: $${producto.precio.toFixed(2)}</p>
                </div>
                <input type="number" min="1" value="${producto.cantidad}" class="cantidad-input" data-indice="${indice}" />
                <p>Subtotal: $${(producto.precio * producto.cantidad).toFixed(2)}</p>
                <button class="btn-eliminar" data-indice="${indice}">Eliminar</button>
            `;
            contenedorCarrito.appendChild(productoDiv);
        });

        textoTotalCarrito.textContent = `Total: $${calcularTotalCarrito().toFixed(2)}`;
    }

    // Esta función elimina un producto del carrito utilizando su índice.
    function eliminarProductoDelCarrito(indice) {
        carrito.splice(indice, 1);
        guardarCarritoEnStorage();
        mostrarCarrito();
    }

    function actualizarCantidadProducto(indice, nuevaCantidad) {
        if (nuevaCantidad < 1 || isNaN(nuevaCantidad)) {
            nuevaCantidad = 1;
        }
        carrito[indice].cantidad = nuevaCantidad;
        guardarCarritoEnStorage();
        mostrarCarrito();
    }

    // Esta función vacía completamente el carrito.
    function vaciarCarrito() {
        carrito = [];
        guardarCarritoEnStorage();
        mostrarCarrito();
    }

    // --- Manejo de Eventos del Carrito ---
    contenedorCarrito.addEventListener("click", function (evento) {
        if (evento.target.classList.contains("btn-eliminar")) {
            const indice = evento.target.getAttribute("data-indice");
            eliminarProductoDelCarrito(indice);
        }
    });

    contenedorCarrito.addEventListener("input", function (evento) {
        if (evento.target.classList.contains("cantidad-input")) {
            const indice = evento.target.getAttribute("data-indice");
            const nuevaCantidad = parseInt(evento.target.value);
            actualizarCantidadProducto(indice, nuevaCantidad);
        }
    });

    // Evento para el botón "Limpiar Carrito".
    botonLimpiar.addEventListener("click", function () {
        if (confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
            vaciarCarrito();
        }
    });

    // --- Lógica del Botón "Comprar" ---
    botonComprar.addEventListener("click", async function () {
        if (carrito.length === 0) {
            alert("Tu carrito está vacío. Agrega productos antes de comprar.");
            return;
        }

        try {
            const loginCheckResponse = await fetch('/api/check_login_status');
            const contentType = loginCheckResponse.headers.get("content-type");

            if (!loginCheckResponse.ok || !contentType || !contentType.includes("application/json")) {
                console.error('Error: Respuesta inesperada del servidor al verificar login. Status:', loginCheckResponse.status, 'Content-Type:', contentType);
                alert('Hubo un problema de comunicación con el servidor al verificar tu sesión. Inténtalo de nuevo.');
                return;
            }

            const loginCheckResult = await loginCheckResponse.json();

            if (!loginCheckResult.isLoggedIn) {
                loginModal.style.display = 'flex';
                return;
            }
        } catch (error) {
            console.error('Error al verificar estado de login (red/parseo):', error);
            alert('No se pudo verificar tu estado de sesión debido a un problema de red o del servidor. Inténtalo de nuevo.');
            return;
        }

        const total = calcularTotalCarrito();

        try {
            const response = await fetch('/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: carrito, total: total })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error('Error: La respuesta del servidor al intentar crear pedido no es JSON. Status:', response.status, 'Content-Type:', contentType);
                alert('Respuesta inesperada del servidor al procesar la compra. Revisa la consola del navegador y del servidor.');
                return;
            }

            const result = await response.json();

            if (response.ok) {
                alert(result.message + ` Pedido ID: ${result.pedido_id}`);
                vaciarCarrito();
                window.location.href = '/mis_pedidos';
            } else {
                alert(result.message || `Error del servidor: ${response.status}.`);
            }
        } catch (error) {
            console.error('Error al realizar la compra (red/parseo final):', error);
            alert('No se pudo conectar con el servidor para procesar la compra. Inténtalo de nuevo más tarde.');
        }
    });

    // --- Manejo de Eventos del Modal de Login/Registro ---
    closeButton.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == loginModal) {
            loginModal.style.display = 'none';
        }
    });

    modalLoginBtn.addEventListener('click', () => {
        window.location.href = '/login';
    });

    modalRegisterBtn.addEventListener('click', () => {
        window.location.href = '/registro';
    });

    // --- Carga Inicial ---
    // Cuando la página se carga por primera vez, muestro el carrito.
    mostrarCarrito();
});
