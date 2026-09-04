const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "必須です";
  }
  if (trimmed.length > 254) {
    return "254文字以内で入力";
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return "形式が正しくありません";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) {
    return "パスワードは必須です";
  }
  if (value.length < 8) {
    return "8文字以上で入力";
  }
  if (value.length > 72) {
    return "72文字以内で入力";
  }
  return null;
}

export function validatePasswordRequired(value: string): string | null {
  if (!value) {
    return "必須です";
  }
  return null;
}

export function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "必須です";
  }
  if (trimmed.length > 50) {
    return "50文字以内で入力";
  }
  return null;
}

export function fieldError(value: string, validate: (value: string) => string | null): string | null {
  if (!value) {
    return null;
  }
  return validate(value);
}
