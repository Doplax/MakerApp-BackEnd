export enum MaterialType {
  PLA = 'PLA',
  ABS = 'ABS',
  PETG = 'PETG',
  TPU = 'TPU',
  NYLON = 'NYLON',
  ASA = 'ASA',
  PC = 'PC',
  PVA = 'PVA',
  HIPS = 'HIPS',
  WOOD = 'WOOD',
  CARBON_FIBER = 'CARBON_FIBER',
  SILK = 'SILK',
  MARBLE = 'MARBLE',
  GLOW = 'GLOW',
  METAL = 'METAL',
  FLEXIBLE = 'FLEXIBLE',
  OTHER = 'OTHER',
}

export enum FilamentStatus {
  AVAILABLE = 'available',
  IN_USE = 'in_use',
  LOW_STOCK = 'low_stock',
  EMPTY = 'empty',
  DRIED = 'dried',
  DAMAGED = 'damaged',
}

export enum PrintStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}
