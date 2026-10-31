-- Pedidos simples por WhatsApp + panel solo para el personal.
-- Correr UNA sola vez sobre una base ya instalada (hacé un backup antes).
-- Borra las cuentas de clientes (la tienda ya no tiene registro público) y los datos que ya no se piden.

-- 1) Estados de pedido: pendiente / vendido / cancelado
ALTER TABLE pedidos
  MODIFY estado ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'vendido', 'cancelado') NOT NULL DEFAULT 'pendiente';
UPDATE pedidos SET estado = 'vendido' WHERE estado IN ('pagado', 'enviado', 'entregado');
ALTER TABLE pedidos
  MODIFY estado ENUM('pendiente', 'vendido', 'cancelado') NOT NULL DEFAULT 'pendiente';
ALTER TABLE pedidos ADD COLUMN vendido_en DATETIME NULL AFTER estado;
UPDATE pedidos SET vendido_en = COALESCE(pagado_en, actualizado_en) WHERE estado = 'vendido';

-- 2) Pedidos: solo nombre, WhatsApp y si retira o pide envío
UPDATE pedidos SET telefono = '' WHERE telefono IS NULL;
ALTER TABLE pedidos
  MODIFY telefono VARCHAR(20) NOT NULL,
  MODIFY entrega ENUM('retiro', 'domicilio') NOT NULL DEFAULT 'retiro';
ALTER TABLE pedidos DROP FOREIGN KEY fk_pedidos_usuario;
ALTER TABLE pedidos
  DROP INDEX idx_pedidos_usuario,
  DROP INDEX idx_pedidos_pago,
  DROP COLUMN usuario_id,
  DROP COLUMN email,
  DROP COLUMN dni,
  DROP COLUMN calle,
  DROP COLUMN altura,
  DROP COLUMN piso,
  DROP COLUMN codigo_postal,
  DROP COLUMN ciudad,
  DROP COLUMN provincia,
  DROP COLUMN notas,
  DROP COLUMN facturacion,
  DROP COLUMN cuit,
  DROP COLUMN razon_social,
  DROP COLUMN medio_pago,
  DROP COLUMN pago_estado,
  DROP COLUMN pago_id,
  DROP COLUMN pago_detalle,
  DROP COLUMN pagado_en,
  DROP COLUMN envio;

-- 3) Usuarios: solo admin y superadmin
DROP TABLE IF EXISTS favoritos;
DELETE FROM usuarios WHERE rol = 'cliente';
ALTER TABLE usuarios DROP INDEX uq_usuarios_google;
ALTER TABLE usuarios
  DROP COLUMN google_id,
  DROP COLUMN newsletter,
  DROP COLUMN telefono,
  DROP COLUMN dni,
  DROP COLUMN calle,
  DROP COLUMN altura,
  DROP COLUMN piso,
  DROP COLUMN codigo_postal,
  DROP COLUMN ciudad,
  DROP COLUMN provincia,
  MODIFY password CHAR(60) NOT NULL,
  MODIFY rol ENUM('admin', 'superadmin') NOT NULL DEFAULT 'admin';
