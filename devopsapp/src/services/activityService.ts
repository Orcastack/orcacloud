import apiClient from './apiClient'

type EventPayload = Record<string, any>

class ActivityService {
  private buffer: any[] = []
  private flushInterval = 5000
  private timer: number | null = null
  private consent = false

  init(options?: { consent?: boolean; flushInterval?: number }) {
    if (options?.flushInterval) this.flushInterval = options.flushInterval
    if (typeof options?.consent === 'boolean') this.consent = options.consent
    this.start()
  }

  setConsent(allow: boolean) {
    this.consent = allow
    if (!allow) this.buffer = []
  }

  start() {
    if (this.timer) return
    this.timer = window.setInterval(() => this.flush(), this.flushInterval)
    // Basic event capture: clicks and form submissions
    window.addEventListener('click', this.handleClick.bind(this), true)
    window.addEventListener('submit', this.handleSubmit.bind(this), true)
    // Capture history navigation
    const pushState = window.history.pushState
    // monkey-patch pushState to capture SPA navigations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.history as any).pushState = function (state: any, title: string, url?: string | null) {
      try {
        __activityService.capture('navigation', 'pushState', { url })
      } catch (e) {}
      return pushState.apply(window.history, [state, title, url])
    }
    window.addEventListener('popstate', () => {
      this.capture('navigation', 'popstate', { url: window.location.pathname + window.location.search })
    })
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    window.removeEventListener('click', this.handleClick.bind(this), true)
    window.removeEventListener('submit', this.handleSubmit.bind(this), true)
  }

  handleClick(ev: MouseEvent) {
    try {
      const target = ev.target as HTMLElement | null
      if (!target) return
      const el = target.closest('[data-track]') || target
      const tag = (el as HTMLElement).tagName
      const text = (el as HTMLElement).textContent?.trim().slice(0, 200) || ''
      this.capture('ui', 'click', { tag, text })
    } catch (e) {
      // ignore
    }
  }

  handleSubmit(ev: Event) {
    try {
      const form = ev.target as HTMLFormElement
      const name = form?.name || form?.id || 'form'
      this.capture('ui', 'submit', { form: name })
    } catch (e) {}
  }

  capture(event_type: string, event_name: string, payload: EventPayload = {}) {
    if (!this.consent) return
    const event = {
      event_type,
      event_name,
      payload,
      timestamp: new Date().toISOString(),
    }
    this.buffer.push(event)
    if (this.buffer.length >= 20) this.flush()
  }

  async flush() {
    if (this.buffer.length === 0) return
    const toSend = this.buffer.splice(0, this.buffer.length)
    try {
      await apiClient.post('/api/v1/activity/logs/', toSend)
    } catch (_err) {
      // put back to buffer on failure (simple retry)
      this.buffer.unshift(...toSend)
    }
  }

  async captureLocation(allowHighAccuracy = false) {
    if (!this.consent) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        this.capture('location', 'geolocation', { latitude, longitude })
      },
      (_err) => {
        // ignore
      },
      { enableHighAccuracy: allowHighAccuracy }
    )
  }
}

const __activityService = new ActivityService()
export default __activityService
