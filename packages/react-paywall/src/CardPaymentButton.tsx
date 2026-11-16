'use client'
import { useRef, useState } from 'react'
import { CardCheckout, type CardCheckoutOptions } from '@launaio/sdk'

export type CardPaymentButtonProps = {
  url: string
  options?: CardCheckoutOptions
  /** Persist this token securely before the first network request, to recover after reload. */
  onToken: (token: string) => void | Promise<void>
  onPaid: (response: Response) => void
  label?: string
}

/** Explicit card selection, hosted Checkout, and manual retry with the same purchase. */
export function CardPaymentButton({
  url,
  options,
  onToken,
  onPaid,
  label = 'Pay by card',
}: CardPaymentButtonProps) {
  const checkout = useRef<CardCheckout | null>(null)
  const originalRequest = useRef('')
  function requestKey() {
    return JSON.stringify([
      url,
      [...new Headers(options?.headers).entries()].sort(),
      options?.credentials ?? 'omit',
    ])
  }
  function assertOriginalRequest() {
    if (
      originalRequest.current !== requestKey() ||
      (options?.token && options.token !== checkout.current?.token)
    )
      throw new Error(
        'The request changed. Restore the original purchase before continuing.',
      )
  }
  const [checkoutURL, setCheckoutURL] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [started, setStarted] = useState(false)

  async function start() {
    setBusy(true)
    try {
      if (!checkout.current) {
        checkout.current = new CardCheckout(url, options)
        originalRequest.current = requestKey()
      }
      assertOriginalRequest()
      if (checkout.current.url !== url)
        throw new Error(
          'The request changed. Finish or resolve the existing purchase before paying again.',
        )
      await onToken(checkout.current.token)
      setStarted(true)
      const state = await checkout.current.start()
      setCheckoutURL(state.checkout_url ?? '')
      setMessage(
        state.status === 'paid'
          ? 'Payment received. Continue to access the API.'
          : state.status === 'pending' && state.checkout_url
            ? 'Complete payment in Stripe, then continue here.'
            : `Payment status: ${state.status}. Keep this purchase; do not pay again.`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start checkout. Retry this purchase.',
      )
    } finally {
      setBusy(false)
    }
  }
  async function resume() {
    setBusy(true)
    try {
      if (!checkout.current || checkout.current.url !== url)
        throw new Error(
          'The request changed; restore the original purchase before continuing.',
        )
      assertOriginalRequest()
      const response = await checkout.current.resume()
      if (
        response.ok &&
        response.status !== 202 &&
        response.headers.has('Launa-Payment-Receipt')
      )
        onPaid(response)
      else {
        const result = await response.json()
        setMessage(
          result.status === 'pending'
            ? 'Payment is still pending. Try again after completing checkout.'
            : `Payment status: ${result.status ?? 'recovery required'}. Keep this purchase; do not pay again.`,
        )
      }
    } catch {
      setMessage(
        'Unable to confirm payment. Retry this purchase; do not pay again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <button type="button" disabled={busy} onClick={() => void start()}>
        {started ? 'Reopen this checkout' : label}
      </button>
      {checkoutURL && (
        <a href={checkoutURL} target="_blank" rel="noopener noreferrer">
          Open Stripe Checkout
        </a>
      )}
      {started && (
        <button type="button" disabled={busy} onClick={() => void resume()}>
          I have paid — continue
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  )
}
