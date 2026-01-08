import Phaser from "phaser";

import {
  MARGINS,
  COLORS,
  TEXT_STYLE,
} from "../config/constants";

export default class SceneB extends Phaser.Scene {
  constructor() {
    super("SceneB");
  }

  render() {

    this.ui?.removeAll(true);
    this.ui = this.add.container(0, 0);

    this.ui.add(
      this.add.text(MARGINS.left, MARGINS.top, "SCENE B / TERMINAL (type; ENTER=nl, BACKSPACE=del)", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: COLORS.TEXT,
      })
    );

    // The text display
    this.terminalText = this.add.text(this.originX, this.originY, "", TEXT_STYLE);
    this.ui.add(this.terminalText);
    
    // Cursor square (drawn with Graphics)
    this.cursorGfx = this.add.graphics();
    this.ui.add(this.cursorGfx);
    
    // Render all lines as one block
    this.terminalText.setText(this.lines.join("\n"));
    this.drawCursor();
  }

  create() {

    // --- "terminal" config ---
    this.originX = MARGINS.left;
    this.originY = MARGINS.top + this.registry.get("cellH");
    
    this.cursorCol = 0;
    this.cursorRow = 0;

    // Backing buffer: array of strings (lines)
    this.lines = Array.from({ length: this.registry.get("drawAreaHeightInCells") }, () => "");

    this.scale.on("resize", () => {
      // console.log("RESIZE");
      this.registry.get("init").bind(this)();
      this.render();
    });

    this.input.keyboard.on("keydown", (e) => {
      // Stop the browser from scrolling/doing shortcuts
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault()
      }
    })

    // Key handling
    this.input.keyboard.on("keydown", (ev) => {
      // Ignore modifier-only keys
      if (ev.key === "Shift" || ev.key === "Control" || ev.key === "Alt" || ev.key === "Meta") return;

      if (ev.key === "Backspace") {
        this.backspace();
        this.render();
        return;
      }

      if (ev.key === "Enter") {
        this.newline();
        this.render();
        return;
      }

      // Printable single-character keys (includes space)
      if (ev.key.length === 1) {
        this.typeChar(ev.key);
        this.render();
      }
    })

    this.render();
  }

  typeChar(ch) {
    if (this.cursorRow >= this.registry.get("drawAreaHeightInCells")) return;

    // If line is full, wrap
    if (this.cursorCol >= this.registry.get("drawAreaWidthInCells")) this.newline();
    if (this.cursorRow >= this.registry.get("drawAreaHeightInCells")) return;

    const line = this.lines[this.cursorRow];
    this.lines[this.cursorRow] = line + ch;
    this.cursorCol += 1;
  }

  backspace() {
    if (this.cursorRow < 0) return;

    if (this.cursorCol > 0) {
      // Remove last char from current line
      const line = this.lines[this.cursorRow];
      this.lines[this.cursorRow] = line.slice(0, -1);
      this.cursorCol -= 1;
      return;
    }

    // If at start of line, go up a line (simple behavior)
    if (this.cursorRow > 0) {
      this.cursorRow -= 1;
      this.cursorCol = this.lines[this.cursorRow].length;
      // Remove last char on that previous line
      if (this.cursorCol > 0) {
        this.lines[this.cursorRow] = this.lines[this.cursorRow].slice(0, -1);
        this.cursorCol -= 1;
      }
    }
  }

  newline() {
    this.cursorRow += 1;
    this.cursorCol = 0;
  }


  drawCursor() {
    this.cursorGfx.clear();
    this.cursorGfx.lineStyle(2, 0x00ff00, 1);

    const x = this.originX + this.cursorCol * this.registry.get("cellW");
    const y = this.originY + this.cursorRow * this.registry.get("cellH");

    // Square cursor at "next character" position
    this.cursorGfx.strokeRect(x, y, this.cellW, this.registry.get("cellH"));
  }
};