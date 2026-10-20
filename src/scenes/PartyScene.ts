import { SCENES } from '../config';
import { StubScene } from './StubScene';

export class PartyScene extends StubScene {
  protected heading = 'Equipe';
  protected description = 'Etapa 6: até 6 monstros.';
  constructor() {
    super(SCENES.Party);
  }
  protected links() {
    return [{ label: 'Voltar', onSelect: () => this.goTo(SCENES.World) }];
  }
}
