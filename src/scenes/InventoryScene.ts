import { SCENES } from '../config';
import { StubScene } from './StubScene';

export class InventoryScene extends StubScene {
  protected heading = 'Inventário';
  protected description = 'Etapa 6: cápsulas, poções e antídotos.';
  constructor() {
    super(SCENES.Inventory);
  }
  protected links() {
    return [{ label: 'Voltar', onSelect: () => this.goTo(SCENES.World) }];
  }
}
