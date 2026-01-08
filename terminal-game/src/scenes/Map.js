import Phaser from "phaser";

import { drawBorderBox } from "../utils/draw";

export default class Map extends Phaser.Scene {
  constructor() {
    super("Map");
  }

  redraw() {
    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);
    drawBorderBox.bind(this)("PUMP ROOM");
  }
  
  create() {

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("init").bind(this)();
      this.redraw();
    });
  }
};