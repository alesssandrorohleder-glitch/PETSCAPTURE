import { SCENES } from '../config';
import { StubScene } from './StubScene';

export class ShopScene extends StubScene {
  protected heading = 'Loja';
  protected description = 'Etapa 6: compra de itens com moedas.';
  constructor() {
    super(SCENES.Shop);
  }
  protected links() {
    return [{ label: 'Voltar', onSelect: () => this.goTo(SCENES.World) }];
  }
}
