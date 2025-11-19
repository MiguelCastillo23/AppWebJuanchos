// Configuración de Firebase - REEMPLAZA CON TUS DATOS
const firebaseConfig = {
    apiKey: "AIzaSyBGPqlxFwB6Tc2Xo2nqSK29s_M3RBFxg-M",
    authDomain: "castillo-sem6.firebaseapp.com",
    projectId: "castillo-sem6",
    storageBucket: "castillo-sem6.firebasestorage.app",
    messagingSenderId: "656452655199",
    appId: "1:656452655199:android:d4fb653bb3c4345b9d63ea"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let todosPedidos = [];
let filtroActual = 'todos';

// Verificar autenticación
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = 'index.html';
    } else {
        cargarPedidos();
    }
});

// Cargar pedidos en tiempo real
function cargarPedidos() {
    db.collection('pedidos').onSnapshot(snapshot => {
        todosPedidos = [];
        
        snapshot.forEach(doc => {
            todosPedidos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Ordenar por fecha (más reciente primero)
        todosPedidos.sort((a, b) => {
            if (!a.fecha || !b.fecha) return 0;
            return b.fecha.toDate() - a.fecha.toDate();
        });

        actualizarEstadisticas();
        mostrarPedidos();
    }, error => {
        console.error('Error al cargar pedidos:', error);
        document.getElementById('pedidosContainer').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error al cargar pedidos</h3>
                <p>${error.message}</p>
            </div>
        `;
    });
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const totalPedidos = todosPedidos.length;
    const pendientes = todosPedidos.filter(p => p.estado === 'Pendiente' || p.estado === 'Esperando pago').length;
    const preparacion = todosPedidos.filter(p => p.estado === 'Preparando pedido').length;
    
    const ventasHoy = todosPedidos
        .filter(p => {
            if (!p.fecha) return false;
            const fechaPedido = p.fecha.toDate();
            return fechaPedido >= hoy;
        })
        .reduce((sum, p) => sum + (p.total_final || 0), 0);

    document.getElementById('totalPedidos').textContent = totalPedidos;
    document.getElementById('pedidosPendientes').textContent = pendientes;
    document.getElementById('pedidosPreparacion').textContent = preparacion;
    document.getElementById('totalVentas').textContent = `S/ ${ventasHoy.toFixed(2)}`;
}

// Mostrar pedidos
function mostrarPedidos() {
    const container = document.getElementById('pedidosContainer');
    
    let pedidosFiltrados = todosPedidos;
    if (filtroActual !== 'todos') {
        pedidosFiltrados = todosPedidos.filter(p => p.estado === filtroActual);
    }

    if (pedidosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No hay pedidos</h3>
                <p>No se encontraron pedidos con el filtro seleccionado</p>
            </div>
        `;
        return;
    }

    container.innerHTML = pedidosFiltrados.map(pedido => crearTarjetaPedido(pedido)).join('');
}

// Crear tarjeta de pedido
function crearTarjetaPedido(pedido) {
    const fecha = pedido.fecha ? pedido.fecha.toDate() : new Date();
    const fechaFormato = `${fecha.getDate()}/${fecha.getMonth() + 1}/${fecha.getFullYear()} ${fecha.getHours()}:${fecha.getMinutes().toString().padLeft(2, '0')}`;
    
    const estadoClass = pedido.estado.toLowerCase().replace(/ /g, '-');
    const tipoEntrega = pedido.tipo_entrega === 'delivery' ? '🚚 Delivery' : '🏪 Recojo en tienda';
    
    const productos = pedido.productos || [];
    const productosHTML = productos.map(p => `
        <div class="producto-item">
            <span>${p.cantidad}x ${p.nombre}</span>
            <span>S/ ${(p.subtotal || 0).toFixed(2)}</span>
        </div>
    `).join('');

    // Estados disponibles según tipo de entrega
    const estadosDisponibles = pedido.tipo_entrega === 'delivery' 
        ? ['Pendiente', 'Esperando pago', 'Pedido aceptado', 'Preparando pedido', 'Pedido enviado', 'Entregado', 'Cancelado']
        : ['Pendiente', 'Esperando pago', 'Pedido aceptado', 'Preparando pedido', 'Pedido listo', 'Entregado', 'Cancelado'];

    const estadosOptions = estadosDisponibles.map(estado => 
        `<option value="${estado}" ${pedido.estado === estado ? 'selected' : ''}>${estado}</option>`
    ).join('');

    return `
        <div class="pedido-card">
            <div class="pedido-header">
                <div>
                    <div class="pedido-id">Pedido #${pedido.id.substring(0, 8)}</div>
                    <small style="color: #999;">${fechaFormato}</small>
                </div>
                <div>
                    <span class="estado-badge estado-${estadoClass}">${pedido.estado}</span>
                </div>
            </div>

            <div class="pedido-info">
                <div class="info-item">
                    <div class="info-label">Cliente</div>
                    <div class="info-value">${pedido.nombre_cliente || 'Sin nombre'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Teléfono</div>
                    <div class="info-value">${pedido.telefono || 'No disponible'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${pedido.email || 'No disponible'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tipo de entrega</div>
                    <div class="info-value">
                        <span class="tipo-entrega">${tipoEntrega}</span>
                    </div>
                </div>
            </div>

            ${pedido.direccion_entrega ? `
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="info-label">📍 Dirección de entrega</div>
                    <div class="info-value">${pedido.direccion_entrega}</div>
                </div>
            ` : ''}

            ${pedido.notas ? `
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="info-label">📝 Notas</div>
                    <div class="info-value">${pedido.notas}</div>
                </div>
            ` : ''}

            <div class="pedido-productos">
                <strong>Productos (${pedido.cantidad_productos || 0}):</strong>
                ${productosHTML}
                ${pedido.costo_delivery > 0 ? `
                    <div class="producto-item">
                        <span>Costo de delivery</span>
                        <span>S/ ${pedido.costo_delivery.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div class="total-pedido">Total: S/ ${(pedido.total_final || 0).toFixed(2)}</div>
            </div>

            <div class="pedido-actions">
                <select class="estado-select" id="estado-${pedido.id}">
                    ${estadosOptions}
                </select>
                <button class="btn-actualizar" onclick="actualizarEstado('${pedido.id}')">
                    Actualizar Estado
                </button>
            </div>
        </div>
    `;
}

// Actualizar estado del pedido
async function actualizarEstado(pedidoId) {
    const nuevoEstado = document.getElementById(`estado-${pedidoId}`).value;
    
    try {
        await db.collection('pedidos').doc(pedidoId).update({
            estado: nuevoEstado
        });
        
        // Mostrar notificación
        mostrarNotificacion('Estado actualizado correctamente', 'success');
    } catch (error) {
        console.error('Error al actualizar:', error);
        mostrarNotificacion('Error al actualizar el estado', 'error');
    }
}

// Filtrar pedidos
function filtrarPedidos(filtro) {
    filtroActual = filtro;
    
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    mostrarPedidos();
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = mensaje;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
}

// Helper para formatear minutos
String.prototype.padLeft = function(length, char) {
    return (new Array(length + 1).join(char) + this).slice(-length);
};