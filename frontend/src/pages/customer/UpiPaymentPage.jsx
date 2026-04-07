import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Smartphone, CheckCircle, ArrowLeft, Loader } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

export default function UpiPaymentPage() {
  const { shopId, orderId } = useParams()
  const navigate = useNavigate()
  const [paid, setPaid] = useState(false)
  const [step, setStep] = useState(1) // 1: show UPI, 2: processing, 3: done

  const { data } = useQuery({
    queryKey: ['order-id', orderId],
    queryFn: () => api.get(`/api/orders/single/${orderId.replace('mongo-', '')}`).then(r => r.data),
  })

  const simulateMutation = useMutation({
    mutationFn: () => api.post('/api/orders/simulate-upi-payment', { orderId }),
    onSuccess: ({ data }) => {
      setPaid(true)
      setStep(3)
      toast.success('Payment successful!')
      setTimeout(() => {
        navigate(`/shop/${shopId}/order-success/${data.order.orderId}`)
      }, 2000)
    },
    onError: err => {
      toast.error(err.response?.data?.message || 'Payment failed')
      setStep(1)
    },
  })

  const handlePayNow = () => {
    setStep(2)
    // Simulate a delay for UPI processing
    setTimeout(() => simulateMutation.mutate(), 2000)
  }

  const order = data?.order

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${step === 3 ? 'bg-green-100' : 'bg-brand-100'}`}>
            {step === 3 ? (
              <CheckCircle size={40} className="text-green-500 animate-fade-in" />
            ) : step === 2 ? (
              <Loader size={36} className="text-brand-500 animate-spin" />
            ) : (
              <Smartphone size={36} className="text-brand-500" />
            )}
          </div>
          <h1 className="font-display text-2xl font-700 text-gray-900">
            {step === 3 ? 'Payment Successful!' : step === 2 ? 'Processing Payment...' : 'UPI Payment'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 3 ? 'Redirecting to your order...' : step === 2 ? 'Please wait while we verify your payment' : 'Complete payment via UPI'}
          </p>
        </div>

        {step === 1 && order && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            {/* Amount */}
            <div className="bg-brand-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-brand-600 font-medium">Amount to Pay</p>
              <p className="text-3xl font-display font-800 text-brand-500 mt-1">{formatCurrency(order.totalAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">Order #{order.orderId}</p>
            </div>

            {/* UPI ID display */}
            {data?.order?.shopId && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">UPI ID</p>
                <p className="font-mono font-semibold text-gray-700 bg-gray-100 rounded-xl px-4 py-2 text-sm">
                  {order.shopId?.upiId || 'shop@upi'}
                </p>
              </div>
            )}

            {/* Simulated QR */}
            <div className="flex justify-center">
              <div className="w-40 h-40 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <div className="text-4xl mb-1">📱</div>
                  <p className="text-xs text-gray-400">Simulated QR</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 text-center bg-amber-50 rounded-xl p-3">
              💡 This is a demo. Click "I've Paid" to simulate successful UPI payment.
            </div>

            <div className="space-y-2">
              <button onClick={handlePayNow} className="btn-primary w-full py-3.5 text-base">
                ✅ I've Paid — Confirm
              </button>
              <button onClick={() => navigate(`/shop/${shopId}/cart`)} className="btn-secondary w-full py-3 flex items-center justify-center gap-2">
                <ArrowLeft size={14} /> Go Back
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <p className="text-gray-500 text-sm">Verifying with UPI gateway...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
