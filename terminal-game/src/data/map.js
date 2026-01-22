export const MAP_DATA = {
  tanks: ['1', '2'],

  // pumps: [
  //   // Tank 0
  //   { label: "A", tanks: [0] },
  //   { label: "B", tanks: [0] },
  //   { label: "C", tanks: [0] },
    
  //   // Both tanks
  //   { label: "D", tanks: [0, 1] },
  //   { label: "E", tanks: [0, 1] },
    
  //   // Tank 1
  //   { label: "F", tanks: [1] },
  //   { label: "G", tanks: [1] },
  //   { label: "H", tanks: [1] },
  // ],

  // pumps: [
  //   // Tank 0
  //   { label: "a", tanks: [0] },
    
  //   // Both tanks
  //   { label: "d", tanks: [0, 1] },
    
  //   // Tank 1
  //   { label: "f", tanks: [1] },
  //   { label: "h", tanks: [1] },
  // ],

  // pumps: [
  //   // Both tanks
  //   { label: "A", tanks: [0, 1] },
    
  //   // Tank 1
  //   { label: "y", tanks: [1] },
  //   { label: "z", tanks: [1] },
  // ],

  // pumps: [
  //   // Both tanks
  //   { label: "A", tanks: [0, 1] },
    
  //   // Tank 1
  //   { label: "x", tanks: [1] },
  //   { label: "y", tanks: [1] },
  //   { label: "z", tanks: [1] },
  // ],

  // pumps: [
  //   // Tank 0
  //   { label: "a", tanks: [0] },
  //   { label: "b", tanks: [0] },
  //   { label: "c", tanks: [0] },
    
  //   // Both tanks
  //   { label: "B", tanks: [0, 1] },
  // ],

  pumps: [
    // Tank 0
    { label: "4", tanks: [0] },
    { label: "1", tanks: [0] },
    
    // Both tanks
    { label: "2", tanks: [0, 1] },

    // Tank 1
    { label: "3", tanks: [1] },
  ],
  utilities: [
    { label: "Pool", pump: "4" },
    { label: "Greenhouse", pump: "1" },
    { label: "Aquarium", pump: "1" },
    { label: "Reservoir", pump: "2" },
    { label: "Fountain", pump: "2" },
    { label: "Kitchen", pump: "3" },
  ],

};

export function validate_MAP_DATA() {

  const MAX_TANKS = 2;
  const MAX_PUMPS = 8;
  const MAX_PUMPS_PER_TANK = 4;

  // Enforce tank count
  if (!MAP_DATA.tanks?.length) throw new Error('MAP DATA has no tanks.');
  if (MAP_DATA.tanks.length !== MAX_TANKS) {
    throw new Error(`MAP DATA must have exactly ${MAX_TANKS} tanks; got ${MAP_DATA.tanks.length}.`);
  }

  // Enforce pump count
  const pumps = MAP_DATA.pumps ?? [];
  const pumpLabels = pumps.map(p => p.label);
  console.log("PUMP LABELS", pumpLabels)
  if (!pumps.length) throw new Error('MAP DATA has no pumps.');
  if (pumpLabels.length > MAX_PUMPS) {
    throw new Error(`MAP DATA has ${pumpLabels.length} pumps. Max is ${MAX_PUMPS}.`);
  }

  // Enforce single character tank labels
  for (const label of MAP_DATA.tanks) {
    if (label.length > 1) {
      throw new Error(`Invalid tank label ${label}. Must be 1 character only.`);
    }
  }
  
  // Enforce single character pump labels
  for (const label of pumpLabels) {
    if (label.length > 1) {
      throw new Error(`Invalid pump label ${label}. Must be 1 character only.`);
    }
  }

  // Validate connections + classify pump types in the *provided order*
  let hasBoth = false;
  let topOnlyCount = 0;
  let bottomOnlyCount = 0;
  let phase = 0; // 0 = top-only phase, 1 = both phase, 2 = bottom-only phase
  for (let i = 0; i < pumps.length; i++) {
    const pump = pumps[i];
    const label = pump.label;
    const conns = pump.tanks;

    if (!Array.isArray(conns)) throw new Error(`Pump ${label} connections must be an array.`);
    if (conns.length !== 1 && conns.length !== 2) {
      throw new Error(`Pump ${label} must connect to 1 tank or both tanks.`);
    }

    const uniq = [...new Set(conns)];
    if (uniq.length !== conns.length) {
      throw new Error(`Pump ${label} has duplicate tank connections: [${conns}].`);
    }

    for (const t of conns) {
      if (!Number.isInteger(t) || t < 0 || t >= MAX_TANKS) {
        throw new Error(`Pump ${label} maps to invalid tank index ${t}.`);
      }
    }

    // Classify current pump based on tank connection
    let type;
    if (conns.length === 2) {
      if (!(uniq.includes(0) && uniq.includes(1))) {
        throw new Error(`Pump ${label} with 2 connections must be [0,1]. Got [${conns}].`);
      }
      type = 'both';
      hasBoth = true;
    } else {
      type = (conns[0] === 0) ? 'top' : 'bottom';
      if (type === 'top') topOnlyCount++;
      else bottomOnlyCount++;
    }

    // Enforce grouping order: top -> both -> bottom
    const typePhase = (type === 'top') ? 0 : (type === 'both') ? 1 : 2;
    if (typePhase < phase) {
      throw new Error(`Pump order invalid at ${label}: expected grouping top-only then both then bottom-only.`);
    }
    phase = Math.max(phase, typePhase);
  }

  // Manifold outlet accounting
  const topOutlets = (hasBoth ? 1 : 0) + topOnlyCount;
  const bottomOutlets = (hasBoth ? 1 : 0) + bottomOnlyCount;

  // Enforce max pumps per tank
  if (topOutlets > MAX_PUMPS_PER_TANK) {
    throw new Error(`Tank ${MAP_DATA.tanks[0]} uses ${topOutlets} outlets (max ${MAX_PUMPS_PER_TANK}).`);
  }
  if (bottomOutlets > MAX_PUMPS_PER_TANK) {
    throw new Error(`Tank ${MAP_DATA.tanks[1]} uses ${bottomOutlets} outlets (max ${MAX_PUMPS_PER_TANK}).`);
  }

  // Enforce each utility is connected to a valid pump
  for (const utility of MAP_DATA.utilities) {
    if (!pumpLabels.includes(utility.pump)) {
      throw new Error(`Utility ${utility.label} is connected to invalid pump ${utility.pump}.`);
    }
  }
}