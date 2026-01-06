import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MARGINS,
  FONT_SIZE,
  COLORS,
} from '../config/constants';

export function initStyle() {
  const textStyle = {
    fontFamily: 'monospace',
    fontSize: FONT_SIZE,
    color: COLORS.TEXT,
  };

  const probeText = this.add.text(0, 0, "", textStyle).setVisible(false);
  const samples = 200;
  const probeChar = "M";
  probeText.setText(probeChar.repeat(samples));
  const cellW = probeText.width / samples;
  probeText.setText(probeChar + "\n" + probeChar);
  const cellH = probeText.height / 2;

  return {
    textStyle,
    cellW,
    cellH,
  };
};

export function borderText(cellW, cellH) {

  // console.log(`GAME_WIDTH ${GAME_WIDTH}`)
  // console.log(`GAME_HEIGHT ${GAME_HEIGHT}`)
  // console.log(`cellW ${cellW}`)
  // console.log(`cellH ${cellH}`)

  

};