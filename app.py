# Importo las librerías y módulos que voy a usar en mi aplicación Flask.
# Cada uno tiene una función específica para que todo ande bien.
from sqlalchemy import event # Para escuchar eventos de SQLAlchemy, en este caso, al conectar a la base de datos.
from sqlalchemy.engine import Engine # El motor de la base de datos para los eventos.
from sqlite3 import Connection as SQLite3Connection # Para verificar si la conexión es de SQLite.

# Módulos principales de Flask y otras extensiones que utilizo.
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy # La extensión para interactuar con bases de datos usando SQLAlchemy.
from werkzeug.security import generate_password_hash, check_password_hash # Para manejar contraseñas de forma segura (hasheo).
from werkzeug.utils import secure_filename # Para limpiar nombres de archivos y evitar problemas de seguridad al subir.
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user # Extensión para gestionar sesiones de usuario.
import os # Para interactuar con el sistema operativo (rutas de archivos, variables de entorno).
from datetime import datetime, UTC # Para manejar fechas y horas, incluyendo la zona horaria UTC.
from sqlalchemy.orm import selectinload # Para cargar relaciones de forma eficiente y evitar el problema N+1.
import logging # Para registrar eventos y depurar la aplicación.
from dotenv import load_dotenv # Para cargar variables de entorno desde un archivo .env.

# --- Configuración Específica para SQLite y Foreign Keys ---
# Escucho el evento 'connect' en el motor de SQLAlchemy.
@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """
    Esta función es re importante. Me asegura que las claves foráneas (Foreign Keys)
    funcionen correctamente en SQLite. Sin esto, las relaciones como 'ondelete=CASCADE'
    (que borra automáticamente los detalles de un pedido si borro el pedido, por ejemplo)
    no andarían. Lo activo cada vez que se establece una conexión a la base de datos.
    """
    if isinstance(dbapi_connection, SQLite3Connection): # Si la conexión es de SQLite...
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;") # Ejecuto el comando PRAGMA.
        cursor.close()

# Cargo las variables de entorno desde el archivo .env (por ejemplo, la URL de la base de datos, la clave secreta).
# Esto me permite mantener información sensible fuera del código fuente.
load_dotenv()

# --- Configuración del Logger ---
# Configuro el sistema de logging para que me ayude a depurar la aplicación.
# Quiero ver mensajes de depuración (DEBUG) y con un formato que incluya la fecha, nivel y el mensaje.
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# --- 2. Inicialización de la Aplicación Flask ---
# Creo la instancia de mi aplicación Flask.
app = Flask(__name__)

# --- 3. Configuración de la Aplicación ---
# Defino la ruta base de mi proyecto para construir rutas de archivos relativas.
basedir = os.path.abspath(os.path.dirname(__file__))
# Configuro la URI de la base de datos. Primero intento leerla de una variable de entorno 'DATABASE_URL'.
# Si no está, uso una base de datos SQLite en el mismo directorio del proyecto.
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'database.db'))
# Deshabilito el seguimiento de modificaciones de SQLAlchemy porque consume recursos innecesarios.
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Defino una clave secreta para la seguridad de las sesiones. La tomo de una variable de entorno 'SECRET_KEY'.
# Si no está definida, uso una de respaldo.
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'una_clave_secreta_de_respaldo_por_si_falla_el_env')
# Configuro Flask para que guarde las sesiones en el sistema de archivos del servidor.
app.config['SESSION_TYPE'] = 'filesystem'

# Inicializo la extensión SQLAlchemy con mi aplicación Flask.
db = SQLAlchemy(app)

# Inicializo Flask-Login con mi aplicación Flask.
login_manager = LoginManager()
login_manager.init_app(app)
# Le digo a Flask-Login cuál es la vista de login si un usuario no autenticado intenta acceder a una página protegida.
login_manager.login_view = 'login'

# --- 4. Definición de Modelos de la Base de Datos ---
# Estos son mis modelos de datos, que representan las tablas en la base de datos.

