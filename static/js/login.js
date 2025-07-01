/*
 * Este es el archivo JavaScript que controla la funcionalidad del formulario de login.
 * Aquí me encargo de manejar la validación de los campos de correo y contraseña,
 * limpiar mensajes de error y enviar las credenciales al servidor para el inicio de sesión.
 */
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const formMessages = document.getElementById('formMessages');

    // --- Funciones de Utilidad ---

    function clearMessages() {
        emailError.textContent = '';
        passwordError.textContent = '';
        formMessages.textContent = '';
        formMessages.className = '';
    }

    // --- Funciones de Validación Individuales ---

    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            emailError.textContent = 'Correo electrónico inválido.';
            return false;
        } else {
            emailError.textContent = '';
            return true;
        }
    }

    // Esta función valida que la contraseña tenga al menos 6 caracteres.
    function validatePassword() {
        const password = passwordInput.value.trim();

        if (password.length < 6) {
            passwordError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            return false;
        } else {
            passwordError.textContent = '';
            return true;
        }
    }

    // --- Manejo del Envío del Formulario ---

    form.addEventListener('submit', async function (event) {
        event.preventDefault();

        clearMessages();

        let valid = true;
        let firstErrorField = null;

        if (!validateEmail()) {
            valid = false;
            firstErrorField = emailInput;
        }

        if (!validatePassword()) {
            valid = false;
            if (!firstErrorField) firstErrorField = passwordInput;
        }

        if (valid) {
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            try {
                // Realizo la solicitud HTTP POST al endpoint /api/login de mi aplicación Flask.
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json(); 

                if (response.ok) {
                    formMessages.textContent = result.message;
                    formMessages.className = 'success';
                    form.reset();
                    console.log('Usuario logueado:', result.user);

                    if (result.redirect_to) {
                        setTimeout(() => { window.location.href = result.redirect_to; }, 1000);
                    } else {
                        setTimeout(() => { window.location.href = '/'; }, 1000);
                    }

                } else {
                    formMessages.textContent = result.message || 'Error desconocido al intentar iniciar sesión.';
                    formMessages.className = 'error';
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                formMessages.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.';
                formMessages.className = 'error';
            }
        } else {
            formMessages.textContent = 'Por favor corrige los errores antes de continuar.';
            formMessages.className = 'error';
            if (firstErrorField) firstErrorField.focus();
        }
    });

    // --- Validación en Tiempo Real ---
    emailInput.addEventListener('blur', validateEmail);
    emailInput.addEventListener('input', validateEmail);
    emailInput.addEventListener('focus', () => {
        emailError.textContent = '';
    });

    passwordInput.addEventListener('blur', validatePassword);
    passwordInput.addEventListener('input', validatePassword);
    passwordInput.addEventListener('focus', () => {
        passwordError.textContent = '';
    });
});
