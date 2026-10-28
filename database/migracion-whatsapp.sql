-- Pedidos coordinados por WhatsApp (sin pasarela de pago).
-- Correr una sola vez sobre una base ya instalada.
ALTER TABLE pedidos
  MODIFY medio_pago ENUM('tarjeta', 'transferencia', 'whatsapp') NOT NULL DEFAULT 'whatsapp';
