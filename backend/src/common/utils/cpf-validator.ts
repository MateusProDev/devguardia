/**
 * Valida CPF brasileiro
 * @param cpf CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  // Remover caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verificar se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  const digit1 = remainder >= 10 ? 0 : remainder;
  
  if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  const digit2 = remainder >= 10 ? 0 : remainder;
  
  return digit2 === parseInt(cleanCPF.charAt(10));
}

/**
 * Formata CPF no padrão brasileiro (000.000.000-00)
 * @param cpf CPF sem formatação
 * @returns CPF formatado
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
