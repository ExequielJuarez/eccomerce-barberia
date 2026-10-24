-- Migración para bases ya instaladas (sucursales, usuarios barbero y notificaciones por usuario).
-- Ejecutar una sola vez:  mysql -u root -p barba_black < database/migracion-peluqueros.sql
USE barba_black;

ALTER TABLE usuarios MODIFY rol ENUM('cliente', 'admin', 'superadmin', 'barbero') NOT NULL DEFAULT 'cliente';

CREATE TABLE IF NOT EXISTS sucursales (
  id         SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(60)       NOT NULL,
  direccion  VARCHAR(120)      NOT NULL,
  activo     TINYINT(1)        NOT NULL DEFAULT 1,
  orden      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sucursales (nombre, direccion, activo, orden)
SELECT * FROM (
  SELECT 'Leopoldo Lugones' AS nombre, 'Av. Leopoldo Lugones 5147' AS direccion, 1 AS activo, 1 AS orden
  UNION ALL SELECT 'San Ramón Nonato', 'San Ramón Nonato 5708', 1, 2
) AS nuevas
WHERE NOT EXISTS (SELECT 1 FROM sucursales);

ALTER TABLE barberos
  ADD COLUMN sucursal_id SMALLINT UNSIGNED NULL AFTER nombre,
  ADD COLUMN usuario_id INT UNSIGNED NULL AFTER sucursal_id,
  ADD COLUMN foto VARCHAR(255) NULL AFTER usuario_id,
  ADD UNIQUE KEY uq_barberos_usuario (usuario_id),
  ADD KEY idx_barberos_sucursal (sucursal_id),
  ADD CONSTRAINT fk_barberos_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales (id) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD CONSTRAINT fk_barberos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON UPDATE CASCADE ON DELETE SET NULL;

UPDATE barberos SET sucursal_id = (SELECT MIN(id) FROM sucursales) WHERE sucursal_id IS NULL;

ALTER TABLE turnos
  ADD COLUMN sucursal_id SMALLINT UNSIGNED NULL AFTER barbero_id,
  ADD COLUMN sucursal VARCHAR(60) NULL AFTER barbero,
  ADD CONSTRAINT fk_turnos_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales (id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE notificaciones
  ADD COLUMN usuario_id INT UNSIGNED NULL AFTER producto_id,
  ADD KEY idx_notificaciones_usuario (usuario_id, leida);
