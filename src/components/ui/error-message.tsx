type ErrorMessageProps = {
  message?: string;
};

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-red-600" role="alert">
      {message}
    </p>
  );
}
