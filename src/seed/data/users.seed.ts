import { UserRole } from '../../common/enums/index.js';

export interface UserSeed {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export const usersToSeed: UserSeed[] = [
  {
    fullName: 'Maker Demo',
    email: 'demo@filamanager.com',
    password: 'demo123456',
    role: UserRole.USER,
  },
  {
    fullName: 'Admin FilaManager',
    email: 'admin@filamanager.com',
    password: 'admin123456',
    role: UserRole.ADMIN,
  },
];
