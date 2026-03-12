import { UserRole } from '../../common/enums/index.js';

export interface UserSeed {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export const usersToSeed: UserSeed[] = [
  //  Admin
  {
    fullName: 'Admin FilaManager',
    email: 'admin@filamanager.com',
    password: 'admin123456',
    role: UserRole.ADMIN,
  },
  {
    fullName: 'Pol Valle',
    email: 'doplax@gmail.com',
    password: 'P@ssw0rd',
    role: UserRole.ADMIN,
  },
  //  Users
  {
    fullName: 'Maker Demo',
    email: 'demo@filamanager.com',
    password: 'demo123456',
    role: UserRole.USER,
  },
];
