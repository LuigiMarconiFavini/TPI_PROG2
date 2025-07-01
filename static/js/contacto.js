/*
 * Este es el archivo JavaScript que controla la funcionalidad del formulario de contacto.
 * Aquí me encargo de manejar la validación de los campos del formulario,
 * limpiar mensajes de error y enviar los datos al servidor a través de una API.
 */
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const formMessages = document.getElementById('formMessages');

    const fields = {
        name: { input: document.getElementById('name'), error: document.getElementById('nameError') },
        email: { input: document.getElementById('email'), error: document.getElementById('emailError') },
        iva: { input: document.getElementById('iva'), error: document.getElementById('errorIva') },
        subject: { input: document.getElementById('subject'), error: document.getElementById('subjectError') },
        message: { input: document.getElementById('message'), error: document.getElementById('messageError') }
    };
    const condicionRadios = document.getElementsByName('condicion');
    const condicionError = document.getElementById('errorCondicion');


    // --- Funciones de Utilidad ---

    function clearMessages() {
        for (const key in fields) {
            fields[key].error.textContent = '';
        }
        condicionError.textContent = '';
        formMessages.textContent = '';
        formMessages.className = '';
    }

    // --- Funciones de Validación Individuales ---

    function validarNombre() {
        const name = fields.name.input.value.trim();
        fields.name.error.textContent = name.length < 5 ? 'El nombre debe tener al menos 5 caracteres.' : '';
        return name.length >= 5;
    }

    function validarEmail() {
        const email = fields.email.input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        fields.email.error.textContent = !emailRegex.test(email) ? 'El correo electrónico no es válido.' : '';
        return emailRegex.test(email);
    }

    function validarIva() {
        const iva = fields.iva.input.value;
        fields.iva.error.textContent = iva === '' ? 'Por favor seleccione una condición de IVA.' : '';
        return iva !== '';
    }

    function validarCondicionCompra() {
        const selected = Array.from(condicionRadios).some(radio => radio.checked);
        condicionError.textContent = !selected ? 'Por favor seleccione una condición de compra.' : '';
        return selected;
    }

    function validarAsunto() {
        const subject = fields.subject.input.value.trim();
        fields.subject.error.textContent = subject.length < 10 ? 'El asunto debe tener al menos 10 caracteres.' : '';
        return subject.length >= 10;
    }

    function validarMensaje() {
        const message = fields.message.input.value.trim();
        fields.message.error.textContent = message.length < 25 ? 'El mensaje debe tener al menos 25 caracteres.' : '';
        return message.length >= 25;
    }

    // --- Manejo del Envío del Formulario ---

    contactForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        clearMessages();

        const isNameValid = validarNombre();
        const isEmailValid = validarEmail();
        const isIvaValid = validarIva();
        const isCondicionValid = validarCondicionCompra();
        const isSubjectValid = validarAsunto();
        const isMessageValid = validarMensaje();

        // Determino si el formulario completo es válido, es decir, si todas las validaciones pasaron.
        const formIsValid = isNameValid && isEmailValid && isIvaValid && isCondicionValid && isSubjectValid && isMessageValid;

        if (formIsValid) {
            // Si el formulario es válido, recolecto los datos para enviarlos.
            const formData = {
                name: fields.name.input.value.trim(),
                email: fields.email.input.value.trim(),
                iva: fields.iva.input.value,
                condicion: document.querySelector('input[name="condicion"]:checked').value,
                subject: fields.subject.input.value.trim(),
                message: fields.message.input.value.trim()
            };

            try {
                // Realizo la solicitud HTTP POST a mi API de Flask para enviar el mensaje.
                const response = await fetch('/api/contacto', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    formMessages.textContent = result.message;
                    formMessages.className = 'success';
                    contactForm.reset();
                } else {
                    formMessages.textContent = result.message || 'Error desconocido al enviar el formulario.';
                    formMessages.className = 'error';
                }
            } catch (error) {
                console.error('Error de red o del servidor:', error);
                formMessages.textContent = 'No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.';
                formMessages.className = 'error';
            }
        } else {
            formMessages.textContent = 'Por favor corrige los errores antes de enviar.';
            formMessages.className = 'error';
            const firstInvalidField = Object.values(fields).find(field => field.error.textContent !== '');
            if (firstInvalidField) {
                firstInvalidField.input.focus();
            } else if (condicionError.textContent !== '') {
                condicionRadios[0].focus();
            }
        }
    });

    // --- Validación en Tiempo Real ---

    for (const key in fields) {
        fields[key].input.addEventListener('blur', fields[`validar${key.charAt(0).toUpperCase() + key.slice(1)}`]);
        fields[key].input.addEventListener('input', fields[`validar${key.charAt(0).toUpperCase() + key.slice(1)}`]);
    }

    Array.from(condicionRadios).forEach(radio => {
        radio.addEventListener('change', validarCondicionCompra);
        radio.addEventListener('blur', validarCondicionCompra);
    });
});
