// utils/colors.js

// A predefined palette of high-contrast, visually distinct colors.
const PREDEFINED_COLORS = [
  "#FF5733", // Vivid Orange
  "#33CFFF", // Bright Cyan
  "#33FF57", // Neon Green
  "#FF33A1", // Hot Pink
  "#F6DD3C", // Bright Yellow
  "#9D33FF", // Electric Purple
  "#33FFA1", // Aquamarine
  "#FF8F33", // Orange Peel
  "#337BFF", // Royal Blue
  "#C70039", // Crimson Red
  "#44E578", // Sea Green
  "#B533FF", // Bright Lilac
];

export const generateUniqueColor = (key) => {
  // Simple deterministic hash to get a number from the string key
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure it's a 32bit integer
  }

  // Use the absolute value of the hash and the modulo operator
  // to get a consistent index within the bounds of the color palette array.
  const index = Math.abs(hash) % PREDEFINED_COLORS.length;

  return PREDEFINED_COLORS[index];
};