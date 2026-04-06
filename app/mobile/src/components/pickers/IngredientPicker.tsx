import React from 'react';
import type { CatalogSelection } from '../../types/catalog';
import {
  fetchIngredients,
  submitIngredient,
} from '../../services/ingredientUnitService';
import { SearchableCreatablePicker } from './SearchableCreatablePicker';

type Props = {
  value: CatalogSelection;
  onValueChange: (next: CatalogSelection) => void;
};

export function IngredientPicker({ value, onValueChange }: Props) {
  return (
    <SearchableCreatablePicker
      label="Ingredient"
      value={value}
      onValueChange={onValueChange}
      fetchList={fetchIngredients}
      createItem={submitIngredient}
    />
  );
}
