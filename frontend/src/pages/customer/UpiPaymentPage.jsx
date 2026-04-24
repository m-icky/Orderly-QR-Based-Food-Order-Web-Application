import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Smartphone, CheckCircle, ArrowLeft, Loader, ExternalLink } from 'lucide-react'
import api from '../../utils/api'
import { formatCurrency } from '../../utils/format'
import toast from 'react-hot-toast'

const UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    color: 'bg-blue-50 text-blue-600',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Google_Pay_Logo.svg',
    packageName: 'com.google.android.apps.nbu.paisa.user'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: 'bg-purple-50 text-purple-600',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg',
    packageName: 'com.phonepe.app'
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: 'bg-cyan-50 text-cyan-600',
    icon: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg',
    packageName: 'net.one97.paytm'
  }
]

export default function UpiPaymentPage() {
  const { shopId, orderId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: selection, 2: processing, 3: done

  const { data, isLoading } = useQuery({
    queryKey: ['order-id', orderId],
    queryFn: () => api.get(`/api/orders/single/${orderId}`).then(r => r.data),
  })

  const simulateMutation = useMutation({
    mutationFn: () => api.post('/api/orders/simulate-upi-payment', { orderId: data?.order?._id }),
    onSuccess: ({ data: responseData }) => {
      setStep(3)
      toast.success('Payment confirmed!')
      setTimeout(() => {
        navigate(`/shop/${shopId}/order-success/${responseData.order.orderId}`)
      }, 2000)
    },
    onError: err => {
      toast.error(err.response?.data?.message || 'Verification failed')
      setStep(1)
    },
  })

  const handleManualConfirm = () => {
    setStep(2)
    simulateMutation.mutate()
  }

  const generateUpiUrl = (app = null) => {
    const order = data?.order
    if (!order || !order.shopId?.upiId) return null

    const pa = order.shopId.upiId
    const pn = encodeURIComponent(order.shopId.name || 'Orderly Shop')
    const am = order.totalAmount.toFixed(2)
    const tn = encodeURIComponent(`Order #${order.orderId}`)
    const cu = 'INR'
    
    const baseUrl = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}`
    
    // On Android, we can try to target specific apps via intent URLs
    const isAndroid = /Android/i.test(navigator.userAgent)
    
    if (app && isAndroid && app.packageName) {
      return `intent://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=${tn}#Intent;scheme=upi;package=${app.packageName};end`
    }
    
    return baseUrl
  }

  const handlePayViaApp = (app = null) => {
    const url = generateUpiUrl(app)
    if (url) {
      window.location.href = url
      // After opening app, show confirmation buttons
      toast.success('UPI app opened. Please complete the payment.')
    } else {
      toast.error('Unable to generate payment link. Missing shop UPI ID.')
    }
  }

  const order = data?.order

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Loader className="text-brand-500 animate-spin mb-4" size={40} />
      <p className="text-gray-500 animate-pulse">Loading order details...</p>
    </div>
  )

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
            {step === 3 ? 'Payment Successful!' : step === 2 ? 'Verifying Payment...' : 'UPI Payment'}
          </h1>
          <p className="text-gray-400 text-sm mt-1 px-4">
            {step === 3 ? 'Redirecting to your order...' : step === 2 ? 'Please wait while we confirm your payment' : 'Choose your preferred UPI app to pay'}
          </p>
        </div>

        {step === 1 && order && (
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
            {/* Amount Summary */}
            <div className="bg-brand-50 rounded-2xl p-4 text-center">
              <p className="text-sm text-brand-600 font-medium">Amount to Pay</p>
              <p className="text-3xl font-display font-800 text-brand-500 mt-1">{formatCurrency(order.totalAmount)}</p>
              <p className="text-xs text-gray-400 mt-1">Order #{order.orderId} • {order.shopId?.name}</p>
            </div>

            {/* App Selection */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Select UPI App</p>
              <div className="grid grid-cols-1 gap-2">
                {UPI_APPS.map(app => (
                  <button
                    key={app.id}
                    onClick={() => handlePayViaApp(app)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${app.color} flex items-center justify-center p-2 group-hover:scale-105 transition-transform`}>
                        <img src={app.icon} alt={app.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
                        <Smartphone className="hidden" size={20} />
                      </div>
                      <span className="font-600 text-gray-700">{app.name}</span>
                    </div>
                    <ExternalLink size={16} className="text-gray-300 group-hover:text-brand-400" />
                  </button>
                ))}
                
                <button
                  onClick={() => handlePayViaApp()}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-gray-200 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <span className="font-600 text-gray-700">Other UPI Apps</span>
                  </div>
                  <ExternalLink size={16} className="text-gray-300 group-hover:text-brand-400" />
                </button>
              </div>
            </div>

            {/* Manual Confirmation Fallback */}
            <div className="pt-2">
              <div className="text-xs text-center text-gray-400 mb-4 bg-gray-50 rounded-xl p-3 px-4">
                Already paid? Click the button below to confirm your order.
              </div>
              <button onClick={handleManualConfirm} className="btn-primary w-full py-4 text-base font-700 shadow-lg shadow-brand-200">
                ✅ I've Paid — Confirm Order
              </button>
              <button 
                onClick={() => navigate(`/shop/${shopId}/cart`)} 
                className="w-full py-3 mt-2 text-gray-400 text-sm font-500 hover:text-gray-600 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} /> Back to Cart
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-3 h-3 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <div>
                <p className="font-semibold text-gray-800">Verifying payment status...</p>
                <p className="text-xs text-gray-400 mt-2">Connecting to shop admin for confirmation</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
