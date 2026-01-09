import Phaser from "phaser";

import { drawBorderBox, drawBuffer } from "../utils/draw";

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

function bufferColumnHeaders(headers) {
  const columnWidth = Math.floor(this.registry.get("drawInnerAreaWidthInCells") / headers.length);
  for (let i = 0; i < headers.length; ++i) {
    if (headers[i].length > columnWidth) {
      this.buffer = [];
      return;
    }
  }
  for (let i = 0; i < headers.length; ++i) {
    const offset = Math.floor((columnWidth - headers[i].length) / 2);
    putStr(
      this.buffer,
      i * columnWidth + offset,
      1,
      headers[i].toUpperCase(),
    );
  }
}

export default class Map extends Phaser.Scene {
  constructor() {
    super("Map");
  }

  create() {

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("resize").bind(this)();

      // recalculate buffer state
      const bufferHeightInCells = this.registry.get("drawInnerAreaHeightInCells");
      const bufferWidthInCells = this.registry.get("drawInnerAreaWidthInCells");
      if (bufferHeightInCells > 0 && bufferWidthInCells > 0) {
        this.buffer = Array.from(
          {length: bufferHeightInCells},
          () => Array(bufferWidthInCells).fill(" ")
        );
        bufferColumnHeaders.bind(this)(["test_1", "test_2", "test_3"]);
      }

      this.render();
    });
  }

  render() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    drawBorderBox.bind(this)("pump room");
    drawBuffer.bind(this)();
  }
  
};