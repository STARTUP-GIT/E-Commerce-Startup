export const shopDetailsService = {
  formatSupportInfo: (email?: string, phone?: string): string => {
    if (email && phone) return `${email} • ${phone}`;
    return email || phone || 'No support details provided';
  },
};
