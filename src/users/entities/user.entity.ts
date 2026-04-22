import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/index.js';
import { Filament } from '../../filaments/entities/filament.entity.js';
import { Printer } from '../../printers/entities/printer.entity.js';
import { Project } from '../../projects/entities/project.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  fullName!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column({ select: false, nullable: true })
  password!: string;

  @Column({ nullable: true, unique: true })
  googleId!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  avatarUrl!: string;

  // ── Datos personales ─────────────────────────────────────────
  @Column({ nullable: true, length: 100 })
  firstName!: string;

  @Column({ nullable: true, length: 100 })
  lastName!: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: Date;

  @Column({ nullable: true, length: 20 })
  dni!: string;

  @Column({ nullable: true, length: 30 })
  phone!: string;

  // ── Dirección postal ─────────────────────────────────────────
  @Column({ nullable: true, length: 100 })
  country!: string;

  @Column({ nullable: true, length: 100 })
  province!: string;

  @Column({ nullable: true, length: 100 })
  city!: string;

  @Column({ nullable: true, length: 20 })
  postalCode!: string;

  @Column({ nullable: true, length: 200 })
  addressLine!: string;

  // ── Nombre del taller ────────────────────────────────────────
  @Column({ nullable: true, length: 150 })
  workshopName!: string;

  // ── Perfil público ──────────────────────────────────────────
  @Column({ nullable: true, length: 500 })
  bio!: string;

  @Column({ nullable: true, length: 200 })
  location!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: number;

  @Column({ nullable: true, length: 200 })
  website!: string;

  // ── Redes sociales ─────────────────────────────────────────
  @Column({ nullable: true, length: 150 })
  tiktok!: string;

  @Column({ nullable: true, length: 150 })
  instagram!: string;

  @Column({ nullable: true, length: 150 })
  facebook!: string;

  @Column({ nullable: true, length: 150 })
  youtube!: string;

  @Column({ nullable: true, length: 150 })
  twitter!: string;

  // ── Estilo de mapa preferido ───────────────────────────────
  @Column({ nullable: true, length: 50 })
  mapStyle!: string;

  // ── Links adicionales (JSON array) ─────────────────────────
  @Column({ type: 'jsonb', nullable: true, default: null })
  customLinks!: { label: string; url: string }[];

  // ── Datos de facturación ─────────────────────────────────────
  @Column({ nullable: true, length: 150 })
  companyName!: string; // Nombre / Empresa para facturas

  @Column({ nullable: true, length: 20 })
  nifCif!: string; // NIF o CIF

  @Column({ nullable: true, length: 300 })
  fiscalAddress!: string; // Dirección fiscal

  @Column({ nullable: true })
  invoiceLogoUrl!: string; // Logo para facturas

  // ── Costes y tarifas del maker ─────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyElectricityCost!: number; // €/mes electricidad total

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyOtherFixedCosts!: number; // €/mes otros costes fijos

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  electricityCost!: number; // €/kWh (detalle avanzado)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  makerHourlyRate!: number; // €/hora

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCostDefault!: number; // € envío por defecto

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  wastagePercent!: number; // % merma

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  productProfitMargin!: number; // % margen beneficio producto

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  laborProfitMargin!: number; // % margen beneficio mano de obra

  @Column({ default: true })
  chargesVat!: boolean; // ¿Factura IVA?

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    default: 21,
  })
  vatPercent!: number; // % IVA (default 21% España)

  // ── Stripe Connect ────────────────────────────────────────
  @Column({ nullable: true, length: 50 })
  stripeAccountId!: string; // ID de la cuenta Express de Stripe Connect

  @OneToMany(() => Filament, (filament) => filament.createdBy)
  filaments!: Filament[];

  @OneToMany(() => Printer, (printer) => printer.createdBy)
  printers!: Printer[];

  @OneToMany(() => Project, (project) => project.createdBy)
  projects!: Project[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async checkPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }
}
