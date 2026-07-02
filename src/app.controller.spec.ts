import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('getHello devuelve el mensaje de salud', () => {
    const controller = new AppController(new AppService());
    expect(controller.getHello()).toEqual({ message: 'Hello World!' });
  });
});
