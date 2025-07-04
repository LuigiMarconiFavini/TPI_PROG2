/*
 * este es el archivo JavaScript que maneja toda la lógica de la página de administración.
 * Acá me encargo de interactuar con la interfaz (el DOM) y de comunicarme con el servidor
 * para gestionar usuarios, productos y pedidos
 */

// Acá me aseguro de que el DOM esté completamente cargado antes de empezar a interactuar con los elementos.
document.addEventListener('DOMContentLoaded', function() {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    // Primero, me armo unas constantes para tener a mano los elementos del HTML
    // con los que voy a trabajar más seguido. Así no tengo que buscarlos cada vez.

    const adminMessageDiv = document.getElementById('adminMessage'); // El div donde muestro mensajes de éxito/error para usuarios y productos.
    const adminOrdersMessageDiv = document.getElementById('adminOrdersMessage'); // El div para mensajes de éxito/error de la gestión de pedidos.
    const allOrdersListDiv = document.getElementById('allOrdersList'); // El contenedor donde muestro todos los pedidos de los clientes.

    // Elementos relacionados con la gestión de productos
    const productListDiv = document.getElementById('productList'); // El div donde se muestran las tarjetas de los productos.
    const productForm = document.getElementById('productForm'); // El formulario para agregar o editar productos.
    const productIdInput = document.getElementById('productId'); // Input oculto para el ID del producto (para editar).
    const productNameInput = document.getElementById('productName'); // Input para el nombre del producto.
    const productPriceInput = document.getElementById('productPrice'); // Input para el precio del producto.
    const productImageInput = document.getElementById('productImage'); // Input para la imagen del producto (tipo file).
    const productStockInput = document.getElementById('productStock'); // Input para el stock del producto.
    const saveProductBtn = document.getElementById('saveProductBtn'); // Botón para guardar (o actualizar) un producto.
    const clearProductFormBtn = document.getElementById('clearProductFormBtn'); // Botón para limpiar el formulario de productos.

    // --- LÓGICA DE ADMINISTRACIÓN DE USUARIOS ---
    document.querySelector('.user-list').addEventListener('click', async function(event) {
        // --- Lógica para Guardar Rol de Usuario ---
        // Chequeo si el clic fue en un botón con la clase 'save-role-btn'.
        if (event.target.classList.contains('save-role-btn')) {
            const button = event.target;
            const userId = button.dataset.userId; // Obtengo el ID del usuario desde el atributo data-userId del botón.
            const selectElement = document.getElementById(`role-${userId}`); // Busco el select de rol específico de ese usuario.
            const newRole = selectElement.value; // Obtengo el nuevo rol seleccionado.
            adminMessageDiv.style.display = 'none'; // Oculto cualquier mensaje anterior para limpiar la vista.

            try {
                // Hago un pedido POST a mi API para cambiar el rol del usuario.
                const response = await fetch('/api/admin/change_user_role', {
                    method: 'POST', // Es un POST porque estoy modificando datos.
                    headers: { 'Content-Type': 'application/json' }, // Le digo al servidor que le mando JSON.
                    body: JSON.stringify({ user_id: userId, new_role: newRole }) // Convierto el objeto a JSON para mandarlo.
                });
                const result = await response.json(); // Espero la respuesta del servidor (también en JSON).
                adminMessageDiv.textContent = result.message;
                // Decido si el mensaje es de éxito o error según si la respuesta fue exitosa (response.ok).
                adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                adminMessageDiv.style.display = 'block'; // Ahora sí, muestro el mensaje.
            } catch (error) {
                // Si algo sale mal en la comunicación con el servidor...
                console.error('Error al cambiar el rol:', error); // Muestro el error en la consola para depurar.
                adminMessageDiv.textContent = 'Error de conexión o del servidor al intentar cambiar el rol.';
                adminMessageDiv.className = 'admin-message error';
                adminMessageDiv.style.display = 'block';
            }
        }

        // --- Lógica para Eliminar Usuario ---
        // Chequeo si el clic fue en un botón con la clase 'delete-user-btn'.
        if (event.target.classList.contains('delete-user-btn')) {
            const button = event.target;
            const userId = button.dataset.userId; // Obtengo el ID del usuario a eliminar.
            if (confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${userId}? Esta acción es irreversible y eliminará todos sus pedidos.`)) {
                adminMessageDiv.style.display = 'none';
                try {
                    // Hago un pedido DELETE a mi API para borrar el usuario.
                    const response = await fetch(`/api/admin/delete_user/${userId}`, { method: 'DELETE' });
                    const result = await response.json(); // Espero la respuesta del servidor.
                    adminMessageDiv.textContent = result.message;
                    adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                    if (response.ok) {
                        // Si se eliminó correctamente, saco el elemento del usuario del DOM.
                        button.closest('.user-item').remove();
                    }
                } catch (error) {
                    // Si hay un problema al eliminar al usuario...
                    console.error('Error al eliminar usuario:', error);
                    adminMessageDiv.textContent = 'Error de conexión o del servidor al intentar eliminar el usuario.';
                    adminMessageDiv.className = 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                }
            }
        }
    });

    // --- LÓGICA DE ADMINISTRACIÓN DE PRODUCTOS ---
    // Esta función se encarga de cargar y mostrar todos los productos.
    async function loadProducts() {
        productListDiv.innerHTML = '<p>Cargando productos...</p>'; // Muestro un mensaje de "cargando" mientras espero.
        try {
            const response = await fetch('/api/productos'); // Pido la lista de productos a mi API.
            const products = await response.json(); // Espero la respuesta y la convierto a JSON.

            if (!response.ok) throw new Error('La respuesta de la red no fue correcta.'); // Si la respuesta no es 200 OK, lanzo un error.
            
            productListDiv.innerHTML = '';

            if (products.length === 0) {
                productListDiv.innerHTML = '<p>No hay productos disponibles.</p>'; // Si no hay productos, muestro un mensaje.
                return; // Y salgo de la función.
            }

            // Recorro cada producto y creo su tarjeta HTML.
            products.forEach(product => {
                const productDiv = document.createElement('div');
                productDiv.className = 'producto';
                
                const imageUrl = product.imagen.startsWith('http') ? product.imagen : `/static/${product.imagen}`;

                productDiv.innerHTML = `
                    <img src="${imageUrl}" alt="${product.nombre}">
                    <h3>${product.nombre}</h3>
                    <p>Precio: $${product.precio.toFixed(2)}</p>
                    <p>Stock: ${product.stock}</p>
                    <button class="edit-product-btn" data-id="${product.id}"
                            data-nombre="${product.nombre}"
                            data-precio="${product.precio}"
                            data-imagen="${product.imagen}"
                            data-stock="${product.stock}">Editar</button>
                    <button class="delete-btn-common delete-product-btn" data-id="${product.id}">Eliminar</button>
                `;
                productListDiv.appendChild(productDiv); // Agrego la tarjeta al contenedor de productos.
            });
        } catch (error) {
            // Si hay un error al cargar los productos...
            console.error('Error al cargar productos:', error);
            productListDiv.innerHTML = '<p class="error">Error al cargar productos.</p>';
        }
    }

    // Escucho el evento 'submit' del formulario de productos (para Agregar o Editar).
    productForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Evito que el formulario se envíe de la forma tradicional (recarga la página).
        const productId = productIdInput.value;
        const method = productId ? 'PUT' : 'POST'; // Si hay ID, es un PUT (actualizar); si no, es un POST (crear).
        const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products'; // La URL de la API cambia según si edito o creo.

        // Creo un objeto FormData para poder mandar tanto los datos del formulario
        // como el archivo de imagen de forma correcta.
        const formData = new FormData();
        formData.append('nombre', productNameInput.value.trim());
        formData.append('precio', parseFloat(productPriceInput.value));
        formData.append('stock', parseInt(productStockInput.value));

        const imageFile = productImageInput.files[0];
        if (imageFile) {
            formData.append('imagen', imageFile);
        }
        
        adminMessageDiv.style.display = 'none';

        try {
            // Hago el pedido a la API.
            const response = await fetch(url, {
                method: method,
                body: formData 
            });
            const result = await response.json(); // Espero la respuesta del servidor.
            
            adminMessageDiv.textContent = result.message;
            adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
            adminMessageDiv.style.display = 'block';

            if (response.ok) {
                // Si todo salió bien, reseteo el formulario, limpio el ID oculto,
                // cambio el texto del botón y recargo la lista de productos para ver los cambios.
                productForm.reset();
                productIdInput.value = '';
                saveProductBtn.textContent = 'Guardar Producto';
                loadProducts(); // Recargo la lista para que se vean los cambios.
            }
        } catch (error) {
            // Si hay un error al guardar o actualizar el producto...
            console.error('Error al guardar producto:', error);
            adminMessageDiv.textContent = 'Error de conexión o del servidor al guardar el producto.';
            adminMessageDiv.className = 'admin-message error';
            adminMessageDiv.style.display = 'block';
        }
    });

    // Escucho los clics en la lista de productos (para Editar y Eliminar).
    productListDiv.addEventListener('click', async function(event) {
        if (event.target.classList.contains('edit-product-btn')) {
            const button = event.target;
            productIdInput.value = button.dataset.id;
            productNameInput.value = button.dataset.nombre;
            productPriceInput.value = button.dataset.precio;
            productImageInput.value = ''; 
            productStockInput.value = button.dataset.stock;
            saveProductBtn.textContent = 'Actualizar Producto';
            window.scrollTo({ top: productForm.offsetTop, behavior: 'smooth' });
        }

        // --- Lógica para el botón "Eliminar" ---
        if (event.target.classList.contains('delete-product-btn')) {
            const productId = event.target.dataset.id;
            if (confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${productId}?`)) {
                adminMessageDiv.style.display = 'none';
                try {
                    // Hago un pedido DELETE a mi API para borrar el producto.
                    const response = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
                    const result = await response.json();
                    
                    adminMessageDiv.textContent = result.message;
                    adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                    adminMessageDiv.style.display = 'block';

                    if (response.ok) {
                        loadProducts(); // Si se borró bien, recargo la lista para que desaparezca el producto.
                    }
                } catch (error) {
                    // Si hay un error al eliminar el producto...
                    console.error('Error al eliminar producto:', error);
                    adminMessageDiv.textContent = 'Error de conexión o del servidor al eliminar el producto.';
                    adminMessageDiv.className = 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                }
            }
        }
    });

    // Escucho el clic en el botón para limpiar el formulario de producto.
    clearProductFormBtn.addEventListener('click', function() {
        productForm.reset();
        productIdInput.value = '';
        saveProductBtn.textContent = 'Guardar Producto';
        adminMessageDiv.style.display = 'none';
    });


    // --- LÓGICA PARA GESTIÓN DE TODOS LOS PEDIDOS DE CLIENTES ---
    // Esta función carga y muestra todos los pedidos realizados por los clientes.
    async function loadAllOrders() {
        allOrdersListDiv.innerHTML = '<p>Cargando pedidos de clientes...</p>';
        adminOrdersMessageDiv.style.display = 'none';

        try {
            const response = await fetch('/api/admin/pedidos'); // Pido todos los pedidos a la API de admin.
            if (!response.ok) throw new Error('La respuesta de la red no fue correcta.'); // Si no es 200 OK, error.
            
            const orders = await response.json(); // Convierto la respuesta a JSON.
            
            allOrdersListDiv.innerHTML = ''; // Limpio el contenedor antes de añadir los pedidos.

            if (orders.length === 0) {
                allOrdersListDiv.innerHTML = '<p>No hay pedidos registrados.</p>'; // Si no hay pedidos, aviso.
                return;
            }

            // Recorro cada pedido y creo su estructura HTML.
            orders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'pedido-item';
                
                // Armo el HTML para cada pedido, incluyendo los datos del comprador y el estado editable.
                orderDiv.innerHTML = `
                    <div class="pedido-header">
                        <h3>Pedido #ID: ${order.id} (Cliente: ${order.comprador_nombre || 'Desconocido'})</h3>
                        <span>Email: ${order.comprador_email || 'Desconocido'}</span>
                        <span>Fecha: ${new Date(order.fecha_pedido).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span>Total: $${order.total.toFixed(2)}</span>
                    </div>
                    <div class="pedido-items">
                        <h4>Productos:</h4>
                        <ul>
                            ${order.items.map(item => `
                                <li>
                                    <span>${item.cantidad} x ${item.nombre_producto || 'Producto Desconocido'}</span>
                                    <span>$${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="pedido-actions" style="display: flex; align-items: center; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                        <strong>Estado:</strong>
                        <select class="order-status-select" data-pedido-id="${order.id}">
                            <option value="Pendiente" ${order.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                            <option value="Aceptado" ${order.estado === 'Aceptado' ? 'selected' : ''}>Aceptado</option>
                            <option value="Enviado" ${order.estado === 'Enviado' ? 'selected' : ''}>Enviado</option>
                        </select>
                        <button class="save-status-btn" data-pedido-id="${order.id}">Guardar Estado</button>
                        <button class="delete-btn-common delete-order-btn" data-pedido-id="${order.id}">Eliminar Pedido</button>
                    </div>
                `;
                allOrdersListDiv.appendChild(orderDiv); // Agrego el pedido al contenedor principal de pedidos.
            });

        } catch (error) {
            // Si hay un error al cargar los pedidos...
            console.error('Error al cargar todos los pedidos:', error);
            adminOrdersMessageDiv.textContent = 'Error de conexión o del servidor al cargar los pedidos.';
            adminOrdersMessageDiv.className = 'admin-message error';
            adminOrdersMessageDiv.style.display = 'block';
        }
    }

    // Escucho los clics en el contenedor de todos los pedidos (para actualizar estado o eliminar).
    allOrdersListDiv.addEventListener('click', async function(event) {
        adminOrdersMessageDiv.style.display = 'none';

        // ---- Lógica para Guardar Estado del Pedido ----
        if (event.target.classList.contains('save-status-btn')) {
            const pedidoId = event.target.dataset.pedidoId;
            const selectElement = document.querySelector(`.order-status-select[data-pedido-id="${pedidoId}"]`);
            const nuevoEstado = selectElement.value;

            try {
                // Hago un pedido PUT a la API para actualizar el estado del pedido.
                const response = await fetch(`/api/admin/pedidos/${pedidoId}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: nuevoEstado })
                });

                const result = await response.json();
                adminOrdersMessageDiv.textContent = result.message;
                adminOrdersMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                adminOrdersMessageDiv.style.display = 'block';

            } catch (error) {
                // Si hay un error al actualizar el estado...
                console.error('Error al actualizar el estado:', error);
                adminOrdersMessageDiv.textContent = 'Error de conexión al actualizar el estado.';
                adminOrdersMessageDiv.className = 'admin-message error';
                adminOrdersMessageDiv.style.display = 'block';
            }
        }

        // ---- Lógica para Eliminar Pedido ----
        if (event.target.classList.contains('delete-order-btn')) {
            const pedidoId = event.target.dataset.pedidoId; // Obtengo el ID del pedido a eliminar.

            if (confirm(`¿Estás seguro de que quieres eliminar el pedido #${pedidoId}? Esta acción es irreversible.`)) {
                try {
                    // Hago un pedido DELETE a la API para borrar el pedido.
                    const response = await fetch(`/api/admin/pedidos/${pedidoId}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();
                    adminOrdersMessageDiv.textContent = result.message;
                    adminOrdersMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                    adminOrdersMessageDiv.style.display = 'block';

                    if (response.ok) {
                        // Si se eliminó correctamente, saco el elemento del pedido de la vista.
                        event.target.closest('.pedido-item').remove();
                    }
                } catch (error) {
                    // Si hay un error al eliminar el pedido...
                    console.error('Error al eliminar el pedido:', error);
                    adminOrdersMessageDiv.textContent = 'Error de conexión al eliminar el pedido.';
                    adminOrdersMessageDiv.className = 'admin-message error';
                    adminOrdersMessageDiv.style.display = 'block';
                }
            }
        }
    });

    // --- CARGA INICIAL DE DATOS ---
    // Cuando la página carga, llamo a estas funciones para que me muestren los datos al toque.
    loadProducts(); // Cargo los productos para la sección de administración de productos.
    loadAllOrders(); // Cargo todos los pedidos de los clientes.
});
