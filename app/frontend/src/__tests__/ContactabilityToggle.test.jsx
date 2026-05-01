import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ContactabilityToggle from '../components/ContactabilityToggle';
import * as authService from '../services/authService';

jest.mock('../services/authService');

describe('ContactabilityToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.getContactabilityValue.mockImplementation((user) => user?.is_contactable ?? true);
    authService.updateMe.mockResolvedValue({
      id: 1,
      username: 'demo',
      is_contactable: false,
    });
  });

  it('renders enabled state from user profile', () => {
    render(<ContactabilityToggle user={{ id: 1, is_contactable: true }} onUserUpdated={jest.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByText(/allow new threads/i)).toBeInTheDocument();
  });

  it('updates preference and notifies parent on toggle', async () => {
    const onUserUpdated = jest.fn();
    render(<ContactabilityToggle user={{ id: 1, is_contactable: true }} onUserUpdated={onUserUpdated} />);
    fireEvent.click(screen.getByRole('checkbox'));

    await waitFor(() => expect(authService.updateMe).toHaveBeenCalledWith({ is_contactable: false }));
    await waitFor(() => expect(onUserUpdated).toHaveBeenCalledWith(expect.objectContaining({
      is_contactable: false,
    })));
  });

  it('rolls back UI state on failure', async () => {
    authService.updateMe.mockRejectedValueOnce(new Error('fail'));
    render(<ContactabilityToggle user={{ id: 1, is_contactable: true }} onUserUpdated={jest.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText(/could not update messaging preference/i)).toBeInTheDocument();
      expect(checkbox).toBeChecked();
    });
  });
});

