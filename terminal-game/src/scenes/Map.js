import Phaser from "phaser";

import { MAP_DATA } from "../data/map";

import {
  drawBorderBox,
  drawBuffer,
  putStr,
} from "../utils/draw";

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

function drawMap() {

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
        // bufferColumnHeaders.bind(this)(["test_1", "test_2", "test_3"]);

        drawMap();
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