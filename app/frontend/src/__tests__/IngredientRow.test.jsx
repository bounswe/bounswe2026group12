import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IngredientRow from '../components/IngredientRow';

const mockIngredients = [
  { id: 1, name: 'Salt' },
  { id: 2, name: 'Sugar' },
];
const mockUnits = [
  { id: 1, name: 'cup' },
  { id: 2, name: 'tbsp' },
];
const defaultRow = {
  id: 'row-1',
  ingredientId: null,
  ingredientName: '',
  amount: '',
  unitId: null,
  unitName: '',
};

function renderRow(overrides = {}) {
  const onChange = jest.fn();
  const onRemove = jest.fn();
  const onNewIngredient = jest.fn();
  const onNewUnit = jest.fn();

  render(
    <IngredientRow
      row={{ ...defaultRow, ...overrides }}
      ingredients={mockIngredients}
      units={mockUnits}
      onChange={onChange}
      onRemove={onRemove}
      onNewIngredient={onNewIngredient}
      onNewUnit={onNewUnit}
    />
  );

  return { onChange, onRemove, onNewIngredient, onNewUnit };
}

describe('IngredientRow', () => {
  it('renders ingredient search input, amount input, unit search input, and remove button', () => {
    renderRow();
    expect(screen.getByPlaceholderText('Ingredient')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Amount')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Unit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('shows filtered ingredient options when typing', () => {
    renderRow();
    fireEvent.change(screen.getByPlaceholderText('Ingredient'), { target: { value: 'sa' } });
    expect(screen.getByText('Salt')).toBeInTheDocument();
    expect(screen.queryByText('Sugar')).not.toBeInTheDocument();
  });

  it('calls onChange when an ingredient is selected', () => {
    const { onChange } = renderRow();
    fireEvent.change(screen.getByPlaceholderText('Ingredient'), { target: { value: 'Salt' } });
    fireEvent.click(screen.getByText('Salt'));
    expect(onChange).toHaveBeenCalledWith('row-1', 'ingredientId', 1);
    expect(onChange).toHaveBeenCalledWith('row-1', 'ingredientName', 'Salt');
  });

  it('calls onChange when amount changes', () => {
    const { onChange } = renderRow();
    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '2' } });
    expect(onChange).toHaveBeenCalledWith('row-1', 'amount', '2');
  });

  it('shows "Add new" option when typed text does not match any ingredient', () => {
    renderRow();
    fireEvent.change(screen.getByPlaceholderText('Ingredient'), { target: { value: 'Turmeric' } });
    expect(screen.getByText(/add "Turmeric"/i)).toBeInTheDocument();
  });

  it('calls onNewIngredient when "Add new" is clicked', async () => {
    const { onNewIngredient } = renderRow();
    onNewIngredient.mockResolvedValue({ id: 99, name: 'Turmeric' });
    fireEvent.change(screen.getByPlaceholderText('Ingredient'), { target: { value: 'Turmeric' } });
    fireEvent.click(screen.getByText(/add "Turmeric"/i));
    await waitFor(() => expect(onNewIngredient).toHaveBeenCalledWith('Turmeric'));
  });

  it('calls onRemove when Remove is clicked', () => {
    const { onRemove } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledWith('row-1');
  });
});
