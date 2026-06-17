/**
 * Tipos de notificación in-app. El frontend renderiza el texto traducido a
 * partir del `type` + `data`; los campos `title`/`body` almacenados sirven de
 * fallback (y para reutilizar en email si hiciera falta).
 */
export enum NotificationType {
  MAINTENANCE_DUE = 'maintenance_due',
  ORDER_CONFIRMED = 'order_confirmed',
  CHAT_MESSAGE = 'chat_message',
  FOLLOW_RECEIVED = 'follow_received',
  REVIEW_RECEIVED = 'review_received',
  SYSTEM = 'system',
}
