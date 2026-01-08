import Phaser from "phaser";

import { drawBorderBox } from "../utils/draw";
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

  redraw() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    drawBorderBox.bind(this)("PUMP ROOM");

    this.buffer = Array.from(
      {length: this.registry.get("drawInnerAreaHeightInCells")},
      () => Array(this.registry.get("drawInnerAreaWidthInCells")).fill("5")
    );
    this.ui.add(
      this.add.text(
        MARGINS.left + this.registry.get("cellW"),
        MARGINS.top + this.registry.get("cellH"),
        this.buffer.map(line => line.join("")).join("\n"),
        TEXT_STYLE
      )
    );

  }
  
  create() {

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("init").bind(this)();
      this.redraw();
    });
  }
};