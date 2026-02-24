import { UserRole } from '../../common/enums/index.js';

export const usersToSeed: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}[] = [
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
