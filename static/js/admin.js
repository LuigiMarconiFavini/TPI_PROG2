/*
 * este es el archivo JavaScript que maneja toda la lógica de la página de administración.
 * Acá me encargo de interactuar con la interfaz (el DOM) y de comunicarme con el servidor
 * para gestionar usuarios, productos y pedidos
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const adminMessageDiv = document.getElementById('adminMessage');
    const adminOrdersMessageDiv = document.getElementById('adminOrdersMessage');
    const allOrdersListDiv = document.getElementById('allOrdersList');

    // Elementos relacionados con la gestión de productos
    const productListDiv = document.getElementById('productList');
    const productForm = document.getElementById('productForm');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productPriceInput = document.getElementById('productPrice');
    const productImageInput = document.getElementById('productImage');
    const productStockInput = document.getElementById('productStock');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const clearProductFormBtn = document.getElementById('clearProductFormBtn');

    // --- LÓGICA DE ADMINISTRACIÓN DE USUARIOS ---
    document.querySelector('.user-list').addEventListener('click', async function(event) {
        if (event.target.classList.contains('save-role-btn')) {
            const button = event.target;
            const userId = button.dataset.userId;
            const selectElement = document.getElementById(`role-${userId}`);
            const newRole = selectElement.value;
            adminMessageDiv.style.display = 'none';

            try {
                const response = await fetch('/api/admin/change_user_role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, new_role: newRole })
                });
                const result = await response.json();
                adminMessageDiv.textContent = result.message;
                adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                adminMessageDiv.style.display = 'block';
            } catch (error) {
                console.error('Error al cambiar el rol:', error);
                adminMessageDiv.textContent = 'Error de conexión o del servidor al intentar cambiar el rol.';
                adminMessageDiv.className = 'admin-message error';
                adminMessageDiv.style.display = 'block';
            }
        }

        // --- Lógica para Eliminar Usuario ---
        if (event.target.classList.contains('delete-user-btn')) {
            const button = event.target;
            const userId = button.dataset.userId;
            if (confirm(`¿Estás seguro de que quieres eliminar al usuario con ID ${userId}? Esta acción es irreversible y eliminará todos sus pedidos.`)) {
                adminMessageDiv.style.display = 'none';
                try {
                    const response = await fetch(`/api/admin/delete_user/${userId}`, { method: 'DELETE' });
                    const result = await response.json();
                    adminMessageDiv.textContent = result.message;
                    adminMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                    if (response.ok) {
                        button.closest('.user-item').remove();
                    }
                } catch (error) {
                    console.error('Error al eliminar usuario:', error);
                    adminMessageDiv.textContent = 'Error de conexión o del servidor al intentar eliminar el usuario.';
                    adminMessageDiv.className = 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                }
            }
        }
    });

    // --- LÓGICA DE ADMINISTRACIÓN DE PRODUCTOS ---
    async function loadProducts() {
        productListDiv.innerHTML = '<p>Cargando productos...</p>';
        try {
            const response = await fetch('/api/productos');
            const products = await response.json();

            if (!response.ok) throw new Error('La respuesta de la red no fue correcta.');
            
            productListDiv.innerHTML = '';

            if (products.length === 0) {
                productListDiv.innerHTML = '<p>No hay productos disponibles.</p>';
                return;
            }

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
                productListDiv.appendChild(productDiv);
            });
        } catch (error) {
            console.error('Error al cargar productos:', error);
            productListDiv.innerHTML = '<p class="error">Error al cargar productos.</p>';
        }
    }

    productForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Evito que el formulario se envíe de la forma tradicional (recarga la página).
        const productId = productIdInput.value;
        const method = productId ? 'PUT' : 'POST';
        const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products';
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
                productForm.reset();
                productIdInput.value = '';
                saveProductBtn.textContent = 'Guardar Producto';
                loadProducts();
            }
        } catch (error) {
            console.error('Error al guardar producto:', error);
            adminMessageDiv.textContent = 'Error de conexión o del servidor al guardar el producto.';
            adminMessageDiv.className = 'admin-message error';
            adminMessageDiv.style.display = 'block';
        }
    });

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
                        loadProducts();
                    }
                } catch (error) {
                    console.error('Error al eliminar producto:', error);
                    adminMessageDiv.textContent = 'Error de conexión o del servidor al eliminar el producto.';
                    adminMessageDiv.className = 'admin-message error';
                    adminMessageDiv.style.display = 'block';
                }
            }
        }
    });

    clearProductFormBtn.addEventListener('click', function() {
        productForm.reset();
        productIdInput.value = '';
        saveProductBtn.textContent = 'Guardar Producto';
        adminMessageDiv.style.display = 'none';
    });


    // --- LÓGICA PARA GESTIÓN DE TODOS LOS PEDIDOS DE CLIENTES ---
    async function loadAllOrders() {
        allOrdersListDiv.innerHTML = '<p>Cargando pedidos de clientes...</p>';
        adminOrdersMessageDiv.style.display = 'none';

        try {
            const response = await fetch('/api/admin/pedidos');
            if (!response.ok) throw new Error('La respuesta de la red no fue correcta.');
            
            const orders = await response.json();
            
            allOrdersListDiv.innerHTML = '';

            if (orders.length === 0) {
                allOrdersListDiv.innerHTML = '<p>No hay pedidos registrados.</p>';
                return;
            }

            orders.forEach(order => {
                const orderDiv = document.createElement('div');
                orderDiv.className = 'pedido-item';
                
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
                allOrdersListDiv.appendChild(orderDiv);
            });

        } catch (error) {
            console.error('Error al cargar todos los pedidos:', error);
            adminOrdersMessageDiv.textContent = 'Error de conexión o del servidor al cargar los pedidos.';
            adminOrdersMessageDiv.className = 'admin-message error';
            adminOrdersMessageDiv.style.display = 'block';
        }
    }

    allOrdersListDiv.addEventListener('click', async function(event) {
        adminOrdersMessageDiv.style.display = 'none';

        // ---- Lógica para Guardar Estado del Pedido ----
        if (event.target.classList.contains('save-status-btn')) {
            const pedidoId = event.target.dataset.pedidoId;
            const selectElement = document.querySelector(`.order-status-select[data-pedido-id="${pedidoId}"]`);
            const nuevoEstado = selectElement.value;

            try {
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
                console.error('Error al actualizar el estado:', error);
                adminOrdersMessageDiv.textContent = 'Error de conexión al actualizar el estado.';
                adminOrdersMessageDiv.className = 'admin-message error';
                adminOrdersMessageDiv.style.display = 'block';
            }
        }

        // ---- Lógica para Eliminar Pedido ----
        if (event.target.classList.contains('delete-order-btn')) {
            const pedidoId = event.target.dataset.pedidoId;

            if (confirm(`¿Estás seguro de que quieres eliminar el pedido #${pedidoId}? Esta acción es irreversible.`)) {
                try {
                    const response = await fetch(`/api/admin/pedidos/${pedidoId}`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();
                    adminOrdersMessageDiv.textContent = result.message;
                    adminOrdersMessageDiv.className = response.ok ? 'admin-message success' : 'admin-message error';
                    adminOrdersMessageDiv.style.display = 'block';

                    if (response.ok) {
                        event.target.closest('.pedido-item').remove();
                    }
                } catch (error) {
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
