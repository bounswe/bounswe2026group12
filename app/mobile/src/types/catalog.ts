/** Ingredient / unit row from GET lists (matches web dropdown data shape). */
export type CatalogItem = {
  id: number;
  name: string;
};

export type CatalogSelection = {
  id: number | null;
  name: string;
};
