// Validaciones de campos de usuario, alineadas con los demas proyectos (recetario-app-backend,
// rotten-tomatos-backend): mismos limites y mismas reglas de contrasena.

export function validatePassword(password) {
  if (typeof password !== 'string') return 'La contraseña es obligatoria';
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  if (password.length > 64) return 'La contraseña no puede superar 64 caracteres';
  if (/\s/.test(password)) return 'La contraseña no puede contener espacios';
  return null;
}

export function validateEmail(email) {
  if (typeof email !== 'string' || !email.trim()) return 'El correo es obligatorio';
  if (email.length > 100) return 'El correo no puede superar 100 caracteres';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Correo invalido';
  return null;
}

export function validateName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'El nombre es obligatorio';
  if (name.trim().length > 50) return 'El nombre no puede superar 50 caracteres';
  return null;
}
