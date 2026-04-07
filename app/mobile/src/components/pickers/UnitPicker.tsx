import React from 'react';
import type { CatalogSelection } from '../../types/catalog';
import { fetchUnits, submitUnit } from '../../services/ingredientUnitService';
import { SearchableCreatablePicker } from './SearchableCreatablePicker';

type Props = {
  value: CatalogSelection;
  onValueChange: (next: CatalogSelection) => void;
};

export function UnitPicker({ value, onValueChange }: Props) {
  return (
    <SearchableCreatablePicker
      label="Unit"
      value={value}
      onValueChange={onValueChange}
      fetchList={fetchUnits}
      createItem={submitUnit}
    />
  );
}