# Modelo para los mensajes del formulario de Contacto.
class Contacto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    iva = db.Column(db.String(50))
    condicion_compra = db.Column(db.String(50))
    asunto = db.Column(db.String(200), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f'<Contacto {self.nombre}>'

# Modelo para los Usuarios. Hereda de UserMixin de Flask-Login para manejar la autenticación.
class Usuario(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    rol = db.Column(db.String(50), default='cliente')

    pedidos = db.relationship('Pedido', backref='comprador', lazy=True)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def __repr__(self):
        return f'<Usuario {self.email}>'

@login_manager.user_loader
def load_user(user_id):
    return Usuario.query.get(int(user_id))

# Modelo para los Productos.
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    imagen = db.Column(db.String(100))
    stock = db.Column(db.Integer, default=0, nullable=False)

    detalle_pedidos_asociados = db.relationship('DetallePedido', backref='producto_del_detalle', lazy=True)

    def __repr__(self):
        return f'<Producto {self.nombre}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'precio': self.precio,
            'imagen': self.imagen,
            'stock': self.stock
        }

# Modelo para los Pedidos.
class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fecha_pedido = db.Column(db.DateTime, nullable=False, default=datetime.now(UTC))
    total = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('usuario.id'), nullable=False)
    estado = db.Column(db.String(50), nullable=False, default='Pendiente')

    items = db.relationship('DetallePedido', backref='pedido_asociado', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Pedido {self.id} de usuario {self.user_id}>'

    def to_dict(self):
        return {
            'id': self.id,
            'fecha_pedido': self.fecha_pedido.isoformat(),
            'total': self.total,
            'user_id': self.user_id,
            'estado': self.estado,
            'items': [item.to_dict() for item in self.items]
        }

# Modelo para los Detalles de Pedido (los ítems individuales dentro de un pedido).
class DetallePedido(db.Model):
    id = db.Column(db.Integer, primary_key=True) 
    cantidad = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float, nullable=False)
    pedido_id = db.Column(db.Integer, db.ForeignKey('pedido.id', ondelete='CASCADE'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('producto.id'), nullable=False)

    def __repr__(self):
        return f'<DetallePedido {self.id} (Pedido: {self.pedido_id}, Producto: {self.producto_id})>'

    def to_dict(self):
        producto_nombre = 'Producto Desconocido'

        if self.producto_del_detalle:
            producto_nombre = self.producto_del_detalle.nombre
            logging.debug(f"DetallePedido.to_dict: Producto encontrado por backref: {producto_nombre}")
        else:
            temp_producto = Producto.query.get(self.producto_id)
            if temp_producto:
                producto_nombre = temp_producto.nombre
                logging.warning(f"DetallePedido.to_dict: Producto (ID: {self.producto_id}) cargado por fallback: {producto_nombre}")
            else:
                logging.error(f"DetallePedido.to_dict: Producto con ID {self.producto_id} NO ENCONTRADO en la base de datos.")

        logging.debug(f"DetallePedido.to_dict: Devolviendo nombre_producto: {producto_nombre}")

        return {
            'id': self.id,
            'cantidad': self.cantidad,
            'precio_unitario': self.precio_unitario,
            'producto_id': self.producto_id,
            'nombre_producto': producto_nombre 
        }

# --- 5. Decorador para Rol de Administrador ---
from functools import wraps

def admin_required(f):
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.rol != 'admin':
            flash('Acceso denegado. Se requiere rol de administrador.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- 6. Rutas para Renderizar las Plantillas HTML ---

@app.route('/')
def index():
    return render_template('index.html', current_user=current_user)

@app.route('/productos')
def productos():
    all_products = Producto.query.all()
    return render_template('productos.html', products=all_products, current_user=current_user)

@app.route('/carrito')
def carrito():
    return render_template('carrito.html', current_user=current_user)

@app.route('/contactos')
def contactos():
    return render_template('contactos.html', current_user=current_user)

@app.route('/login')
def login():
    return render_template('login.html', current_user=current_user)

@app.route('/registro')
def registro():
    return render_template('registro.html', current_user=current_user)

@app.route('/admin')
@admin_required
def admin_page():
    users = Usuario.query.all()
    return render_template('admin.html', users=users, current_user=current_user)

@app.route('/mis_pedidos')
@login_required
def mis_pedidos():
    pedidos_usuario = Pedido.query.filter_by(user_id=current_user.id).options(
        selectinload(Pedido.items).selectinload(DetallePedido.producto_del_detalle)
    ).order_by(Pedido.fecha_pedido.desc()).all()

    logging.debug("\n--- DEBUG: Datos de Pedidos (antes de renderizar) ---")
    for pedido in pedidos_usuario:
        logging.debug(f"Pedido ID: {pedido.id}, Total: {pedido.total}")
        for item in pedido.items:
            item_dict = item.to_dict()
            logging.debug(f"  - Item Dict (para HTML): {item_dict}")
    logging.debug("--------------------------------------------------\n")

    return render_template('mis_pedidos.html', pedidos=pedidos_usuario, current_user=current_user)

# Ruta para cerrar la sesión del usuario.
@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Has cerrado sesión exitosamente.', 'success')
    return redirect(url_for('index'))

# --- 7. Rutas de la API (Endpoints para Interacción JavaScript) ---

@app.route('/api/contacto', methods=['POST'])
def recibir_contacto():
    data = request.get_json()

    if not data or not all(k in data for k in ['name', 'email', 'subject', 'message']):
        return jsonify({'message': 'Faltan datos obligatorios'}), 400

    nuevo_contacto = Contacto(
        nombre=data['name'],
        email=data['email'],
        iva=data.get('iva', 'No especificado'),
        condicion_compra=data.get('condicion', 'No especificado'),
        asunto=data['subject'],
        mensaje=data['message']
    )

    try:
        db.session.add(nuevo_contacto)
        db.session.commit()
        return jsonify({'message': 'Mensaje de contacto recibido y guardado con éxito!'}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al guardar el contacto: {str(e)}")
        return jsonify({'message': f'Error al guardar el contacto: {str(e)}'}), 500

# API para registrar un nuevo usuario.
@app.route('/api/registros', methods=['POST'])
def registrar_usuario():
    data = request.get_json()

    if not data or not all(k in data for k in ['nombre', 'email', 'password']):
        return jsonify({'message': 'Faltan datos obligatorios para el registro'}), 400

    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'El correo electrónico ya está registrado'}), 409

    nuevo_usuario = Usuario(nombre=data['nombre'], email=data['email'], rol='cliente')
    nuevo_usuario.set_password(data['password'])

    try:
        db.session.add(nuevo_usuario)
        db.session.commit() 
        login_user(nuevo_usuario)
        return jsonify({'message': '¡Registro exitoso! Has iniciado sesión automáticamente.', 'redirect_to': '/carrito'}), 201
    except Exception as e:
        db.session.rollback() 
        logging.error(f"Error al registrar el usuario: {str(e)}")
        return jsonify({'message': f'Error al registrar el usuario: {str(e)}'}), 500

# API para obtener todos los productos (para la página de productos del frontend).
@app.route('/api/productos', methods=['GET'])
def obtener_productos_api():
    productos = Producto.query.all() 
    productos_list = [producto.to_dict() for producto in productos]
    logging.debug(f"Enviando {len(productos_list)} productos vía API.")
    return jsonify(productos_list), 200

# API para iniciar sesión.
@app.route('/api/login', methods=['POST'])
def iniciar_sesion():
    data = request.get_json()

    if not data or not all(k in data for k in ['email', 'password']):
        return jsonify({'message': 'Correo electrónico y contraseña son obligatorios'}), 400

    usuario = Usuario.query.filter_by(email=data['email']).first()

    if usuario and usuario.check_password(data['password']):
        login_user(usuario)
        redirect_url = '/admin' if usuario.rol == 'admin' else '/productos'
        return jsonify({'message': 'Inicio de sesión exitoso', 'user': {'id': usuario.id, 'nombre': usuario.nombre, 'email': usuario.email, 'rol': usuario.rol}, 'redirect_to': redirect_url}), 200
    else:
        return jsonify({'message': 'Credenciales inválidas'}), 401

@app.route('/api/check_login_status')
def check_login_status():
    """Verifica si el usuario actual está autenticado."""
    is_logged_in = current_user.is_authenticated 
    return jsonify({'isLoggedIn': is_logged_in})

@app.route('/api/admin/change_user_role', methods=['POST'])
@admin_required 
def change_user_role():
    data = request.get_json()
    user_id = data.get('user_id')
    new_role = data.get('new_role')

    if not user_id or not new_role:
        return jsonify({'message': 'ID de usuario y nuevo rol son obligatorios'}), 400

    user = Usuario.query.get(user_id)
    if not user:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    allowed_roles = ['cliente', 'admin']
    if new_role not in allowed_roles:
        return jsonify({'message': 'Rol inválido. Debe ser "cliente" o "admin"'}), 400

    user.rol = new_role
    try:
        db.session.commit()
        return jsonify({'message': f'Rol de usuario {user.email} actualizado a {new_role}'}), 200 # Devuelvo éxito.
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al actualizar el rol: {str(e)}")
        return jsonify({'message': f'Error al actualizar el rol: {str(e)}'}), 500

# API para ELIMINAR UN USUARIO (solo para admins).
@app.route('/api/admin/delete_user/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user_to_delete = Usuario.query.get(user_id)
    if not user_to_delete:
        return jsonify({'message': 'Usuario no encontrado'}), 404

    if user_to_delete.id == current_user.id:
        return jsonify({'message': 'No puedes eliminar tu propia cuenta de administrador'}), 403

    try:
        for pedido in user_to_delete.pedidos:
            DetallePedido.query.filter_by(pedido_id=pedido.id).delete()
        Pedido.query.filter_by(user_id=user_to_delete.id).delete()
        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({'message': 'Usuario y sus datos asociados eliminados exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al eliminar el usuario ID {user_id}: {str(e)}")
        return jsonify({'message': f'Error al eliminar el usuario: {str(e)}'}), 500

# API para AGREGAR UN NUEVO PRODUCTO (solo para admins).
@app.route('/api/admin/products', methods=['POST'])
@admin_required
def add_product():
    nombre = request.form.get('nombre')
    precio = request.form.get('precio')
    stock = request.form.get('stock')

    if not nombre or not precio or stock is None:
        return jsonify({'message': 'Nombre, precio y stock del producto son obligatorios'}), 400

    if 'imagen' not in request.files or request.files['imagen'].filename == '':
        return jsonify({'message': 'La imagen del producto es obligatoria'}), 400

    file = request.files['imagen']
    try:
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.root_path, 'static/img', filename))
        imagen_path = f'img/{filename}'

        precio_float = float(precio)
        stock_int = int(stock) 
        if stock_int < 0:
            return jsonify({'message': 'El stock no puede ser negativo'}), 400
    except ValueError:
        return jsonify({'message': 'El precio y el stock deben ser números válidos'}), 400
    except Exception as e:
        logging.error(f"Error al guardar la imagen: {str(e)}")
        return jsonify({'message': 'Error al guardar la imagen'}), 500

    new_product = Producto(nombre=nombre, precio=precio_float, imagen=imagen_path, stock=stock_int)
    try:
        db.session.add(new_product) 
        db.session.commit()
        logging.info(f"Producto '{nombre}' agregado exitosamente con stock {stock_int}.")
        return jsonify({'message': 'Producto agregado exitosamente', 'product': new_product.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al agregar el producto: {str(e)}")
        return jsonify({'message': f'Error al agregar el producto: {str(e)}'}), 500
    
# API para EDITAR UN PRODUCTO EXISTENTE (solo para admins).
@app.route('/api/admin/products/<int:product_id>', methods=['PUT'])
@admin_required
def update_product(product_id):
    product_to_update = Producto.query.get(product_id)
    if not product_to_update:
        return jsonify({'message': 'Producto no encontrado'}), 404

    product_to_update.nombre = request.form.get('nombre')
    product_to_update.precio = float(request.form.get('precio'))
    product_to_update.stock = int(request.form.get('stock'))

    if 'imagen' in request.files and request.files['imagen'].filename != '':
        file = request.files['imagen']
        try:
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.root_path, 'static/img', filename))
            product_to_update.imagen = f'img/{filename}'
        except Exception as e:
            logging.error(f"Error al actualizar la imagen: {str(e)}")
            return jsonify({'message': 'Error al actualizar la imagen'}), 500

    try:
        db.session.commit()
        logging.info(f"Producto '{product_to_update.nombre}' actualizado exitosamente.")
        return jsonify({'message': 'Producto actualizado exitosamente', 'product': product_to_update.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al actualizar el producto: {str(e)}")
        return jsonify({'message': f'Error al actualizar el producto: {str(e)}'}), 500

# API para ELIMINAR UN PRODUCTO (solo para admins).
@app.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(product_id):
    product_to_delete = Producto.query.get(product_id)
    if not product_to_delete:
        return jsonify({'message': 'Producto no encontrado'}), 404

    try:
        DetallePedido.query.filter_by(producto_id=product_id).delete()
        db.session.delete(product_to_delete)
        db.session.commit()
        logging.info(f"Producto ID {product_id} eliminado exitosamente.")
        return jsonify({'message': 'Producto y sus detalles de pedido asociados eliminados exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al eliminar el producto ID {product_id}: {str(e)}")
        return jsonify({'message': f'Error al eliminar el producto: {str(e)}'}), 500

# API para crear un nuevo pedido.
@app.route('/api/pedidos', methods=['POST'])
@login_required
def crear_pedido():
    data = request.get_json()
    cart_items = data.get('items')
    total_pedido = data.get('total')

    logging.debug(f"crear_pedido: Recibiendo solicitud para usuario ID: {current_user.id}")
    logging.debug(f"crear_pedido: Items del carrito: {cart_items}")
    logging.debug(f"crear_pedido: Total del pedido: {total_pedido}")

    if not cart_items or not isinstance(cart_items, list) or not total_pedido:
        logging.warning("crear_pedido: Datos del carrito inválidos o faltantes")
        return jsonify({'message': 'Datos del carrito inválidos o faltantes'}), 400

    if not cart_items:
        logging.warning("crear_pedido: El carrito está vacío, no se puede crear un pedido")
        return jsonify({'message': 'El carrito está vacío, no se puede crear un pedido'}), 400

    try:
        productos_a_actualizar = []
        for item in cart_items:
            producto = db.session.get(Producto, item['id'])
            if not producto:
                logging.error(f"crear_pedido: Producto con ID {item['id']} no encontrado.")
                raise ValueError(f"Producto con ID {item['id']} no encontrado en la base de datos para la creación del detalle del pedido.")

            requested_quantity = int(item['cantidad'])
            if requested_quantity <= 0:
                logging.warning(f"crear_pedido: Cantidad inválida ({requested_quantity}) para el producto {producto.nombre}.")
                raise ValueError(f"Cantidad inválida ({requested_quantity}) para el producto {producto.nombre}.")

            if producto.stock < requested_quantity:
                logging.warning(f"crear_pedido: Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {requested_quantity}.")
                return jsonify({'message': f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {requested_quantity}."}), 400

            productos_a_actualizar.append({'producto': producto, 'cantidad': requested_quantity})

        nuevo_pedido = Pedido(user_id=current_user.id, total=total_pedido, fecha_pedido=datetime.now(UTC))
        db.session.add(nuevo_pedido)
        db.session.flush()

        for entry in productos_a_actualizar:
            producto = entry['producto']
            cantidad = entry['cantidad']

            producto.stock -= cantidad 
            db.session.add(producto)

            detalle = DetallePedido(
                pedido_id=nuevo_pedido.id,
                producto_id=producto.id,
                cantidad=cantidad,
                precio_unitario=producto.precio
            )
            db.session.add(detalle)

        db.session.commit()
        logging.info(f"Pedido {nuevo_pedido.id} creado con éxito para usuario {current_user.id}.")
        return jsonify({'message': 'Pedido realizado con éxito!', 'pedido_id': nuevo_pedido.id}), 201

    except ValueError as ve:
        db.session.rollback()
        logging.error(f"crear_pedido: ValueError: {str(ve)}")
        return jsonify({'message': str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        logging.critical(f"crear_pedido: Error inesperado al procesar pedido: {str(e)}", exc_info=True)
        return jsonify({'message': f'Error al procesar el pedido: {str(e)}'}), 500

# API para obtener todos los pedidos (solo para admins).
@app.route('/api/admin/pedidos', methods=['GET'])
@admin_required
def get_all_orders():
    all_orders = Pedido.query.options(
        selectinload(Pedido.items).selectinload(DetallePedido.producto_del_detalle),
        selectinload(Pedido.comprador)
    ).order_by(Pedido.fecha_pedido.desc()).all()

    orders_list = []
    for order in all_orders:
        order_dict = order.to_dict()
        order_dict['comprador_nombre'] = order.comprador.nombre if order.comprador else 'Usuario Desconocido'
        order_dict['comprador_email'] = order.comprador.email if order.comprador else 'Email Desconocido'
        orders_list.append(order_dict)

    logging.debug(f"Enviando {len(orders_list)} pedidos al admin.")
    return jsonify(orders_list), 200

# API para actualizar el estado de un pedido (solo para admins).
@app.route('/api/admin/pedidos/<int:pedido_id>/estado', methods=['PUT'])
@admin_required
def update_order_status(pedido_id):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return jsonify({'message': 'Pedido no encontrado'}), 404

    data = request.get_json()
    new_status = data.get('estado')

    allowed_statuses = ['Pendiente', 'Aceptado', 'Enviado']
    if not new_status or new_status not in allowed_statuses:
        return jsonify({'message': 'Estado inválido'}), 400

    pedido.estado = new_status
    try:
        db.session.commit()
        return jsonify({'message': f'Estado del pedido #{pedido.id} actualizado a "{new_status}"'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al actualizar estado del pedido: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

# API para ELIMINAR UN PEDIDO (solo para admins).
@app.route('/api/admin/pedidos/<int:pedido_id>', methods=['DELETE'])
@admin_required
def delete_order(pedido_id):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return jsonify({'message': 'Pedido no encontrado'}), 404

    try:
        db.session.delete(pedido)
        db.session.commit()
        return jsonify({'message': f'Pedido #{pedido.id} eliminado exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error al eliminar el pedido: {str(e)}")
        return jsonify({'message': 'Error interno del servidor'}), 500

# --- 8. Comandos CLI para Inicializar la Base de Datos ---
def init_db_command_function():
    """
    Este comando me sirve para crear todas las tablas de la base de datos
    y también para insertar algunos datos iniciales, como productos de ejemplo
    y un usuario administrador y otro cliente para pruebas.
    """
    with app.app_context():
        db.create_all()
        logging.info("Base de datos y tablas creadas (o ya existentes).")

        if not Producto.query.first():
            productos_iniciales = [
                Producto(nombre="Árbol de Manzana", precio=25000, imagen="img/manzana.jpg", stock=15),
                Producto(nombre="Árbol de Pera", precio=23000, imagen="img/pera.jpg", stock=10),
                Producto(nombre="Árbol de Durazno", precio=24000, imagen="img/durazno.jpg", stock=20),
                Producto(nombre="Árbol de Naranja", precio=26000, imagen="img/naranja.jpg", stock=12),
                Producto(nombre="Árbol de Mandarina", precio=22000, imagen="img/mandarina.jpg", stock=8)
            ]
            for prod in productos_iniciales:
                db.session.add(prod)
            db.session.commit()
            logging.info("Productos iniciales cargados con stock.")
        else:
            logging.info("Productos ya existen en la base de datos.")

        admin_email = 'admin@frutales.com'
        if not Usuario.query.filter_by(email=admin_email).first():
            admin_user = Usuario(nombre='Admin Frutales', email=admin_email, rol='admin')
            admin_user.set_password('admin123')
            db.session.add(admin_user)
            db.session.commit()
            logging.info(f"Usuario administrador '{admin_email}' creado con contraseña 'admin123'.")
        else:
            logging.info(f"Usuario administrador '{admin_email}' ya existe.")

        client_email = 'cliente@frutales.com'
        if not Usuario.query.filter_by(email=client_email).first():
            client_user = Usuario(nombre='Cliente Prueba', email=client_email, rol='cliente')
            client_user.set_password('cliente123')
            db.session.add(client_user)
            db.session.commit()
            logging.info(f"Usuario cliente '{client_email}' creado con contraseña 'cliente123'.")
        else:
            logging.info(f"Usuario cliente '{client_email}' ya existe.")

app.cli.add_command(app.cli.command("init-db")(init_db_command_function))

# --- 9. Ejecución de la Aplicación Flask ---
if __name__ == '__main__':
    with app.app_context():
        logging.info("La aplicación se iniciará. Asegúrate de haber ejecutado 'flask init-db' al menos una vez.")
    app.run(debug=True)
