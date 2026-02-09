/*
Fix: the Level 2 circle was on a WALL tile (row 8 col 9 is '#'),
so it looks “outside” / unreachable.

Changes:
- Move that circle to (r: 8, c: 8) which is a FLOOR tile '.'
- Add a safety check: if any circle is placed on a wall/outside, snap it onto the first floor tile.
*/

const TS = 32;

const LEVELS = [
  {
    name: "Level 1",
    legend: { "#": 1, ".": 0 },
    grid: [
      "################",
      "#....#.....#...#",
      "#.##.#.###.#.#.#",
      "#.#..#...#...#.#",
      "#.#.####.###.#.#",
      "#.....#...#....#",
      "###.#.#.###.##.#",
      "#...#...#...#..#",
      "#.#####.#.###..#",
      "#..............#",
      "################",
    ],
    playerStart: { r: 1, c: 1 },
    circles: [
      { r: 1, c: 2, col: [255, 0, 0] },
      { r: 5, c: 4, col: [0, 0, 255] },
      { r: 8, c: 13, col: [0, 200, 0] },
    ],
  },
  {
    name: "Level 2",
    legend: { "#": 1, ".": 0 },
    grid: [
      "################",
      "#..#.......#...#",
      "#..#.#####.#.#.#",
      "#....#...#...#.#",
      "####.#.#.#####.#",
      "#....#.#.....#.#",
      "#.####.#####.#.#",
      "#......#...#...#",
      "#.######.#.###.#",
      "#........#.....#",
      "################",
    ],
    playerStart: { r: 1, c: 1 },
    circles: [
      { r: 1, c: 14, col: [255, 255, 0] },
      { r: 7, c: 2, col: [255, 0, 255] },
      { r: 9, c: 10, col: [0, 255, 255] },
      { r: 8, c: 8, col: [255, 120, 0] }, // FIXED (was 8,9 which is a wall)
    ],
  },
];

class Level {
  constructor(levelData, tileSize) {
    this.ts = tileSize;
    this.load(levelData);
  }

  load(levelData) {
    this.data = levelData;

    this.grid = this.data.grid.map((row) =>
      row.split("").map((ch) => this.data.legend[ch] ?? 0),
    );

    // helper: find first floor tile (guaranteed inside)
    const firstFloor = () => {
      for (let r = 0; r < this.grid.length; r++) {
        for (let c = 0; c < this.grid[0].length; c++) {
          if (this.grid[r][c] === 0) return { r, c };
        }
      }
      return { r: 1, c: 1 };
    };

    // circles with safety snap (prevents outside/wall placement)
    this.circles = this.data.circles.map((circ) => {
      let r = circ.r;
      let c = circ.c;

      const out =
        r < 0 || c < 0 || r >= this.grid.length || c >= this.grid[0].length;
      const wall = !out && this.grid[r][c] === 1;

      if (out || wall) {
        const p = firstFloor();
        r = p.r;
        c = p.c;
      }

      return { r, c, col: circ.col, collected: false };
    });
  }

  cols() {
    return this.grid[0].length;
  }
  rows() {
    return this.grid.length;
  }
  pixelWidth() {
    return this.cols() * this.ts;
  }
  pixelHeight() {
    return this.rows() * this.ts;
  }

  isWall(r, c) {
    if (r < 0 || c < 0 || r >= this.rows() || c >= this.cols()) return true;
    return this.grid[r][c] === 1;
  }

  circlesLeft() {
    return this.circles.filter((c) => !c.collected).length;
  }

  draw() {
    for (let r = 0; r < this.rows(); r++) {
      for (let c = 0; c < this.cols(); c++) {
        fill(this.grid[r][c] === 1 ? [30, 50, 60] : 230);
        rect(c * this.ts, r * this.ts, this.ts, this.ts);
      }
    }

    for (const circ of this.circles) {
      if (circ.collected) continue;
      fill(circ.col);
      ellipse(
        circ.c * this.ts + this.ts / 2,
        circ.r * this.ts + this.ts / 2,
        this.ts * 0.6,
      );
    }
  }

  tryCollectCircle(r, c) {
    for (const circ of this.circles) {
      if (!circ.collected && circ.r === r && circ.c === c) {
        circ.collected = true;
      }
    }
  }

  allCirclesCollected() {
    return this.circles.every((c) => c.collected);
  }
}

class Player {
  constructor(r, c, ts) {
    this.r = r;
    this.c = c;
    this.ts = ts;
  }

  move(dr, dc, level) {
    const nr = this.r + dr;
    const nc = this.c + dc;
    if (!level.isWall(nr, nc)) {
      this.r = nr;
      this.c = nc;
      level.tryCollectCircle(this.r, this.c);
    }
  }

  draw() {
    fill(255, 180, 0);
    rect(
      this.c * this.ts + 6,
      this.r * this.ts + 6,
      this.ts - 12,
      this.ts - 12,
      6,
    );
  }
}

let levelIndex = 0;
let level;
let player;

function loadLevel(i) {
  levelIndex = i;
  level.load(LEVELS[levelIndex]);
  resizeCanvas(level.pixelWidth(), level.pixelHeight());
  player.r = LEVELS[levelIndex].playerStart.r;
  player.c = LEVELS[levelIndex].playerStart.c;
  level.tryCollectCircle(player.r, player.c);
}

function setup() {
  level = new Level(LEVELS[0], TS);
  createCanvas(level.pixelWidth(), level.pixelHeight());
  noStroke();
  textFont("sans-serif");
  textSize(14);

  player = new Player(LEVELS[0].playerStart.r, LEVELS[0].playerStart.c, TS);
  level.tryCollectCircle(player.r, player.c);
}

function draw() {
  background(240);

  level.draw();
  player.draw();

  // HUD (top)
  fill(0);
  textAlign(LEFT, TOP);
  text(level.data.name, 8, 6);
  text(`Circles left: ${level.circlesLeft()}`, 8, 24);

  // Auto-advance
  if (level.allCirclesCollected()) {
    if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
    else {
      fill(0);
      textAlign(CENTER, CENTER);
      text("All levels complete", width / 2, height / 2);
      noLoop();
    }
  }
}

function keyPressed() {
  if (keyCode === LEFT_ARROW) player.move(0, -1, level);
  if (keyCode === RIGHT_ARROW) player.move(0, 1, level);
  if (keyCode === UP_ARROW) player.move(-1, 0, level);
  if (keyCode === DOWN_ARROW) player.move(1, 0, level);
}
