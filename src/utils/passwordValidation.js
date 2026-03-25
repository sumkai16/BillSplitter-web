export function getPasswordError(password) {
  if (!password) return "Password is required";
  if (password.length < 8 || password.length > 16)
    return "Password must be 8-16 characters";
  if (!/[A-Z]/.test(password))
    return "Password needs at least one uppercase letter";
  if (!/[a-z]/.test(password))
    return "Password needs at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password needs at least one number";
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    return "Password needs at least one special character";
  return "";
}

export function getConfirmPasswordError(password, confirmPassword) {
  if (!confirmPassword) return "Please confirm your password";
  if (confirmPassword !== password) return "Passwords do not match";
  return "";
}
