import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Filament {
  @PrimaryGeneratedColumn('uuid') // Genera IDs únicos tipo 'a1b2-c3d4...'
  id: string;

  @Column()
  brand: string; // Marca (e.g. "Sunlu")

  @Column()
  type: string; // Material (e.g. "PLA")

  @Column()
  color: string; // Nombre del color

  @Column({ nullable: true })
  colorHex: string; // Código Hexadecimal para mostrarlo en el frontend

  @Column('float')
  diameter: number; // 1.75 o 2.85

  @Column('float')
  density: number; // g/cm3 (Crucial para cálculos)

  @Column('int')
  totalWeight: number; // Peso inicial en gramos (e.g. 1000)

  @Column('float')
  remainingWeight: number; // Peso actual

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // Precio de compra
}
