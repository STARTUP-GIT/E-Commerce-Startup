import { useMutation } from '@tanstack/react-query';
import { paymentApi, CreatePaymentPayload, VerifyPaymentPayload, BuyNowParams } from '../api/paymentApi';
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
    buyNow?: BuyNowParams;
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
        buyNow: params.buyNow,
      });

      if (orderDetails.gateway === 'RAZORPAY') {
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_dummykey';
        const amountPaise = Math.round(orderDetails.amount * 100);
        const currency = orderDetails.currency;
        const orderId = orderDetails.gatewayOrderId;

        console.log('=== Razorpay Validation ===');
        console.log('Razorpay Key:', razorpayKey);
        console.log('Order ID:', orderId);
        console.log('Amount (paise):', amountPaise);
        console.log('Currency:', currency);

        if (!razorpayKey) {
          throw new Error(
            'RAZORPAY_UNDEFINED: key is undefined. Set NEXT_PUBLIC_RAZORPAY_KEY_ID in Vercel env.'
          );
        }
        if (!orderId) {
          throw new Error(
            'RAZORPAY_UNDEFINED: order_id is undefined. Backend did not return gatewayOrderId.'
          );
        }
        if (!amountPaise || isNaN(amountPaise)) {
          throw new Error(
            'RAZORPAY_UNDEFINED: amount is invalid. Backend returned amount=' + orderDetails.amount
          );
        }
        if (!currency) {
          throw new Error(
            'RAZORPAY_UNDEFINED: currency is undefined.'
          );
        }

        const options = {
          key: razorpayKey,
          amount: amountPaise,
          currency: currency,
          name: 'Aura Marketplace',
          description: 'Aura Marketplace Checkout Payment',
          order_id: orderId,
          handler: async (response: any) => {
            await verifyPaymentMutation.mutateAsync({
              shippingAddressId: params.shippingAddressId,
              couponCode: params.couponCode,
              buyNow: params.buyNow,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          prefill: {
            name: params.userName || 'Customer',
            email: params.userEmail || '',
          },
          theme: {
            color: '#7c3aed',
          },
        };

        console.log('Razorpay Options:', options);

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
