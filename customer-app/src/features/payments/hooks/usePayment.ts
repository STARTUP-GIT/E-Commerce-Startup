import { useMutation } from '@tanstack/react-query';
import { paymentApi, CreatePaymentPayload, VerifyPaymentPayload } from '../api/paymentApi';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function usePayment() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createPaymentMutation = useMutation({
    mutationFn: (payload: CreatePaymentPayload) => paymentApi.createPayment(payload),
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (payload: VerifyPaymentPayload) => paymentApi.verifyPayment(payload),
    onSuccess: (data) => {
      router.push(`/orders/success?orderNumber=${data.orderNumber || ''}`);
    },
    onError: (err: any) => {
      setError(err?.message || 'Payment verification failed');
    },
  });

  const processPayment = async (params: {
    shippingAddressId: string;
    couponCode?: string;
    userEmail: string;
    userName: string;
  }) => {
    setError(null);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your network connection.');
      }

      const orderDetails = await createPaymentMutation.mutateAsync({
        shippingAddressId: params.shippingAddressId,
        couponCode: params.couponCode,
      });

      if (orderDetails.gateway === 'RAZORPAY') {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummykey',
          amount: Math.round(orderDetails.amount * 100),
          currency: orderDetails.currency,
          name: 'Aura Marketplace',
          description: 'Aura Marketplace Checkout Payment',
          order_id: orderDetails.gatewayOrderId,
          handler: async (response: any) => {
            await verifyPaymentMutation.mutateAsync({
              shippingAddressId: params.shippingAddressId,
              couponCode: params.couponCode,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          prefill: {
            name: params.userName,
            email: params.userEmail,
          },
          theme: {
            color: '#7c3aed',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setError(resp.error.description || 'Payment checkout failed');
        });
        rzp.open();
      } else {
        const redirectUrl = orderDetails.phonepeDetails?.data?.instrumentResponse?.redirectInfo?.url;
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error('PhonePe payment instrument failed to return redirection URL');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate gateway payment.');
    }
  };

  return {
    processPayment,
    isProcessing: createPaymentMutation.isPending || verifyPaymentMutation.isPending,
    error,
    isSuccess: verifyPaymentMutation.isSuccess,
  };
}
