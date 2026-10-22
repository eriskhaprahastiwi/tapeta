import type { Category, CategoryId } from "../types";

export const CATEGORIES: Category[] = [
  { id: "kafe", name: "Kafe dan coffee shop", shortName: "Kafe" },
  { id: "kuliner", name: "Kuliner dan restoran", shortName: "Kuliner" },
  { id: "alam", name: "Wisata alam", shortName: "Alam" },
  { id: "budaya", name: "Wisata budaya dan sejarah", shortName: "Budaya" },
  { id: "rekreasi", name: "Tempat rekreasi", shortName: "Rekreasi" },
  { id: "lainnya", name: "Tempat menarik lainnya", shortName: "Lainnya" },
];

export const CATEGORY_BY_ID = new Map<CategoryId, Category>(
  CATEGORIES.map((category) => [category.id, category]),
);

export const EXPLORATION_THRESHOLD = 5;

export const CATEGORY_COLORS: Record<CategoryId, string> = {
  kafe: "#d98a72",
  kuliner: "#b4553f",
  alam: "#4f6f5a",
  budaya: "#3f4d6e",
  rekreasi: "#c2597b",
  lainnya: "#847b6b",
};
