import { useState } from 'react';
import './Avatar.css';

export default function Avatar({ user, size = 'sm', className = '' }) {
  const [imageBroken, setImageBroken] = useState(false);
  const initial = user?.username?.[0]?.toUpperCase() ?? '?';
  const photo = user?.profile_picture;
  const showImage = photo && !imageBroken;
  const classes = `avatar avatar-${size}${className ? ` ${className}` : ''}`;

  if (showImage) {
    return (
      <span className={classes}>
        <img
          src={photo}
          alt=""
          className="avatar-image"
          onError={() => setImageBroken(true)}
        />
      </span>
    );
  }
  return <span className={classes} aria-hidden="true">{initial}</span>;
}
