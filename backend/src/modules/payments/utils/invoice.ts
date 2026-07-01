export const generateInvoice = (params: {
    invoiceNumber: string;
    customer: {
        id: string;
        username: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    order: {
        orderNumber: string;
        createdAt: Date | string;
        subtotal: number;
        shippingTotal: number;
        packingFeeTotal: number;
        taxTotal: number;
        grandTotal: number;
    };
    sellers: {
        sellerId: string;
        shopName: string;
        items: {
            name: string;
            sku: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
        }[];
    }[];
    payment: {
        method: string;
        status: string;
    };
}) => {
    return {
        invoiceNumber: params.invoiceNumber,
        invoiceDate: new Date(),
        customer: {
            id: params.customer.id,
            username: params.customer.username,
            email: params.customer.email,
            fullName: `${params.customer.firstName} ${params.customer.lastName}`.trim()
        },
        order: {
            orderNumber: params.order.orderNumber,
            orderDate: params.order.createdAt
        },
        items: params.sellers.flatMap(s => s.items.map(item => ({
            ...item,
            sellerId: s.sellerId,
            shopName: s.shopName
        }))),
        breakdown: {
            productTotal: Number(params.order.subtotal),
            packingFee: Number(params.order.packingFeeTotal),
            shipping: Number(params.order.shippingTotal),
            gst: Number(params.order.taxTotal),
            grandTotal: Number(params.order.grandTotal)
        },
        payment: {
            method: params.payment.method,
            status: params.payment.status
        }
    };
};
