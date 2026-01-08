import Phaser from "phaser";

import { drawBorderBox, drawBuffer } from "../utils/draw";
import { MARGINS, TEXT_STYLE } from "../config/constants";

function putStr(buf, x, y, str) {
  const ROW_LIMIT = buf.length;
  const COL_LIMIT = buf[0].length;
  if (y < 0 || y >= ROW_LIMIT) return;
  if (x + str.length - 1 >= COL_LIMIT) return;
  for (let i = 0; i < str.length; ++i) {
    const xx = x + i;
    buf[y][xx] = str[i];
  }
}


export default class Map extends Phaser.Scene {
  constructor() {
    super("Map");
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    drawBorderBox.bind(this)("PUMP ROOM");

    const bufferHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
    const bufferWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
    if (bufferHeightInCells > 0 && bufferWidthInCells > 0) {
      this.buffer = Array.from(
        {length: bufferHeightInCells},
        () => Array(bufferWidthInCells).fill("")
      );
      drawBuffer.bind(this)();
    }


  }
  
  create() {

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("init").bind(this)();
      this.render();
    });
  }
};