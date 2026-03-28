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
  id: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  avatarUrl: string;

  // ── Perfil público ──────────────────────────────────────────
  @Column({ nullable: true, length: 500 })
  bio: string;

  @Column({ nullable: true, length: 200 })
  location: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ nullable: true, length: 200 })
  website: string;

  // ── Redes sociales ─────────────────────────────────────────
  @Column({ nullable: true, length: 150 })
  tiktok: string;

  @Column({ nullable: true, length: 150 })
  instagram: string;

  @Column({ nullable: true, length: 150 })
  facebook: string;

  @Column({ nullable: true, length: 150 })
  youtube: string;

  @Column({ nullable: true, length: 150 })
  twitter: string;

  // ── Links adicionales (JSON array) ─────────────────────────
  @Column({ type: 'jsonb', nullable: true, default: null })
  customLinks: { label: string; url: string }[];

  // ── Costes y tarifas del maker ─────────────────────────────
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  electricityCost: number; // €/kWh

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  makerHourlyRate: number; // €/hora

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingCostDefault: number; // € envío por defecto

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  wastagePercent: number; // % merma

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  productProfitMargin: number; // % margen beneficio producto

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  laborProfitMargin: number; // % margen beneficio mano de obra

  @Column({ default: true })
  chargesVat: boolean; // ¿Factura IVA?

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, default: 21 })
  vatPercent: number; // % IVA (default 21% España)

  @OneToMany(() => Filament, (filament) => filament.createdBy)
  filaments: Filament[];

  @OneToMany(() => Printer, (printer) => printer.createdBy)
  printers: Printer[];

  @OneToMany(() => Project, (project) => project.createdBy)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
