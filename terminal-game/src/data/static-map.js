// This diagram has min height 35, and min width 62
// ▓ = battery unit filled
// ░ = battery unit empty

export const MAP_STATE_1 = {
  utilities: {
    A: { level: 1, capacity: 5 },
    B: { level: 2, capacity: 3 },
    C: { level: 3, capacity: 3 },
    D: { level: 0, capacity: 4 },
  },
  batteries: {
    "1": { level: 0, capacity: 4 },
  },
  connections: {
    up: {
      "1": ["A", "B", "C", "D"],
    },
    down: {
      "1": ["A", "B", "C"],
    },
  },
  goal: {
    A: 5,
  },
};

export const MAP_STATE_2 = {
  utilities: {
    // D: { level: 0, capacity: 4 },
    E: { level: 3, capacity: 3 },
  },
  batteries: {
    "2": { level: 0, capacity: 4 },
  },
  connections: {
    up: {
      "1": ["A", "B", "C", "D"],
      "2": ["E"],
    },
    down: {
      "1": ["A", "B", "C"],
      "2": ["D", "E"],
    },
  },
  goal: {
    D: 4,
  },
};

export const MAP_STATE_3 = {
  utilities: {
    F: { level: 5, capacity: 6 }, // capacity can be higher
    G: { level: 0, capacity: 3 },
    H: { level: 0, capacity: 3 },
  },
  batteries: {
    "3": { level: 0, capacity: 4 },
    "4": { level: 0, capacity: 4 },
  },
  connections: {
    up: {
      "2": ["E", "F"],
      "3": ["G"],
      "4": ["H"],
    },
    down: {
      "2": ["D", "E"],
      "3": ["F"],
      "4": ["G", "H"],
    },
  },
  goal: {
    H: 2,
  },
};


export const STATIC_MAP_ASCII_1 = `
                ┌ a ┐
                │   │─────── A ▓▓▓ ░░░ ░░░ ░░░ ░░░
       ┌────────│ > │
       │        │   │─────── B ▓▓▓ ▓▓▓ ░░░
┌ 1 ┐  │        └───┘
│░░░│──┘
│░░░│           ┌ b ┐
│░░░│           │   │
│░░░│───────────│ > │─────── C ▓▓▓ ▓▓▓ ▓▓▓
└───┘           │   │
                └───┘
`;

export const MAP_CONNECTIONS_1 = {
  batteryToSwitch: {
    up: {
      "1": ["a", "b"],
    },
    down: {
      "1": ["a", "b"],
    },
  },
  switchToUtility: {
    a: ["A", "B"],
    b: ["C"],
  },
};

export const STATIC_MAP_ASCII_2 = `
                ┌ a ┐
                │   │─────── A ▓▓▓ ░░░ ░░░ ░░░ ░░░
       ┌────────│ > │
       │        │   │─────── B ▓▓▓ ▓▓▓ ░░░
┌ 1 ┐  │        └───┘
│░░░│──┘
│░░░│           ┌ b ┐
│░░░│           │   │
│░░░│───────────│ > │─────── C ▓▓▓ ▓▓▓ ▓▓▓
└───┘           │   │
  │             └───┘
  └────────┐
           │    ┌ c ┐
┌ 2 ┐      │    │   │
│░░░│──┐   \\────│ > │─────── E ░░░ ░░░ ░░░ ░░░
│░░░│  └───┘    │   │
│░░░│           └───┘
│░░░│──────┐
└───┘      │    ┌ d ┐
           │    │   │
           └────│ > │─────── F ▓▓▓ ▓▓▓ ▓▓▓
                │   │
                └───┘
`;

export const MAP_CONNECTIONS_2 = {
  batteryToSwitch: {
    up: {
      "1": ["a", "b", "c"],
      "2": ["d"]
    },
    down: {
      "1": ["a", "b"],
      "2": ["c", "d"],
    },
  },
  switchToUtility: {
    a: ["A", "B"],
    b: ["C"],
    c: ["E"],
    d: ["F"],
  },
};

export const STATIC_MAP_ASCII_3 = `
                ┌ a ┐
                │   │─────── A ▓▓▓ ░░░ ░░░ ░░░ ░░░
       ┌────────│ > │
       │        │   │─────── B ▓▓▓ ▓▓▓ ░░░
┌ 1 ┐  │        └───┘
│░░░│──┘
│░░░│           ┌ b ┐
│░░░│           │   │
│░░░│───────────│ > │─────── C ▓▓▓ ▓▓▓ ▓▓▓
└───┘           │   │
  │             └───┘
  └────────┐
           │    ┌ c ┐
┌ 2 ┐      │    │   │
│░░░│──┐   \\────│ > │─────── E ░░░ ░░░ ░░░ ░░░
│░░░│  └───┘    │   │
│░░░│           └───┘
│░░░│──────┐
└───┘      │    ┌ d ┐
  │        │    │   │
  └────┐   └────│ > │─────── F ▓▓▓ ▓▓▓ ▓▓▓
       │        │   │
┌ 3 ┐  \\───┐    └───┘
│░░░│──┘   │
│░░░│      │    ┌ e ┐
│░░░│      │    │   │
│░░░│──┐   └────│ > │─────── G ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓ ▓▓▓ ░░░ ░░░ ░░░
└───┘  │        │   │
       │        └───┘
       \\───┐
       │   │    ┌ f ┐
┌ 4 ┐  │   │    │   │
│░░░│──┘   └────│ > │─────── H ░░░ ░░░ ░░░
│░░░│           │   │
│░░░│           └───┘
│░░░│──┐
└───┘  │        ┌ g ┐
       │        │   │
       └────────│ > │─────── I ░░░ ░░░ ░░░
                │   │
                └───┘
`;

export const MAP_CONNECTIONS_3 = {
  batteryToSwitch: {
    up: {
      "1": ["a", "b", "c"],
      "2": ["d", "e"],
      "3": ["f"],
      "4": ["g"],
    },
    down: {
      "1": ["a", "b"],
      "2": ["c", "d"],
      "3": ["e"],
      "4": ["f", "g"],
    },
  },
  switchToUtility: {
    a: ["A", "B"],
    b: ["C"],
    c: ["E"],
    d: ["F"],
    e: ["G"],
    f: ["H"],
    g: ["I"],
  },
};
