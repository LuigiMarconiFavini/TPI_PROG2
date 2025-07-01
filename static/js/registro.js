/*
 * Este es el archivo JavaScript que controla la funcionalidad del formulario de registro de usuarios.
 * Aquí me encargo de manejar la validación de los campos del formulario,
 * limpiar mensajes de error y enviar los datos de registro al servidor.
 */
document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('registroForm');
    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmarInput = document.getElementById('confirmar');
    const formMessages = document.getElementById('formMessages');

    const errores = {
        nombreError: document.getElementById('nombreError'),
        emailError: document.getElementById('emailError'),
        passwordError: document.getElementById('passwordError'),
        confirmarError: document.getElementById('confirmarError')
    };

    function limpiarErrores() {
        Object.values(errores).forEach(e => e.textContent = '');
        formMessages.textContent = '';
        formMessages.className = '';
    }

    // --- Funciones de Validación ---

    function validarCampos() {
        let valido = true;

        if (nombreInput.value.trim().length < 5) {
            errores.nombreError.textContent = "El nombre debe tener al menos 5 caracteres.";
            valido = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
            errores.emailError.textContent = "Correo electrónico no válido.";
            valido = false;
        }

        if (passwordInput.value.length < 6) {
            errores.passwordError.textContent = "La contraseña debe tener al menos 6 caracteres.";
            valido = false;
        }

        if (passwordInput.value !== confirmarInput.value) {
            errores.confirmarError.textContent = "Las contraseñas no coinciden.";
            valido = false;
        }

        return valido;
    }

    // --- Manejo del Envío del Formulario ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        limpiarErrores(); 

        if (!validarCampos()) {

            formMessages.textContent = "Por favor corrige los errores antes de registrarte.";
            formMessages.className = "error";
            return;
        }

        const nombre = nombreInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        try {
            // Realizo la solicitud HTTP POST al endpoint /api/registros de mi aplicación Flask.
            const response = await fetch('/api/registros', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nombre, email, password })
            });

            const result = await response.json();

            if (response.ok) {
                formMessages.textContent = result.message; 
                formMessages.className = 'success'; 
                form.reset();

                if (result.redirect_to) {
                    setTimeout(() => { window.location.href = result.redirect_to; }, 1000);
                }
            } else {
                formMessages.textContent = result.message || 'Error desconocido al intentar registrar el usuario.';
                formMessages.className = 'error';
            }
        } catch (error) {
            console.error('Error al registrar usuario:', error);
            formMessages.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.';
            formMessages.className = 'error';
        }
    });

    // --- Validaciones en Tiempo Real ---

    nombreInput.addEventListener('input', () => {
        errores.nombreError.textContent = nombreInput.value.trim().length < 5
            ? "El nombre debe tener al menos 5 caracteres." : "";
    });

    emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim();
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        errores.emailError.textContent = !regex.test(email) ? "Correo electrónico no válido." : "";
    });

    passwordInput.addEventListener('input', () => {
        errores.passwordError.textContent = passwordInput.value.length < 6
            ? "La contraseña debe tener al menos 6 caracteres." : "";
        if (confirmarInput.value !== passwordInput.value) {
            errores.confirmarError.textContent = "Las contraseñas no coinciden.";
        } else {
            errores.confirmarError.textContent = "";
        }
    });

    confirmarInput.addEventListener('input', () => {
        errores.confirmarError.textContent = confirmarInput.value !== passwordInput.value
            ? "Las contraseñas no coinciden." : "";
    });
});
