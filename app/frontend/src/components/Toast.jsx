import './Toast.css';

export default function Toast({ message, type }) {
  if (!message) return null;

  return (
    <div role="alert" className={`toast toast-${type}`}>
      {message}
    </div>
  );
}
