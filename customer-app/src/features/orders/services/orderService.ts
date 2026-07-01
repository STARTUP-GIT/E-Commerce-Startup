export const orderService = {
  getStatusBadgeVariant: (status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' => {
    switch (status.toUpperCase()) {
      case 'CONFIRMED':
      case 'DELIVERED':
      case 'COMPLETED':
      case 'ACCEPTED':
        return 'success';
      case 'PENDING':
      case 'PROCESSING':
      case 'SHIPPED':
        return 'default';
      case 'CANCELLED':
      case 'REJECTED':
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  },
  formatStatus: (status: string): string => {
    return status.replace(/_/g, ' ');
  },
};
