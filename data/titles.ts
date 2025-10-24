export const WAR_TITLES = [
  "Beta War Sentinel",      // War 0
  "First Strike Champion",    // War 1
  "Second Wave Sovereign",  // War 2
  "Triple Threat Tyrant",
  "Fourth Dimension Dominator",
  "The Fifth Element",
  "Sixth Sense Sorcerer",
  "Seventh Heaven Vanquisher",
  "Eighth Wonder",
  "Ninth Gate Keeper",
  "Decade Destroyer",
  "The Pack God",
  "The Vinyl Virtuoso",
  "Rhythm Ruler",
  "Soundwave Sovereign",
  "Melody Monarch",
  "Groove Guardian",
  "Tempo Titan",
  "The Darth Warrior",
  "Echo Emperor",
  "Frequency Fiend"
];

export const getTitleForWar = (warNumber: number): string => {
  // Use modulo to loop through titles if we run out, but add a prefix to keep them unique
  if (warNumber < WAR_TITLES.length) {
    return WAR_TITLES[warNumber];
  }
  const index = (warNumber - WAR_TITLES.length) % (WAR_TITLES.length - 11) + 11; // Avoid using the first few titles in the loop
  return `War Veteran: ${WAR_TITLES[index]}`;
};
