import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from '../components/Avatar';

describe('Avatar', () => {
  it('renders the username initial when no profile_picture is set', () => {
    render(<Avatar user={{ username: 'ayse' }} size="sm" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders ? when there is no user', () => {
    render(<Avatar user={null} size="sm" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders an <img> when profile_picture is present', () => {
    render(<Avatar user={{ username: 'ayse', profile_picture: '/media/avatars/a.jpg' }} size="md" />);
    const img = document.querySelector('img.avatar-image');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/media/avatars/a.jpg');
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('falls back to initials when the image fails to load', () => {
    render(<Avatar user={{ username: 'ayse', profile_picture: '/broken.jpg' }} size="sm" />);
    const img = document.querySelector('img.avatar-image');
    fireEvent.error(img);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies the size variant class', () => {
    const { container } = render(<Avatar user={{ username: 'a' }} size="md" />);
    expect(container.querySelector('.avatar-md')).not.toBeNull();
  });
});
