import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Filament } from '../filaments/entities/filament.entity.js';
import { Printer } from '../printers/entities/printer.entity.js';
import { Project } from '../projects/entities/project.entity.js';
import { PrintLog } from '../print-logs/entities/print-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { usersToSeed } from './data/users.seed.js';
import { filamentsToSeed } from './data/filaments.seed.js';
import { printersToSeed } from './data/printers.seed.js';
import { projectsToSeed } from './data/projects.seed.js';
import { printLogsToSeed } from './data/print-logs.seed.js';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Filament)
    private readonly filamentRepository: Repository<Filament>,
    @InjectRepository(Printer)
    private readonly printerRepository: Repository<Printer>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(PrintLog)
    private readonly printLogRepository: Repository<PrintLog>,
  ) {}

  async executeSeed() {
    // Limpiar datos existentes (order matters due to foreign keys)
    await this.printLogRepository.createQueryBuilder().delete().execute();
    await this.filamentRepository.createQueryBuilder().delete().execute();
    await this.printerRepository.createQueryBuilder().delete().execute();
    await this.projectRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();

    // Crear usuarios desde seed data
    const savedUsers: User[] = [];
    for (const userData of usersToSeed) {
      const user = this.userRepository.create(userData);
      savedUsers.push(await this.userRepository.save(user));
    }

    // El primer usuario (demo) es el owner de los recursos
    const demoUser = savedUsers[0];

    // Crear filamentos
    const savedFilaments: Filament[] = [];
    for (const data of filamentsToSeed) {
      const filament = this.filamentRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedFilaments.push(await this.filamentRepository.save(filament));
    }

    // Crear impresoras
    const savedPrinters: Printer[] = [];
    for (const data of printersToSeed) {
      const printer = this.printerRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedPrinters.push(await this.printerRepository.save(printer));
    }

    // Crear proyectos
    const savedProjects: Project[] = [];
    for (const data of projectsToSeed) {
      const project = this.projectRepository.create({
        ...data,
        createdBy: demoUser,
      });
      savedProjects.push(await this.projectRepository.save(project));
    }

    // Crear registros de impresión
    for (const data of printLogsToSeed) {
      const { filamentIndex, printerIndex, projectIndex, ...logData } = data;
      const printLog = this.printLogRepository.create({
        ...logData,
        filament: savedFilaments[filamentIndex],
        printer: savedPrinters[printerIndex],
        project: projectIndex !== undefined ? savedProjects[projectIndex] : undefined,
        createdBy: demoUser,
      });
      await this.printLogRepository.save(printLog);
    }

    this.logger.log('Seed executed successfully!');
    this.logger.log(
      `Created: ${savedUsers.length} users, ${savedFilaments.length} filaments, ${savedPrinters.length} printers, ${savedProjects.length} projects, ${printLogsToSeed.length} print logs`,
    );

    return {
      message: 'Seed executed successfully',
      data: {
        users: savedUsers.length,
        filaments: savedFilaments.length,
        printers: savedPrinters.length,
        projects: savedProjects.length,
        printLogs: printLogsToSeed.length,
      },
      credentials: {
        demo: { email: usersToSeed[0].email, password: 'demo123456' },
        admin: { email: usersToSeed[1].email, password: 'admin123456' },
      },
    };
  }
}

        color: 'Blanco',
        colorHex: '#FFFFFF',
        diameter: 1.75,
        density: 1.24,
        totalWeight: 1000,
        remainingWeight: 750,
        price: 15.99,
        currency: 'EUR',
        supplier: 'Amazon',
        printTempMin: 190,
        printTempMax: 220,
        bedTempMin: 50,
        bedTempMax: 60,
        status: FilamentStatus.AVAILABLE,
        spoolType: 'Standard 1kg',
        notes: 'Buen filamento para piezas generales',
      },
      {
        brand: 'eSun',
        material: MaterialType.PLA,
        color: 'Negro',
        colorHex: '#1A1A1A',
        diameter: 1.75,
        density: 1.24,
        totalWeight: 1000,
        remainingWeight: 320,
        price: 18.5,
        currency: 'EUR',
        supplier: 'Amazon',
        printTempMin: 195,
        printTempMax: 225,
        bedTempMin: 50,
        bedTempMax: 65,
        status: FilamentStatus.AVAILABLE,
        spoolType: 'Standard 1kg',
      },
      {
        brand: 'Prusament',
        material: MaterialType.PETG,
        color: 'Naranja Prusament',
        colorHex: '#F06B22',
        diameter: 1.75,
        density: 1.27,
        totalWeight: 1000,
        remainingWeight: 890,
        price: 29.99,
        currency: 'EUR',
        supplier: 'Prusa',
        printTempMin: 230,
        printTempMax: 250,
        bedTempMin: 70,
        bedTempMax: 90,
        status: FilamentStatus.AVAILABLE,
        spoolType: 'Standard 1kg',
        notes: 'PETG premium, excelente layer adhesion',
      },
      {
        brand: 'Hatchbox',
        material: MaterialType.ABS,
        color: 'Rojo',
        colorHex: '#E53935',
        diameter: 1.75,
        density: 1.04,
        totalWeight: 1000,
        remainingWeight: 500,
        price: 22.0,
        currency: 'EUR',
        supplier: 'Hatchbox Store',
        printTempMin: 220,
        printTempMax: 250,
        bedTempMin: 95,
        bedTempMax: 110,
        status: FilamentStatus.IN_USE,
        spoolType: 'Standard 1kg',
      },
      {
        brand: 'Overture',
        material: MaterialType.TPU,
        color: 'Azul Transparente',
        colorHex: '#42A5F5',
        diameter: 1.75,
        density: 1.21,
        totalWeight: 1000,
        remainingWeight: 950,
        price: 25.99,
        currency: 'EUR',
        supplier: 'Amazon',
        printTempMin: 200,
        printTempMax: 230,
        bedTempMin: 50,
        bedTempMax: 60,
        status: FilamentStatus.AVAILABLE,
        spoolType: 'Standard 1kg',
        notes: 'TPU 95A, flexible',
      },
      {
        brand: 'Sunlu',
        material: MaterialType.SILK,
        color: 'Dorado',
        colorHex: '#FFD700',
        diameter: 1.75,
        density: 1.24,
        totalWeight: 1000,
        remainingWeight: 120,
        price: 19.99,
        currency: 'EUR',
        supplier: 'Amazon',
        printTempMin: 195,
        printTempMax: 215,
        bedTempMin: 50,
        bedTempMax: 60,
        status: FilamentStatus.LOW_STOCK,
        spoolType: 'Standard 1kg',
        notes: 'Acabado sedoso brillante',
      },
      {
        brand: 'Polymaker',
        material: MaterialType.PLA,
        color: 'Verde Bosque',
        colorHex: '#2E7D32',
        diameter: 1.75,
        density: 1.24,
        totalWeight: 750,
        remainingWeight: 0,
        price: 21.0,
        currency: 'EUR',
        supplier: 'Polymaker',
        printTempMin: 190,
        printTempMax: 220,
        bedTempMin: 45,
        bedTempMax: 60,
        status: FilamentStatus.EMPTY,
        spoolType: 'Standard 750g',
      },
      {
        brand: 'eSun',
        material: MaterialType.ASA,
        color: 'Gris',
        colorHex: '#9E9E9E',
        diameter: 1.75,
        density: 1.07,
        totalWeight: 1000,
        remainingWeight: 680,
        price: 24.5,
        currency: 'EUR',
        supplier: 'Amazon',
        printTempMin: 235,
        printTempMax: 255,
        bedTempMin: 90,
        bedTempMax: 110,
        status: FilamentStatus.AVAILABLE,
        spoolType: 'Standard 1kg',
        notes: 'Resistente a UV, ideal para exteriores',
      },
    ];

    const savedFilaments: Filament[] = [];
    for (const data of filamentsData) {
      const filament = this.filamentRepository.create({
        ...data,
        createdBy: savedUser,
      });
      savedFilaments.push(await this.filamentRepository.save(filament));
    }

    // Crear impresoras
    const printersData = [
      {
        name: 'Prusa MK4',
        brand: 'Prusa Research',
        model: 'MK4',
        type: 'FDM',
        buildVolumeX: 250,
        buildVolumeY: 210,
        buildVolumeZ: 220,
        nozzleDiameter: 0.4,
        status: 'idle',
        notes: 'Impresora principal, muy fiable',
      },
      {
        name: 'Ender 3 V3',
        brand: 'Creality',
        model: 'Ender 3 V3',
        type: 'FDM',
        buildVolumeX: 220,
        buildVolumeY: 220,
        buildVolumeZ: 250,
        nozzleDiameter: 0.4,
        status: 'idle',
        notes: 'Modificada con direct drive',
      },
      {
        name: 'Bambu Lab P1S',
        brand: 'Bambu Lab',
        model: 'P1S',
        type: 'FDM',
        buildVolumeX: 256,
        buildVolumeY: 256,
        buildVolumeZ: 256,
        nozzleDiameter: 0.4,
        status: 'printing',
        notes: 'CoreXY cerrada, multi-material con AMS',
      },
    ];

    const savedPrinters: Printer[] = [];
    for (const data of printersData) {
      const printer = this.printerRepository.create({
        ...data,
        createdBy: savedUser,
      });
      savedPrinters.push(await this.printerRepository.save(printer));
    }

    // Crear proyectos
    const projectsData = [
      {
        name: 'Carcasa Raspberry Pi 5',
        description:
          'Carcasa con ventilación para Raspberry Pi 5 con soporte para ventilador',
        status: 'completed',
        estimatedWeight: 45,
        estimatedTime: 120,
      },
      {
        name: 'Organizador de escritorio',
        description:
          'Organizador modular con compartimentos para herramientas y accesorios',
        status: 'in_progress',
        estimatedWeight: 200,
        estimatedTime: 480,
      },
      {
        name: 'Soporte para teléfono',
        description: 'Soporte articulado para móvil con ajuste de ángulo',
        status: 'completed',
        estimatedWeight: 35,
        estimatedTime: 90,
      },
      {
        name: 'Maceta autoregante',
        description: 'Maceta con depósito de agua para riego automático',
        status: 'draft',
        estimatedWeight: 150,
        estimatedTime: 300,
      },
    ];

    const savedProjects: Project[] = [];
    for (const data of projectsData) {
      const project = this.projectRepository.create({
        ...data,
        createdBy: savedUser,
      });
      savedProjects.push(await this.projectRepository.save(project));
    }

    // Crear registros de impresión
    const printLogsData = [
      {
        name: 'Carcasa RPi5 - Base',
        description: 'Parte inferior de la carcasa',
        weightUsed: 25,
        printDuration: 65,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[0], // PLA Blanco
        printer: savedPrinters[0], // Prusa MK4
        project: savedProjects[0],
      },
      {
        name: 'Carcasa RPi5 - Tapa',
        description: 'Parte superior con ventilación',
        weightUsed: 20,
        printDuration: 55,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[0],
        printer: savedPrinters[0],
        project: savedProjects[0],
      },
      {
        name: 'Organizador - Módulo 1',
        description: 'Primer módulo del organizador',
        weightUsed: 85,
        printDuration: 180,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[1], // PLA Negro
        printer: savedPrinters[2], // Bambu Lab
        project: savedProjects[1],
      },
      {
        name: 'Soporte teléfono v1',
        description: 'Primera versión del soporte',
        weightUsed: 40,
        printDuration: 95,
        status: PrintStatus.FAILED,
        filament: savedFilaments[3], // ABS Rojo
        printer: savedPrinters[1], // Ender 3
        project: savedProjects[2],
        notes: 'Warping en la base, aumentar temp de cama',
      },
      {
        name: 'Soporte teléfono v2',
        description: 'Segunda versión corregida',
        weightUsed: 35,
        printDuration: 90,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[3],
        printer: savedPrinters[1],
        project: savedProjects[2],
      },
      {
        name: 'Test benchy',
        description: 'Benchy de calibración',
        weightUsed: 15,
        printDuration: 30,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[2], // PETG Naranja
        printer: savedPrinters[0],
      },
      {
        name: 'Llavero personalizado',
        description: 'Llavero con logo',
        weightUsed: 5,
        printDuration: 15,
        status: PrintStatus.COMPLETED,
        filament: savedFilaments[5], // Silk Dorado
        printer: savedPrinters[2],
      },
    ];

    for (const data of printLogsData) {
      const printLog = this.printLogRepository.create({
        ...data,
        createdBy: savedUser,
      });
      await this.printLogRepository.save(printLog);
    }

    this.logger.log('Seed executed successfully!');
    this.logger.log(
      `Created: ${savedFilaments.length} filaments, ${savedPrinters.length} printers, ${savedProjects.length} projects, ${printLogsData.length} print logs`,
    );

    return {
      message: 'Seed executed successfully',
      data: {
        users: 2,
        filaments: savedFilaments.length,
        printers: savedPrinters.length,
        projects: savedProjects.length,
        printLogs: printLogsData.length,
      },
      credentials: {
        demo: { email: 'demo@filamanager.com', password: 'demo123456' },
        admin: { email: 'admin@filamanager.com', password: 'admin123456' },
      },
    };
  }
}
