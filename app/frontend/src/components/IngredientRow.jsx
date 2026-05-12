import { useState } from 'react';
import './IngredientRow.css';

export default function IngredientRow({
  row,
  ingredients,
  units,
  onChange,
  onRemove,
  onNewIngredient,
  onNewUnit,
}) {
  const [ingredientSearch, setIngredientSearch] = useState(row.ingredientName || '');
  const [unitSearch, setUnitSearch] = useState(row.unitName || '');
  const [showIngredientList, setShowIngredientList] = useState(false);
  const [showUnitList, setShowUnitList] = useState(false);
  const [addIngredientError, setAddIngredientError] = useState('');
  const [addUnitError, setAddUnitError] = useState('');

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );
  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(unitSearch.toLowerCase())
  );

  const ingredientExactMatch = ingredients.some(
    (i) => i.name.toLowerCase() === ingredientSearch.toLowerCase()
  );
  const unitExactMatch = units.some(
    (u) => u.name.toLowerCase() === unitSearch.toLowerCase()
  );

  function handleSelectIngredient(ingredient) {
    setIngredientSearch(ingredient.name);
    setShowIngredientList(false);
    onChange(row.id, 'ingredientId', ingredient.id);
    onChange(row.id, 'ingredientName', ingredient.name);
  }

  function handleSelectUnit(unit) {
    setUnitSearch(unit.name);
    setShowUnitList(false);
    onChange(row.id, 'unitId', unit.id);
    onChange(row.id, 'unitName', unit.name);
  }

  async function handleAddIngredient() {
    setAddIngredientError('');
    try {
      const newIngredient = await onNewIngredient(ingredientSearch);
      if (newIngredient) handleSelectIngredient(newIngredient);
    } catch {
      setAddIngredientError(`Could not add "${ingredientSearch}". Please try again.`);
    }
  }

  async function handleAddUnit() {
    setAddUnitError('');
    try {
      const newUnit = await onNewUnit(unitSearch);
      if (newUnit) handleSelectUnit(newUnit);
    } catch {
      setAddUnitError(`Could not add "${unitSearch}". Please try again.`);
    }
  }

  return (
    <div className="ingredient-row">
      <div className="ingredient-combobox">
        <input
          placeholder="Ingredient"
          value={ingredientSearch}
          onChange={(e) => {
            setIngredientSearch(e.target.value);
            setShowIngredientList(true);
            onChange(row.id, 'ingredientId', null);
            onChange(row.id, 'ingredientName', e.target.value);
          }}
          onFocus={() => setShowIngredientList(true)}
          onBlur={() => setTimeout(() => setShowIngredientList(false), 150)}
          autoComplete="off"
        />
        {showIngredientList && ingredientSearch && (
          <ul className="combobox-list">
            {filteredIngredients.map((i) => (
              <li key={i.id} onMouseDown={() => handleSelectIngredient(i)} onClick={() => handleSelectIngredient(i)}>
                {i.name}
              </li>
            ))}
            {!ingredientExactMatch && ingredientSearch && (
              <li className="add-new" onMouseDown={handleAddIngredient} onClick={handleAddIngredient}>
                Add &quot;{ingredientSearch}&quot;
              </li>
            )}
          </ul>
        )}
        {addIngredientError && <p className="combobox-error" role="alert">{addIngredientError}</p>}
      </div>

      <input
        placeholder="Amount"
        type="number"
        min="0"
        step="any"
        value={row.amount}
        onChange={(e) => onChange(row.id, 'amount', e.target.value)}
      />

      <div className="ingredient-combobox">
        <input
          placeholder="Unit"
          value={unitSearch}
          onChange={(e) => {
            setUnitSearch(e.target.value);
            setShowUnitList(true);
            onChange(row.id, 'unitId', null);
            onChange(row.id, 'unitName', e.target.value);
          }}
          onFocus={() => setShowUnitList(true)}
          onBlur={() => setTimeout(() => setShowUnitList(false), 150)}
          autoComplete="off"
        />
        {showUnitList && unitSearch && (
          <ul className="combobox-list">
            {filteredUnits.map((u) => (
              <li key={u.id} onMouseDown={() => handleSelectUnit(u)} onClick={() => handleSelectUnit(u)}>
                {u.name}
              </li>
            ))}
            {!unitExactMatch && unitSearch && (
              <li className="add-new" onMouseDown={handleAddUnit} onClick={handleAddUnit}>
                Add &quot;{unitSearch}&quot;
              </li>
            )}
          </ul>
        )}
        {addUnitError && <p className="combobox-error" role="alert">{addUnitError}</p>}
      </div>

      <button type="button" onClick={() => onRemove(row.id)}>
        Remove
      </button>
    </div>
  );
}
