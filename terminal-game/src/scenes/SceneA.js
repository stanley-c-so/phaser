import Phaser from "phaser";

import { MARGINS, COLORS } from "../config/constants";

export default class SceneA extends Phaser.Scene {
  constructor() {
    super("SceneA");
  }

  create() {
    this.add.text(MARGINS.left, MARGINS.top, "SCENE A\n(press SPACE)", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: COLORS.TEXT,
    });

    this.input.keyboard.once("keydown-SPACE", () => {
      this.scene.start("SceneB")
    });
  }
};