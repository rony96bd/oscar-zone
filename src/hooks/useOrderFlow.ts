import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fetchGames } from '@/services/games'
import { fetchPaymentMethods, uploadPaymentScreenshot } from '@/services/payments'
import { calculateBonusPreview } from '@/services/orders'
import { supabase } from '@/lib/supabase'
import type { CreateOrderPayload } from '@/types'
import { toast } from 'sonner'

interface OrderFlowState {
  step: number
  gameId: string | null
  customerGameId: string | null
  username: string
  amount: number
  paymentMethodId: string | null
  screenshotFile: File | null
  screenshotPath: string | null
  guestName: string
  guestEmail: string
  guestPhone: string
}

export function useOrderFlow(isGuest = false) {
  const [state, setState] = useState<OrderFlowState>({
    step: 1,
    gameId: null,
    customerGameId: null,
    username: '',
    amount: 0,
    paymentMethodId: null,
    screenshotFile: null,
    screenshotPath: null,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
  })

  const gamesQuery = useQuery({
    queryKey: ['games', 'active'],
    queryFn: fetchGames,
  })

  const paymentMethodsQuery = useQuery({
    queryKey: ['payment-methods', 'active'],
    queryFn: fetchPaymentMethods,
  })

  const bonusQuery = useQuery({
    queryKey: ['bonus-preview', state.gameId, state.amount],
    queryFn: () => calculateBonusPreview(state.gameId!, state.amount),
    enabled: !!state.gameId && state.amount >= 10,
    staleTime: 30000,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Upload screenshot if not yet uploaded
      let screenshotPath = state.screenshotPath
      if (state.screenshotFile && !screenshotPath) {
        const { data: { user } } = await supabase.auth.getUser()
        screenshotPath = await uploadPaymentScreenshot(
          state.screenshotFile,
          'temp-' + Date.now(),
          user?.id || null
        )
      }

      const payload: CreateOrderPayload = {
        game_id: state.gameId!,
        username: state.username,
        base_amount: state.amount,
        payment_method_id: state.paymentMethodId!,
        payment_screenshot_path: screenshotPath!,
        customer_game_id: state.customerGameId || undefined,
        ...(isGuest && {
          guest_name: state.guestName,
          guest_email: state.guestEmail,
          guest_phone: state.guestPhone,
        }),
      }

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: payload,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Order submitted successfully!')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit order')
    },
  })

  const update = (updates: Partial<OrderFlowState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => setState((prev) => ({ ...prev, step: prev.step + 1 }))
  const prevStep = () => setState((prev) => ({ ...prev, step: prev.step - 1 }))
  const goToStep = (step: number) => setState((prev) => ({ ...prev, step }))

  return {
    state,
    update,
    nextStep,
    prevStep,
    goToStep,
    games: gamesQuery.data || [],
    paymentMethods: paymentMethodsQuery.data || [],
    bonusPreview: bonusQuery.data,
    isBonusLoading: bonusQuery.isLoading,
    submitMutation,
    isSubmitting: submitMutation.isPending,
    submittedOrder: submitMutation.data,
  }
}
